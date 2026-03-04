"""
PARTS 2 + 3 — REAL-TIME ATTENDANCE + PERSISTENT IDENTITY TRACKING
══════════════════════════════════════════════════════════════════════════════
Key design — Persistent Student ID:
  Once a person is confirmed (CONFIRM_VOTES consecutive high-sim matches),
  their student_id is LOCKED to the track.

  When the person LEAVES frame:
    - Their confirmed identity is cached in `_reid_cache` for REID_TIMEOUT frames
    - Cache stores their last known embedding

  When ANY new track appears:
    - Immediately compare face embedding against reid_cache
    - If match found → restore student_id instantly (no re-voting needed)
    - The label shows student_id (S001, S002...) not a random ByteTrack number

  Face covered (occlusion):
    - Body track ID kept alive by ByteTrack → orange OCCLUDED badge
    - Student ID unchanged

GPU split:
  YOLO + ByteTrack  → T1000 via PyTorch
  InsightFace ArcFace → GPU via onnxruntime-gpu (CUDA 11.8)
"""

import cv2
import numpy as np
import pandas as pd
from datetime    import datetime
from collections import defaultdict, deque
from ultralytics import YOLO

from face_engine import FaceEngine
from database    import StudentDatabase
from config      import (
    CAM_INDEX, FRAME_W, FRAME_H,
    YOLO_WEIGHTS, YOLO_CONF, FACE_DET_SKIP,
    RECOG_SMOOTH_N, PANEL_W, ATTENDANCE_TMPL,
    CONFIRM_THRESHOLD, CONFIRM_VOTES, REID_TIMEOUT,
)


# ─────────────────────────────────────────────────────────────────────────────
#  PERSISTENT IDENTITY TRACKER
# ─────────────────────────────────────────────────────────────────────────────

class IdentityTracker:
    """
    Maintains student_id persistence across:
      1. Face occlusion  (body tracked by ByteTrack, ID kept)
      2. Frame exit/re-entry (re-ID from embedding cache)
    """

    def __init__(self, db: StudentDatabase):
        self.db         = db
        self.frame_n    = 0

        # Active tracks: track_id → identity dict
        self.identities: dict = {}

        # Rolling recognition vote buffers: track_id → deque
        self._bufs = defaultdict(lambda: deque(maxlen=RECOG_SMOOTH_N))

        # Confirmed locks: track_id → {student_id, name, confidence, votes}
        self._locks: dict = {}

        # Re-ID cache: student_id → {name, embedding, lost_at_frame}
        # Persists after track is lost so re-entry can be matched instantly
        self._reid_cache: dict = {}

    # ── Public ────────────────────────────────────────────────────────────────

    def update(self, tracked: list, faces: list):
        """
        tracked : [(track_id: int, bbox: np.array[4]), ...]
        faces   : List[FaceResult]
        """
        self.frame_n += 1
        active   = {tid for tid, _ in tracked}
        body_map = {tid: box for tid, box in tracked}

        # Expire old re-ID cache entries
        for sid in list(self._reid_cache):
            if self.frame_n - self._reid_cache[sid]["lost_at"] > REID_TIMEOUT:
                del self._reid_cache[sid]

        # Associate faces → body boxes
        face_to_track   = self._associate(faces, body_map)
        tracks_with_face = set()

        for fi, tid in face_to_track.items():
            emb = faces[fi].embedding
            tracks_with_face.add(tid)

            # If already locked — no need to re-vote
            if tid in self._locks:
                continue

            # Try instant re-ID from cache first (person returning to frame)
            cached_sid = self._check_reid_cache(emb)
            if cached_sid:
                cname = self.db.students[cached_sid]["name"]
                self._locks[tid] = {
                    "student_id": cached_sid,
                    "name":       cname,
                    "confidence": self._reid_cache[cached_sid]["similarity"],
                    "votes":      CONFIRM_VOTES,   # immediately confirmed
                }
                del self._reid_cache[cached_sid]
                print(f"  🔄  Re-identified: {cname} ({cached_sid})  "
                      f"track #{tid}")
                continue

            # Normal vote-based recognition
            sid, name, sim = self.db.identify(emb)
            self._bufs[tid].append((sid, name, sim, emb))

            # Check if we've accumulated enough votes to lock
            self._try_lock(tid)

        # Build identity dict for all active tracks
        for tid in active:
            locked = self._locks.get(tid)
            if tid not in self.identities:
                self.identities[tid] = {
                    "student_id": "pending",
                    "name":       "Identifying\u2026",
                    "confidence": 0.0,
                    "occluded":   False,
                    "locked":     False,
                }
            if locked:
                self.identities[tid].update({
                    "student_id": locked["student_id"],
                    "name":       locked["name"],
                    "confidence": locked["confidence"],
                    "locked":     True,
                })
            else:
                # Show best current vote result (unlocked, may flicker)
                smoothed = self._smooth(tid)
                if smoothed:
                    self.identities[tid].update(smoothed)
                    self.identities[tid]["locked"] = False

            self.identities[tid]["occluded"] = (tid not in tracks_with_face)

        # Handle lost tracks — cache confirmed identities for re-ID
        for tid in list(self.identities):
            if tid not in active:
                locked = self._locks.get(tid)
                if locked and locked["student_id"] not in ("unknown", "pending"):
                    # Cache the best embedding from this track's buffer
                    best_emb = self._best_embedding(tid)
                    if best_emb is not None:
                        self._reid_cache[locked["student_id"]] = {
                            "name":       locked["name"],
                            "embedding":  best_emb,
                            "similarity": locked["confidence"],
                            "lost_at":    self.frame_n,
                        }
                # Clean up
                del self.identities[tid]
                self._locks.pop(tid, None)
                self._bufs.pop(tid, None)

    def get(self, track_id):
        return self.identities.get(track_id)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _associate(self, faces, body_map):
        """Face centre must lie inside a body bounding box."""
        result = {}
        for fi, face in enumerate(faces):
            x1, y1, x2, y2 = face.bbox
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            best_tid, best_area = None, float("inf")
            for tid, box in body_map.items():
                bx1, by1, bx2, by2 = box
                if bx1 <= cx <= bx2 and by1 <= cy <= by2:
                    area = (bx2 - bx1) * (by2 - by1)
                    if area < best_area:
                        best_area, best_tid = area, tid
            if best_tid is not None:
                result[fi] = best_tid
        return result

    def _try_lock(self, track_id):
        """Lock identity if CONFIRM_VOTES consecutive high-sim votes agree."""
        buf = list(self._bufs[track_id])
        if len(buf) < CONFIRM_VOTES:
            return
        recent = buf[-CONFIRM_VOTES:]
        # All must agree on the same student_id
        sids = [x[0] for x in recent]
        sims = [x[2] for x in recent]
        if len(set(sids)) == 1 and sids[0] not in ("unknown",):
            avg_sim = float(np.mean(sims))
            if avg_sim >= CONFIRM_THRESHOLD:
                sid  = sids[0]
                name = recent[0][1]
                self._locks[track_id] = {
                    "student_id": sid,
                    "name":       name,
                    "confidence": avg_sim,
                    "votes":      CONFIRM_VOTES,
                }
                print(f"  🔒  Locked identity: {name} ({sid})  "
                      f"sim={avg_sim:.3f}  track #{track_id}")

    def _check_reid_cache(self, embedding: np.ndarray):
        """
        Compare embedding against reid cache.
        Returns student_id if match found, else None.
        """
        if not self._reid_cache:
            return None

        emb = embedding / (np.linalg.norm(embedding) + 1e-6)
        best_sid, best_sim = None, 0.0

        for sid, cached in self._reid_cache.items():
            c_emb = cached["embedding"]
            c_emb = c_emb / (np.linalg.norm(c_emb) + 1e-6)
            sim   = float(np.dot(emb, c_emb))
            if sim > best_sim:
                best_sim = sim
                best_sid = sid

        # Use a slightly higher threshold for re-ID to avoid false matches
        if best_sim >= CONFIRM_THRESHOLD:
            self._reid_cache[best_sid]["similarity"] = best_sim
            return best_sid
        return None

    def _best_embedding(self, track_id):
        """Returns the highest-similarity embedding from the track's buffer."""
        buf = list(self._bufs.get(track_id, []))
        if not buf:
            return None
        best = max(buf, key=lambda x: x[2])
        return best[3]   # embedding

    def _smooth(self, track_id):
        """Majority vote for unlocked tracks."""
        buf = self._bufs.get(track_id)
        if not buf:
            return None
        votes: dict = defaultdict(list)
        for sid, name, sim, _ in buf:
            votes[sid].append((name, sim))
        best = max(
            votes,
            key=lambda s: (len(votes[s]),
                           np.mean([x[1] for x in votes[s]]))
        )
        name    = votes[best][0][0]
        avg_sim = float(np.mean([x[1] for x in votes[best]]))
        return {"student_id": best, "name": name, "confidence": avg_sim}


# ─────────────────────────────────────────────────────────────────────────────
#  ATTENDANCE MANAGER
# ─────────────────────────────────────────────────────────────────────────────

class AttendanceManager:
    def __init__(self):
        self.log: dict = {}

    def update(self, identities: dict):
        now = datetime.now()
        for tid, ident in identities.items():
            sid = ident.get("student_id")
            if not sid or sid in ("unknown", "pending"):
                continue
            if not ident.get("locked", False):
                continue    # Only log confirmed/locked identities
            if sid not in self.log:
                self.log[sid] = {
                    "name":       ident["name"],
                    "first_seen": now,
                    "last_seen":  now,
                }
                print(f"  📋  Present: {ident['name']}  ({sid})"
                      f"  @ {now.strftime('%H:%M:%S')}")
            else:
                self.log[sid]["last_seen"] = now

    def summary(self):
        return sorted(
            [(sid, d["name"], d["first_seen"].strftime("%H:%M:%S"))
             for sid, d in self.log.items()],
            key=lambda x: x[2],
        )

    def save(self, ts: str) -> str:
        path = ATTENDANCE_TMPL.format(ts=ts)
        rows = [
            {
                "student_id":   sid,
                "name":         d["name"],
                "status":       "Present",
                "first_seen":   d["first_seen"].strftime("%H:%M:%S"),
                "last_seen":    d["last_seen"].strftime("%H:%M:%S"),
                "duration_min": round(
                    (d["last_seen"] - d["first_seen"]).total_seconds() / 60, 1
                ),
            }
            for sid, d in self.log.items()
        ]
        pd.DataFrame(rows).to_csv(path, index=False)
        print(f"\n  💾  Saved → {path}\n")
        return path


# ─────────────────────────────────────────────────────────────────────────────
#  COLOUR PALETTE  (BGR)
# ─────────────────────────────────────────────────────────────────────────────

_C = {
    "locked":   (0,  215,  55),    # Green  — confirmed & locked
    "occluded": (0,  155, 255),    # Orange — locked but face hidden
    "voting":   (200, 200,  0),    # Yellow — recognising, not yet locked
    "unknown":  (0,   50, 220),    # Red    — face seen, not in DB
    "pending":  (110, 110, 120),   # Grey   — no face yet
    "face_box": (240, 225,  18),   # Yellow — raw face detection
}


# ─────────────────────────────────────────────────────────────────────────────
#  VISUALISATION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _label(img, x, y, text, color,
           font=cv2.FONT_HERSHEY_DUPLEX, scale=0.52, thick=1):
    (tw, th), base = cv2.getTextSize(text, font, scale, thick)
    cv2.rectangle(img, (x, y - th - base - 4), (x + tw + 8, y + base + 2), color, -1)
    cv2.putText(img, text, (x + 4, y - 2), font, scale, (255, 255, 255), thick)


def _corner_box(img, x1, y1, x2, y2, color, thick=2, cl=18):
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
    for px, py, dx, dy in [
        (x1, y1,  1,  1), (x2, y1, -1,  1),
        (x1, y2,  1, -1), (x2, y2, -1, -1),
    ]:
        cv2.line(img, (px, py), (px + dx * cl, py),          color, thick + 1)
        cv2.line(img, (px, py), (px,           py + dy * cl), color, thick + 1)


def draw_tracked_persons(frame, tracked, id_tracker: IdentityTracker):
    for tid, box in tracked:
        x1, y1, x2, y2 = [int(v) for v in box]
        ident = id_tracker.get(tid)

        if ident is None:
            col = _C["pending"]
            top = f"Detecting..."
            bot = ""
        else:
            sid    = ident["student_id"]
            occ    = ident["occluded"]
            locked = ident.get("locked", False)

            if sid == "pending":
                col = _C["pending"]
                top = "Identifying\u2026"
                bot = ""
            elif sid == "unknown":
                col = _C["unknown"]
                top = "Unknown"
                bot = f"sim={ident['confidence']:.2f}"
            elif not locked:
                # Voting in progress — show candidate
                col  = _C["voting"]
                conf = f"{ident['confidence'] * 100:.0f}%"
                top  = f"{ident['name']}?"
                bot  = f"{sid}  {conf}  (confirming...)"
            else:
                # Fully locked — show student ID prominently
                col  = _C["occluded"] if occ else _C["locked"]
                conf = f"{ident['confidence'] * 100:.0f}%"
                top  = f"{sid}  {ident['name']}"
                bot  = conf + ("  \u25cf OCCLUDED" if occ else "  \u2713 LOCKED")

        _corner_box(frame, x1, y1, x2, y2, col)
        _label(frame, x1, y1, top, col)
        if bot:
            cv2.putText(frame, bot, (x1 + 4, y2 + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1)


def draw_face_boxes(frame, faces):
    for face in faces:
        x1, y1, x2, y2 = face.bbox
        cv2.rectangle(frame, (x1, y1), (x2, y2), _C["face_box"], 1)


def draw_hud(frame, fps, n_tracks, n_present, n_db, n_reid_cache):
    fps_col = ((0, 215, 80)  if fps >= 20 else
               (0, 165, 255) if fps >= 10 else
               (0, 50,  220))
    cv2.rectangle(frame, (8, 8), (170, 46), (0, 0, 0), -1)
    cv2.putText(frame, f"FPS  {fps:.1f}",
                (14, 36), cv2.FONT_HERSHEY_DUPLEX, 0.78, fps_col, 1)
    cv2.putText(frame,
                f"Tracking {n_tracks}  |  Present {n_present}/{n_db}  |  "
                f"ReID cache {n_reid_cache}  |  [S] Save  [Q] Quit",
                (182, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (195, 200, 225), 1)


def draw_panel(summary, n_db, panel_h):
    panel = np.full((panel_h, PANEL_W, 3), (20, 20, 30), dtype=np.uint8)

    cv2.rectangle(panel, (0, 0), (PANEL_W, 54), (36, 36, 56), -1)
    cv2.putText(panel, "ATTENDANCE",
                (14, 26), cv2.FONT_HERSHEY_DUPLEX, 0.68, (195, 215, 255), 1)
    cv2.putText(panel, datetime.now().strftime("%H:%M:%S"),
                (14, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (135, 145, 175), 1)

    n_pres = len(summary)
    pct    = int(100 * n_pres / max(n_db, 1))
    cv2.putText(panel, f"Present: {n_pres} / {n_db}  ({pct}%)",
                (14, 76), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 210, 95), 1)
    bx1, bx2, by = 14, PANEL_W - 14, 92
    cv2.rectangle(panel, (bx1, by - 9), (bx2, by + 9), (48, 48, 68), -1)
    cv2.rectangle(panel,
                  (bx1, by - 9),
                  (bx1 + int((bx2 - bx1) * pct / 100), by + 9),
                  (0, 200, 95), -1)

    y = 116
    for lbl, col in [("Locked",   _C["locked"]),
                     ("Occluded", _C["occluded"]),
                     ("Voting",   _C["voting"]),
                     ("Unknown",  _C["unknown"])]:
        cv2.circle(panel, (24, y - 4), 6, col, -1)
        cv2.putText(panel, lbl, (36, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (175, 175, 195), 1)
        y += 18

    cv2.line(panel, (10, y + 4), (PANEL_W - 10, y + 4), (45, 45, 65), 1)
    y += 14

    for i, (sid, name, t_in) in enumerate(summary):
        bg = (30, 40, 30) if i % 2 == 0 else (25, 33, 25)
        cv2.rectangle(panel, (0, y - 16), (PANEL_W, y + 22), bg, -1)
        cv2.putText(panel, name[:17],
                    (10, y),      cv2.FONT_HERSHEY_SIMPLEX, 0.48, (185, 240, 185), 1)
        cv2.putText(panel, sid,
                    (10, y + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (95, 145, 95), 1)
        cv2.putText(panel, t_in,
                    (PANEL_W - 66, y), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (115, 160, 115), 1)
        y += 44
        if y > panel_h - 50:
            more = len(summary) - i - 1
            if more > 0:
                cv2.putText(panel, f"\u2026 +{more} more",
                            (14, y + 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, (115, 120, 145), 1)
            break

    cv2.rectangle(panel, (0, panel_h - 30), (PANEL_W, panel_h), (36, 36, 56), -1)
    cv2.putText(panel, "[S] Save attendance   [Q] Quit",
                (8, panel_h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 145, 175), 1)
    return panel


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline():
    print("\n" + "═" * 55)
    print("  SMART CLASSROOM  —  ATTENDANCE SYSTEM")
    print("═" * 55)

    face_engine = FaceEngine()

    yolo = YOLO(YOLO_WEIGHTS)
    yolo.to("cuda")
    print(f"[YOLO] device: {next(yolo.model.parameters()).device}")

    db         = StudentDatabase()
    id_tracker = IdentityTracker(db)
    attendance = AttendanceManager()

    print(f"\n  Students in database : {len(db)}")
    if len(db) == 0:
        print("  ⚠  No students enrolled — run option 1 first!")
    print("  🔒 = identity locked   🟡 = confirming   🔄 = re-identified")
    print("  [S] save   [Q] quit\n")

    cap = cv2.VideoCapture(CAM_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    cap.set(cv2.CAP_PROP_BUFFERSIZE,   1)

    fps_val = 0.0
    fps_t0  = cv2.getTickCount()
    fps_cnt = 0
    frame_n = 0
    cached_faces = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_n += 1
        fps_cnt += 1

        # ── YOLO + ByteTrack (T1000 GPU) ──────────────────────────────────────
        yolo_res = yolo.track(
            frame,
            classes=[0],
            conf=YOLO_CONF,
            tracker="bytetrack.yaml",
            persist=True,
            verbose=False,
        )[0]

        tracked_list = []
        if yolo_res.boxes.id is not None:
            ids          = yolo_res.boxes.id.int().cpu().tolist()
            boxes        = yolo_res.boxes.xyxy.cpu().numpy()
            tracked_list = list(zip(ids, boxes))

        # ── Face recognition (every N frames) ─────────────────────────────────
        if frame_n % FACE_DET_SKIP == 0:
            cached_faces = face_engine.detect_and_embed(frame)

        # ── Identity association + locking + re-ID ────────────────────────────
        id_tracker.update(tracked_list, cached_faces)

        # ── Attendance (locked identities only) ───────────────────────────────
        attendance.update(id_tracker.identities)

        # ── FPS ───────────────────────────────────────────────────────────────
        if fps_cnt >= 15:
            elapsed = (cv2.getTickCount() - fps_t0) / cv2.getTickFrequency()
            fps_val = fps_cnt / elapsed
            fps_cnt = 0
            fps_t0  = cv2.getTickCount()

        # ── Visualisation ─────────────────────────────────────────────────────
        vis = frame.copy()
        draw_tracked_persons(vis, tracked_list, id_tracker)
        draw_face_boxes(vis, cached_faces)
        draw_hud(vis, fps_val, len(tracked_list),
                 len(attendance.log), len(db),
                 len(id_tracker._reid_cache))

        summary  = attendance.summary()
        panel    = draw_panel(summary, len(db), FRAME_H)
        vis_w    = FRAME_W - PANEL_W
        vis      = cv2.resize(vis, (vis_w, FRAME_H))
        combined = np.hstack([vis, panel])

        cv2.imshow("Smart Classroom — Attendance", combined)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("s"):
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            attendance.save(ts)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    attendance.save(ts)
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_pipeline()
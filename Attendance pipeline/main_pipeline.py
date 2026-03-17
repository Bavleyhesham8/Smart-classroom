"""
SMART CLASSROOM — MAIN PIPELINE
════════════════════════════════════════════════════════════════════════════════
Features:
  • YOLO26n + ByteTrack        — person detection + occlusion-robust tracking (GPU)
  • InsightFace buffalo_l      — ArcFace face recognition (GPU, batched)
  • Smart motion-based skip    — adapts face det frequency to scene activity
  • Identity locking           — 5-vote confirmation before marking present
  • Re-entry re-ID             — person returning to frame identified instantly
  • Stranger alert             — unknown person → warning + face saved to DB
  • Persistent student ID      — student_id shown instead of ByteTrack number
  • SQLite writes              — all data written to classroom.db (web-shared)
  • Pipeline events            — real-time events pushed for WebSocket clients
  • Headless mode              — runs without OpenCV window when started by web
  • MJPEG stream               — live annotated frame for browser viewing
  • Stop event                 — web server can stop pipeline gracefully

GPU split:
  YOLO26n + ByteTrack          → T1000 via PyTorch
  InsightFace buffalo_l        → T1000 via onnxruntime-gpu (CUDA 11.8)

Run standalone:   python main_pipeline.py
Run via web:      POST /api/pipeline/start  (server.py handles threading)
"""

import cv2
import numpy as np
import pandas as pd
import threading
from datetime    import datetime
from collections import defaultdict, deque
from ultralytics import YOLO

from face_engine  import FaceEngine
from database     import StudentDatabase
from stranger_db  import StrangerDatabase
import db_sqlite  as sqldb
from config       import (
    CAM_INDEX, FRAME_W, FRAME_H, TARGET_FPS,
    YOLO_WEIGHTS, YOLO_CONF, FACE_DET_MAX_SKIP,
    MOTION_THRESH_HIGH, MOTION_THRESH_LOW,
    RECOG_SMOOTH_N, PANEL_W,
    CONFIRM_THRESHOLD, CONFIRM_VOTES, REID_TIMEOUT,
    STRANGER_ALERT_FRAMES, ALERT_FLASH_FRAMES,
)

# Global callback for web stream (set by server_v2.py)
update_stream_frame = None


# ─────────────────────────────────────────────────────────────────────────────
#  ENHANCEMENT 1 — SMART MOTION-BASED FACE DETECTION SKIP
# ─────────────────────────────────────────────────────────────────────────────

class MotionSkipController:
    """
    Decides whether to run face detection this frame based on scene motion.

    High motion  (diff > MOTION_THRESH_HIGH) → run every frame     (skip=1)
    Medium motion                            → run every 2-3 frames (skip=2)
    Low motion   (diff < MOTION_THRESH_LOW)  → run every N frames   (skip=FACE_DET_MAX_SKIP)

    Saves GPU when classroom is still, ramps up when people are moving.
    """

    def __init__(self):
        self._prev_grey = None
        self._skip_n    = 2
        self._frame_cnt = 0
        self.motion_val = 0.0

    def should_run(self, frame: np.ndarray) -> bool:
        self._frame_cnt += 1
        grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        grey = cv2.resize(grey, (320, 180))

        if self._prev_grey is None:
            self._prev_grey = grey
            return True

        diff = cv2.absdiff(grey, self._prev_grey)
        self.motion_val = float(diff.mean())
        self._prev_grey = grey

        if self.motion_val > MOTION_THRESH_HIGH:
            self._skip_n = 1
        elif self.motion_val > MOTION_THRESH_LOW:
            self._skip_n = 2
        else:
            self._skip_n = FACE_DET_MAX_SKIP

        return (self._frame_cnt % self._skip_n) == 0

    @property
    def skip_n(self):
        return self._skip_n


# ─────────────────────────────────────────────────────────────────────────────
#  IDENTITY TRACKER — persistent locking + re-entry re-ID
# ─────────────────────────────────────────────────────────────────────────────

class IdentityTracker:
    """
    Maps ByteTrack IDs → confirmed student identities.

    States per track:
      pending   — face not yet seen
      voting    — collecting recognition votes (not yet locked)
      locked    — confirmed identity (shown as student_id + name)
      occluded  — locked but face currently hidden
      unknown   — face seen but not in database

    Re-entry:
      When a locked track is lost, the best embedding is cached in
      _reid_cache for REID_TIMEOUT frames. Any new track whose face
      matches the cache above CONFIRM_THRESHOLD is instantly relocked
      without needing to re-vote.
    """

    def __init__(self, db: StudentDatabase):
        self.db              = db
        self.frame_n         = 0
        self.identities:     dict = {}
        self._bufs           = defaultdict(lambda: deque(maxlen=RECOG_SMOOTH_N))
        self._locks:         dict = {}
        self._reid_cache:    dict = {}
        self.last_face_to_track: dict = {}   # exposed for StrangerAlertTracker

    def update(self, tracked: list, faces: list):
        self.frame_n += 1
        active   = {tid for tid, _ in tracked}
        body_map = {tid: box for tid, box in tracked}

        # Expire re-ID cache entries
        for sid in list(self._reid_cache):
            if self.frame_n - self._reid_cache[sid]["lost_at"] > REID_TIMEOUT:
                del self._reid_cache[sid]

        face_to_track    = self._associate(faces, body_map)
        self.last_face_to_track = face_to_track
        tracks_with_face = set()

        for fi, tid in face_to_track.items():
            emb = faces[fi].embedding
            tracks_with_face.add(tid)

            # Already locked — no need to re-vote
            if tid in self._locks:
                continue

            # Try instant re-ID from cache
            cached_sid = self._check_reid_cache(emb)
            if cached_sid:
                cname = self.db.students[cached_sid]["name"]
                self._locks[tid] = {
                    "student_id": cached_sid,
                    "name":       cname,
                    "confidence": self._reid_cache[cached_sid]["similarity"],
                    "votes":      CONFIRM_VOTES,
                }
                del self._reid_cache[cached_sid]
                print(f"  🔄  Re-ID: {cname} ({cached_sid})  track #{tid}")
                continue

            # Normal vote path
            sid_r, name, sim = self.db.identify(emb)
            self._bufs[tid].append((sid_r, name, sim, emb))
            self._try_lock(tid)

        # Build / update identity dict for all active tracks
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
                sm = self._smooth(tid)
                if sm:
                    self.identities[tid].update(sm)
                    self.identities[tid]["locked"] = False
            self.identities[tid]["occluded"] = (tid not in tracks_with_face)

        # Handle lost tracks — cache confirmed identities for re-ID
        for tid in list(self.identities):
            if tid not in active:
                locked = self._locks.get(tid)
                if locked and locked["student_id"] not in ("unknown", "pending"):
                    best_emb = self._best_embedding(tid)
                    if best_emb is not None:
                        self._reid_cache[locked["student_id"]] = {
                            "name":       locked["name"],
                            "embedding":  best_emb,
                            "similarity": locked["confidence"],
                            "lost_at":    self.frame_n,
                        }
                del self.identities[tid]
                self._locks.pop(tid, None)
                self._bufs.pop(tid, None)

    def get(self, tid):
        return self.identities.get(tid)

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

    def _try_lock(self, tid):
        """Lock if CONFIRM_VOTES consecutive votes agree above CONFIRM_THRESHOLD."""
        buf = list(self._bufs[tid])
        if len(buf) < CONFIRM_VOTES:
            return
        recent = buf[-CONFIRM_VOTES:]
        sids   = [x[0] for x in recent]
        sims   = [x[2] for x in recent]
        if len(set(sids)) == 1 and sids[0] != "unknown":
            avg = float(np.mean(sims))
            if avg >= CONFIRM_THRESHOLD:
                self._locks[tid] = {
                    "student_id": sids[0],
                    "name":       recent[0][1],
                    "confidence": avg,
                    "votes":      CONFIRM_VOTES,
                }
                print(f"  🔒  Locked: {recent[0][1]} ({sids[0]})  "
                      f"sim={avg:.3f}  track #{tid}")

    def _check_reid_cache(self, emb):
        if not self._reid_cache:
            return None
        e = emb / (np.linalg.norm(emb) + 1e-6)
        best_sid, best_sim = None, 0.0
        for sid, cached in self._reid_cache.items():
            c   = cached["embedding"] / (np.linalg.norm(cached["embedding"]) + 1e-6)
            sim = float(np.dot(e, c))
            if sim > best_sim:
                best_sim, best_sid = sim, sid
        if best_sim >= CONFIRM_THRESHOLD:
            self._reid_cache[best_sid]["similarity"] = best_sim
            return best_sid
        return None

    def _best_embedding(self, tid):
        buf = list(self._bufs.get(tid, []))
        return max(buf, key=lambda x: x[2])[3] if buf else None

    def _smooth(self, tid):
        buf = self._bufs.get(tid)
        if not buf:
            return None
        votes: dict = defaultdict(list)
        for sid, name, sim, _ in buf:
            votes[sid].append((name, sim))
        best = max(votes, key=lambda s: (
            len(votes[s]), np.mean([x[1] for x in votes[s]])
        ))
        return {
            "student_id": best,
            "name":       votes[best][0][0],
            "confidence": float(np.mean([x[1] for x in votes[best]])),
        }


# ─────────────────────────────────────────────────────────────────────────────
#  STRANGER ALERT TRACKER
# ─────────────────────────────────────────────────────────────────────────────

class StrangerAlertTracker:
    """
    Watches for tracks that are consistently unrecognised.
    After STRANGER_ALERT_FRAMES frames of 'unknown' → triggers alert.
    Saves face image + embedding to StrangerDatabase.
    Recognises the same stranger on repeat visits.
    """

    def __init__(self, str_db: StrangerDatabase):
        self.str_db         = str_db
        self.frame_n        = 0
        self._track_state:  dict = {}
        self.active_alerts: dict = {}
        self._alert_flash        = 0

    def update(self, tracked, face_to_track, faces, identities, frame):
        self.frame_n += 1
        active        = {tid for tid, _ in tracked}
        track_to_face = {v: k for k, v in face_to_track.items()}

        for tid in active:
            ident = identities.get(tid, {})
            sid   = ident.get("student_id", "pending")

            if tid not in self._track_state:
                self._track_state[tid] = {
                    "unknown_frames": 0,
                    "alerted":        False,
                    "stranger_id":    None,
                    "last_emb":       None,
                    "last_img":       None,
                    "sighting_start": self.frame_n,
                }

            state = self._track_state[tid]
            fi    = track_to_face.get(tid)
            emb   = faces[fi].embedding if fi is not None else None
            f_img = None
            if fi is not None:
                x1, y1, x2, y2 = faces[fi].bbox
                roi = frame[max(0, y1):y2, max(0, x1):x2]
                if roi.size > 0:
                    f_img = roi.copy()

            if sid == "unknown" and emb is not None:
                state["unknown_frames"] += 1
                state["last_emb"] = emb.copy()
                state["last_img"] = f_img
            elif sid not in ("pending", "unknown"):
                # Recognised — reset stranger state
                state["unknown_frames"] = 0
                state["alerted"]        = False
                state["stranger_id"]    = None

            # ── Trigger alert ─────────────────────────────────────────────────
            if (state["unknown_frames"] >= STRANGER_ALERT_FRAMES
                    and not state["alerted"]
                    and state["last_emb"] is not None):

                now   = datetime.now()
                found, str_sid, sim = self.str_db.find_match(state["last_emb"])

                if found:
                    self.str_db.update_sighting(
                        str_sid, state["last_emb"], state["last_img"],
                        now, state["unknown_frames"] / 30.0)
                    state["stranger_id"] = str_sid
                    print(f"  ⚠  Known stranger re-sighted: "
                          f"{str_sid}  sim={sim:.3f}  track #{tid}")
                    sqldb.push_event("stranger_reseen", {
                        "stranger_id": str_sid,
                        "similarity":  round(sim, 3),
                    })
                else:
                    str_sid = self.str_db.add_new(
                        state["last_emb"], state["last_img"], now)
                    state["stranger_id"] = str_sid
                    sqldb.push_event("stranger_alert", {
                        "stranger_id": str_sid,
                        "image_path":  self.str_db.strangers.get(
                            str_sid, {}).get("image_path", ""),
                    })

                state["alerted"]  = True
                self._alert_flash = ALERT_FLASH_FRAMES
                self.active_alerts[str_sid] = {
                    "track_id":    tid,
                    "alert_frame": self.frame_n,
                }

            # ── Update duration for already-alerted strangers (~every 1s) ─────
            elif (state["alerted"]
                    and state["stranger_id"]
                    and state["unknown_frames"] % 30 == 0):
                self.str_db.update_sighting(
                    state["stranger_id"],
                    state["last_emb"],
                    state["last_img"],
                    datetime.now(),
                    1.0,
                )

        # Remove stale track states
        for tid in list(self._track_state):
            if tid not in active:
                del self._track_state[tid]

        # Remove stale active alerts (track gone > 90 frames)
        for str_sid in list(self.active_alerts):
            al = self.active_alerts[str_sid]
            if (al["track_id"] not in active
                    and self.frame_n - al["alert_frame"] > 90):
                del self.active_alerts[str_sid]

        if self._alert_flash > 0:
            self._alert_flash -= 1

    @property
    def flash_active(self):
        return self._alert_flash > 0

    def active_stranger_count(self):
        return sum(1 for s in self._track_state.values()
                   if s.get("alerted"))


# ─────────────────────────────────────────────────────────────────────────────
#  ATTENDANCE MANAGER
# ─────────────────────────────────────────────────────────────────────────────

class AttendanceManager:
    """
    Logs attendance for confirmed (locked) identities only.
    Writes to both in-memory dict and SQLite classroom.db.
    Pushes student_present event on first confirmed sighting.
    """

    def __init__(self):
        self.log: dict = {}

    def update(self, identities: dict):
        now  = datetime.now()
        date = now.strftime("%Y-%m-%d")

        for tid, ident in identities.items():
            sid = ident.get("student_id")
            if not sid or sid in ("unknown", "pending"):
                continue
            if not ident.get("locked", False):
                continue

            first_entry = sid not in self.log

            if first_entry:
                self.log[sid] = {
                    "name":       ident["name"],
                    "first_seen": now,
                    "last_seen":  now,
                }
                print(f"  📋  Present: {ident['name']} ({sid})"
                      f"  @ {now.strftime('%H:%M:%S')}")
                # Push event for WebSocket clients
                sqldb.push_event("student_present", {
                    "student_id": sid,
                    "name":       ident["name"],
                    "confidence": round(ident.get("confidence", 0), 3),
                    "time":       now.strftime("%H:%M:%S"),
                })
            else:
                self.log[sid]["last_seen"] = now

            # Write / update SQLite record
            d = self.log[sid]
            duration = round(
                (d["last_seen"] - d["first_seen"]).total_seconds() / 60, 1)
            sqldb.upsert_attendance(
                sid,
                d["name"],
                date,
                d["first_seen"].strftime("%H:%M:%S"),
                d["last_seen"].strftime("%H:%M:%S"),
                duration,
            )

    def summary(self):
        return sorted(
            [(sid, d["name"], d["first_seen"].strftime("%H:%M:%S"))
             for sid, d in self.log.items()],
            key=lambda x: x[2],
        )

    def save_csv(self, ts: str) -> str:
        """Save attendance to CSV file (local backup)."""
        from config import ATTENDANCE_TMPL
        path = ATTENDANCE_TMPL.format(ts=ts)
        rows = [
            {
                "student_id":   sid,
                "name":         d["name"],
                "status":       "Present",
                "first_seen":   d["first_seen"].strftime("%H:%M:%S"),
                "last_seen":    d["last_seen"].strftime("%H:%M:%S"),
                "duration_min": round(
                    (d["last_seen"] - d["first_seen"]).total_seconds() / 60, 1),
            }
            for sid, d in self.log.items()
        ]
        pd.DataFrame(rows).to_csv(path, index=False)
        print(f"\n  💾  CSV saved → {path}\n")
        return path


# ─────────────────────────────────────────────────────────────────────────────
#  COLOUR PALETTE  (BGR)
# ─────────────────────────────────────────────────────────────────────────────

_C = {
    "locked":   (0,  215,  55),   # Green   — confirmed + locked
    "occluded": (0,  155, 255),   # Orange  — locked, face hidden
    "voting":   (200, 200,   0),  # Yellow  — accumulating votes
    "unknown":  (0,   50,  220),  # Red     — face seen, not in DB
    "stranger": (0,   20,  255),  # Bright red — stranger alert
    "pending":  (110, 110, 120),  # Grey    — no face yet
    "face_box": (240, 225,  18),  # Yellow  — raw face detection box
}


# ─────────────────────────────────────────────────────────────────────────────
#  VISUALISATION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _label(img, x, y, text, color,
           font=cv2.FONT_HERSHEY_DUPLEX, scale=0.52, thick=1):
    (tw, th), base = cv2.getTextSize(text, font, scale, thick)
    cv2.rectangle(img, (x, y-th-base-4), (x+tw+8, y+base+2), color, -1)
    cv2.putText(img, text, (x+4, y-2), font, scale, (255, 255, 255), thick)


def _corner_box(img, x1, y1, x2, y2, color, thick=2, cl=18):
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
    for px, py, dx, dy in [
        (x1, y1,  1,  1), (x2, y1, -1,  1),
        (x1, y2,  1, -1), (x2, y2, -1, -1),
    ]:
        cv2.line(img, (px, py), (px+dx*cl, py),        color, thick+1)
        cv2.line(img, (px, py), (px,       py+dy*cl),  color, thick+1)


def draw_tracked_persons(frame, tracked, id_tracker, stranger_tracker):
    for tid, box in tracked:
        x1, y1, x2, y2 = [int(v) for v in box]
        ident  = id_tracker.get(tid)
        state  = stranger_tracker._track_state.get(tid, {})
        is_str = state.get("alerted", False)

        if ident is None:
            col, top, bot = _C["pending"], "Detecting...", ""
        else:
            sid    = ident["student_id"]
            occ    = ident["occluded"]
            locked = ident.get("locked", False)

            if is_str and sid in ("unknown", "pending"):
                str_sid = state.get("stranger_id", "STR???")
                col = _C["stranger"]
                top = f"\u26a0 STRANGER  {str_sid}"
                bot = "Not in student database"
            elif sid == "pending":
                col, top, bot = _C["pending"], "Identifying\u2026", ""
            elif sid == "unknown":
                col = _C["unknown"]
                top = "Unknown"
                bot = f"sim={ident['confidence']:.2f}"
            elif not locked:
                col = _C["voting"]
                top = f"{ident['name']}?"
                bot = f"{sid}  {ident['confidence']*100:.0f}%  (confirming)"
            else:
                col = _C["occluded"] if occ else _C["locked"]
                top = f"{sid}  {ident['name']}"
                bot = f"{ident['confidence']*100:.0f}%" + (
                    "  \u25cf OCCLUDED" if occ else "  \u2713 LOCKED")

        _corner_box(frame, x1, y1, x2, y2, col)
        _label(frame, x1, y1, top, col)
        if bot:
            cv2.putText(frame, bot, (x1+4, y2+18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1)


def draw_face_boxes(frame, faces):
    for face in faces:
        x1, y1, x2, y2 = face.bbox
        cv2.rectangle(frame, (x1, y1), (x2, y2), _C["face_box"], 1)


def draw_stranger_alert_overlay(frame, stranger_tracker):
    if not stranger_tracker.flash_active:
        return
    h, w  = frame.shape[:2]
    alpha = stranger_tracker._alert_flash / ALERT_FLASH_FRAMES
    thick = max(2, int(12 * alpha))
    cv2.rectangle(frame, (0, 0), (w-1, h-1), (0, 0, 220), thick)
    n    = stranger_tracker.active_stranger_count()
    warn = f"\u26a0  UNKNOWN PERSON DETECTED  ({n} active)"
    tw   = cv2.getTextSize(warn, cv2.FONT_HERSHEY_DUPLEX, 0.9, 2)[0][0]
    bx   = w//2 - tw//2 - 16
    cv2.rectangle(frame, (bx, h-95), (bx+tw+32, h-60), (0, 0, 180), -1)
    cv2.putText(frame, warn, (bx+16, h-68),
                cv2.FONT_HERSHEY_DUPLEX, 0.9, (80, 80, 255), 2)
    cv2.putText(frame, "Face saved  |  Check Module 3: Visitor Alert",
                (bx+16, h-52), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (160, 160, 255), 1)


def draw_hud(frame, fps, n_tracks, n_present, n_db,
             n_reid, n_strangers, motion_val, skip_n, headless):
    fps_col = ((0, 215, 80)  if fps >= 20 else
               (0, 165, 255) if fps >= 10 else
               (0, 50,  220))
    cv2.rectangle(frame, (8, 8), (170, 46), (0, 0, 0), -1)
    cv2.putText(frame, f"FPS  {fps:.1f}",
                (14, 36), cv2.FONT_HERSHEY_DUPLEX, 0.78, fps_col, 1)

    mot_col = ((0, 215, 80)  if motion_val > MOTION_THRESH_HIGH else
               (0, 165, 255) if motion_val > MOTION_THRESH_LOW  else
               (130, 130, 130))
    mode_tag = "[WEB]" if headless else "[LOCAL]"
    cv2.putText(frame,
                f"Motion {motion_val:4.0f}  Skip 1/{skip_n}  |  "
                f"Tracking {n_tracks}  |  Present {n_present}/{n_db}  |  "
                f"ReID {n_reid}  |  Strangers {n_strangers}  "
                f"{mode_tag}  [S]Save [Q]Quit",
                (182, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.42, mot_col, 1)

    if n_strangers > 0:
        cv2.putText(frame,
                    f"\u26a0  {n_strangers} UNKNOWN PERSON(S) — see Module 3",
                    (182, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 80, 255), 1)


def draw_panel(summary, n_db, panel_h, n_strangers):
    panel = np.full((panel_h, PANEL_W, 3), (20, 20, 30), dtype=np.uint8)

    # Header
    cv2.rectangle(panel, (0, 0), (PANEL_W, 54), (36, 36, 56), -1)
    cv2.putText(panel, "ATTENDANCE",
                (14, 26), cv2.FONT_HERSHEY_DUPLEX, 0.68, (195, 215, 255), 1)
    cv2.putText(panel, datetime.now().strftime("%H:%M:%S"),
                (14, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (135, 145, 175), 1)

    # Progress bar
    n_pres = len(summary)
    pct    = int(100 * n_pres / max(n_db, 1))
    cv2.putText(panel, f"Present: {n_pres}/{n_db}  ({pct}%)",
                (14, 76), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 210, 95), 1)
    bx1, bx2, by = 14, PANEL_W-14, 92
    cv2.rectangle(panel, (bx1, by-9), (bx2, by+9), (48, 48, 68), -1)
    cv2.rectangle(panel, (bx1, by-9),
                  (bx1 + int((bx2-bx1)*pct/100), by+9), (0, 200, 95), -1)

    # Stranger banner
    if n_strangers > 0:
        cv2.rectangle(panel, (0, 100), (PANEL_W, 125), (30, 0, 60), -1)
        cv2.putText(panel, f"\u26a0  {n_strangers} UNKNOWN PERSON(S)",
                    (10, 118), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (100, 80, 255), 1)

    # Legend
    y = 130
    for lbl, col in [
        ("Locked",   _C["locked"]),
        ("Occluded", _C["occluded"]),
        ("Voting",   _C["voting"]),
        ("Stranger", _C["stranger"]),
    ]:
        cv2.circle(panel, (24, y-4), 6, col, -1)
        cv2.putText(panel, lbl, (36, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (175, 175, 195), 1)
        y += 18

    cv2.line(panel, (10, y+4), (PANEL_W-10, y+4), (45, 45, 65), 1)
    y += 14

    # Student list
    for i, (sid, name, t_in) in enumerate(summary):
        bg = (30, 40, 30) if i % 2 == 0 else (25, 33, 25)
        cv2.rectangle(panel, (0, y-16), (PANEL_W, y+22), bg, -1)
        cv2.putText(panel, name[:17], (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (185, 240, 185), 1)
        cv2.putText(panel, sid, (10, y+14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.36, (95, 145, 95), 1)
        cv2.putText(panel, t_in, (PANEL_W-66, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (115, 160, 115), 1)
        y += 44
        if y > panel_h - 50:
            more = len(summary) - i - 1
            if more > 0:
                cv2.putText(panel, f"\u2026 +{more} more",
                            (14, y+10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, (115, 120, 145), 1)
            break

    # Footer
    cv2.rectangle(panel, (0, panel_h-30), (PANEL_W, panel_h), (36, 36, 56), -1)
    cv2.putText(panel, "[S] Save   [Q] Quit",
                (8, panel_h-10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 145, 175), 1)
    return panel


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(stop_event: threading.Event = None,
                 headless: bool = False):
    """
    stop_event : threading.Event — set by web server to stop gracefully.
                 Pass None when running standalone.
    headless   : True  — no OpenCV window, encodes MJPEG frames for web stream.
                 False — shows OpenCV window (standalone / local mode).
    """

    print("\n" + "═"*55)
    print("  SMART CLASSROOM  —  ATTENDANCE SYSTEM")
    print("═"*55)
    print("  Active enhancements:")
    print("    ✓ YOLO26n            (NMS-free, faster)")
    print("    ✓ InsightFace buffalo_l  (best accuracy)")
    print("    ✓ Smart motion skip  (adaptive face det)")
    print("    ✓ Batched inference  (one GPU pass/cycle)")
    print("    ✓ SQLite backend     (web-shared DB)")
    mode = "HEADLESS (web)" if headless else "LOCAL (OpenCV window)"
    print(f"    ✓ Mode: {mode}")

    # ── Init DB ───────────────────────────────────────────────────────────────
    sqldb.init_db()

    # ── Init models ───────────────────────────────────────────────────────────
    face_engine = FaceEngine()
    yolo        = YOLO(YOLO_WEIGHTS)
    yolo.to("cuda")
    print(f"\n[YOLO26] device: {next(yolo.model.parameters()).device}")

    # ── Init managers ─────────────────────────────────────────────────────────
    db               = StudentDatabase()
    str_db           = StrangerDatabase()
    id_tracker       = IdentityTracker(db)
    stranger_tracker = StrangerAlertTracker(str_db)
    attendance       = AttendanceManager()
    motion_ctrl      = MotionSkipController()

    print(f"\n  Students in database : {len(db)}")
    print(f"  Strangers logged     : {len(str_db)}")
    if len(db) == 0:
        print("  ⚠  No students enrolled — run option 1 first!")
    if not headless:
        print("  [S] save CSV   [Q] quit\n")

    # ── Camera ────────────────────────────────────────────────────────────────
    def open_camera(index):
        # If index is a string and looks like a file, open without CAP_DSHOW
        if isinstance(index, str) and not index.isdigit():
            print(f"[*] Opening video file: {index}")
            return cv2.VideoCapture(index)
            
        # Hardware index handling
        idx = int(index) if isinstance(index, str) and index.isdigit() else index
        # Try DSHOW first for faster init on Windows
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(idx)
        return cap

    print(f"[*] Initializing input (target: {CAM_INDEX})...")
    cap = open_camera(CAM_INDEX)
    
    # Fallback to other indices ONLY if primary target was a hardware index
    is_hardware = not (isinstance(CAM_INDEX, str) and not str(CAM_INDEX).isdigit())
    
    if not cap.isOpened() and is_hardware:
        for alt_idx in [0, 1, 2]:
            if alt_idx == CAM_INDEX: continue
            print(f"[*] Trying alternative camera index {alt_idx}...")
            cap = open_camera(alt_idx)
            if cap.isOpened():
                print(f"[+] Found working camera at index {alt_idx}")
                break
    
    if not cap.isOpened():
        print("  ❌ FATAL: Could not open any camera index (0, 1, 2).")
        sqldb.push_event("pipeline_error", {"detail": "Camera access denied or device disconnected"})
        sqldb.update_pipeline_status(running=False)
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    cap.set(cv2.CAP_PROP_BUFFERSIZE,   1)

    # ── Push startup event ────────────────────────────────────────────────────
    sqldb.push_event("pipeline_started", {
        "fps_target":        TARGET_FPS,
        "students_enrolled": len(db),
        "mode":              "headless" if headless else "local",
    })
    sqldb.update_pipeline_status(running=True)

    fps_val      = 0.0
    fps_t0       = cv2.getTickCount()
    fps_cnt      = 0
    frame_n      = 0
    cached_faces = []
    status_tick  = 0

    # ── Main loop ─────────────────────────────────────────────────────────────
    while True:
        ret, frame = cap.read()
        if not ret:
            print("  ⚠  Camera read failed — retrying...")
            continue

        frame_n  += 1
        fps_cnt  += 1
        status_tick += 1

        # ── 1. YOLO26n + ByteTrack (GPU) ──────────────────────────────────────
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

        # ── 2. Smart motion skip + batched face recognition ───────────────────
        if motion_ctrl.should_run(frame):
            # detect_and_embed runs all face crops in one GPU pass internally
            cached_faces = face_engine.detect_and_embed(frame)

        # ── 3. Identity tracking (lock / re-ID / smooth) ──────────────────────
        id_tracker.update(tracked_list, cached_faces)

        # ── 4. Stranger alert ─────────────────────────────────────────────────
        stranger_tracker.update(
            tracked_list,
            id_tracker.last_face_to_track,
            cached_faces,
            id_tracker.identities,
            frame,
        )

        # ── 5. Attendance (locked identities only → SQLite) ───────────────────
        attendance.update(id_tracker.identities)

        # ── 6. FPS counter ────────────────────────────────────────────────────
        if fps_cnt >= 15:
            elapsed = (cv2.getTickCount() - fps_t0) / cv2.getTickFrequency()
            fps_val = fps_cnt / max(elapsed, 1e-6)
            fps_cnt = 0
            fps_t0  = cv2.getTickCount()

        # ── 7. Write pipeline status to SQLite every 30 frames ───────────────
        if status_tick >= 30:
            status_tick = 0
            sqldb.update_pipeline_status(
                fps              = round(fps_val, 1),
                students_in_frame= len(tracked_list),
                strangers_active = stranger_tracker.active_stranger_count(),
                motion_level     = round(motion_ctrl.motion_val, 1),
            )

        # ── 8. Compose output frame ───────────────────────────────────────────
        vis = frame.copy()
        draw_tracked_persons(vis, tracked_list, id_tracker, stranger_tracker)
        draw_face_boxes(vis, cached_faces)
        draw_stranger_alert_overlay(vis, stranger_tracker)
        draw_hud(
            vis, fps_val,
            len(tracked_list),
            len(attendance.log),
            len(db),
            len(id_tracker._reid_cache),
            stranger_tracker.active_stranger_count(),
            motion_ctrl.motion_val,
            motion_ctrl.skip_n,
            headless,
        )

        summary  = attendance.summary()
        panel    = draw_panel(summary, len(db), FRAME_H,
                              stranger_tracker.active_stranger_count())
        vis_w    = FRAME_W - PANEL_W
        vis      = cv2.resize(vis, (vis_w, FRAME_H))
        combined = np.hstack([vis, panel])

        # ── 9. Output — window or MJPEG stream ───────────────────────────────
        if headless:
            # Encode JPEG and push to web stream buffer
            if update_stream_frame:
                _, jpg = cv2.imencode(
                    ".jpg", combined,
                    [cv2.IMWRITE_JPEG_QUALITY, 75]
                )
                update_stream_frame(jpg.tobytes())
        else:
            cv2.imshow("Smart Classroom — Attendance", combined)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("s"):
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                attendance.save_csv(ts)

        # ── 10. Stop signal from web server ───────────────────────────────────
        if stop_event is not None and stop_event.is_set():
            print("\n  [Pipeline] Stop signal received from web server.")
            break

    # ── Cleanup ───────────────────────────────────────────────────────────────
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    attendance.save_csv(ts)

    sqldb.update_pipeline_status(running=False)
    sqldb.push_event("pipeline_stopped", {
        "students_present": len(attendance.log),
        "strangers_logged": len(str_db),
    })

    cap.release()
    if not headless:
        cv2.destroyAllWindows()

    print("\n  Pipeline stopped cleanly.\n")


# ─────────────────────────────────────────────────────────────────────────────
#  STANDALONE ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_pipeline(stop_event=None, headless=False)
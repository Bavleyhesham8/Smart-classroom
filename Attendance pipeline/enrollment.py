"""
PART 1 — GUIDED ENROLLMENT
- Duplicate face check before saving
- Pitch/yaw normalization fix
- Live angle debug display
"""

import os
import cv2
import math
import numpy as np
from face_engine import FaceEngine
from database   import StudentDatabase
from config import (
    CAM_INDEX, FRAME_W, FRAME_H,
    FRONT_YAW_MAX, SIDE_YAW_MIN, SIDE_YAW_MAX, PITCH_MAX, HOLD_FRAMES,
)


# ─────────────────────────────────────────────────────────────────────────────
#  HEAD POSE ESTIMATOR
# ─────────────────────────────────────────────────────────────────────────────

class HeadPoseEstimator:
    _MODEL3D = np.array([
        [-30.0,  40.0, -20.0],
        [ 30.0,  40.0, -20.0],
        [  0.0,   0.0,   0.0],
        [-25.0, -35.0, -25.0],
        [ 25.0, -35.0, -25.0],
    ], dtype=np.float64)

    def __init__(self, frame_w: int, frame_h: int):
        f          = float(frame_w)
        self._cam  = np.array(
            [[f, 0, frame_w / 2.0],
             [0, f, frame_h / 2.0],
             [0, 0, 1.0]],
            dtype=np.float64,
        )
        self._dist = np.zeros((4, 1), dtype=np.float64)

    def estimate(self, kps: np.ndarray):
        if kps is None or kps.shape != (5, 2):
            return None, None
        ok, rvec, _ = cv2.solvePnP(
            self._MODEL3D, kps.astype(np.float64),
            self._cam, self._dist,
            flags=cv2.SOLVEPNP_SQPNP,
        )
        if not ok:
            return None, None
        R, _ = cv2.Rodrigues(rvec)
        pitch = math.degrees(math.atan2( R[2, 1],  R[2, 2]))
        yaw   = math.degrees(math.atan2(-R[2, 0],
                             math.sqrt(R[2,1]**2 + R[2,2]**2)))
        # Normalize to [-90, +90] — fixes the solvePnP 162° flip bug
        if pitch >  90: pitch -= 180
        if pitch < -90: pitch += 180
        if yaw   >  90: yaw   -= 180
        if yaw   < -90: yaw   += 180
        return yaw, pitch


# ─────────────────────────────────────────────────────────────────────────────
#  POSE STAGES
# ─────────────────────────────────────────────────────────────────────────────

_STAGES = [
    {
        "key":   "front",
        "label": "Look STRAIGHT at the camera",
        "hint":  f"Need |yaw| < {FRONT_YAW_MAX}\u00b0  and  |pitch| < {PITCH_MAX}\u00b0",
        "check": lambda y, p: abs(y) < FRONT_YAW_MAX and abs(p) < PITCH_MAX,
        "color": (0, 215, 80),
    },
    {
        "key":   "right",
        "label": "Turn your head RIGHT  \u2192",
        "hint":  f"Need yaw +{SIDE_YAW_MIN}\u00b0 to +{SIDE_YAW_MAX}\u00b0",
        "check": lambda y, p: SIDE_YAW_MIN < y < SIDE_YAW_MAX and abs(p) < PITCH_MAX,
        "color": (0, 175, 255),
    },
    {
        "key":   "left",
        "label": "\u2190  Turn your head LEFT",
        "hint":  f"Need yaw \u2212{SIDE_YAW_MIN}\u00b0 to \u2212{SIDE_YAW_MAX}\u00b0",
        "check": lambda y, p: -SIDE_YAW_MAX < y < -SIDE_YAW_MIN and abs(p) < PITCH_MAX,
        "color": (255, 175, 0),
    },
]


# ─────────────────────────────────────────────────────────────────────────────
#  DRAWING HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _corner_rect(img, x1, y1, x2, y2, color, thick=2, cl=20):
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
    for px, py, dx, dy in [
        (x1, y1,  1,  1), (x2, y1, -1,  1),
        (x1, y2,  1, -1), (x2, y2, -1, -1),
    ]:
        cv2.line(img, (px, py), (px + dx * cl, py),          color, thick + 1)
        cv2.line(img, (px, py), (px,           py + dy * cl), color, thick + 1)


def _draw_overlay(disp, stage_idx, thumbs, face_bbox, kps,
                  yaw, pitch, hold_ctr, pose_ok):
    h, w  = disp.shape[:2]
    stage = _STAGES[stage_idx] if stage_idx < len(_STAGES) else None

    # Frosted top bar
    bar = disp.copy()
    cv2.rectangle(bar, (0, 0), (w, 145), (12, 12, 22), -1)
    cv2.addWeighted(bar, 0.72, disp, 0.28, 0, disp)
    cv2.putText(disp, "STUDENT ENROLLMENT",
                (20, 34), cv2.FONT_HERSHEY_DUPLEX, 0.82, (195, 215, 255), 1)

    # 3-step progress
    CX   = [w // 2 - 165, w // 2, w // 2 + 165]
    LBLS = ["FRONT", "RIGHT", "LEFT"]
    for i, (cx, lbl) in enumerate(zip(CX, LBLS)):
        if i < stage_idx:
            cv2.circle(disp, (cx, 68), 22, (0, 200, 90), -1)
            cv2.putText(disp, "v", (cx - 8, 76),
                        cv2.FONT_HERSHEY_DUPLEX, 0.75, (255, 255, 255), 2)
            if i < len(thumbs):
                th = cv2.resize(thumbs[i], (55, 55))
                disp[145:200, cx - 27: cx + 28] = th
        elif i == stage_idx:
            col = _STAGES[i]["color"] if pose_ok else (80, 80, 185)
            cv2.circle(disp, (cx, 68), 22, col, -1)
            cv2.circle(disp, (cx, 68), 22, (255, 255, 255), 2)
            cv2.putText(disp, str(i + 1), (cx - 8, 76),
                        cv2.FONT_HERSHEY_DUPLEX, 0.75, (255, 255, 255), 2)
        else:
            cv2.circle(disp, (cx, 68), 22, (55, 55, 75), -1)
            cv2.putText(disp, str(i + 1), (cx - 8, 76),
                        cv2.FONT_HERSHEY_DUPLEX, 0.75, (120, 120, 140), 2)
        cv2.putText(disp, lbl, (cx - 24, 108),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (155, 160, 185), 1)
        if i < 2:
            lc = (0, 200, 90) if i < stage_idx else (55, 55, 75)
            cv2.line(disp, (CX[i] + 26, 68), (CX[i+1] - 26, 68), lc, 2)

    # Live angle panel (top-right)
    if yaw is not None:
        panel_bg = disp.copy()
        cv2.rectangle(panel_bg, (w - 320, 155), (w - 10, 260), (15, 15, 28), -1)
        cv2.addWeighted(panel_bg, 0.78, disp, 0.22, 0, disp)

        yaw_col   = (0, 220, 80) if abs(yaw)   < FRONT_YAW_MAX else (0, 100, 255)
        pitch_col = (0, 220, 80) if abs(pitch) < PITCH_MAX      else (0, 100, 255)
        cv2.putText(disp, f"YAW   {yaw:+.1f}\u00b0",
                    (w - 310, 195), cv2.FONT_HERSHEY_DUPLEX, 0.95, yaw_col, 2)
        cv2.putText(disp, f"PITCH {pitch:+.1f}\u00b0",
                    (w - 310, 248), cv2.FONT_HERSHEY_DUPLEX, 0.95, pitch_col, 2)

        # Exact failure reason
        if stage and not pose_ok:
            issues = []
            if stage["key"] == "front":
                if abs(yaw)   >= FRONT_YAW_MAX:
                    issues.append(f"yaw {yaw:+.0f} need <{FRONT_YAW_MAX}")
                if abs(pitch) >= PITCH_MAX:
                    issues.append(f"pitch {pitch:+.0f} need <{PITCH_MAX}")
            elif stage["key"] == "right":
                if not (SIDE_YAW_MIN < yaw < SIDE_YAW_MAX):
                    issues.append(f"yaw {yaw:+.0f} need +{SIDE_YAW_MIN}~+{SIDE_YAW_MAX}")
            elif stage["key"] == "left":
                if not (-SIDE_YAW_MAX < yaw < -SIDE_YAW_MIN):
                    issues.append(f"yaw {yaw:+.0f} need -{SIDE_YAW_MIN}~-{SIDE_YAW_MAX}")
            if issues:
                cv2.putText(disp, "Fix: " + "  |  ".join(issues),
                            (16, h - 62),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (80, 130, 255), 1)
    else:
        cv2.putText(disp, "NO FACE DETECTED",
                    (w - 310, 210), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 60, 255), 2)

    # Keypoints
    if kps is not None:
        kp_colors = [(255,255,0),(255,255,0),(0,255,255),(0,200,255),(0,200,255)]
        for idx, (px, py) in enumerate(kps.astype(int)):
            cv2.circle(disp, (px, py), 4, kp_colors[idx], -1)

    # Instruction
    if stage:
        lc = stage["color"] if pose_ok else (170, 170, 195)
        tw = cv2.getTextSize(stage["label"], cv2.FONT_HERSHEY_DUPLEX, 0.82, 2)[0][0]
        cv2.putText(disp, stage["label"],
                    (w // 2 - tw // 2, h - 82),
                    cv2.FONT_HERSHEY_DUPLEX, 0.82, lc, 2)
        hint_col = (0, 200, 80) if pose_ok else (110, 115, 145)
        hw = cv2.getTextSize(stage["hint"], cv2.FONT_HERSHEY_SIMPLEX, 0.50, 1)[0][0]
        cv2.putText(disp, stage["hint"],
                    (w // 2 - hw // 2, h - 56),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, hint_col, 1)

    # Yaw gauge
    if yaw is not None:
        bw  = 260;  bx = w // 2 - bw // 2;  by = h - 44
        cxg = bx + bw // 2
        cv2.rectangle(disp, (bx, by - 7), (bx + bw, by + 7), (35, 35, 50), -1)
        norm  = max(-1.0, min(1.0, yaw / 80.0))
        dot_x = int(cxg + norm * (bw // 2))
        dot_c = (stage["color"] if (pose_ok and stage) else (80, 80, 200))
        cv2.circle(disp, (dot_x, by), 9, dot_c, -1)
        cv2.line(disp, (cxg, by - 8), (cxg, by + 8), (90, 90, 110), 2)
        for angle in [-SIDE_YAW_MAX, -SIDE_YAW_MIN, SIDE_YAW_MIN, SIDE_YAW_MAX]:
            mx = int(cxg + (angle / 80.0) * (bw // 2))
            cv2.line(disp, (mx, by - 7), (mx, by + 7), (70, 70, 95), 1)

    # Face box
    if face_bbox:
        x1, y1, x2, y2 = face_bbox
        fc = (stage["color"] if (pose_ok and stage) else (70, 70, 200))
        _corner_rect(disp, x1, y1, x2, y2, fc)

    # Hold bar
    if pose_ok and stage:
        prog = min(hold_ctr / HOLD_FRAMES, 1.0)
        bx1, bx2 = w // 2 - 160, w // 2 + 160
        by = h - 26
        cv2.rectangle(disp, (bx1, by - 9), (bx2, by + 9), (38, 38, 55), -1)
        cv2.rectangle(disp,
                      (bx1, by - 9),
                      (int(bx1 + (bx2 - bx1) * prog), by + 9),
                      stage["color"], -1)
        cv2.putText(disp, f"HOLD  {int(prog * 100)}%",
                    (w // 2 - 38, by + 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1)


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN ENROLLMENT
# ─────────────────────────────────────────────────────────────────────────────

def run_enrollment():
    print("\n" + "═" * 52)
    print("  SMART CLASSROOM  —  STUDENT ENROLLMENT")
    print("═" * 52)

    db = StudentDatabase()
    print(f"  Students already enrolled : {len(db)}")
    if len(db) > 0:
        print("  Existing students:")
        for sid, name in db.list_students():
            print(f"    {sid}  {name}")

    print(f"\n  Thresholds: front |yaw|<{FRONT_YAW_MAX}° |pitch|<{PITCH_MAX}°  "
          f"side {SIDE_YAW_MIN}°–{SIDE_YAW_MAX}°")

    name = input("\n  Enter student name (or blank to cancel): ").strip()
    if not name:
        print("  Cancelled.\n")
        return None, None

    face_engine = FaceEngine()
    pose_est    = HeadPoseEstimator(FRAME_W, FRAME_H)

    cap = cv2.VideoCapture(CAM_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    cap.set(cv2.CAP_PROP_BUFFERSIZE,   1)

    captured_embs   = []
    captured_thumbs = []
    stage_idx = 0
    hold_ctr  = 0
    log_tick  = 0

    print(f"\n  Enrolling  : {name}")
    print("  Poses      : 1=FRONT   2=RIGHT   3=LEFT")
    print("  Press Q to cancel\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame   = cv2.flip(frame, 1)
        display = frame.copy()

        face      = face_engine.largest_face(frame)
        face_bbox = face.bbox if face else None
        kps       = face.kps  if face else None

        yaw, pitch = None, None
        if face is not None and face.kps is not None:
            yaw, pitch = pose_est.estimate(face.kps)

        pose_ok = False
        if yaw is not None and stage_idx < len(_STAGES):
            pose_ok  = _STAGES[stage_idx]["check"](yaw, pitch)
            hold_ctr = (hold_ctr + 1) if pose_ok else max(0, hold_ctr - 2)
        else:
            hold_ctr = 0

        log_tick += 1
        if yaw is not None and log_tick % 30 == 0:
            sk = _STAGES[stage_idx]["key"] if stage_idx < len(_STAGES) else "done"
            print(f"  [{sk:5s}]  yaw={yaw:+6.1f}  pitch={pitch:+6.1f}  "
                  f"hold={hold_ctr:2d}/{HOLD_FRAMES}  ok={pose_ok}")

        # ── Auto-capture ──────────────────────────────────────────────────────
        if (pose_ok and hold_ctr >= HOLD_FRAMES
                and face is not None and stage_idx < len(_STAGES)):

            captured_embs.append(face.embedding.copy())
            x1, y1, x2, y2 = face.bbox
            roi   = frame[max(0, y1):y2, max(0, x1):x2]
            thumb = (cv2.resize(roi, (55, 55))
                     if roi.size > 0
                     else np.zeros((55, 55, 3), np.uint8))
            captured_thumbs.append(thumb)

            print(f"\n  ✓  Captured : {_STAGES[stage_idx]['key'].upper()}"
                  f"  yaw={yaw:+.1f}°  pitch={pitch:+.1f}°\n")
            hold_ctr   = 0
            stage_idx += 1

            if stage_idx >= len(_STAGES):
                # All 3 poses done — show flash while we do duplicate check
                flash = display.copy()
                cv2.rectangle(flash, (0, 0), (FRAME_W, FRAME_H), (0, 200, 80), -1)
                cv2.addWeighted(flash, 0.22, display, 0.78, 0, display)
                cv2.putText(display, "Checking database...",
                            (FRAME_W // 2 - 160, FRAME_H // 2),
                            cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 100), 2)
                cv2.imshow("Enrollment — Smart Classroom", display)
                cv2.waitKey(500)
                break

        _draw_overlay(display, stage_idx, captured_thumbs,
                      face_bbox, kps, yaw, pitch, hold_ctr, pose_ok)
        cv2.putText(display,
                    f"Enrolling: {name}   |   DB: {len(db)} enrolled",
                    (FRAME_W - 450, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (150, 155, 180), 1)
        cv2.imshow("Enrollment — Smart Classroom", display)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

    # ── Duplicate check before saving ────────────────────────────────────────
    if len(captured_embs) == 3:
        emb_arr = np.stack(captured_embs).astype(np.float32)

        is_dup, dup_sid, dup_name, dup_sim = db.check_duplicate(emb_arr)

        if is_dup:
            print(f"\n  ⚠  DUPLICATE DETECTED!")
            print(f"     This face already exists in the database:")
            print(f"     ID   : {dup_sid}")
            print(f"     Name : {dup_name}")
            print(f"     Similarity : {dup_sim:.3f}  (threshold: {0.60})")
            print(f"     Enrollment cancelled to avoid duplicates.\n")

            confirm = input(
                f"  Force enroll anyway as '{name}'? "
                f"(only if this is a different person) [y/N]: "
            ).strip().lower()
            if confirm != "y":
                print("  Cancelled.\n")
                return None, None
            print("  Proceeding with forced enrollment...\n")

        sid = db.enroll(name, emb_arr)
        print(f"\n  ✅  Enrolled successfully!")
        print(f"      ID    : {sid}")
        print(f"      Name  : {name}")
        print(f"      Total : {len(db)} student(s) in database\n")
        return sid, name

    print("\n  ❌  Cancelled (< 3 poses captured).\n")
    return None, None


def run_enrollment_headless(name, status_dict, lock, update_frame_cb=None):
    """
    Automated version of run_enrollment for web integration.
    Does NOT use cv2.imshow or input().
    Updates status_dict for frontend polling.
    """
    import cv2
    import numpy as np
    import base64
    from face_engine import FaceEngine
    from database import StudentDatabase
    from config import CAM_INDEX, FRAME_W, FRAME_H, HOLD_FRAMES
    from datetime import datetime

    with lock:
        status_dict.update({
            "stage": "initializing",
            "progress": 0,
            "yaw": 0,
            "pitch": 0,
            "pose_ok": False,
            "face_detected": False,
            "label": "Initializing camera..."
        })

    try:
        db = StudentDatabase()
        face_engine = FaceEngine()
        pose_est = HeadPoseEstimator(FRAME_W, FRAME_H)

        # Try multiple camera indices if CAM_INDEX fails
        cap = None
        
        # Determine if CAM_INDEX is a file or a device
        is_file = isinstance(CAM_INDEX, str) and not str(CAM_INDEX).isdigit()
        
        if is_file:
            print(f"[Enrollment] Attempting to open video file: {CAM_INDEX}")
            cap = cv2.VideoCapture(CAM_INDEX)
        else:
            indices_to_try = [CAM_INDEX, 0, 1, 2] if CAM_INDEX != 0 else [0, 1, 2]
            for idx in indices_to_try:
                # Convert to int if string digit
                device_idx = int(idx) if isinstance(idx, str) and idx.isdigit() else idx
                print(f"[Enrollment] Attempting to open camera index {device_idx}...")
                test_cap = cv2.VideoCapture(device_idx, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(device_idx)
                if test_cap.isOpened():
                    cap = test_cap
                    print(f"[Enrollment] Camera opened successfully on index {device_idx}")
                    break
                test_cap.release()

        if not cap or not cap.isOpened():
            detail = f"Video file access failed: {CAM_INDEX}" if is_file else "Camera access failed. Ensure no other app is using it."
            print(f"[Enrollment] CRITICAL: {detail}")
            with lock:
                status_dict.update({"stage": "error", "detail": detail})
            
            # Optional: yield one "Camera Fail" frame so user sees the error on stream
            if update_frame_cb:
                fail_frame = np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8)
                cv2.putText(fail_frame, "CAMERA ACCESS FAILED", (FRAME_W//2-200, FRAME_H//2), cv2.FONT_HERSHEY_DUPLEX, 1.0, (0,0,255), 2)
                _, jpeg = cv2.imencode('.jpg', fail_frame)
                update_frame_cb(jpeg.tobytes())
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        captured_embs = []
        captured_thumb_b64 = ""
        stage_idx = 0
        hold_ctr = 0

        while stage_idx < len(_STAGES):
            # Check for cancellation
            with lock:
                if status_dict.get("stage") == "cancelled":
                    break

            ret, frame = cap.read()
            if not ret:
                print("[Enrollment] Failed to capture frame")
                break

            # Diagnostic: check if frame is black
            if frame.mean() < 0.1:
                # If we get many black frames, it might be a busy camera or closed lid
                # Log once in a while
                if hold_ctr % 30 == 0:
                    print(f"[Enrollment] Warning: Camera returning black frames (mean={frame.mean():.2f})")

            frame = cv2.flip(frame, 1)
            display = frame.copy()
            face = face_engine.largest_face(frame)

            yaw, pitch = None, None
            pose_ok = False
            face_bbox = None
            kps = None

            if face:
                face_bbox = face.bbox
                kps = face.kps
                yaw, pitch = pose_est.estimate(face.kps)
                if yaw is not None:
                    pose_ok = _STAGES[stage_idx]["check"](yaw, pitch)

            if pose_ok:
                hold_ctr += 1
            else:
                hold_ctr = max(0, hold_ctr - 2)

            # Update shared status
            with lock:
                status_dict.update({
                    "stage": _STAGES[stage_idx]["key"],
                    "label": _STAGES[stage_idx]["label"],
                    "progress": int((hold_ctr / HOLD_FRAMES) * 100),
                    "yaw": float(yaw) if yaw is not None else None,
                    "pitch": float(pitch) if pitch is not None else None,
                    "pose_ok": pose_ok,
                    "face_detected": face is not None
                })

            # Stream annotated frame
            if update_frame_cb:
                # Reuse the _draw_overlay from the original enrollment.py
                # Note: thumbs are empty here as we don't need them for headless web view
                _draw_overlay(display, stage_idx, [],
                              face_bbox, kps, yaw, pitch, hold_ctr, pose_ok)
                _, jpeg = cv2.imencode('.jpg', display)
                update_frame_cb(jpeg.tobytes())

            if pose_ok and hold_ctr >= HOLD_FRAMES:
                captured_embs.append(face.embedding.copy())
                
                # Capture thumbnail for the front face (first pose)
                if stage_idx == 0 and face_bbox is not None:
                    try:
                        x1, y1, x2, y2 = face_bbox
                        roi = frame[max(0, y1):y2, max(0, x1):x2]
                        if roi.size > 0:
                            resized = cv2.resize(roi, (200, 200))
                            _, buffer = cv2.imencode('.jpg', resized)
                            captured_thumb_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')
                    except Exception as e:
                        print(f"[Enrollment] Thumbnail capture failed: {e}")

                hold_ctr = 0
                stage_idx += 1
                with lock:
                    status_dict["progress"] = 0

        cap.release()

        # Check final results
        if len(captured_embs) == 3:
            with lock:
                status_dict.update({"stage": "saving", "label": "Registering in database...", "progress": 100})
            
            emb_arr = np.stack(captured_embs).astype(np.float32)
            is_dup, dup_sid, dup_name, dup_sim = db.check_duplicate(emb_arr)

            if is_dup:
                with lock:
                    status_dict.update({
                        "stage": "error",
                        "detail": f"Duplicate face: {dup_name} ({dup_sid})",
                        "error_type": "duplicate"
                    })
                return

            # Save using SQLAlchemy V2
            from database_v2 import SessionLocal
            import models_v2 as models
            
            # Use same timestamp-based ID as server_v2.py for consistency
            sid = "S" + datetime.now().strftime("%H%M%S")
            
            # Internal CV-engine enrollment still needs ID
            legacy_id = db.enroll(name, emb_arr) 
            
            with SessionLocal() as session:
                new_student = models.Student(
                    student_id=sid,
                    name=name,
                    profile_image_b64=captured_thumb_b64,
                    enrolled_date=datetime.now()
                )
                session.add(new_student)
                
                # Add embeddings
                for i, angle in enumerate(["front", "right", "left"]):
                    db_emb = models.FaceEmbedding(
                        student_id=sid,
                        embedding=captured_embs[i].tobytes(),
                        angle=angle
                    )
                    session.add(db_emb)
                
                session.commit()

            with lock:
                status_dict.update({
                    "stage": "done",
                    "label": "Enrollment Complete!",
                    "student_id": sid,
                    "name": name
                })
        else:
            with lock:
                if status_dict.get("stage") != "cancelled":
                    status_dict.update({"stage": "error", "detail": "Enrollment incomplete"})

    except Exception as e:
        import traceback
        traceback.print_exc()
        with lock:
            status_dict.update({"stage": "error", "detail": str(e)})
    finally:
        if cap and cap.isOpened():
            cap.release()



if __name__ == "__main__":
    while True:
        sid, name = run_enrollment()
        if sid is None:
            break
        again = input("  Enroll another? [y/N]: ").strip().lower()
        if again != "y":
            break
    print("  Done.\n")
"""
MODULE 3 — VISITOR ALERT MANAGER
════════════════════════════════════════════════════════════════
OpenCV-based review interface for unknown persons detected in class.

Controls:
  ← → Arrow keys   Navigate stranger cards
  ENTER            View detailed info + all face images
  E                Enroll selected stranger as a student
  S                Mark as Safe / known visitor
  D                Delete record
  F                Filter: All / Unknown only / Safe
  Q                Quit
"""

import cv2
import numpy as np
import os
from datetime import datetime
from stranger_db import StrangerDatabase
from database    import StudentDatabase


# ─────────────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

WIN_W, WIN_H = 1280, 720
CARD_W, CARD_H = 200, 260
THUMB_SIZE = (160, 160)
COLS = 5
CARD_PAD = 20
HEADER_H = 80
FOOTER_H = 60

STATUS_COLORS = {
    "unknown":  (0,  50,  220),   # Red
    "safe":     (0,  200,  80),   # Green
    "enrolled": (200, 160,   0),  # Gold
}
STATUS_LABELS = {
    "unknown":  "UNKNOWN",
    "safe":     "SAFE",
    "enrolled": "ENROLLED",
}

FILTERS = ["all", "unknown", "safe", "enrolled"]


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN VIEWER
# ─────────────────────────────────────────────────────────────────────────────

def run_visitor_alert():
    str_db = StrangerDatabase()
    stu_db = StudentDatabase()

    selected   = 0
    filter_idx = 0
    detail_mode = False
    detail_img_idx = 0
    message     = ""
    msg_timer   = 0

    print("\n" + "═" * 55)
    print("  SMART CLASSROOM  —  VISITOR ALERT MANAGER")
    print("═" * 55)
    print(f"  Total strangers logged: {len(str_db)}")
    print("  Controls: ←→ navigate  ENTER=detail  E=enroll  "
          "S=safe  D=delete  F=filter  Q=quit\n")

    cv2.namedWindow("Visitor Alert Manager", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Visitor Alert Manager", WIN_W, WIN_H)

    while True:
        cur_filter = FILTERS[filter_idx]
        items = str_db.get_all(
            status_filter=(None if cur_filter == "all" else cur_filter)
        )

        if not items:
            canvas = _empty_canvas(cur_filter, len(str_db))
            cv2.imshow("Visitor Alert Manager", canvas)
            key = cv2.waitKey(100) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("f"):
                filter_idx = (filter_idx + 1) % len(FILTERS)
            continue

        # Clamp selection
        selected = max(0, min(selected, len(items) - 1))

        if detail_mode:
            sid, meta = items[selected]
            canvas = _draw_detail(str_db, stu_db, sid, meta,
                                  detail_img_idx, message, msg_timer)
        else:
            canvas = _draw_grid(str_db, items, selected,
                                cur_filter, message, msg_timer)

        if msg_timer > 0:
            msg_timer -= 1
        else:
            message = ""

        cv2.imshow("Visitor Alert Manager", canvas)
        key = cv2.waitKey(50) & 0xFF

        if key == ord("q"):
            break

        elif key == ord("f") and not detail_mode:
            filter_idx = (filter_idx + 1) % len(FILTERS)
            selected   = 0

        elif key in (81, ord("a")):   # Left arrow or A
            if detail_mode:
                detail_img_idx = max(0, detail_img_idx - 1)
            else:
                selected = max(0, selected - 1)

        elif key in (83, ord("d")) and not detail_mode:   # Right arrow or D (grid only)
            selected = min(len(items) - 1, selected + 1)

        elif key in (82, ord("w")) and not detail_mode:   # Up arrow
            selected = max(0, selected - COLS)

        elif key in (84, ord("s")) and not detail_mode:   # Down arrow
            selected = min(len(items) - 1, selected + COLS)

        elif key == 13:   # ENTER
            detail_mode = not detail_mode
            detail_img_idx = 0

        elif key == 27:   # ESC — back to grid
            detail_mode    = False
            detail_img_idx = 0

        elif key == ord("e"):   # Enroll
            sid, meta = items[selected]
            if meta["status"] == "enrolled":
                message   = f"{sid} already enrolled!"
                msg_timer = 60
            else:
                cv2.destroyWindow("Visitor Alert Manager")
                enrolled_sid = _enroll_stranger(str_db, stu_db, sid, meta)
                if enrolled_sid:
                    str_db.set_status(sid, "enrolled",
                                      notes=f"Enrolled as {enrolled_sid}")
                    message   = f"Enrolled as {enrolled_sid} ✓"
                    msg_timer = 90
                    detail_mode = False
                cv2.namedWindow("Visitor Alert Manager", cv2.WINDOW_NORMAL)
                cv2.resizeWindow("Visitor Alert Manager", WIN_W, WIN_H)

        elif key == ord("s") and detail_mode:   # Mark safe (detail mode)
            sid, meta = items[selected]
            str_db.set_status(sid, "safe", notes="Marked safe by admin")
            message   = f"{sid} marked as SAFE ✓"
            msg_timer = 60
            detail_mode = False

        elif key == ord("x"):   # Delete
            sid, meta = items[selected]
            str_db.delete(sid)
            message   = f"{sid} deleted"
            msg_timer = 60
            selected  = max(0, selected - 1)
            detail_mode = False

    cv2.destroyAllWindows()


# ─────────────────────────────────────────────────────────────────────────────
#  GRID VIEW
# ─────────────────────────────────────────────────────────────────────────────

def _draw_grid(str_db, items, selected, cur_filter, message, msg_timer):
    canvas = np.full((WIN_H, WIN_W, 3), (18, 18, 28), dtype=np.uint8)

    # Header
    cv2.rectangle(canvas, (0, 0), (WIN_W, HEADER_H), (28, 28, 45), -1)
    cv2.putText(canvas, "VISITOR ALERT MANAGER",
                (24, 38), cv2.FONT_HERSHEY_DUPLEX, 0.9, (195, 215, 255), 1)

    # Filter + counts
    unk_count  = sum(1 for _, d in items if d["status"] == "unknown")
    safe_count = sum(1 for _, d in items if d["status"] == "safe")
    enr_count  = sum(1 for _, d in items if d["status"] == "enrolled")

    filter_txt = f"Filter: [{cur_filter.upper()}]  |  " \
                 f"Unknown {unk_count}  Safe {safe_count}  Enrolled {enr_count}  " \
                 f"Total {len(items)}"
    cv2.putText(canvas, filter_txt,
                (24, 66), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (140, 150, 180), 1)

    # Cards
    for i, (sid, meta) in enumerate(items):
        col = i % COLS
        row = i // COLS
        x   = CARD_PAD + col * (CARD_W + CARD_PAD)
        y   = HEADER_H + CARD_PAD + row * (CARD_H + CARD_PAD)

        if y + CARD_H > WIN_H - FOOTER_H:
            break

        _draw_card(canvas, str_db, sid, meta, x, y,
                   selected=(i == selected))

    # Footer
    cv2.rectangle(canvas, (0, WIN_H - FOOTER_H), (WIN_W, WIN_H), (28, 28, 45), -1)
    controls = ("← → ↑ ↓  Navigate    ENTER  Detail view    "
                "E  Enroll    X  Delete    F  Filter    Q  Quit")
    cv2.putText(canvas, controls,
                (16, WIN_H - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.44,
                (140, 145, 175), 1)

    # Message overlay
    if message and msg_timer > 0:
        _draw_message(canvas, message)

    return canvas


def _draw_card(canvas, str_db, sid, meta, x, y, selected):
    status = meta["status"]
    col    = STATUS_COLORS.get(status, (100, 100, 100))

    # Card background
    bg = (38, 38, 55) if not selected else (50, 60, 85)
    cv2.rectangle(canvas, (x, y), (x + CARD_W, y + CARD_H), bg, -1)
    cv2.rectangle(canvas, (x, y), (x + CARD_W, y + CARD_H),
                  col if selected else (55, 55, 75), 2 if selected else 1)

    # Thumbnail
    thumb = str_db.load_image(sid, size=THUMB_SIZE)
    th    = cv2.resize(thumb, (CARD_W - 8, CARD_W - 8))
    ty    = y + 4
    canvas[ty: ty + CARD_W - 8, x + 4: x + CARD_W - 4] = th

    # Status badge
    status_lbl = STATUS_LABELS.get(status, status.upper())
    cv2.rectangle(canvas, (x + 4, y + 4),
                  (x + 4 + len(status_lbl) * 9 + 6, y + 22), col, -1)
    cv2.putText(canvas, status_lbl, (x + 7, y + 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1)

    # Text info below thumbnail
    info_y = ty + CARD_W - 4
    cv2.putText(canvas, sid,
                (x + 6, info_y + 18),
                cv2.FONT_HERSHEY_DUPLEX, 0.52, (220, 225, 255), 1)

    # First seen (date only)
    fs = meta["first_seen"][:10]
    cv2.putText(canvas, f"First: {fs}",
                (x + 6, info_y + 36),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 145, 175), 1)

    # Duration
    dur = meta["total_duration_sec"]
    dur_str = (f"{int(dur // 60)}m {int(dur % 60)}s" if dur >= 60
               else f"{int(dur)}s")
    cv2.putText(canvas, f"Duration: {dur_str}",
                (x + 6, info_y + 52),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 145, 175), 1)

    # Appearances
    cv2.putText(canvas, f"Seen: {meta['total_appearances']}x",
                (x + 6, info_y + 68),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 145, 175), 1)

    # Selection highlight
    if selected:
        cv2.rectangle(canvas, (x, y), (x + CARD_W, y + CARD_H), col, 3)


# ─────────────────────────────────────────────────────────────────────────────
#  DETAIL VIEW
# ─────────────────────────────────────────────────────────────────────────────

def _draw_detail(str_db, stu_db, sid, meta, img_idx, message, msg_timer):
    canvas = np.full((WIN_H, WIN_W, 3), (18, 18, 28), dtype=np.uint8)
    status = meta["status"]
    col    = STATUS_COLORS.get(status, (100, 100, 100))

    # Header
    cv2.rectangle(canvas, (0, 0), (WIN_W, HEADER_H), (28, 28, 45), -1)
    cv2.putText(canvas, f"DETAIL VIEW  —  {sid}",
                (24, 38), cv2.FONT_HERSHEY_DUPLEX, 0.9, (195, 215, 255), 1)
    cv2.putText(canvas, "ESC  Back to grid",
                (24, 66), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (120, 125, 155), 1)

    # Status badge
    status_lbl = STATUS_LABELS.get(status, status.upper())
    cv2.rectangle(canvas, (WIN_W - 200, 14), (WIN_W - 14, 46), col, -1)
    cv2.putText(canvas, status_lbl,
                (WIN_W - 185, 36),
                cv2.FONT_HERSHEY_DUPLEX, 0.62, (255, 255, 255), 1)

    # Face image gallery
    img_paths = str_db.get_all_images(sid)
    if img_paths:
        img_idx = max(0, min(img_idx, len(img_paths) - 1))
        img = cv2.imread(img_paths[img_idx])
        if img is not None:
            img = cv2.resize(img, (280, 280))
            canvas[HEADER_H + 20: HEADER_H + 300, 30: 310] = img
        # Gallery nav
        nav_txt = f"Photo {img_idx + 1} / {len(img_paths)}  (← → to browse)"
        cv2.putText(canvas, nav_txt, (30, HEADER_H + 315),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, (130, 135, 165), 1)
    else:
        ph = np.full((280, 280, 3), 40, dtype=np.uint8)
        cv2.putText(ph, "No image", (50, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 120), 1)
        canvas[HEADER_H + 20: HEADER_H + 300, 30: 310] = ph

    # ── Info panel (right of image) ──────────────────────────────────────────
    ix = 340
    iy = HEADER_H + 30

    def info_row(label, value, color=(185, 190, 215)):
        nonlocal iy
        cv2.putText(canvas, label, (ix, iy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (120, 125, 155), 1)
        cv2.putText(canvas, str(value), (ix + 180, iy),
                    cv2.FONT_HERSHEY_DUPLEX, 0.52, color, 1)
        iy += 32

    info_row("Stranger ID :", sid, (220, 225, 255))
    info_row("Status      :", status_lbl, col)
    iy += 8
    info_row("First seen  :", meta["first_seen"].replace("T", "  "))
    info_row("Last seen   :", meta["last_seen"].replace("T", "  "))
    iy += 8
    dur = meta["total_duration_sec"]
    dur_str = (f"{int(dur//3600)}h {int((dur%3600)//60)}m {int(dur%60)}s"
               if dur >= 3600 else
               f"{int(dur//60)}m {int(dur%60)}s" if dur >= 60 else
               f"{int(dur)}s")
    info_row("Total time  :", dur_str, (0, 215, 80))
    info_row("Appearances :", f"{meta['total_appearances']} sighting(s)")
    info_row("Photos saved:", f"{len(str_db.get_all_images(sid))} image(s)")
    iy += 8
    if meta.get("notes"):
        info_row("Notes       :", meta["notes"][:40], (200, 200, 100))

    # ── Action buttons (bottom-right) ────────────────────────────────────────
    actions = [
        ("[E] Enroll as Student",  (0, 200, 80)),
        ("[S] Mark as Safe",       (0, 175, 255)),
        ("[X] Delete Record",      (0, 50,  220)),
        ("[ESC] Back to Grid",     (100, 100, 130)),
    ]
    ay = WIN_H - FOOTER_H - len(actions) * 40 - 10
    for label, acol in actions:
        cv2.rectangle(canvas, (ix, ay), (ix + 360, ay + 30), acol, -1)
        cv2.putText(canvas, label, (ix + 10, ay + 21),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)
        ay += 38

    # Message overlay
    if message and msg_timer > 0:
        _draw_message(canvas, message)

    return canvas


# ─────────────────────────────────────────────────────────────────────────────
#  ENROLL FROM STRANGER RECORD
# ─────────────────────────────────────────────────────────────────────────────

def _enroll_stranger(str_db: StrangerDatabase,
                     stu_db: StudentDatabase,
                     sid: str, meta: dict):
    """
    Convert a stranger record to a full student.
    Uses stored embedding (front only — 3x same embedding as placeholder).
    Admin must re-enroll properly later for best accuracy.
    Returns new student_id or None.
    """
    print(f"\n  Enrolling stranger {sid} as a student...")
    name = input(f"  Enter name for this person: ").strip()
    if not name:
        print("  Cancelled.\n")
        return None

    embedding = str_db.embeddings.get(sid)
    if embedding is None:
        print("  No embedding found — cannot enroll.\n")
        return None

    # Use same embedding 3 times (front/right/left placeholder)
    # Student should be properly re-enrolled later for full accuracy
    emb_3 = np.stack([embedding, embedding, embedding]).astype(np.float32)

    new_sid = stu_db.enroll(name, emb_3)

    print(f"\n  ✅  Enrolled as student!")
    print(f"      Student ID : {new_sid}")
    print(f"      Name       : {name}")
    print(f"  ⚠  NOTE: Only 1 embedding angle stored.")
    print(f"      Re-enroll via Module 1 for best accuracy.\n")
    return new_sid


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _empty_canvas(cur_filter, total):
    canvas = np.full((WIN_H, WIN_W, 3), (18, 18, 28), dtype=np.uint8)
    cv2.rectangle(canvas, (0, 0), (WIN_W, HEADER_H), (28, 28, 45), -1)
    cv2.putText(canvas, "VISITOR ALERT MANAGER",
                (24, 38), cv2.FONT_HERSHEY_DUPLEX, 0.9, (195, 215, 255), 1)
    msg = (f"No records found for filter '{cur_filter.upper()}'"
           if total > 0 else
           "No strangers detected yet — run Attendance (option 2) first")
    cv2.putText(canvas, msg,
                (WIN_W//2 - 280, WIN_H//2),
                cv2.FONT_HERSHEY_DUPLEX, 0.7, (130, 135, 165), 1)
    cv2.putText(canvas, "[F] Change filter   [Q] Quit",
                (WIN_W//2 - 160, WIN_H//2 + 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.52, (100, 105, 135), 1)
    return canvas


def _draw_message(canvas, message):
    h, w = canvas.shape[:2]
    tw   = cv2.getTextSize(message, cv2.FONT_HERSHEY_DUPLEX, 0.75, 2)[0][0]
    bx   = w//2 - tw//2 - 20
    cv2.rectangle(canvas, (bx, h//2 - 30), (bx + tw + 40, h//2 + 20),
                  (30, 50, 30), -1)
    cv2.rectangle(canvas, (bx, h//2 - 30), (bx + tw + 40, h//2 + 20),
                  (0, 200, 80), 2)
    cv2.putText(canvas, message,
                (bx + 20, h//2 + 8),
                cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 230, 100), 2)


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_visitor_alert()
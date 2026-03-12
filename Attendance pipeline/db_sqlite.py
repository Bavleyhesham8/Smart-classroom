"""
Shared SQLite database — replaces CSV/NPZ files.
Used by BOTH the CV pipeline and the FastAPI web server.
Thread-safe via check_same_thread=False + WAL mode.
"""
import os
import json
import sqlite3
import numpy as np
from datetime import datetime
from contextlib import contextmanager
from config import BASE_DIR

DB_PATH = os.path.join(BASE_DIR, "classroom_v2.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # allows concurrent reads+writes
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """V2 Schema ensures tables exist. Actual init via database_v2.py usually."""
    print(f"[DB Bridge] Pointing to V2 Database: {DB_PATH}")


# ── Embedding helpers ─────────────────────────────────────────────────────────

def emb_to_blob(arr: np.ndarray) -> bytes:
    return arr.astype(np.float32).tobytes()

def blob_to_emb(blob: bytes, shape) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32).reshape(shape)


# ── Students (Updated for V2 Schema) ─────────────────────────────────────────

def get_all_students():
    with db() as conn:
        rows = conn.execute(
            "SELECT student_id, name, enrolled_date FROM students ORDER BY student_id"
        ).fetchall()
    return [dict(r) for r in rows]

def get_student(student_id: str):
    with db() as conn:
        row = conn.execute(
            "SELECT student_id, name, enrolled_date FROM students WHERE student_id=?",
            (student_id,)
        ).fetchone()
    return dict(row) if row else None

def get_all_embeddings():
    """
    Returns {student_id: np.array(3,512)} for all students.
    V2 Schema stores up to 3 embeddings per student in face_embeddings table.
    """
    with db() as conn:
        rows = conn.execute("""
            SELECT student_id, angle, embedding 
            FROM face_embeddings 
            ORDER BY student_id, angle
        """).fetchall()
    
    result = {}
    temp = {}
    for r in rows:
        sid = r["student_id"]
        emb = blob_to_emb(r["embedding"], (512,))
        if sid not in temp: temp[sid] = []
        temp[sid].append(emb)
    
    for sid, embs in temp.items():
        if len(embs) >= 3:
            result[sid] = np.stack(embs[:3])
        else:
            # Fallback for partially enrolled
            result[sid] = np.stack([embs[0]] * 3)
            
    return result

def save_student(student_id, name, enrolled_date, embedding_3x512):
    """Note: Prefer web enrollment, but keeping for compatibility."""
    with db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO students (student_id, name, enrolled_date) VALUES (?,?,?)",
            (student_id, name, enrolled_date)
        )
        for i, angle in enumerate(["front", "right", "left"]):
            conn.execute(
                "INSERT OR REPLACE INTO face_embeddings (student_id, angle, embedding) VALUES (?,?,?)",
                (student_id, angle, emb_to_blob(embedding_3x512[i]))
            )

def next_student_id():
    with db() as conn:
        rows = conn.execute(
            "SELECT student_id FROM students WHERE student_id LIKE 'S%'"
        ).fetchall()
    nums = []
    for r in rows:
        sid = r["student_id"]
        if sid[1:].isdigit():
            nums.append(int(sid[1:]))
    return f"S{(max(nums)+1):03d}" if nums else "S001"


# ── Attendance (Updated for V2 table name) ────────────────────────────────────

def upsert_attendance(student_id, name, date, first_seen, last_seen, duration_min):
    with db() as conn:
        conn.execute("""
            INSERT INTO attendance_logs
                (student_id, date, first_seen, last_seen, duration_min, status)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(student_id, date) DO UPDATE SET
                last_seen    = excluded.last_seen,
                duration_min = excluded.duration_min
        """, (student_id, date, first_seen, last_seen, duration_min, 'Present'))
# ── Pipeline events ───────────────────────────────────────────────────────────

def push_event(event_type: str, payload: dict):
    with db() as conn:
        conn.execute(
            "INSERT INTO pipeline_events (event_type, payload, timestamp) VALUES (?,?,?)",
            (event_type, json.dumps(payload),
             datetime.now().isoformat(timespec="seconds"))
        )

def get_pending_events():
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM pipeline_events WHERE consumed=0 ORDER BY id"
        ).fetchall()
    return [dict(r) for r in rows]

def consume_events(ids: list):
    with db() as conn:
        conn.execute(
            f"UPDATE pipeline_events SET consumed=1 WHERE id IN "
            f"({','.join('?'*len(ids))})", ids
        )


# ── Pipeline status ───────────────────────────────────────────────────────────

def update_pipeline_status(running=None, fps=None, students_in_frame=None,
                           strangers_active=None, motion_level=None):
    fields, vals = [], []
    if running          is not None: fields.append("running=?");           vals.append(int(running))
    if fps              is not None: fields.append("fps=?");               vals.append(fps)
    if students_in_frame is not None: fields.append("students_in_frame=?"); vals.append(students_in_frame)
    if strangers_active  is not None: fields.append("strangers_active=?");  vals.append(strangers_active)
    if motion_level     is not None: fields.append("motion_level=?");      vals.append(motion_level)
    fields.append("last_heartbeat=?")
    vals.append(datetime.now().isoformat(timespec="seconds"))
    vals.append(1)
    with db() as conn:
        conn.execute(
            f"UPDATE pipeline_status SET {', '.join(fields)} WHERE id=?", vals
        )

def get_pipeline_status():
    with db() as conn:
        row = conn.execute("SELECT * FROM pipeline_status WHERE id=1").fetchone()
    return dict(row) if row else {}
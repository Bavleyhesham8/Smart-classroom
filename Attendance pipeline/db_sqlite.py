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

DB_PATH = os.path.join(BASE_DIR, "classroom.db")


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
    """Create all tables if they don't exist. Safe to call on every startup."""
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            student_id    TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            enrolled_date TEXT NOT NULL,
            embedding     BLOB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attendance_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id    TEXT NOT NULL,
            name          TEXT NOT NULL,
            date          TEXT NOT NULL,
            first_seen    TEXT NOT NULL,
            last_seen     TEXT NOT NULL,
            duration_min  REAL DEFAULT 0,
            status        TEXT DEFAULT 'Present',
            UNIQUE(student_id, date)
        );

        CREATE TABLE IF NOT EXISTS strangers (
            stranger_id         TEXT PRIMARY KEY,
            first_seen          TEXT NOT NULL,
            last_seen           TEXT NOT NULL,
            total_duration_sec  REAL DEFAULT 0,
            total_appearances   INT  DEFAULT 1,
            image_path          TEXT DEFAULT '',
            status              TEXT DEFAULT 'unknown',
            notes               TEXT DEFAULT '',
            embedding           BLOB
        );

        CREATE TABLE IF NOT EXISTS pipeline_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type  TEXT NOT NULL,
            payload     TEXT NOT NULL,
            timestamp   TEXT NOT NULL,
            consumed    INT  DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS pipeline_status (
            id                INT  PRIMARY KEY DEFAULT 1,
            running           INT  DEFAULT 0,
            fps               REAL DEFAULT 0,
            students_in_frame INT  DEFAULT 0,
            strangers_active  INT  DEFAULT 0,
            motion_level      REAL DEFAULT 0,
            last_heartbeat    TEXT DEFAULT ''
        );

        INSERT OR IGNORE INTO pipeline_status (id) VALUES (1);
        """)
    print(f"[DB] SQLite ready: {DB_PATH}")


# ── Embedding helpers ─────────────────────────────────────────────────────────

def emb_to_blob(arr: np.ndarray) -> bytes:
    return arr.astype(np.float32).tobytes()

def blob_to_emb(blob: bytes, shape) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32).reshape(shape)


# ── Students ──────────────────────────────────────────────────────────────────

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
    """Returns {student_id: np.array(3,512)} for all students."""
    with db() as conn:
        rows = conn.execute(
            "SELECT student_id, embedding FROM students"
        ).fetchall()
    result = {}
    for r in rows:
        result[r["student_id"]] = blob_to_emb(r["embedding"], (3, 512))
    return result

def save_student(student_id, name, enrolled_date, embedding_3x512):
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO students VALUES (?,?,?,?)",
            (student_id, name, enrolled_date, emb_to_blob(embedding_3x512))
        )

def delete_student(student_id: str):
    with db() as conn:
        conn.execute("DELETE FROM students WHERE student_id=?", (student_id,))

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


# ── Attendance ────────────────────────────────────────────────────────────────

def upsert_attendance(student_id, name, date, first_seen, last_seen, duration_min):
    with db() as conn:
        conn.execute("""
            INSERT INTO attendance_log
                (student_id, name, date, first_seen, last_seen, duration_min)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(student_id, date) DO UPDATE SET
                last_seen    = excluded.last_seen,
                duration_min = excluded.duration_min
        """, (student_id, name, date, first_seen, last_seen, duration_min))

def get_attendance_today():
    today = datetime.now().strftime("%Y-%m-%d")
    return get_attendance_by_date(today)

def get_attendance_by_date(date: str):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_log WHERE date=? ORDER BY first_seen",
            (date,)
        ).fetchall()
    return [dict(r) for r in rows]

def get_attendance_range(date_from: str, date_to: str):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_log WHERE date BETWEEN ? AND ? ORDER BY date, first_seen",
            (date_from, date_to)
        ).fetchall()
    return [dict(r) for r in rows]

def get_attendance_for_student(student_id: str):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_log WHERE student_id=? ORDER BY date DESC",
            (student_id,)
        ).fetchall()
    return [dict(r) for r in rows]


# ── Strangers ─────────────────────────────────────────────────────────────────

def get_all_strangers(status_filter=None):
    with db() as conn:
        if status_filter:
            rows = conn.execute(
                "SELECT stranger_id,first_seen,last_seen,total_duration_sec,"
                "total_appearances,image_path,status,notes FROM strangers "
                "WHERE status=? ORDER BY first_seen DESC",
                (status_filter,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT stranger_id,first_seen,last_seen,total_duration_sec,"
                "total_appearances,image_path,status,notes FROM strangers "
                "ORDER BY first_seen DESC"
            ).fetchall()
    return [dict(r) for r in rows]

def get_stranger(stranger_id: str):
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM strangers WHERE stranger_id=?", (stranger_id,)
        ).fetchone()
    return dict(row) if row else None

def get_stranger_embedding(stranger_id: str):
    with db() as conn:
        row = conn.execute(
            "SELECT embedding FROM strangers WHERE stranger_id=?", (stranger_id,)
        ).fetchone()
    if row and row["embedding"]:
        return blob_to_emb(row["embedding"], (512,))
    return None

def save_stranger(stranger_id, first_seen, last_seen, duration_sec,
                  appearances, image_path, status, notes, embedding):
    with db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO strangers VALUES (?,?,?,?,?,?,?,?,?)
        """, (stranger_id, first_seen, last_seen, duration_sec,
              appearances, image_path, status, notes,
              emb_to_blob(embedding) if embedding is not None else None))

def update_stranger_status(stranger_id: str, status: str, notes: str = ""):
    with db() as conn:
        conn.execute(
            "UPDATE strangers SET status=?, notes=? WHERE stranger_id=?",
            (status, notes, stranger_id)
        )

def update_stranger_sighting(stranger_id, last_seen, duration_sec,
                              appearances, embedding=None):
    with db() as conn:
        if embedding is not None:
            conn.execute("""
                UPDATE strangers SET
                    last_seen=?, total_duration_sec=?,
                    total_appearances=?, embedding=?
                WHERE stranger_id=?
            """, (last_seen, duration_sec, appearances,
                  emb_to_blob(embedding), stranger_id))
        else:
            conn.execute("""
                UPDATE strangers SET
                    last_seen=?, total_duration_sec=?, total_appearances=?
                WHERE stranger_id=?
            """, (last_seen, duration_sec, appearances, stranger_id))

def delete_stranger(stranger_id: str):
    with db() as conn:
        conn.execute("DELETE FROM strangers WHERE stranger_id=?", (stranger_id,))

def get_all_stranger_embeddings():
    """Returns {stranger_id: np.array(512,)} for matching."""
    with db() as conn:
        rows = conn.execute(
            "SELECT stranger_id, embedding FROM strangers WHERE embedding IS NOT NULL"
        ).fetchall()
    result = {}
    for r in rows:
        result[r["stranger_id"]] = blob_to_emb(r["embedding"], (512,))
    return result

def next_stranger_id():
    with db() as conn:
        rows = conn.execute(
            "SELECT stranger_id FROM strangers WHERE stranger_id LIKE 'STR%'"
        ).fetchall()
    nums = []
    for r in rows:
        sid = r["stranger_id"]
        if sid[3:].isdigit():
            nums.append(int(sid[3:]))
    return f"STR{(max(nums)+1):03d}" if nums else "STR001"


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
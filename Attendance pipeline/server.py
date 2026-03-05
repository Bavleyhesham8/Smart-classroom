"""
FastAPI server — bridge between CV system and web frontend.
Run alongside the CV pipeline:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Endpoints match exactly what is documented in INTEGRATION_SPEC.md
"""
import os
import json
import asyncio
import threading
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

import db_sqlite as db
from config import BASE_DIR, ATT_DIR, STR_IMG
from database import StudentDatabase

app = FastAPI(title="Smart Classroom CV API", version="1.0")

# Allow all origins — restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve stranger face images as static files
app.mount("/static/strangers/images",
          StaticFiles(directory=STR_IMG), name="stranger_images")

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    db.init_db()
    print("[Server] FastAPI ready")


# ── WebSocket connection manager ──────────────────────────────────────────────

class WSManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections.remove(ws)

ws_manager = WSManager()

# Background task: poll pipeline_events table and push to WebSocket clients
async def event_broadcaster():
    while True:
        await asyncio.sleep(0.5)
        events = db.get_pending_events()
        if events:
            ids = [e["id"] for e in events]
            for e in events:
                await ws_manager.broadcast({
                    "event_type": e["event_type"],
                    "timestamp":  e["timestamp"],
                    "payload":    json.loads(e["payload"]),
                })
            db.consume_events(ids)

@app.on_event("startup")
async def start_broadcaster():
    asyncio.create_task(event_broadcaster())

@app.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()   # keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


# ── Pipeline control ──────────────────────────────────────────────────────────

_pipeline_thread = None
_pipeline_stop_event = threading.Event()

@app.post("/api/pipeline/start")
def pipeline_start():
    global _pipeline_thread, _pipeline_stop_event
    status = db.get_pipeline_status()
    if status.get("running"):
        raise HTTPException(400, "Pipeline already running")

    _pipeline_stop_event.clear()

    def run():
        from main_pipeline import run_pipeline
        run_pipeline(stop_event=_pipeline_stop_event, headless=True)

    _pipeline_thread = threading.Thread(target=run, daemon=True)
    _pipeline_thread.start()
    db.update_pipeline_status(running=True)
    return {"status": "started"}

@app.post("/api/pipeline/stop")
def pipeline_stop():
    global _pipeline_stop_event
    _pipeline_stop_event.set()
    db.update_pipeline_status(running=False)
    return {"status": "stopped"}

@app.get("/api/pipeline/status")
def pipeline_status():
    return db.get_pipeline_status()


# ── Live MJPEG stream ─────────────────────────────────────────────────────────

# CV pipeline writes latest annotated frame here
_latest_frame_jpg: bytes = b""
_frame_lock = threading.Lock()

def update_stream_frame(jpg_bytes: bytes):
    """Called by main_pipeline.py every frame to update stream."""
    global _latest_frame_jpg
    with _frame_lock:
        _latest_frame_jpg = jpg_bytes

def _mjpeg_generator():
    import time
    while True:
        with _frame_lock:
            frame = _latest_frame_jpg
        if frame:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
        time.sleep(1/30)

@app.get("/stream")
def live_stream():
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ── Enrollment ────────────────────────────────────────────────────────────────

_enroll_status = {"stage": "idle", "progress": 0, "name": ""}
_enroll_lock   = threading.Lock()

class EnrollRequest(BaseModel):
    name: str

@app.post("/api/enroll/start")
def enroll_start(req: EnrollRequest):
    global _enroll_status
    with _enroll_lock:
        if _enroll_status["stage"] not in ("idle", "done", "cancelled"):
            raise HTTPException(400, "Enrollment already in progress")
        
        # Check if pipeline is running and stop it (need camera)
        status = db.get_pipeline_status()
        if status.get("running"):
            pipeline_stop()
            import time
            time.sleep(1.5) # Wait for camera release

        _enroll_status = {"stage": "starting", "progress": 0, "name": req.name}

    def run():
        from enrollment import run_enrollment_headless
        run_enrollment_headless(req.name, _enroll_status, _enroll_lock, 
                                update_frame_cb=update_stream_frame)

    threading.Thread(target=run, daemon=True).start()
    return {"status": "started", "name": req.name}

@app.get("/api/enroll/status")
def enroll_status():
    with _enroll_lock:
        return dict(_enroll_status)

class WebEnrollRequest(BaseModel):
    name: str
    images: list[str]  # Base64 encoded images

@app.post("/api/enroll/web")
def enroll_web(req: WebEnrollRequest):
    if len(req.images) < 1:
        raise HTTPException(400, "At least 1 image is required")

    import base64
    import cv2
    import numpy as np
    from face_engine import FaceEngine
    
    engine = FaceEngine()
    crops = []
    
    for count, b64_img in enumerate(req.images):
        try:
            if ',' in b64_img:
                b64_img = b64_img.split(',', 1)[1]
            img_data = base64.b64decode(b64_img)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            face = engine.largest_face(frame)
            if not face:
                raise HTTPException(400, f"No face detected in capture #{count+1}")
            crops.append(face.embedding)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Error processing image {count+1}: {e}")
            
    # Typically 3 captures. If fewer, duplicate the last capture's embedding to make 3 (for the (3, 512) DB schema)
    while len(crops) < 3:
        crops.append(crops[-1])
        
    emb_arr = np.stack(crops[:3]).astype(np.float32)

    # Save to SQLite (db_sqlite)
    sid = db.next_student_id()
    db.save_student(sid, req.name, datetime.now().isoformat(timespec="seconds"), emb_arr)
    
    # Also save to legacy StudentDatabase (CSV/NPZ) for recognition pipeline
    try:
        legacy_db = StudentDatabase()
        # StudentDatabase.enroll(name, embeddings_3) handles ID generation internally using its own logic
        # But we want to keep IDs synced, so we manually update its dicts
        legacy_db.students[sid] = {
            "name":          req.name,
            "enrolled_date": datetime.now().isoformat(timespec="seconds"),
        }
        legacy_db.embeddings[sid] = emb_arr
        legacy_db.save()
    except Exception as e:
        print(f"Error saving to legacy database: {e}")

    db.push_event("student_enrolled_web", {
        "student_id": sid, "name": req.name
    })

    return {"status": "enrolled", "student_id": sid, "name": req.name}

# ── Students ──────────────────────────────────────────────────────────────────

@app.get("/api/students")
def list_students():
    return db.get_all_students()

@app.get("/api/students/{student_id}")
def get_student(student_id: str):
    s = db.get_student(student_id)
    if not s:
        raise HTTPException(404, f"Student {student_id} not found")
    return s

@app.delete("/api/students/{student_id}")
def delete_student(student_id: str):
    if not db.get_student(student_id):
        raise HTTPException(404, f"Student {student_id} not found")
    db.delete_student(student_id)
    return {"status": "deleted", "student_id": student_id}


# ── Attendance ────────────────────────────────────────────────────────────────

@app.get("/api/attendance/today")
def attendance_today():
    return db.get_attendance_today()

@app.get("/api/attendance/{date}")
def attendance_by_date(date: str):
    return db.get_attendance_by_date(date)

@app.get("/api/attendance/range/{date_from}/{date_to}")
def attendance_range(date_from: str, date_to: str):
    return db.get_attendance_range(date_from, date_to)

@app.get("/api/attendance/student/{student_id}")
def attendance_for_student(student_id: str):
    return db.get_attendance_for_student(student_id)

@app.get("/api/attendance/export/{date}")
def attendance_export(date: str):
    import csv, io
    records = db.get_attendance_by_date(date)
    output  = io.StringIO()
    writer  = csv.DictWriter(output, fieldnames=[
        "student_id","name","date","first_seen","last_seen","duration_min","status"
    ])
    writer.writeheader()
    writer.writerows(records)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{date}.csv"}
    )


# ── Strangers ─────────────────────────────────────────────────────────────────

@app.get("/api/strangers")
def list_strangers(status: Optional[str] = None):
    return db.get_all_strangers(status_filter=status)

@app.get("/api/strangers/{stranger_id}")
def get_stranger(stranger_id: str):
    s = db.get_stranger(stranger_id)
    if not s:
        raise HTTPException(404, f"Stranger {stranger_id} not found")
    s.pop("embedding", None)   # never expose raw embeddings to web
    return s

class SafeRequest(BaseModel):
    notes: str = ""

@app.post("/api/strangers/{stranger_id}/safe")
def mark_safe(stranger_id: str, req: SafeRequest):
    if not db.get_stranger(stranger_id):
        raise HTTPException(404)
    db.update_stranger_status(stranger_id, "safe", req.notes)
    return {"status": "updated", "stranger_id": stranger_id}

class EnrollStrangerRequest(BaseModel):
    name: str

@app.post("/api/strangers/{stranger_id}/enroll")
def enroll_stranger(stranger_id: str, req: EnrollStrangerRequest):
    emb = db.get_stranger_embedding(stranger_id)
    if emb is None:
        raise HTTPException(400, "No embedding found for this stranger")
    import numpy as np
    emb_3 = np.stack([emb, emb, emb]).astype(np.float32)
    sid   = db.next_student_id()
    db.save_student(sid, req.name,
                    datetime.now().isoformat(timespec="seconds"), emb_3)
    db.update_stranger_status(stranger_id, "enrolled", f"Enrolled as {sid}")
    db.push_event("student_enrolled_from_stranger", {
        "student_id": sid, "name": req.name,
        "stranger_id": stranger_id
    })
    return {"status": "enrolled", "student_id": sid, "name": req.name}

@app.delete("/api/strangers/{stranger_id}")
def delete_stranger(stranger_id: str):
    s = db.get_stranger(stranger_id)
    if not s:
        raise HTTPException(404)
    # Delete images
    img_dir = STR_IMG
    for fname in os.listdir(img_dir):
        if fname.startswith(stranger_id):
            try:
                os.remove(os.path.join(img_dir, fname))
            except Exception:
                pass
    db.delete_stranger(stranger_id)
    return {"status": "deleted", "stranger_id": stranger_id}


# ── Events (polling fallback for web backends without WS) ────────────────────

@app.get("/api/events/pending")
def pending_events():
    return db.get_pending_events()

class ConsumeRequest(BaseModel):
    ids: list[int]

@app.post("/api/events/consume")
def consume_events(req: ConsumeRequest):
    db.consume_events(req.ids)
    return {"status": "consumed", "count": len(req.ids)}
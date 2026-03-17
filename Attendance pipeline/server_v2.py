import os
import json
import asyncio
import threading
import base64
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import models_v2 as models
import schemas_v2 as schemas
import crud_v2 as crud
import cv2
import numpy as np
from fastapi.responses import StreamingResponse
import queue
from typing import List, Optional, Union
from database_v2 import engine, get_db, init_db_v2
from config import BASE_DIR, STR_IMG
import crud_v2 as crud
import schemas_v2 as schemas
import models_v2 as models
from face_engine import FaceEngine
from database import StudentDatabase

# Initialize DB
init_db_v2()

# Global AI Engine
face_engine = FaceEngine()
legacy_db = StudentDatabase()

app = FastAPI(title="SmartClass V2 API")

# Pipeline state
_pipeline_thread = None
_pipeline_stop_event = threading.Lock() # Using a lock to prevent concurrent start/stop
_pipeline_running = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager per plan
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()
video_queue = queue.Queue(maxsize=10)
_last_stream_access = datetime.now()

def update_stream_frame(jpg_bytes: bytes):
    """Called by main_pipeline.py every frame to update stream."""
    global _last_stream_access
    # Check if we should stop the pipeline due to inactivity
    # (e.g. if no one has requested the stream for 60 seconds)
    if (datetime.now() - _last_stream_access).total_seconds() > 60:
        if _pipeline_active:
            print("[Auto-Stop] No stream viewers for 60s. Stopping pipeline...")
            pipeline_stop()
        return

    if video_queue.full():
        try: video_queue.get_nowait()
        except: pass
    video_queue.put(jpg_bytes)

def gen_frames():
    global _last_stream_access
    while True:
        _last_stream_access = datetime.now()
        try:
            # Short timeout to keep loop responsive
            frame = video_queue.get(timeout=0.5)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        except queue.Empty:
            # If queue is empty, we could yield a "Waiting for stream..." image
            # For now just continue to keep the connection alive
            continue

@app.get("/stream")
async def video_stream():
    print(f"[Stream] New viewer connected at {datetime.now()}")
    return StreamingResponse(gen_frames(),
                             media_type='multipart/x-mixed-replace; boundary=frame')

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=req.email)
    if not user or user.password_hash != req.password: # Plain text for mock simplicity
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.status == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending approval by an administrator.")
    if user.status == "rejected":
        raise HTTPException(status_code=403, detail="Your account has been rejected. Please contact support.")

    # In a real app, generate a JWT. For now, returning mock token.
    token = "v2_mock_token_" + str(user.id)
    return {
        "token": token,
        "user": {
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "childId": user.child_id,
            "theme_preference": user.theme_preference,
            "status": user.status
        },
        "needsProfileCompletion": (user.role == "parent" and not user.child_id)
    }

@app.patch("/api/users/theme")
def update_theme(req: dict, db: Session = Depends(get_db)):
    # In a real app, get user_id from token
    email = req.get("email")
    theme = req.get("theme")
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404)
    user.theme_preference = theme
    db.commit()
    return {"status": "success", "theme": theme}

@app.patch("/api/users/link-child")
def link_child(req: dict, db: Session = Depends(get_db)):
    email = req.get("email")
    child_id = req.get("child_id")
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.child_id = child_id
    db.commit()
    return {"status": "success", "childId": child_id}

# ── Students ──────────────────────────────────────────────────────────────────

@app.get("/api/students", response_model=List[schemas.StudentBase])
def list_students(db: Session = Depends(get_db)):
    return crud.get_students(db)

@app.get("/api/students/{student_id}", response_model=schemas.StudentDetail)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.get_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Mock additional data for now to match frontend expectations
    return {
        **student.__dict__,
        "attendance": [],
        "performance": {"quizzes": [], "homework": [], "handRaises": 0},
        "engagement": [],
        "parentContact": {"name": "Contact", "phone": "", "email": ""},
        "feeStatus": {"status": "Paid", "progress": 100}
    }

@app.patch("/api/students/{student_id}/photo")
@app.post("/api/students/{student_id}/photo")
def update_student_photo(student_id: str, req: dict, db: Session = Depends(get_db)):
    student = crud.get_student(db, student_id=student_id)
    if not student:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.profile_image_b64 = req.get("image_b64")
    db.commit()
    return {"status": "success"}

@app.delete("/api/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.delete_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"status": "success", "message": "Student deleted"}

@app.patch("/api/students/{student_id}/deactivate")
def deactivate_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.deactivate_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404)
    return {"status": "success"}

# ── Attendance ────────────────────────────────────────────────────────────────

@app.post("/api/attendance/override")
async def attendance_override(req: schemas.AttendanceOverrideRequest, db: Session = Depends(get_db)):
    log = crud.update_attendance(db, req.studentId, req.date, req.status)
    # Broadcast update to all dashboards
    await manager.broadcast({
        "type": "attendance_update",
        "payload": {
            "student_id": req.studentId,
            "date": req.date,
            "status": req.status,
            "time": datetime.now().strftime("%I:%M %p")
        }
    })
    return {"success": True}

# ── Reports ───────────────────────────────────────────────────────────────────

@app.get("/api/reports")
def list_reports(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_reports(db, student_id=student_id)

@app.post("/api/reports")
def create_report(req: dict, db: Session = Depends(get_db)):
    # In real app, get teacher_id from token
    student_id = req.get("studentId")
    teacher_id = req.get("teacherId", 1) # Default for mock
    subject = req.get("subject")
    content = req.get("content")
    report = crud.create_report(db, student_id, teacher_id, subject, content)
    # Broadcast new report to Admin & Teacher dashboards
    asyncio.create_task(manager.broadcast({
        "type": "report_new",
        "payload": {
            "id": report.id,
            "student_id": report.student_id,
            "subject": report.subject,
            "status": report.status,
            "date": report.date
        }
    }))
    return report

@app.patch("/api/reports/{report_id}/status")
async def update_report_status(report_id: int, req: dict, db: Session = Depends(get_db)):
    status = req.get("status")
    log_action = req.get("log_action")
    report = crud.update_report_status(db, report_id, status, log_action)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Broadcast update to all connected clients
    await manager.broadcast({
        "type": "report_update",
        "payload": {
            "id": report.id,
            "status": report.status,
            "audit_log": report.audit_log
        }
    })
    return report

@app.get("/api/teacher/data")
def get_teacher_data(user_id: int = 1, db: Session = Depends(get_db)):
    teacher = crud.get_teacher_by_user_id(db, user_id=user_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    classes = crud.get_classes_by_teacher(db, teacher_id=teacher.id)
    # Match frontend mock data structure
    schedule = []
    if classes:
        schedule = classes[0].schedule # Return first class schedule as mock
    return {
        "teacher": {"name": teacher.user.name, "subject": teacher.subject},
        "schedule": schedule,
        "performance": {
            "strengths": ["Active Participation", "Analytical Thinking", "Group Collaboration"],
            "weaknesses": ["Time Management", "Complex Documentation"],
            "avgEngagement": 88
        }
    }

@app.get("/api/teacher/schedule")
def get_teacher_schedule(user_id: int = 1, db: Session = Depends(get_db)):
    res = get_teacher_data(user_id, db)
    return res["schedule"]

@app.delete("/api/teacher/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = crud.delete_teacher(db, teacher_id=teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"status": "success", "message": "Teacher deleted"}

@app.patch("/api/teacher/{teacher_id}/deactivate")
def deactivate_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = crud.deactivate_teacher(db, teacher_id=teacher_id)
    if not teacher:
        raise HTTPException(status_code=404)
    return {"status": "success"}

@app.post("/api/teacher/{teacher_id}/photo")
def update_teacher_photo(teacher_id: int, req: dict, db: Session = Depends(get_db)):
    teacher = crud.get_teacher(db, teacher_id=teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.user.photo = req.get("image_b64")
    db.commit()
    return {"status": "success"}

# ── Admin / Users ─────────────────────────────────────────────────────────────

@app.get("/api/users/pending")
def list_pending_users(db: Session = Depends(get_db)):
    return crud.get_pending_users(db)

@app.post("/api/users/approve")
def approve_user(req: dict, db: Session = Depends(get_db)):
    user_id = req.get("userId")
    user = crud.update_user_status(db, user_id=user_id, status="approved")
    if not user:
        raise HTTPException(404)
    return {"status": "success"}


@app.post("/api/users/reject")
def reject_user(req: dict, db: Session = Depends(get_db)):
    user_id = req.get("userId")
    user = crud.update_user_status(db, user_id=user_id, status="rejected")
    if not user:
        raise HTTPException(404)
    return {"status": "success"}

# ── Pending Changes (Admin Approval) ──────────────────────────────────────────

@app.get("/api/changes/pending")
def list_pending_changes(db: Session = Depends(get_db)):
    changes = crud.get_pending_changes(db)
    # Simplify for frontend Mock matching
    return [
        {
            "id": c.id,
            "type": c.type,
            "payload": c.payload,
            "requested_by": c.requested_by,
            "created_at": c.created_at.isoformat(),
            "status": c.status
        }
        for c in changes
    ]

@app.post("/api/changes/{change_id}/approve")
def approve_change(change_id: int, db: Session = Depends(get_db)):
    change = crud.approve_pending_change(db, change_id=change_id)
    if not change:
        raise HTTPException(404, "Change not found or not pending")
    return {"status": "success", "change_id": change.id}

@app.post("/api/changes/{change_id}/reject")
def reject_change(change_id: int, db: Session = Depends(get_db)):
    change = crud.reject_pending_change(db, change_id=change_id)
    if not change:
        raise HTTPException(404, "Change not found or not pending")
    return {"status": "success", "change_id": change.id}

# ── Pipeline Control ──────────────────────────────────────────────────────────

_pipeline_active = False
_stop_event = threading.Event()

@app.post("/api/pipeline/start")
async def pipeline_start():
    global _pipeline_thread, _stop_event, _pipeline_active
    
    # Check if anything is already using the camera/port
    # We rely on main_pipeline's own error handling for camera index
    if _pipeline_active:
        raise HTTPException(400, "Pipeline is already running")

    _stop_event.clear()
    
    def run_task():
        global _pipeline_active, _last_stream_access
        _last_stream_access = datetime.now() # Reset timer on start
        
        try:
            _pipeline_active = True
            # CRITICAL: We monkeypatch the function in the main_pipeline module
            # so the loop uses our queue instead of the old server.
            import main_pipeline
            main_pipeline.update_stream_frame = update_stream_frame
            print("[Pipeline] Starting core with monkeypatched stream...")
            main_pipeline.run_pipeline(stop_event=_stop_event, headless=True)
        finally:
            _pipeline_active = False
            print("[Pipeline] Core stopped and camera released.")

    _pipeline_thread = threading.Thread(target=run_task, daemon=True)
    _pipeline_thread.start()
    return {"status": "started"}

@app.post("/api/pipeline/stop")
def pipeline_stop():
    global _stop_event
    _stop_event.set()
    return {"status": "stopped"}

@app.get("/api/pipeline/status")
def pipeline_status():
    return {"running": _pipeline_active}

# ── Classes & Schedules (Auto-Enrollment & Approvals) ─────────────────────────

@app.post("/api/classes/assign")
def assign_class(req: dict, db: Session = Depends(get_db)):
    teacher_id = req.get("teacher_id")
    class_name = req.get("class_name")
    
    if not teacher_id or not class_name:
        raise HTTPException(400, "Missing teacher_id or class_name")
        
    # Auto-generate schedule
    schedule = [
        f"{class_name} Session (Mon 9:00 AM - 10:30 AM)", 
        f"{class_name} Lab (Wed 2:00 PM - 3:30 PM)"
    ]
    
    db_class = models.Class(teacher_id=teacher_id, name=class_name, schedule=schedule)
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return {"status": "success", "class_id": db_class.id, "schedule": schedule}

@app.post("/api/teacher/schedule/edit")
def edit_schedule(req: dict, db: Session = Depends(get_db)):
    teacher_id = req.get("teacher_id")
    new_schedule = req.get("schedule")
    
    if not teacher_id or not new_schedule:
        raise HTTPException(400, "Missing teacher_id or schedule")
        
    change = models.PendingChange(
        type="class_schedule",
        payload={"teacher_id": teacher_id, "new_schedule": new_schedule},
        requested_by=teacher_id,
        status="pending"
    )
    db.add(change)
    db.commit()
    return {"status": "pending_approval", "change_id": change.id}

# ── Strangers & Alerts ─────────────────────────────────────────────────────────


@app.post("/api/alerts/stranger")
async def stranger_detected(req: dict, db: Session = Depends(get_db)):
    # This endpoint is called by the CV pipeline
    stranger_id = req.get("stranger_id")
    image_b64 = req.get("image_b64")
    
    # 1. Create Stranger record
    stranger = crud.create_stranger(db, stranger_id, image_b64, datetime.now())
    
    # 2. Create Alert record
    alert = crud.create_alert(db, stranger_id, "stranger", f"Unknown person detected: {stranger_id}")
    
    # 3. Broadcast to WebSockets
    await manager.broadcast({
        "type": "stranger_alert",
        "timestamp": datetime.now().isoformat(),
        "payload": {
            "stranger_id": stranger_id,
            "image": image_b64,
            "message": f"Unknown person detected in classroom!"
        }
    })
    
    # 4. Mock Email to teacher (placeholder)
    print(f"MOCK EMAIL: Unknown person {stranger_id} detected.")
    
    return {"status": "received"}

@app.get("/api/alerts", response_model=List[schemas.AlertResponse])
def list_alerts(db: Session = Depends(get_db)):
    return crud.get_alerts(db)

# ── Enrollment (Legacy bridge) ────────────────────────────────────────────────

_enroll_status = {"stage": "idle", "progress": 0, "name": ""}
_enroll_lock   = threading.Lock()

@app.post("/api/enroll/start")
def enroll_start(req: dict):
    global _enroll_status
    with _enroll_lock:
        if _enroll_status["stage"] not in ("idle", "done", "cancelled", "error"):
            raise HTTPException(400, "Enrollment already in progress")
        _enroll_status = {"stage": "starting", "progress": 0, "name": req.get("name")}

    def run():
        # This would need to be updated to use the new DB session
        from enrollment import run_enrollment_headless
        
        def update_frame(frame_bytes):
            if video_queue.full():
                try: video_queue.get_nowait()
                except: pass
            video_queue.put(frame_bytes)

        run_enrollment_headless(req.get("name"), _enroll_status, _enroll_lock, update_frame_cb=update_frame)

    threading.Thread(target=run, daemon=True).start()
    return {"status": "started"}

@app.get("/api/enroll/status")
def enroll_status_get():
    with _enroll_lock:
        return dict(_enroll_status)

@app.post("/api/enroll/web")
def enroll_web(req: dict, db: Session = Depends(get_db)):
    name = req.get("name")
    email = req.get("email") # Get user email to link
    images = req.get("images", []) # List[b64]
    
    if not images or len(images) < 1:
        raise HTTPException(400, "At least one image required for enrollment")
        
    # Process images with real FaceEngine to get embeddings
    embeddings = []
    processed_images = []
    
    for img_b64 in images:
        try:
            # Decode b64
            header, encoded = img_b64.split(",", 1) if "," in img_b64 else (None, img_b64)
            img_data = base64.b64decode(encoded)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None: continue
            
            # Use real FaceEngine
            face = face_engine.largest_face(frame)
            if face:
                embeddings.append(face.embedding)
                processed_images.append(img_b64) # Keep the one that worked
        except Exception as e:
            print(f"Error processing enrollment image: {e}")
            continue

    if not embeddings:
        raise HTTPException(400, "Could not detect a clear face. Please try again.")

    emb_stack = np.stack(embeddings[:3] if len(embeddings) >= 3 else [embeddings[0]]*3)
    
    # 0. Check Duplicate
    is_dup, dup_sid, dup_name, _ = legacy_db.check_duplicate(emb_stack)
    if is_dup:
        raise HTTPException(400, f"Face already enrolled: {dup_name} ({dup_sid})")

    # We take up to 3 for legacy sync (front, right, left)
    # If we have less, we duplicate the first one for the angles
    final_embs = []
    for i in range(3):
        if i < len(embeddings):
            final_embs.append(embeddings[i])
        else:
            final_embs.append(embeddings[0])
    
    emb_stack = np.stack(final_embs) # (3, 512)
    
    # 1. Save to New SQLAlchemy DB (SQLITE/POSTGRES)
    sid = "S" + datetime.now().strftime("%H%M%S")
    db_student = models.Student(
        student_id=sid,
        name=name,
        profile_image_b64=processed_images[0],
        enrolled_date=datetime.now()
    )
    db.add(db_student)
    db.commit()
    
    for i, angle in enumerate(["front", "right", "left"]):
        db_emb = models.FaceEmbedding(
            student_id=sid,
            embedding=final_embs[i].tobytes(),
            angle=angle
        )
        db.add(db_emb)
    db.commit()
    
    # 3. LINK TO USER
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.child_id = sid
            db.commit()
            print(f"[Enroll] Linked student {sid} to user {email}")
    
    # 3. LINK TO USER
    if email:
        target_user = db.query(models.User).filter(models.User.email == email).first()
        if target_user:
            target_user.child_id = sid
            db.commit()
            print(f"[Sync] Linked student {sid} to parent {email}")

    # 2. SYNC TO LEGACY DATABASE
    try:
        legacy_db.enroll(name, emb_stack)
        print(f"[Sync] Saved {name} to legacy database.")
    except Exception as e:
        print(f"[Sync] Warning: Failed to sync to legacy DB: {e}")
    
    return {"status": "enrolled", "student_id": sid, "name": name}

# Static files
if not os.path.exists(STR_IMG):
    os.makedirs(STR_IMG)
app.mount("/static/strangers", StaticFiles(directory=STR_IMG), name="strangers")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

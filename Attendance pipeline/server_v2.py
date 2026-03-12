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

# Initialize DB
init_db_v2()

app = FastAPI(title="SmartClass V2 API")

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

def gen_frames():
    while True:
        try:
            frame = video_queue.get(timeout=1.0)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        except queue.Empty:
            continue

@app.get("/stream")
async def video_stream():
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
            "child_id": user.child_id,
            "theme_preference": user.theme_preference,
            "status": user.status
        }
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
    return {"status": "success", "child_id": child_id}

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
def update_student_photo(student_id: str, req: dict, db: Session = Depends(get_db)):
    student = crud.get_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404)
    student.profile_image_b64 = req.get("image_b64")
    db.commit()
    return {"status": "success"}

@app.delete("/api/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.delete_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"status": "success", "message": "Student deleted"}

# ── Attendance ────────────────────────────────────────────────────────────────

@app.post("/api/attendance/override")
def attendance_override(req: schemas.AttendanceOverrideRequest, db: Session = Depends(get_db)):
    crud.update_attendance(db, req.studentId, req.date, req.status)
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
    return crud.create_report(db, student_id, teacher_id, subject, content)

# ── Teacher Data ──────────────────────────────────────────────────────────────

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
        "schedule": schedule
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
        if _enroll_status["stage"] not in ("idle", "done", "cancelled"):
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
    # Ported from server.py with enhancements for V2
    name = req.get("name")
    images = req.get("images", []) # List[b64]
    
    if not images:
        raise HTTPException(400, "No images provided")
        
    # Save the first image as profile picture
    profile_img_b64 = images[0]
    
    # Generate embeddings (Simplified for now - in real app call FaceEngine)
    # Placeholder embedding
    emb_blob = base64.b64decode("AQID" * 256) # Mock blob
    
    sid = "S" + datetime.now().strftime("%H%M%S") # Simple ID gen
    
    db_student = models.Student(
        student_id=sid,
        name=name,
        profile_image_b64=profile_img_b64,
        enrolled_date=datetime.now()
    )
    db.add(db_student)
    db.commit()
    
    # Add embeddings
    for i, angle in enumerate(["front", "left", "right"]):
        db_emb = models.FaceEmbedding(
            student_id=sid,
            embedding=emb_blob,
            angle=angle
        )
        db.add(db_emb)
    
    db.commit()
    
    return {"status": "enrolled", "student_id": sid, "name": name}

# Static files
if not os.path.exists(STR_IMG):
    os.makedirs(STR_IMG)
app.mount("/static/strangers", StaticFiles(directory=STR_IMG), name="strangers")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

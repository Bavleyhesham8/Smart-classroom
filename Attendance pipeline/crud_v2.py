from sqlalchemy.orm import Session
from sqlalchemy import or_
import models_v2 as models
import schemas_v2 as schemas
from datetime import datetime

# Auth
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# Students
def get_students(db: Session):
    return db.query(models.Student).all()

def get_student(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()

def create_student(db: Session, student: schemas.StudentBase):
    db_student = models.Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: str):
    db_student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if db_student:
        db.delete(db_student)
        db.commit()
    return db_student

# Attendance
def get_attendance_log(db: Session, student_id: str = None, date: str = None):
    query = db.query(models.AttendanceLog)
    if student_id:
        query = query.filter(models.AttendanceLog.student_id == student_id)
    if date:
        query = query.filter(models.AttendanceLog.date == date)
    return query.all()

def update_attendance(db: Session, student_id: str, date: str, status: str):
    log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.student_id == student_id,
        models.AttendanceLog.date == date
    ).first()
    if log:
        log.status = status
    else:
        log = models.AttendanceLog(student_id=student_id, date=date, status=status)
        db.add(log)
    db.commit()
    db.refresh(log)
    return log

# Reports
def get_reports(db: Session, student_id: str = None):
    query = db.query(models.Report)
    if student_id:
        query = query.filter(models.Report.student_id == student_id)
    return query.all()

def create_report(db: Session, student_id: str, teacher_id: int, subject: str, content: str):
    db_report = models.Report(
        student_id=student_id,
        teacher_id=teacher_id,
        subject=subject,
        content=content,
        date=datetime.now().strftime("%Y-%m-%d"),
        status="Pending Approval",
        audit_log=[{"date": datetime.now().isoformat(), "action": "Submitted by Teacher"}]
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

# Strangers
def get_strangers(db: Session):
    return db.query(models.Stranger).all()

def create_stranger(db: Session, stranger_id: str, image_b64: str, appearance_time: datetime):
    db_stranger = models.Stranger(
        id=stranger_id, 
        image_base64=image_b64, 
        appearance_time=appearance_time
    )
    db.add(db_stranger)
    db.commit()
    db.refresh(db_stranger)
    return db_stranger

# Alerts
def create_alert(db: Session, stranger_id: str, alert_type: str, message: str):
    db_alert = models.Alert(
        stranger_id=stranger_id,
        type=alert_type,
        message=message
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alerts(db: Session):
    return db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()

# Teachers & Classes
def get_teacher_by_user_id(db: Session, user_id: int):
    return db.query(models.Teacher).filter(models.Teacher.user_id == user_id).first()

def get_classes_by_teacher(db: Session, teacher_id: int):
    return db.query(models.Class).filter(models.Class.teacher_id == teacher_id).all()

def delete_teacher(db: Session, teacher_id: int):
    db_teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if db_teacher:
        db.delete(db_teacher)
        db.commit()
    return db_teacher

# ── Pending Changes (Workflow) ──────────────────────────

def get_pending_changes(db: Session):
    return db.query(models.PendingChange).filter(models.PendingChange.status == "pending").all()

def approve_pending_change(db: Session, change_id: int):
    change = db.query(models.PendingChange).filter(models.PendingChange.id == change_id).first()
    if change and change.status == "pending":
        change.status = "approved"
        # In a full system, we would apply `change.payload` to the actual Class schedule here
        db.commit()
        db.refresh(change)
    return change

def reject_pending_change(db: Session, change_id: int):
    change = db.query(models.PendingChange).filter(models.PendingChange.id == change_id).first()
    if change and change.status == "pending":
        change.status = "rejected"
        db.commit()
        db.refresh(change)
    return change
# User Management (Admin)
def get_pending_users(db: Session):
    return db.query(models.User).filter(models.User.status == "pending").all()

def update_user_status(db: Session, user_id: int, status: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.status = status
        db.commit()
    return user

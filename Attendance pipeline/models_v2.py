from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, LargeBinary, Boolean, Text
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # admin, teacher, parent
    name = Column(String, nullable=False)
    child_id = Column(String, ForeignKey("students.student_id"), nullable=True)
    theme_preference = Column(String, default="light")
    status = Column(String, default="approved") # approved, pending, rejected
    
    student = relationship("Student", foreign_keys=[child_id], back_populates="parent_user")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)

class Student(Base):
    __tablename__ = "students"
    
    student_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    enrolled_date = Column(DateTime, default=datetime.utcnow)
    profile_image_b64 = Column(Text, nullable=True)
    class_name = Column(String, nullable=True) # Mapping to "Grade 10 - Section A" etc
    
    parent_user = relationship("User", foreign_keys=[User.child_id], back_populates="student")
    embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")
    attendance = relationship("AttendanceLog", back_populates="student")
    reports = relationship("Report", back_populates="student")
    fees = relationship("Fee", back_populates="student")

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    embedding = Column(LargeBinary, nullable=False) # blob
    angle = Column(String, nullable=False) # front, left, right
    
    student = relationship("Student", back_populates="embeddings")

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String, nullable=False)
    salary = Column(Float, default=0.0)
    
    user = relationship("User", back_populates="teacher_profile")
    classes = relationship("Class", back_populates="teacher")
    reports = relationship("Report", back_populates="teacher")

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    schedule = Column(JSON, nullable=True) # [{time, monday, tuesday...}]
    
    teacher = relationship("Teacher", back_populates="classes")
    enrollments = relationship("ClassEnrollment", back_populates="class_")

class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    status = Column(String, default="active") # active, pending
    
    class_ = relationship("Class", back_populates="enrollments")
    student = relationship("Student")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    first_seen = Column(String, nullable=True)
    last_seen = Column(String, nullable=True)
    duration_min = Column(Float, default=0.0)
    status = Column(String, default="Absent") # Present, Late, Absent
    
    student = relationship("Student", back_populates="attendance")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject = Column(String, nullable=False)
    date = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default="Pending Approval") # Sent, Pending Approval
    audit_log = Column(JSON, nullable=True) # [{date, action}]
    
    student = relationship("Student", back_populates="reports")
    teacher = relationship("Teacher", back_populates="reports")

class Stranger(Base):
    __tablename__ = "strangers"
    
    id = Column(String, primary_key=True, index=True) # STR001
    image_base64 = Column(Text, nullable=True)
    appearance_time = Column(DateTime, default=datetime.utcnow)
    recurrence_count = Column(Integer, default=1)
    duration_seconds = Column(Float, default=0.0)
    session_id = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, resolved, safe, enrolled
    notes = Column(Text, nullable=True)
    classified_as = Column(String, nullable=True)
    embedding = Column(LargeBinary, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    stranger_id = Column(String, ForeignKey("strangers.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    type = Column(String, nullable=False) # stranger, attendance, fee
    message = Column(Text, nullable=False)
    status = Column(String, default="unread") # unread, read
    created_at = Column(DateTime, default=datetime.utcnow)
    
    stranger = relationship("Stranger")

class Fee(Base):
    __tablename__ = "fees"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False)
    status = Column(String, default="Unpaid") # Paid, Unpaid, Pending
    
    student = relationship("Student", back_populates="fees")

class Salary(Base):
    __tablename__ = "salaries"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    month = Column(String, nullable=False)
    paid = Column(Boolean, default=False)
    date_paid = Column(DateTime, nullable=True)

class PendingChange(Base):
    __tablename__ = "pending_changes"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False) # class_schedule, lesson_plan, assignment
    payload = Column(JSON, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") # pending, approved, rejected

class PipelineEvent(Base):
    __tablename__ = "pipeline_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    consumed = Column(Boolean, default=False)

class PipelineStatus(Base):
    __tablename__ = "pipeline_status"
    
    id = Column(Integer, primary_key=True, default=1)
    running = Column(Boolean, default=False)
    fps = Column(Float, default=0.0)
    students_in_frame = Column(Integer, default=0)
    strangers_active = Column(Integer, default=0)
    motion_level = Column(Float, default=0.0)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)

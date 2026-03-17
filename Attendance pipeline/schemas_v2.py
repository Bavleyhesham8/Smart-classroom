from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class UserBase(BaseModel):
    name: str
    email: str
    role: str
    childId: Optional[str] = None
    theme_preference: str = "light"
    status: str = "approved"

class UserResponse(BaseModel):
    token: str
    user: UserBase

# Student Schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    enrolled_date: datetime
    class_name: Optional[str] = None
    profile_image_b64: Optional[str] = None

class StudentDetail(StudentBase):
    attendance: List[Any] = []
    performance: Optional[Any] = None
    engagement: List[Any] = []
    parentContact: Optional[Any] = None
    feeStatus: Optional[Any] = None

# Attendance Schemas
class AttendanceLogResponse(BaseModel):
    student_id: str
    date: str
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    duration_min: float
    status: str

class AttendanceOverrideRequest(BaseModel):
    studentId: str
    date: str
    status: str

# Report Schemas
class ReportResponse(BaseModel):
    id: int
    student_id: str
    teacher_id: int
    subject: str
    date: str
    content: str
    status: str
    audit_log: List[Any] = []

# Stranger Schemas
class StrangerResponse(BaseModel):
    id: str
    image_base64: Optional[str] = None
    appearance_time: datetime
    recurrence_count: int
    duration_seconds: float
    status: str
    notes: Optional[str] = None

# Alert Schemas
class AlertResponse(BaseModel):
    id: int
    stranger_id: Optional[str] = None
    type: str
    message: str
    status: str
    created_at: datetime

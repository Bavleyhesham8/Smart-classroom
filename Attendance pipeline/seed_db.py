from database_v2 import SessionLocal, init_db_v2, engine
from models_v2 import User, Student, Teacher, Class, Report, Stranger, AttendanceLog, FaceEmbedding, Base
from datetime import datetime

def seed():
    print("Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Also wipe legacy files to prevent ID conflicts
    from config import STUDENTS_CSV, EMBEDDINGS_FILE
    for f in [STUDENTS_CSV, EMBEDDINGS_FILE]:
        if os.path.exists(f):
            os.remove(f)
    
    db = SessionLocal()
    
    # 1. Teachers & Users
    t1_user = User(email="teacher@example.com", password_hash="pass123", role="teacher", name="Mr. Teacher", status="approved")
    db.add(t1_user)
    db.commit()
    
    t1 = Teacher(user_id=t1_user.id, subject="Mathematics", salary=4500.0)
    db.add(t1)
    db.commit()
    
    # 2. Students
    s1 = Student(student_id="S001", name="Alice Johnson", class_name="Math 101")
    s2 = Student(student_id="S002", name="Bob Smith", class_name="Math 101")
    s3 = Student(student_id="S003", name="Charlie Davis", class_name="Physics 202")
    db.add_all([s1, s2, s3])
    db.commit()
    
    # 3. Parents
    p1 = User(email="parent@example.com", password_hash="pass123", role="parent", name="Mrs. Parent", child_id="S001", status="approved")
    db.add(p1)
    
    # 4. Pending Users (for Admin Approval test)
    p_pending = User(email="new_parent@example.com", password_hash="pass123", role="parent", name="New Parent", status="pending")
    db.add(p_pending)
    
    # 5. Admin
    admin = User(email="admin@example.com", password_hash="pass123", role="admin", name="Admin User", status="approved")
    db.add(admin)
    db.commit()
    
    # 6. Classes
    c1 = Class(name="Math 101", teacher_id=t1.id, schedule=[
        {"time": "08:00 AM", "monday": "Math 101", "tuesday": "Office Hours", "wednesday": "Math 101", "thursday": "Prep Time", "friday": "Math 101"},
        {"time": "10:00 AM", "monday": "Algebra II", "tuesday": "Math 101", "wednesday": "Algebra II", "thursday": "Math 101", "friday": "Algebra II"},
        {"time": "01:00 PM", "monday": "Calculus", "tuesday": "Calculus", "wednesday": "Calculus", "thursday": "Calculus", "friday": "Calculus"}
    ])
    db.add(c1)
    db.commit()
    
    # 7. Reports
    r1 = Report(student_id="S001", teacher_id=t1.id, subject="Math", date="2026-03-01", content="Alice is showing great progress in Algebra.", status="Approved", 
                audit_log=[{"date": "2026-03-01T10:00:00Z", "action": "Submitted by Teacher"}, {"date": "2026-03-02T09:00:00Z", "action": "Approved by Admin"}])
    r2 = Report(student_id="S002", teacher_id=t1.id, subject="Math", date="2026-03-02", content="Bob needs to focus on his late submissions.", status="Pending Approval", 
                audit_log=[{"date": "2026-03-02T14:30:00Z", "action": "Submitted by Teacher"}])
    db.add_all([r1, r2])
    db.commit()
    
    print("Database seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed()

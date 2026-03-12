from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models_v2 import Base
import os

# Using the same classroom.db but for the new models
# In a real migration, we would use Alembic
DB_URL = "sqlite:///d:/Smart classroom/Attendance pipeline/classroom_v2.db"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db_v2():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

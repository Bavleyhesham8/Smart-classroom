from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models_v2 import Base
import os

# Using the same classroom.db but for the new models
# In a real migration, we would use Alembic
# Default to SQLite for local development, use PostgreSQL in production
DB_URL = os.getenv("DATABASE_URL", "sqlite:///classroom_v2.db")

print(f"[*] Database configuration: {DB_URL}")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db_v2():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

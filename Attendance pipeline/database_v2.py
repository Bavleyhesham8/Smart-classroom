from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models_v2 import Base
import os

# Using the same classroom.db but for the new models
# In a real migration, we would use Alembic
# Using PostgreSQL for production reliability
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/smartclass")

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db_v2():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

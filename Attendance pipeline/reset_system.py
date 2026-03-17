import os
import shutil
import sqlite3
from config import DB_DIR, STR_DIR, BASE_DIR

def reset_all():
    print("═" * 50)
    print("  SMART CLASSROOM — SYSTEM RESET")
    print("═" * 50)

    # 1. Clear SQL Database
    db_v2 = os.path.join(BASE_DIR, "classroom_v2.db")
    if os.path.exists(db_v2):
        print(f"[*] Removing SQL database: {db_v2}")
        try:
            os.remove(db_v2)
        except PermissionError:
            print("  ❌ ERROR: Could not delete classroom_v2.db. Is the server running?")
            return

    # 2. Clear Legacy Files
    to_delete = [
        os.path.join(DB_DIR, "students.csv"),
        os.path.join(DB_DIR, "embeddings.npz"),
        os.path.join(STR_DIR, "strangers.csv"),
        os.path.join(STR_DIR, "embeddings.npz")
    ]
    
    for f in to_delete:
        if os.path.exists(f):
            print(f"[*] Deleting legacy record: {f}")
            os.remove(f)

    # 3. Clear Stranger Images
    str_img_dir = os.path.join(STR_DIR, "images")
    if os.path.isdir(str_img_dir):
        print(f"[*] Cleaning visitor images: {str_img_dir}")
        shutil.rmtree(str_img_dir)
        os.makedirs(str_img_dir)

    print("\n✅ SYSTEM RESET COMPLETE!")
    print("Run 'python seed_db.py' now to start with fresh default users.")
    print("═" * 50)

if __name__ == "__main__":
    reset_all()

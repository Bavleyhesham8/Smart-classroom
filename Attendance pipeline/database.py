"""
Student database
  database/students.csv     — student_id, name, enrolled_date
  database/embeddings.npz   — key=student_id, value=np.float32(3, 512)
"""
import os
import numpy as np
import pandas as pd
from datetime import datetime
from config import STUDENTS_CSV, EMBEDDINGS_FILE, SIM_THRESHOLD, DUP_THRESHOLD


class StudentDatabase:
    def __init__(self):
        self.students:   dict = {}
        self.embeddings: dict = {}
        self._load()

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load(self):
        if os.path.exists(STUDENTS_CSV):
            df = pd.read_csv(STUDENTS_CSV, dtype=str)
            for _, r in df.iterrows():
                self.students[r["student_id"]] = {
                    "name":          r["name"],
                    "enrolled_date": r["enrolled_date"],
                }
        if os.path.exists(EMBEDDINGS_FILE):
            data = np.load(EMBEDDINGS_FILE, allow_pickle=False)
            for k in data.files:
                self.embeddings[k] = data[k]

    def save(self):
        rows = [
            {
                "student_id":    sid,
                "name":          d["name"],
                "enrolled_date": d["enrolled_date"],
            }
            for sid, d in self.students.items()
        ]
        pd.DataFrame(rows).to_csv(STUDENTS_CSV, index=False)
        if self.embeddings:
            np.savez(EMBEDDINGS_FILE, **self.embeddings)

    # ── Enrollment ────────────────────────────────────────────────────────────

    def _next_id(self) -> str:
        if not self.students:
            return "S001"
        nums = [
            int(k[1:]) for k in self.students
            if k.startswith("S") and k[1:].isdigit()
        ]
        return f"S{(max(nums) + 1):03d}" if nums else "S001"

    def check_duplicate(self, embeddings_3: np.ndarray):
        """
        Checks whether a face is already in the database.
        embeddings_3 : np.array (3, 512) — front / right / left

        Returns (is_duplicate, student_id, name, max_similarity)
        is_duplicate = True if any stored face matches above DUP_THRESHOLD
        """
        if not self.embeddings:
            return False, None, None, 0.0

        best_sid, best_name, best_sim = None, None, 0.0

        for new_emb in embeddings_3:
            emb = new_emb / (np.linalg.norm(new_emb) + 1e-6)
            for sid, stored in self.embeddings.items():
                norms = stored / (
                    np.linalg.norm(stored, axis=1, keepdims=True) + 1e-6
                )
                sims = norms @ emb
                sim  = float(sims.max())
                if sim > best_sim:
                    best_sim  = sim
                    best_sid  = sid
                    best_name = self.students[sid]["name"]

        is_dup = best_sim >= DUP_THRESHOLD
        return is_dup, best_sid, best_name, best_sim

    def enroll(self, name: str, embeddings_3: np.ndarray) -> str:
        """
        embeddings_3 : np.array (3, 512) — front / right / left
        Returns the new student_id string.
        Does NOT check for duplicates — call check_duplicate() first.
        """
        sid = self._next_id()
        self.students[sid] = {
            "name":          name,
            "enrolled_date": datetime.now().isoformat(timespec="seconds"),
        }
        self.embeddings[sid] = embeddings_3.astype(np.float32)
        self.save()
        return sid

    # ── Recognition ───────────────────────────────────────────────────────────

    def identify(self, embedding: np.ndarray):
        """
        Returns (student_id, name, similarity).
        Returns ('unknown', 'Unknown', sim) when below threshold.
        """
        if not self.embeddings:
            return "unknown", "Unknown", 0.0

        emb = embedding / (np.linalg.norm(embedding) + 1e-6)

        best_sid, best_name, best_sim = "unknown", "Unknown", 0.0

        for sid, stored in self.embeddings.items():
            norms = stored / (np.linalg.norm(stored, axis=1, keepdims=True) + 1e-6)
            sims  = norms @ emb
            sim   = float(sims.max())
            if sim > best_sim:
                best_sim  = sim
                best_sid  = sid
                best_name = self.students[sid]["name"]

        if best_sim < SIM_THRESHOLD:
            return "unknown", "Unknown", best_sim
        return best_sid, best_name, best_sim

    # ── Helpers ───────────────────────────────────────────────────────────────

    def __len__(self):
        return len(self.students)

    def list_students(self):
        return [(sid, d["name"]) for sid, d in self.students.items()]
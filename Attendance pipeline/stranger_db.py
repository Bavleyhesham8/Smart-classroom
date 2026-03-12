"""
Stranger / Visitor Database
════════════════════════════════════════════════════════════════
Stores unidentified people detected in the classroom.

Directory layout:
  strangers/
    strangers.csv      — metadata for every stranger sighting
    embeddings.npz     — one (512,) embedding per stranger
    images/
      STR001_01.jpg    — best face crop(s) per stranger
      STR001_02.jpg
      STR002_01.jpg
      ...

CSV columns:
  stranger_id, first_seen, last_seen, total_duration_sec,
  total_appearances, image_path, status, notes

Status values:
  "unknown"   — not yet reviewed
  "safe"      — admin marked as safe/known visitor
  "enrolled"  — converted to a student via enrollment
"""

import os
import cv2
import numpy as np
import pandas as pd
import requests
import base64
from datetime import datetime
from config import (
    STRANGERS_CSV, STRANGERS_EMB, STR_IMG,
    STRANGER_SIM_THRESH,
)


class StrangerDatabase:
    def __init__(self):
        self.strangers:   dict = {}   # str_id → metadata dict
        self.embeddings:  dict = {}   # str_id → np.array (512,)
        self.api_url = "http://127.0.0.1:8000/api/alerts/stranger"
        self._load()

    def _push_alert(self, sid: str, face_img: np.ndarray):
        """Push a stranger alert to the FastAPI backend."""
        try:
            _, buffer = cv2.imencode('.jpg', face_img)
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            
            payload = {
                "stranger_id": sid,
                "image_b64": img_b64,
                "timestamp": datetime.now().isoformat()
            }
            requests.post(self.api_url, json=payload, timeout=2)
        except Exception as e:
            print(f"[StrangerDB] Failed to push alert: {e}")

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load(self):
        if os.path.exists(STRANGERS_CSV):
            df = pd.read_csv(STRANGERS_CSV, dtype=str)
            for _, r in df.iterrows():
                self.strangers[r["stranger_id"]] = {
                    "first_seen":         r["first_seen"],
                    "last_seen":          r["last_seen"],
                    "total_duration_sec": float(r.get("total_duration_sec", 0)),
                    "total_appearances":  int(r.get("total_appearances", 1)),
                    "image_path":         r.get("image_path", ""),
                    "status":             r.get("status", "unknown"),
                    "notes":              r.get("notes", ""),
                }
        if os.path.exists(STRANGERS_EMB):
            data = np.load(STRANGERS_EMB, allow_pickle=False)
            for k in data.files:
                self.embeddings[k] = data[k]

    def save(self):
        rows = [
            {
                "stranger_id":        sid,
                "first_seen":         d["first_seen"],
                "last_seen":          d["last_seen"],
                "total_duration_sec": round(d["total_duration_sec"], 1),
                "total_appearances":  d["total_appearances"],
                "image_path":         d["image_path"],
                "status":             d["status"],
                "notes":              d["notes"],
            }
            for sid, d in self.strangers.items()
        ]
        pd.DataFrame(rows).to_csv(STRANGERS_CSV, index=False)
        if self.embeddings:
            np.savez(STRANGERS_EMB, **self.embeddings)

    # ── ID generation ─────────────────────────────────────────────────────────

    def _next_id(self) -> str:
        if not self.strangers:
            return "STR001"
        nums = [
            int(k[3:]) for k in self.strangers
            if k.startswith("STR") and k[3:].isdigit()
        ]
        return f"STR{(max(nums) + 1):03d}" if nums else "STR001"

    # ── Core logic ────────────────────────────────────────────────────────────

    def find_match(self, embedding: np.ndarray):
        """
        Check if this embedding matches a previously seen stranger.
        Returns (found: bool, stranger_id: str, similarity: float)
        """
        if not self.embeddings:
            return False, None, 0.0

        emb  = embedding / (np.linalg.norm(embedding) + 1e-6)
        best_sid, best_sim = None, 0.0

        for sid, stored in self.embeddings.items():
            s = stored / (np.linalg.norm(stored) + 1e-6)
            sim = float(np.dot(emb, s))
            if sim > best_sim:
                best_sim = sim
                best_sid = sid

        if best_sim >= STRANGER_SIM_THRESH:
            return True, best_sid, best_sim
        return False, None, best_sim

    def add_new(self, embedding: np.ndarray,
                face_img: np.ndarray,
                timestamp: datetime) -> str:
        """
        Register a brand-new stranger.
        Saves face image to disk, stores embedding.
        Returns new stranger_id.
        """
        sid   = self._next_id()
        ts    = timestamp.strftime("%Y%m%d_%H%M%S")
        fname = f"{sid}_01.jpg"
        fpath = os.path.join(STR_IMG, fname)

        # Save face crop
        if face_img is not None and face_img.size > 0:
            h, w = face_img.shape[:2]
            if h > 0 and w > 0:
                # Pad the face crop so it's square
                pad_img = _square_pad(face_img, 160)
                cv2.imwrite(fpath, pad_img)

        self.strangers[sid] = {
            "first_seen":         timestamp.isoformat(timespec="seconds"),
            "last_seen":          timestamp.isoformat(timespec="seconds"),
            "total_duration_sec": 0.0,
            "total_appearances":  1,
            "image_path":         fpath if os.path.exists(fpath) else "",
            "status":             "unknown",
            "notes":              "",
        }
        self.embeddings[sid] = embedding.astype(np.float32)
        self.save()

        # Trigger real-time alert
        self._push_alert(sid, face_img)

        print(f"  🚨  NEW STRANGER logged: {sid}  @ {ts}")
        return sid

    def update_sighting(self, sid: str,
                        embedding: np.ndarray,
                        face_img:  np.ndarray,
                        timestamp: datetime,
                        delta_sec: float):
        """
        Update an existing stranger record with a new sighting.
        Updates embedding (running average for robustness),
        saves a new face image if it's a different day.
        """
        if sid not in self.strangers:
            return

        d = self.strangers[sid]
        d["last_seen"]          = timestamp.isoformat(timespec="seconds")
        d["total_duration_sec"] = d["total_duration_sec"] + delta_sec
        d["total_appearances"]  = d["total_appearances"]  + 1

        # Running average embedding — improves match over time
        old_emb = self.embeddings.get(sid)
        if old_emb is not None:
            merged = 0.7 * old_emb + 0.3 * embedding
            self.embeddings[sid] = (merged / (np.linalg.norm(merged) + 1e-6)
                                    ).astype(np.float32)

        # Save an extra image if it's a new appearance
        if face_img is not None and face_img.size > 0:
            count = d["total_appearances"]
            if count <= 5:   # keep up to 5 face images per stranger
                fname = f"{sid}_{count:02d}.jpg"
                fpath = os.path.join(STR_IMG, fname)
                pad_img = _square_pad(face_img, 160)
                cv2.imwrite(fpath, pad_img)
                
                # Push recurring alert for visibility
                self._push_alert(sid, face_img)

        self.save()

    def set_status(self, sid: str, status: str, notes: str = ""):
        if sid in self.strangers:
            self.strangers[sid]["status"] = status
            if notes:
                self.strangers[sid]["notes"] = notes
            self.save()

    def delete(self, sid: str):
        """Remove stranger record and their images."""
        if sid not in self.strangers:
            return
        # Delete all saved images for this stranger
        for fname in os.listdir(STR_IMG):
            if fname.startswith(sid):
                try:
                    os.remove(os.path.join(STR_IMG, fname))
                except Exception:
                    pass
        del self.strangers[sid]
        self.embeddings.pop(sid, None)
        self.save()

    def get_all(self, status_filter=None):
        """
        Returns list of (sid, metadata_dict) sorted by first_seen desc.
        Optional status_filter: 'unknown' | 'safe' | 'enrolled'
        """
        items = list(self.strangers.items())
        if status_filter:
            items = [(s, d) for s, d in items if d["status"] == status_filter]
        items.sort(key=lambda x: x[1]["first_seen"], reverse=True)
        return items

    def load_image(self, sid: str, size=(120, 120)) -> np.ndarray:
        """Load the primary face image for a stranger. Returns placeholder if missing."""
        fpath = self.strangers.get(sid, {}).get("image_path", "")
        if fpath and os.path.exists(fpath):
            img = cv2.imread(fpath)
            if img is not None:
                return cv2.resize(img, size)
        # Grey placeholder with "?" text
        ph = np.full((*size[::-1], 3), 45, dtype=np.uint8)
        cv2.putText(ph, "?", (size[0]//2 - 15, size[1]//2 + 15),
                    cv2.FONT_HERSHEY_DUPLEX, 2.0, (130, 130, 150), 2)
        return ph

    def get_all_images(self, sid: str):
        """Return paths of all saved images for this stranger."""
        paths = []
        for fname in sorted(os.listdir(STR_IMG)):
            if fname.startswith(sid) and fname.endswith(".jpg"):
                paths.append(os.path.join(STR_IMG, fname))
        return paths

    def __len__(self):
        return len(self.strangers)


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _square_pad(img: np.ndarray, target: int) -> np.ndarray:
    """Resize + pad image to a square of (target × target)."""
    h, w = img.shape[:2]
    scale = target / max(h, w, 1)
    nh, nw = int(h * scale), int(w * scale)
    resized = cv2.resize(img, (nw, nh))
    out = np.zeros((target, target, 3), dtype=np.uint8)
    y0 = (target - nh) // 2
    x0 = (target - nw) // 2
    out[y0:y0+nh, x0:x0+nw] = resized
    return out
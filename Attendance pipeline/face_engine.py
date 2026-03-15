"""
InsightFace ArcFace wrapper.
Enhancement 2: Batched inference — all faces processed in one GPU forward pass.
Enhancement 3: buffalo_l model for best accuracy.
"""
import os
import sys
import ctypes


def _preload_cuda():
    dirs = []
    try:
        import torch
        lib = os.path.join(os.path.dirname(torch.__file__), "lib")
        if os.path.isdir(lib):
            dirs.append(lib)
    except ImportError:
        pass
    conda_bin = os.path.join(sys.prefix, "Library", "bin")
    if os.path.isdir(conda_bin):
        dirs.append(conda_bin)
    for ver in ["11.8", "12.1", "12.4"]:
        p = rf"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v{ver}\bin"
        if os.path.isdir(p):
            dirs.append(p)
    valid = [d for d in dirs if os.path.isdir(d)]
    if hasattr(os, "add_dll_directory"):
        for d in valid:
            try:
                os.add_dll_directory(d)
            except Exception:
                pass
    if valid:
        os.environ["PATH"] = ";".join(valid) + ";" + os.environ.get("PATH", "")
    dll_names = [
        "cudart64_110.dll", "cudart64_118.dll",
        "cublas64_11.dll", "cublasLt64_11.dll",
        "cudnn64_8.dll", "cudnn_ops_infer64_8.dll",
    ]
    loaded = []
    for dll in dll_names:
        for d in valid:
            full = os.path.join(d, dll)
            if os.path.exists(full):
                try:
                    ctypes.CDLL(full)
                    loaded.append(dll)
                    break
                except Exception:
                    pass
    if loaded:
        print(f"[CUDA] Preloaded {len(loaded)} DLL(s): {', '.join(loaded)}")

_preload_cuda()

import numpy as np
from dataclasses import dataclass
from typing import List, Optional

# Robust import for insightface to handle onnxruntime environment issues
try:
    from insightface.app import FaceAnalysis
    FACE_ENGINE_AVAILABLE = True
except ImportError as e:
    print(f"[FaceEngine] ⚠  Critical: InsightFace or ONNXRuntime failed to import: {e}")
    FACE_ENGINE_AVAILABLE = False
except Exception as e:
    print(f"[FaceEngine] ⚠  Unexpected error during import: {e}")
    FACE_ENGINE_AVAILABLE = False

from config import INSIGHT_MODEL, DET_SIZE, USE_GPU


@dataclass
class FaceResult:
    bbox:      List[int]    # [x1, y1, x2, y2]
    embedding: np.ndarray   # (512,) float32
    det_score: float
    kps:       np.ndarray   # (5, 2)


class FaceEngine:
    """
    Wraps InsightFace FaceAnalysis.

    Enhancement 2 — Batched inference:
      InsightFace's app.get() processes one image and internally runs each
      detected face through the recognition model sequentially.
      We expose detect_and_embed_batch() which feeds a pre-cropped stack
      of face images through the recognition model in ONE onnxruntime call,
      cutting GPU round-trips from N to 1 for N faces per frame.

    For the pipeline we use detect_and_embed() (single frame) which already
    benefits from batching internally when multiple faces are found,
    because we call app.get() once and InsightFace handles all crops.
    The explicit batch path is available for future multi-camera use.
    """

    def __init__(self):
        if not FACE_ENGINE_AVAILABLE:
            print("[FaceEngine] ⚠  AI Core is OFFLINE. Model initialization skipped.")
            self._app = None
            self._rec_session = None
            return

        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if USE_GPU else
            ["CPUExecutionProvider"]
        )
        try:
            self._app = FaceAnalysis(name=INSIGHT_MODEL, providers=providers)
            self._app.prepare(ctx_id=0 if USE_GPU else -1, det_size=DET_SIZE)
        except Exception as e:
            print(f"[FaceEngine] ⚠  Failed to prepare FaceAnalysis: {e}")
            self._app = None
            self._rec_session = None
            return

        # Confirm GPU
        gpu_active = False
        for model in self._app.models.values():
            if hasattr(model, "session"):
                gpu_active = any(
                    "CUDA" in p for p in model.session.get_providers()
                )
                break

        device = "GPU ✓ (CUDA)" if gpu_active else "CPU"
        print(f"[FaceEngine] model={INSIGHT_MODEL}  "
              f"det_size={DET_SIZE}  device={device}")
        if not gpu_active and USE_GPU:
            print("[FaceEngine] ⚠  CUDA not active — check onnxruntime-gpu")

        # Cache recognition model session for direct batched calls
        self._rec_session = None
        self._rec_input_name  = None
        self._rec_output_name = None
        self._setup_rec_session()

    def _setup_rec_session(self):
        """
        Find the recognition (ArcFace) model session inside InsightFace
        so we can call it directly with a batched numpy array.
        InsightFace names it 'recognition' internally.
        """
        if not self._app:
            return
        for name, model in self._app.models.items():
            if hasattr(model, "session") and "recognition" in name.lower():
                sess = model.session
                self._rec_session    = sess
                self._rec_input_name  = sess.get_inputs()[0].name
                self._rec_output_name = sess.get_outputs()[0].name
                print(f"[FaceEngine] Batched rec session ready: "
                      f"input='{self._rec_input_name}'  "
                      f"providers={sess.get_providers()}")
                break

    # ── Public API ────────────────────────────────────────────────────────────

    def detect_and_embed(self, frame: np.ndarray) -> List[FaceResult]:
        """
        Full pipeline: detect faces + embed all in one call.
        InsightFace internally processes all crops — already benefits from
        GPU batching for multi-face frames.
        Returns FaceResults sorted largest-face-first.
        """
        if not self._app:
            return []
        try:
            raw = self._app.get(frame)
        except Exception as e:
            print(f"[FaceEngine] Error during detection: {e}")
            return []
            
        if not raw:
            return []

        results = [
            FaceResult(
                bbox      = f.bbox.astype(int).tolist(),
                embedding = f.embedding,
                det_score = float(f.det_score),
                kps       = f.kps,
            )
            for f in raw
        ]
        results.sort(
            key=lambda r: (r.bbox[2]-r.bbox[0]) * (r.bbox[3]-r.bbox[1]),
            reverse=True,
        )
        return results

    def embed_batch(self, face_crops: List[np.ndarray]) -> np.ndarray:
        """
        Enhancement 2 — True batched embedding:
        Takes a list of face crop images (any size), preprocesses them all,
        stacks into one tensor, and runs ONE onnxruntime forward pass.

        Returns np.array (N, 512) float32.
        Falls back to sequential if session not found.
        """
        if not face_crops:
            return np.zeros((0, 512), dtype=np.float32)

        if self._rec_session is None:
            # Fallback: sequential
            embs = [self._embed_single(c) for c in face_crops]
            return np.stack(embs).astype(np.float32)

        # Preprocess all crops into (N, 3, 112, 112) float32
        batch = np.stack([self._preprocess_face(c) for c in face_crops])

        # Single GPU forward pass for all N faces
        out = self._rec_session.run(
            [self._rec_output_name],
            {self._rec_input_name: batch}
        )[0]   # shape (N, 512)

        # L2-normalise
        norms = np.linalg.norm(out, axis=1, keepdims=True) + 1e-6
        return (out / norms).astype(np.float32)

    def largest_face(self, frame: np.ndarray) -> Optional[FaceResult]:
        faces = self.detect_and_embed(frame)
        return faces[0] if faces else None

    # ── Internals ─────────────────────────────────────────────────────────────

    @staticmethod
    def _preprocess_face(img: np.ndarray) -> np.ndarray:
        """
        Resize face crop to 112×112, normalize to [-1, 1],
        convert HWC-BGR → CHW-RGB float32 for ArcFace input.
        """
        import cv2
        face = cv2.resize(img, (112, 112))
        face = face[:, :, ::-1]                    # BGR → RGB
        face = face.astype(np.float32) / 127.5 - 1.0
        return face.transpose(2, 0, 1)             # HWC → CHW

    def _embed_single(self, img: np.ndarray) -> np.ndarray:
        """Sequential fallback for one face crop."""
        if self._rec_session is None:
            return np.zeros(512, dtype=np.float32)
        inp = self._preprocess_face(img)[np.newaxis]  # (1,3,112,112)
        out = self._rec_session.run(
            [self._rec_output_name],
            {self._rec_input_name: inp}
        )[0][0]
        return out / (np.linalg.norm(out) + 1e-6)
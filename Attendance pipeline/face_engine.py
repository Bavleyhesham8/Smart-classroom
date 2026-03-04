"""
InsightFace ArcFace wrapper.
Now fully GPU — CUDA toolkit 11.8 + onnxruntime-gpu 1.18 + PyTorch cu118.
Both InsightFace and YOLO run on T1000.
"""
import os
import sys
import ctypes


# ── CUDA DLL preload ──────────────────────────────────────────────────────────
def _preload_cuda():
    dirs = []

    # PyTorch ships its own cudart/cublas/cudnn — always check here first
    try:
        import torch
        lib = os.path.join(os.path.dirname(torch.__file__), "lib")
        if os.path.isdir(lib):
            dirs.append(lib)
    except ImportError:
        pass

    # Conda environment bin
    conda_bin = os.path.join(sys.prefix, "Library", "bin")
    if os.path.isdir(conda_bin):
        dirs.append(conda_bin)

    # CUDA toolkit 11.8 system install
    toolkit_118 = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin"
    if os.path.isdir(toolkit_118):
        dirs.append(toolkit_118)

    valid = [d for d in dirs if os.path.isdir(d)]

    # Windows DLL search path registration
    if hasattr(os, "add_dll_directory"):
        for d in valid:
            try:
                os.add_dll_directory(d)
            except Exception:
                pass

    # Also update PATH
    if valid:
        os.environ["PATH"] = ";".join(valid) + ";" + os.environ.get("PATH", "")

    # ctypes preload — puts DLLs in process table BEFORE onnxruntime loads
    dll_names = [
        "cudart64_110.dll",    # CUDA 11.x runtime
        "cudart64_118.dll",    # CUDA 11.8 runtime
        "cublas64_11.dll",
        "cublasLt64_11.dll",
        "cudnn64_8.dll",
        "cudnn_ops_infer64_8.dll",
        "cudnn_cnn_infer64_8.dll",
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
    else:
        print("[CUDA] ⚠  No CUDA DLLs preloaded — check toolkit path")

_preload_cuda()
# ─────────────────────────────────────────────────────────────────────────────


import numpy as np
from dataclasses import dataclass
from typing import List, Optional
from insightface.app import FaceAnalysis
from config import INSIGHT_MODEL, DET_SIZE, USE_GPU


@dataclass
class FaceResult:
    bbox:      List[int]    # [x1, y1, x2, y2]
    embedding: np.ndarray   # (512,) float32
    det_score: float
    kps:       np.ndarray   # (5, 2)


class FaceEngine:
    def __init__(self):
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if USE_GPU else
            ["CPUExecutionProvider"]
        )

        self._app = FaceAnalysis(name=INSIGHT_MODEL, providers=providers)
        self._app.prepare(ctx_id=0 if USE_GPU else -1, det_size=DET_SIZE)

        # Confirm what actually ran
        gpu_active = False
        for model in self._app.models.values():
            if hasattr(model, "session"):
                active_providers = model.session.get_providers()
                gpu_active = any("CUDA" in p for p in active_providers)
                break

        if gpu_active:
            print(f"[FaceEngine] ✓  model={INSIGHT_MODEL}  "
                  f"det_size={DET_SIZE}  device=GPU (CUDA)")
        else:
            print(f"[FaceEngine] ⚠  model={INSIGHT_MODEL}  "
                  f"det_size={DET_SIZE}  device=CPU  "
                  f"(CUDA requested but not loaded)")
            print("[FaceEngine]    Verify: onnxruntime-gpu==1.18  "
                  "and  CUDA toolkit 11.8 in PATH")

    def detect_and_embed(self, frame: np.ndarray) -> List[FaceResult]:
        raw = self._app.get(frame)
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
            key=lambda r: (r.bbox[2] - r.bbox[0]) * (r.bbox[3] - r.bbox[1]),
            reverse=True,
        )
        return results

    def largest_face(self, frame: np.ndarray) -> Optional[FaceResult]:
        faces = self.detect_and_embed(frame)
        return faces[0] if faces else None
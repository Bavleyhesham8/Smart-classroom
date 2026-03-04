"""
Smart Classroom — Main Launcher
  1. Enroll Student
  2. Attendance Tracking
  3. Visitor Alert Manager
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
        os.environ["PATH"] = ";".join(valid) + ";" + os.environ.get("PATH","")
    dll_names = [
        "cudart64_110.dll","cudart64_118.dll","cublas64_11.dll",
        "cublasLt64_11.dll","cudnn64_8.dll","cudnn_ops_infer64_8.dll",
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
    print(f"[CUDA] Preloaded {len(loaded)} DLL(s)"
          + (f": {', '.join(loaded)}" if loaded else " — CPU fallback"))

_preload_cuda()


def main():
    print("\n" + "═"*50)
    print("    SMART CLASSROOM  —  CV SYSTEM")
    print("═"*50)
    print("  1.  Enroll new student")
    print("  2.  Run attendance tracking")
    print("  3.  Visitor Alert Manager")
    print("  Q.  Quit")
    print()

    choice = input("  Select [1 / 2 / 3 / Q]: ").strip().lower()

    if choice == "1":
        from enrollment import run_enrollment
        while True:
            sid, name = run_enrollment()
            if sid is None:
                break
            again = input("  Enroll another? [y/N]: ").strip().lower()
            if again != "y":
                break

    elif choice == "2":
        from main_pipeline import run_pipeline
        run_pipeline()

    elif choice == "3":
        from visitor_alert import run_visitor_alert
        run_visitor_alert()

    else:
        print("  Bye!\n")


if __name__ == "__main__":
    main()
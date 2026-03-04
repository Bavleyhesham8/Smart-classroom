# run_once_fix_cuda.py  — run this once, then delete it
import os, shutil, torch

src_dir = os.path.join(os.path.dirname(torch.__file__), "lib")
import onnxruntime as ort
dst_dir = os.path.dirname(ort.__file__)

dlls = [f for f in os.listdir(src_dir)
        if f.endswith(".dll") and any(
            x in f.lower() for x in ["cudart", "cublas", "cudnn"]
        )]

print(f"Copying {len(dlls)} DLL(s) from:\n  {src_dir}\nto:\n  {dst_dir}\n")
for dll in dlls:
    src = os.path.join(src_dir, dll)
    dst = os.path.join(dst_dir, dll)
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        print(f"  ✓ {dll}")
    else:
        print(f"  — {dll}  (already exists)")

print("\nDone. Restart Python and test with:")
print('  python -c "import onnxruntime as ort; print(ort.get_available_providers())"')
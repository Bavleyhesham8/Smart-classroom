import cv2
import os

def test_caps():
    for i in [0, 1]:
        print(f"Testing Index {i}...")
        cap = cv2.VideoCapture(i)
        if not cap.isOpened():
            print(f"  FAILED to open")
            continue
        
        # Try to set resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        # Read 10 frames to let auto-exposure settle
        for _ in range(10):
            cap.read()
            
        ret, frame = cap.read()
        if ret:
            fname = f"test_cap_{i}.jpg"
            cv2.imwrite(fname, frame)
            print(f"  SUCCESS! Resolution: {frame.shape[1]}x{frame.shape[0]}. Saved to {fname}")
            print(f"  Mean value: {frame.mean():.2f}")
        else:
            print(f"  FAILED to read frame")
        cap.release()

if __name__ == "__main__":
    test_caps()

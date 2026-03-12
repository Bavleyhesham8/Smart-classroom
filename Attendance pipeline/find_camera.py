import cv2
import time

def find_camera():
    print("Searching for cameras...")
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if not cap.isOpened():
            print(f"Index {i}: Not opened")
            continue
        
        ret, frame = cap.read()
        if ret:
            mean_val = frame.mean()
            print(f"Index {i}: Found! Average brightness: {mean_val:.2f}")
            if mean_val > 5:
                print(f"  --> Looks like a valid camera!")
            else:
                print(f"  --> Warning: Frame is very dark/black.")
        else:
            print(f"Index {i}: Failed to read frame")
        
        cap.release()

if __name__ == "__main__":
    find_camera()

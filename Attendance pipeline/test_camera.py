from enrollment import HeadPoseEstimator
import cv2
import numpy as np

print("Testing HeadPoseEstimator and CV2...")
try:
    pose = HeadPoseEstimator(1280, 720)
    print("HeadPoseEstimator initialized.")
    
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        print("Camera 0 opened successfully.")
        ret, frame = cap.read()
        if ret:
            print(f"Captured frame of size: {frame.shape}")
        else:
            print("Failed to read frame from camera 0.")
        cap.release()
    else:
        print("Failed to open camera 0.")
except Exception as e:
    print(f"Error: {e}")

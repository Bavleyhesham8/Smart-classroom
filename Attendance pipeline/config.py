import os

# ═══════════════════════════════════════════
#  PATHS
# ═══════════════════════════════════════════
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_DIR    = os.path.join(BASE_DIR, "database")
ATT_DIR   = os.path.join(BASE_DIR, "attendance")

os.makedirs(DB_DIR,  exist_ok=True)
os.makedirs(ATT_DIR, exist_ok=True)

STUDENTS_CSV    = os.path.join(DB_DIR, "students.csv")
EMBEDDINGS_FILE = os.path.join(DB_DIR, "embeddings.npz")
ATTENDANCE_TMPL = os.path.join(ATT_DIR, "attendance_{ts}.csv")

# ═══════════════════════════════════════════
#  CAMERA
# ═══════════════════════════════════════════
CAM_INDEX  = 0
FRAME_W    = 1280
FRAME_H    = 720
TARGET_FPS = 30

# ═══════════════════════════════════════════
#  INSIGHTFACE
#  buffalo_sc = faster, good accuracy (recommended for real-time)
#  buffalo_l  = slower, best accuracy (use if recognition is poor)
# ═══════════════════════════════════════════
INSIGHT_MODEL = "buffalo_sc"   # switched from buffalo_l for speed
DET_SIZE      = (320, 320)     # reduced from 640 — still reliable at webcam range
USE_GPU       = True

# ═══════════════════════════════════════════
#  ENROLLMENT THRESHOLDS
# ═══════════════════════════════════════════
FRONT_YAW_MAX    = 30
SIDE_YAW_MIN     = 12
SIDE_YAW_MAX     = 80
PITCH_MAX        = 40
HOLD_FRAMES      = 10

# ═══════════════════════════════════════════
#  RECOGNITION
# ═══════════════════════════════════════════
SIM_THRESHOLD      = 0.38   # identify match threshold
DUP_THRESHOLD      = 0.60   # similarity above this = already enrolled
RECOG_SMOOTH_N     = 7      # rolling vote window
CONFIRM_THRESHOLD  = 0.50   # similarity needed to "confirm" identity lock
CONFIRM_VOTES      = 5      # consecutive matching votes to lock identity
REID_TIMEOUT       = 300    # frames to remember a lost identity (~10s @ 30fps)

# ═══════════════════════════════════════════
#  YOLO + BYTETRACK
# ═══════════════════════════════════════════
YOLO_WEIGHTS  = "yolov8n.pt"
YOLO_CONF     = 0.45
TRACK_BUFFER  = 90
FACE_DET_SKIP = 2      # reduced from 3 for faster re-ID on re-entry

# ═══════════════════════════════════════════
#  VISUALIZATION
# ═══════════════════════════════════════════
PANEL_W = 300
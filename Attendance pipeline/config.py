import os

# ═══════════════════════════════════════════
#  PATHS
# ═══════════════════════════════════════════
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_DIR    = os.path.join(BASE_DIR, "database")
ATT_DIR   = os.path.join(BASE_DIR, "attendance")
STR_DIR   = os.path.join(BASE_DIR, "strangers")
STR_IMG   = os.path.join(STR_DIR,  "images")

os.makedirs(DB_DIR,  exist_ok=True)
os.makedirs(ATT_DIR, exist_ok=True)
os.makedirs(STR_DIR, exist_ok=True)
os.makedirs(STR_IMG, exist_ok=True)

STUDENTS_CSV    = os.path.join(DB_DIR, "students.csv")
EMBEDDINGS_FILE = os.path.join(DB_DIR, "embeddings.npz")
ATTENDANCE_TMPL = os.path.join(ATT_DIR, "attendance_{ts}.csv")
STRANGERS_CSV   = os.path.join(STR_DIR, "strangers.csv")
STRANGERS_EMB   = os.path.join(STR_DIR, "embeddings.npz")

# ═══════════════════════════════════════════
#  CAMERA
# ═══════════════════════════════════════════
CAM_INDEX  = r"D:\Smart classroom\grok-video-13f1aec6-e293-4d6f-afa7-75dc3f360918.mp4"
FRAME_W    = 1280
FRAME_H    = 720
TARGET_FPS = 30

# ═══════════════════════════════════════════
#  INSIGHTFACE
#  Enhancement 3: back to buffalo_l — best accuracy, GPU is stable
# ═══════════════════════════════════════════
INSIGHT_MODEL = "buffalo_l"    # ← upgraded from buffalo_sc
DET_SIZE      = (320, 320)
USE_GPU       = True

# ═══════════════════════════════════════════
#  ENROLLMENT THRESHOLDS
# ═══════════════════════════════════════════
FRONT_YAW_MAX = 30
SIDE_YAW_MIN  = 12
SIDE_YAW_MAX  = 80
PITCH_MAX     = 40
HOLD_FRAMES   = 10

# ═══════════════════════════════════════════
#  RECOGNITION
# ═══════════════════════════════════════════
SIM_THRESHOLD      = 0.38
DUP_THRESHOLD      = 0.60
RECOG_SMOOTH_N     = 7
CONFIRM_THRESHOLD  = 0.50
CONFIRM_VOTES      = 5
REID_TIMEOUT       = 300

# ═══════════════════════════════════════════
#  STRANGER / VISITOR ALERT
# ═══════════════════════════════════════════
STRANGER_SIM_THRESH   = 0.52
STRANGER_ALERT_FRAMES = 20
STRANGER_SAVE_BEST_N  = 3
ALERT_FLASH_FRAMES    = 30

# ═══════════════════════════════════════════
#  YOLO + BYTETRACK
#  Enhancement 4: YOLO26n — NMS-free, faster, better small objects
# ═══════════════════════════════════════════
YOLO_WEIGHTS  = "yolo26n.pt"   # ← upgraded from yolov8n.pt
YOLO_CONF     = 0.45
TRACK_BUFFER  = 90

# ═══════════════════════════════════════════
#  Enhancement 1: Smart motion-based face detection skip
#  Instead of fixed every-N-frames, skip based on how much
#  people are actually moving in the scene
# ═══════════════════════════════════════════
FACE_DET_SKIP       = 2        # fallback fixed skip (used when motion low)
MOTION_THRESH_HIGH  = 800.0    # mean pixel diff → always run face det
MOTION_THRESH_LOW   = 150.0    # mean pixel diff → can skip face det
FACE_DET_MAX_SKIP   = 5        # never skip more than this many frames

# ═══════════════════════════════════════════
#  VISUALIZATION
# ═══════════════════════════════════════════
PANEL_W = 300
import cv2
import face_recognition
import csv
import os
import time
import json
import numpy as np
from datetime import datetime

# ────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────
CSV_FILE                  = 'students_embeddings.csv'
THRESHOLD                 = 0.55          # Lower = stricter
WINDOW_NAME               = 'SmartClass AI - Face Recognition'
FONT                      = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE                = 0.7
THICKNESS                 = 2
PROCESS_SCALE             = 0.5           # Downscale frames for 2–4× speed gain
RECOGNITION_INTERVAL      = 4             # Recognize only every N frames
COOLDOWN_AFTER_ENROLL_SEC = 3.0

FIELDNAMES = ['student_id', 'name', 'embedding', 'last_modified']

# ────────────────────────────────────────────────
# Check if dlib was compiled with CUDA (GPU support)
# ────────────────────────────────────────────────
try:
    import dlib
    cuda_devices = dlib.cuda.get_num_devices()
    if cuda_devices > 0:
        print(f"GPU SUPPORT DETECTED! Using {dlib.cuda.get_device(0).name} ({cuda_devices} device(s))")
    else:
        print("No CUDA-capable GPU detected → falling back to CPU")
except Exception as e:
    print(f"Could not check CUDA support: {e} → using CPU")

# ────────────────────────────────────────────────
# CSV & Embeddings handling
# ────────────────────────────────────────────────
def init_csv():
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()

def load_known_faces():
    known = []
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                emb_list = json.loads(row['embedding'])
                known.append({
                    'student_id': row['student_id'],
                    'name': row['name'],
                    'embedding': np.array(emb_list, dtype=np.float64),
                    'last_modified': row['last_modified']
                })
    return known

def save_new_student(student_id, name, master_embedding):
    last_modified = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(CSV_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writerow({
            'student_id': student_id,
            'name': name,
            'embedding': json.dumps(master_embedding.tolist()),
            'last_modified': last_modified
        })
    print(f"→ Saved new student: {name} ({student_id})")

# ────────────────────────────────────────────────
# Capture one face image with on-screen instructions
# ────────────────────────────────────────────────
def capture_profile_view(view_text):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Cannot open webcam")
        return None

    instructions = [
        f"Position: {view_text}",
        "Look at camera clearly",
        "Press SPACE to capture",
        "Press Q or ESC to cancel"
    ]

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        y0, dy = 30, 30
        for i, line in enumerate(instructions):
            y = y0 + i * dy
            cv2.putText(frame, line, (20, y), FONT, 0.9, (0, 255, 255), 2)

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord(' '):
            cap.release()
            cv2.destroyAllWindows()
            return frame
        if key in (ord('q'), 27):
            break

    cap.release()
    cv2.destroyAllWindows()
    return None

# ────────────────────────────────────────────────
# Extract embedding (first face)
# ────────────────────────────────────────────────
def get_face_embedding(image):
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    locations = face_recognition.face_locations(rgb)
    if not locations:
        return None, None
    encoding = face_recognition.face_encodings(rgb, locations, model='small')[0]
    return encoding, locations[0]

# ────────────────────────────────────────────────
# Enroll new student (3 views → average embedding)
# ────────────────────────────────────────────────
def enroll_new_student():
    print("\n→ Unknown face → Starting enrollment...")
    student_id = input("Enter Student ID: ").strip()
    if not student_id: return None

    name = input("Enter Full Name: ").strip()
    if not name: return None

    views = ["Front view (straight)", "Left profile", "Right profile"]
    embeddings = []

    for view in views:
        print(f"\nCapturing: {view}")
        frame = capture_profile_view(view)
        if frame is None: return None

        emb, _ = get_face_embedding(frame)
        if emb is None:
            print(f"No face in {view}. Try again.")
            return None
        embeddings.append(emb)

    master_emb = np.mean(embeddings, axis=0)
    save_new_student(student_id, name, master_emb)
    return {'student_id': student_id, 'name': name, 'embedding': master_emb}

# ────────────────────────────────────────────────
# MAIN LOOP
# ────────────────────────────────────────────────
def main():
    init_csv()
    known_faces = load_known_faces()
    print(f"Loaded {len(known_faces)} known students.")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Cannot open webcam")
        return

    frame_count = 0
    last_recognition_time = time.time()
    prev_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        now = time.time()
        fps = 1 / (now - prev_time + 1e-6)
        prev_time = now

        # Downscale for speed
        small_frame = cv2.resize(frame, (0, 0), fx=PROCESS_SCALE, fy=PROCESS_SCALE)
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # Detect faces every frame (fast)
        locations_small = face_recognition.face_locations(rgb_small)

        # Scale locations back to original size
        locations = [(int(t/PROCESS_SCALE), int(r/PROCESS_SCALE),
                      int(b/PROCESS_SCALE), int(l/PROCESS_SCALE))
                     for (t, r, b, l) in locations_small]

        # Recognition only every N frames or after cooldown
        do_recognition = (frame_count % RECOGNITION_INTERVAL == 0) and \
                         (now - last_recognition_time > COOLDOWN_AFTER_ENROLL_SEC)

        encodings = []
        if do_recognition and len(locations_small) > 0:
            encodings = face_recognition.face_encodings(rgb_small, locations_small, model='small')
            last_recognition_time = now

        for i, ((top, right, bottom, left), enc) in enumerate(zip(locations, encodings)):
            name = "Unknown"
            student_id = ""
            confidence = 0.0
            color = (0, 0, 255)

            if len(known_faces) > 0 and len(encodings) > 0:
                distances = face_recognition.face_distance(
                    [f['embedding'] for f in known_faces], enc)
                best_idx = np.argmin(distances)
                min_dist = distances[best_idx]

                if min_dist < THRESHOLD:
                    match = known_faces[best_idx]
                    name = match['name']
                    student_id = match['student_id']
                    confidence = 1 - min_dist
                    color = (0, 255, 0)

            # Draw box & label
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            label = f"{name}"
            if student_id: label += f" ID:{student_id}"
            if confidence > 0: label += f" {confidence:.2%}"

            cv2.rectangle(frame, (left, top-35), (right, top), color, cv2.FILLED)
            cv2.putText(frame, label, (left+6, top-10), FONT, FONT_SCALE, (255,255,255), THICKNESS)

        # Status bar
        status = f"FPS: {fps:.1f} | Known: {len(known_faces)} | Scale: {PROCESS_SCALE}"
        cv2.putText(frame, status, (10, frame.shape[0]-10), FONT, 0.7, (200,200,200), 2)

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break

        # Auto-enroll if unknown face(s) and we did recognition recently
        if len(locations) > 0 and do_recognition:
            should_enroll = False
            if len(known_faces) == 0:
                should_enroll = True
            else:
                known_embs = [f['embedding'] for f in known_faces]
                distances_per_face = [face_recognition.face_distance(known_embs, enc).min()
                                      for enc in encodings]
                should_enroll = all(d >= THRESHOLD for d in distances_per_face)

            if should_enroll:
                cv2.putText(frame, "UNKNOWN → Enrollment...", 
                            (50, frame.shape[0]//2), FONT, 1.2, (0,0,255), 3)
                cv2.imshow(WINDOW_NAME, frame)
                cv2.waitKey(1200)

                cap.release()
                cv2.destroyAllWindows()

                new_student = enroll_new_student()
                if new_student:
                    known_faces.append(new_student)
                    print("→ Updated. Restarting...")
                    time.sleep(COOLDOWN_AFTER_ENROLL_SEC)

                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    print("Error re-opening webcam")
                    break

        frame_count += 1

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
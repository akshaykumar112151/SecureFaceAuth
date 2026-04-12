import cv2
import numpy as np
import random

try:
    import mediapipe.python.solutions.face_mesh as _face_mesh_module
    class _Mp:
        class solutions:
            face_mesh = _face_mesh_module
    mp_face_mesh = _Mp.solutions.face_mesh
    MEDIAPIPE_OK = True
except Exception as e:
    MEDIAPIPE_OK = False

LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

EAR_THRESHOLD  = 0.19   # aankhein is se neeche = closed
EAR_RANGE_MIN  = 0.15   # minimum movement needed

# ── 7 CHALLENGES ──────────────────────
CHALLENGES = [
    {"key": "mouth_open", "label": "😮 Open your mouth!"},
    {"key": "look_left",  "label": "👈 Look Left!"},
    {"key": "look_right", "label": "👉 Look Right!"},
    {"key": "look_up",    "label": "👆 Look Up!"},
    {"key": "look_down",  "label": "👇 Look Down!"},
    {"key": "wink_left",  "label": "😉 Wink Left Eye!"},
    {"key": "wink_right", "label": "😉 Wink Right Eye!"},
]

# Opposite challenges — agar ye detect ho toh IMMEDIATELY fail
OPPOSITE_CHALLENGE = {
    "look_left":  "look_right",
    "look_right": "look_left",
    "look_up":    "look_down",
    "look_down":  "look_up",
    "wink_left":  "wink_right",
    "wink_right": "wink_left",
}

def get_random_challenge():
    return random.choice(CHALLENGES)


# ── LANDMARK HELPERS ──────────────────────────────────

def get_point(landmarks, idx, img_w, img_h):
    lm = landmarks[idx]
    return (lm.x * img_w, lm.y * img_h)


def eye_aspect_ratio(landmarks, eye_indices, img_w, img_h):
    points = []
    for idx in eye_indices:
        lm = landmarks[idx]
        points.append((lm.x * img_w, lm.y * img_h))
    v1 = np.linalg.norm(np.array(points[1]) - np.array(points[5]))
    v2 = np.linalg.norm(np.array(points[2]) - np.array(points[4]))
    h  = np.linalg.norm(np.array(points[0]) - np.array(points[3]))
    if h == 0:
        return 0.3
    return (v1 + v2) / (2.0 * h)


# ── CHALLENGE DETECTORS ───────────────────────────────

def detect_mouth_open(landmarks, img_w, img_h):
    upper_lip    = get_point(landmarks, 13,  img_w, img_h)
    lower_lip    = get_point(landmarks, 14,  img_w, img_h)
    left_corner  = get_point(landmarks, 61,  img_w, img_h)
    right_corner = get_point(landmarks, 291, img_w, img_h)
    mouth_height = np.linalg.norm(np.array(upper_lip)    - np.array(lower_lip))
    mouth_width  = np.linalg.norm(np.array(right_corner) - np.array(left_corner))
    if mouth_width == 0:
        return False
    ratio = mouth_height / (mouth_width + 1e-6)
    print(f"[Challenge-MouthOpen] ratio: {ratio:.2f}")
    return ratio > 0.25


def detect_look_left(landmarks, img_w, img_h):
    nose_tip    = get_point(landmarks, 1,   img_w, img_h)
    left_cheek  = get_point(landmarks, 234, img_w, img_h)
    right_cheek = get_point(landmarks, 454, img_w, img_h)
    face_center_x = (left_cheek[0] + right_cheek[0]) / 2
    face_width    = abs(right_cheek[0] - left_cheek[0])
    if face_width == 0:
        return False
    offset = (face_center_x - nose_tip[0]) / face_width
    print(f"[Challenge-LookLeft] offset: {offset:.2f}")
    return offset > 0.10   # slightly stricter than before


def detect_look_right(landmarks, img_w, img_h):
    nose_tip    = get_point(landmarks, 1,   img_w, img_h)
    left_cheek  = get_point(landmarks, 234, img_w, img_h)
    right_cheek = get_point(landmarks, 454, img_w, img_h)
    face_center_x = (left_cheek[0] + right_cheek[0]) / 2
    face_width    = abs(right_cheek[0] - left_cheek[0])
    if face_width == 0:
        return False
    offset = (nose_tip[0] - face_center_x) / face_width
    print(f"[Challenge-LookRight] offset: {offset:.2f}")
    return offset > 0.10


def detect_look_up(landmarks, img_w, img_h):
    nose_tip   = get_point(landmarks, 1,   img_w, img_h)
    chin       = get_point(landmarks, 152, img_w, img_h)
    forehead   = get_point(landmarks, 10,  img_w, img_h)
    face_center_y = (chin[1] + forehead[1]) / 2
    face_height   = abs(chin[1] - forehead[1])
    if face_height == 0:
        return False
    offset = (face_center_y - nose_tip[1]) / face_height
    print(f"[Challenge-LookUp] offset: {offset:.2f}")
    return offset > 0.10


def detect_look_down(landmarks, img_w, img_h):
    nose_tip   = get_point(landmarks, 1,   img_w, img_h)
    chin       = get_point(landmarks, 152, img_w, img_h)
    forehead   = get_point(landmarks, 10,  img_w, img_h)
    face_center_y = (chin[1] + forehead[1]) / 2
    face_height   = abs(chin[1] - forehead[1])
    if face_height == 0:
        return False
    offset = (nose_tip[1] - face_center_y) / face_height
    print(f"[Challenge-LookDown] offset: {offset:.2f}")
    return offset > 0.10


def detect_wink_left(landmarks, img_w, img_h):
    left_ear  = eye_aspect_ratio(landmarks, LEFT_EYE,  img_w, img_h)
    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, img_w, img_h)
    diff = left_ear - right_ear
    print(f"[Challenge-WinkLeft] left_ear: {left_ear:.3f} right_ear: {right_ear:.3f} diff: {diff:.3f}")
    return right_ear < 0.15 and left_ear > 0.21 and diff > 0.10


def detect_wink_right(landmarks, img_w, img_h):
    left_ear  = eye_aspect_ratio(landmarks, LEFT_EYE,  img_w, img_h)
    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, img_w, img_h)
    diff = right_ear - left_ear
    print(f"[Challenge-WinkRight] left_ear: {left_ear:.3f} right_ear: {right_ear:.3f} diff: {diff:.3f}")
    return left_ear < 0.15 and right_ear > 0.21 and diff > 0.10


# ── CHALLENGE DISPATCHER ──────────────────────────────

CHALLENGE_DETECTORS = {
    "mouth_open": detect_mouth_open,
    "look_left":  detect_look_left,
    "look_right": detect_look_right,
    "look_up":    detect_look_up,
    "look_down":  detect_look_down,
    "wink_left":  detect_wink_left,
    "wink_right": detect_wink_right,
}


def check_challenge(frames, challenge_key):
    """
    Check if user performed the given challenge across frames.
    - Agar opposite direction detect ho → IMMEDIATELY FAIL (spoof)
    - Agar 60% frames mein correct action nahi → FAIL
    Returns: (bool, score)
    """
    if not MEDIAPIPE_OK or not frames:
        return True, 75.0

    detector = CHALLENGE_DETECTORS.get(challenge_key)
    if not detector:
        print(f"[Challenge] Unknown challenge: {challenge_key}")
        return True, 75.0

    # Opposite detector — agar ye trigger ho toh FAIL
    opposite_key      = OPPOSITE_CHALLENGE.get(challenge_key)
    opposite_detector = CHALLENGE_DETECTORS.get(opposite_key) if opposite_key else None

    detected_count  = 0
    opposite_count  = 0
    total_frames    = 0

    try:
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as fm:
            for frame in frames:
                img_h, img_w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = fm.process(rgb)
                if results.multi_face_landmarks:
                    lms = results.multi_face_landmarks[0].landmark
                    total_frames += 1
                    if detector(lms, img_w, img_h):
                        detected_count += 1
                    # Check opposite direction
                    if opposite_detector and opposite_detector(lms, img_w, img_h):
                        opposite_count += 1

        if total_frames == 0:
            print(f"[Challenge] No face detected in frames")
            return False, 30.0

        detection_ratio = detected_count / total_frames
        opposite_ratio  = opposite_count / total_frames

        print(f"[Challenge-{challenge_key}] correct:{detected_count}/{total_frames} ({detection_ratio:.2f}) | opposite:{opposite_count} ({opposite_ratio:.2f})")

        # ── RULE 1: Opposite direction detected → SPOOF ──
        if opposite_ratio > 0.4:
            print(f"[Challenge] SPOOF — opposite direction detected!")
            return False, 10.0

        # ── RULE 2: Correct action needed in 60%+ frames ──
        if detection_ratio >= 0.60:
            score = 75.0 + (detection_ratio * 20.0)
            score = min(score, 95.0)
            print(f"[Challenge] PASS | Score: {score:.1f}")
            return True, round(score, 2)
        else:
            score = detection_ratio * 60.0
            print(f"[Challenge] FAIL | Score: {score:.1f}")
            return False, round(score, 2)

    except Exception as e:
        print(f"[Challenge] Error: {e}")
        return False, 30.0


# ── BLINK DETECTION ───────────────────────────────────

def check_blink(frame):
    """Single frame blink check — fallback only"""
    if not MEDIAPIPE_OK:
        return True, 70.0
    try:
        img_h, img_w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as fm:
            results = fm.process(rgb)
            if not results.multi_face_landmarks:
                return True, 65.0
            lms = results.multi_face_landmarks[0].landmark
            left_ear  = eye_aspect_ratio(lms, LEFT_EYE,  img_w, img_h)
            right_ear = eye_aspect_ratio(lms, RIGHT_EYE, img_w, img_h)
            avg_ear   = (left_ear + right_ear) / 2.0
            score = min(avg_ear * 200, 100.0)
            if score < 10.0:
                score = 60.0
            print(f"[Liveness-Single] EAR: {avg_ear:.3f} Score: {score:.1f}")
            return True, round(score, 2)
    except Exception as e:
        print(f"[Liveness-Single] Error: {e}")
        return True, 65.0


def check_blink_sequence(frames):
    """
    Strict blink detection across multiple frames.
    RULES:
    1. Aankhein actually EAR_THRESHOLD se neeche jaani chahiye — warna FAIL
    2. Sirf movement (edhar udhar dekhna) se PASS nahi hoga
    3. Clean blink = open → closed → open sequence
    """
    if not MEDIAPIPE_OK or not frames:
        return True, 70.0

    ear_values = []
    try:
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as fm:
            for frame in frames:
                img_h, img_w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = fm.process(rgb)
                if results.multi_face_landmarks:
                    lms = results.multi_face_landmarks[0].landmark
                    left_ear  = eye_aspect_ratio(lms, LEFT_EYE,  img_w, img_h)
                    right_ear = eye_aspect_ratio(lms, RIGHT_EYE, img_w, img_h)
                    avg_ear   = (left_ear + right_ear) / 2.0
                    ear_values.append(avg_ear)

        if len(ear_values) < 3:
            print(f"[Liveness] Not enough face detections: {len(ear_values)}")
            return False, 40.0

        print(f"[Liveness] EAR sequence: {[round(e,3) for e in ear_values]}")
        min_ear   = min(ear_values)
        max_ear   = max(ear_values)
        ear_range = max_ear - min_ear
        print(f"[Liveness] min:{min_ear:.3f} max:{max_ear:.3f} range:{ear_range:.3f}")

        # ── STRICT RULE: Aankhein MUST close below threshold ──
        actually_closed = any(e < EAR_THRESHOLD for e in ear_values)

        if not actually_closed:
            # Aankhein kabhi band nahi hui — movement ya looking around
            print(f"[Liveness] FAIL — eyes never closed (min EAR: {min_ear:.3f} > threshold: {EAR_THRESHOLD})")
            print(f"[Liveness] Possible: looking around / photo / screen")
            return False, 20.0

        # ── Clean blink: open → closed → open ─────────────
        blink_detected  = False
        blink_frame_idx = -1
        for i in range(1, len(ear_values) - 1):
            if (ear_values[i-1] > EAR_THRESHOLD and
                ear_values[i]   < EAR_THRESHOLD and
                ear_values[i+1] > EAR_THRESHOLD):
                blink_detected  = True
                blink_frame_idx = i
                print(f"[Liveness] Clean blink at frame {i} | EAR: {ear_values[i]:.3f}")
                break

        if blink_detected:
            blink_depth   = max(0.0, EAR_THRESHOLD - ear_values[blink_frame_idx])
            dynamic_score = 80.0 + min(blink_depth * 200, 15.0)
            print(f"[Liveness] PASS — clean blink | Score: {dynamic_score:.1f}")
            return True, round(dynamic_score, 2)

        # ── Partial blink: eyes closed but sequence not perfect ──
        # e.g. eyes were already closed at start, or slow blink
        if ear_range > EAR_RANGE_MIN and actually_closed:
            depth         = max(0.0, EAR_THRESHOLD - min_ear)
            partial_score = 68.0 + min(depth * 150, 10.0)
            print(f"[Liveness] PASS — partial blink | Score: {partial_score:.1f}")
            return True, round(partial_score, 2)

        # ── Fallback fail ──────────────────────────────────
        stability_score = max(20.0, 30.0 - (ear_range * 100))
        print(f"[Liveness] FAIL — no valid blink | Score: {stability_score:.1f}")
        return False, round(stability_score, 2)

    except Exception as e:
        print(f"[Liveness] Error: {e}")
        return False, 35.0
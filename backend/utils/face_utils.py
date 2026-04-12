import numpy as np
import cv2

# ── DeepFace for person-specific embeddings ───────────
try:
    from deepface import DeepFace
    DEEPFACE_OK = True
    print("[FaceUtils] DeepFace loaded ✅")
except Exception as e:
    DEEPFACE_OK = False
    print(f"[FaceUtils] DeepFace not available: {e}")


# ── Thresholds ────────────────────────────────────────
DEEPFACE_THRESHOLD  = 82.0   # DeepFace cosine similarity — strict
FALLBACK_THRESHOLD  = 78.0   # LBP+HOG fallback — stricter than before (was 72)


def count_faces_in_frame(frame):
    """Multi-Person Detection: count faces in frame."""
    try:
        gray    = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        frontal = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces   = frontal.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=8, minSize=(80, 80))
        count   = len(faces)
        print(f"[MultiPersonCheck] {count} face(s) detected in frame")
        return count
    except Exception as e:
        print(f"Multi-person check error: {e}")
        return 0


def extract_face_encoding(frame):
    """
    Extract face encoding from frame.
    Uses DeepFace (Facenet512) for person-specific embeddings.
    Falls back to LBP+HOG if DeepFace fails.
    """
    try:
        # ── Multi-person block ──
        face_count = count_faces_in_frame(frame)
        if face_count > 1:
            print(f"[BLOCKED] {face_count} faces — spoofing attempt rejected")
            return None, "multiple_faces"

        # ── Try DeepFace first ──
        if DEEPFACE_OK:
            try:
                result = DeepFace.represent(
                    img_path   = frame,
                    model_name = "Facenet512",   # 512-dim, very accurate
                    enforce_detection = False,
                    detector_backend  = "opencv",
                )
                if result and len(result) > 0:
                    embedding = np.array(result[0]["embedding"], dtype=np.float32)
                    norm = np.linalg.norm(embedding)
                    if norm > 0:
                        embedding = embedding / norm
                    print(f"[FaceUtils] DeepFace encoding: {len(embedding)} dims")
                    return embedding, None
            except Exception as e:
                print(f"[FaceUtils] DeepFace failed, using fallback: {e}")

        # ── Fallback: LBP+HOG+Pixel ──
        face_roi, gray = detect_face_roi(frame)
        if face_roi is None:
            print("No face detected")
            return None, "no_face"

        face_resized = cv2.resize(face_roi, (128, 128))
        face_eq      = cv2.equalizeHist(face_resized)

        lbp     = extract_lbp_features(face_eq)
        hog     = extract_hog_features(face_eq)
        pixel   = face_eq.astype(np.float32).flatten() / 255.0
        encoding = np.concatenate([lbp, hog, pixel[:256]])

        norm = np.linalg.norm(encoding)
        if norm > 0:
            encoding = encoding / norm

        print(f"[FaceUtils] Fallback encoding: {len(encoding)} features")
        return encoding, None

    except Exception as e:
        print(f"Face encoding error: {e}")
        return None, "error"


def match_face(new_encoding, stored_encoding):
    """
    Compare two face encodings using cosine similarity.
    Threshold depends on encoding size:
      - 512 dims = DeepFace → 82% threshold
      - 768 dims = LBP+HOG  → 78% threshold
    """
    try:
        if new_encoding is None or stored_encoding is None:
            return False, 0.0

        min_len = min(len(new_encoding), len(stored_encoding))

        # Dimension mismatch — different encoding types
        # Re-extract not possible here, so reject
        if abs(len(new_encoding) - len(stored_encoding)) > 10:
            print(f"[FaceUtils] Encoding dimension mismatch: {len(new_encoding)} vs {len(stored_encoding)} — treating as no match")
            return False, 0.0

        a = new_encoding[:min_len]
        b = stored_encoding[:min_len]

        dot  = np.dot(a, b)
        na   = np.linalg.norm(a)
        nb   = np.linalg.norm(b)

        if na == 0 or nb == 0:
            return False, 0.0

        similarity = dot / (na * nb)
        score      = float(similarity) * 100

        # Use correct threshold based on encoding type
        if min_len >= 500:
            threshold = DEEPFACE_THRESHOLD   # 82% for DeepFace
            method    = "DeepFace/Facenet512"
        else:
            threshold = FALLBACK_THRESHOLD   # 78% for LBP+HOG
            method    = "LBP+HOG fallback"

        print(f"[FaceUtils] Match score: {score:.2f}% | threshold: {threshold}% | method: {method}")
        return score >= threshold, score

    except Exception as e:
        print(f"Match error: {e}")
        return False, 0.0


def detect_face_roi(frame):
    """Multi-cascade face detection for fallback encoding."""
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        frontal = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces   = frontal.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40))
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            print(f"[FaceDetect] Frontal cascade — face at ({x},{y}) size {w}x{h}")
            return gray[y:y+h, x:x+w], gray

        frontal_alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        faces       = frontal_alt.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40))
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            print(f"[FaceDetect] Frontal alt — face at ({x},{y}) size {w}x{h}")
            return gray[y:y+h, x:x+w], gray

        profile = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
        faces   = profile.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40))
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            return gray[y:y+h, x:x+w], gray

        gray_flipped = cv2.flip(gray, 1)
        faces        = profile.detectMultiScale(gray_flipped, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40))
        if len(faces) > 0:
            h_img, w_img = gray_flipped.shape
            x, y, w, h  = max(faces, key=lambda f: f[2] * f[3])
            x_orig       = w_img - x - w
            return gray[y:y+h, x_orig:x_orig+w], gray

        print("No face detected")
        return None, None

    except Exception as e:
        print(f"Face detection error: {e}")
        return None, None


def extract_lbp_features(img):
    try:
        h, w    = img.shape
        lbp_img = np.zeros_like(img, dtype=np.uint8)
        for i in range(1, h-1):
            for j in range(1, w-1):
                c    = img[i, j]
                code = 0
                code |= (1 if img[i-1,j-1] >= c else 0) << 7
                code |= (1 if img[i-1,j  ] >= c else 0) << 6
                code |= (1 if img[i-1,j+1] >= c else 0) << 5
                code |= (1 if img[i  ,j+1] >= c else 0) << 4
                code |= (1 if img[i+1,j+1] >= c else 0) << 3
                code |= (1 if img[i+1,j  ] >= c else 0) << 2
                code |= (1 if img[i+1,j-1] >= c else 0) << 1
                code |= (1 if img[i  ,j-1] >= c else 0) << 0
                lbp_img[i, j] = code
        cell_size = 16
        features  = []
        for i in range(0, h-cell_size, cell_size):
            for j in range(0, w-cell_size, cell_size):
                cell      = lbp_img[i:i+cell_size, j:j+cell_size]
                hist, _   = np.histogram(cell, bins=32, range=(0, 256))
                hist      = hist.astype(np.float32)
                hist     /= (hist.sum() + 1e-6)
                features.extend(hist)
        return np.array(features[:256], dtype=np.float32)
    except Exception as e:
        print(f"LBP error: {e}")
        return np.zeros(256, dtype=np.float32)


def extract_hog_features(img):
    try:
        hog      = cv2.HOGDescriptor((128, 128), (16, 16), (8, 8), (8, 8), 9)
        features = hog.compute(img).flatten()
        return features[:256].astype(np.float32)
    except Exception as e:
        print(f"HOG error: {e}")
        return np.zeros(256, dtype=np.float32)


def detect_face(frame):
    try:
        face_roi, _ = detect_face_roi(frame)
        return face_roi is not None
    except Exception as e:
        print(f"Detect error: {e}")
        return False
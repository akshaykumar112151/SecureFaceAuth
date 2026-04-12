import cv2
import numpy as np


def check_real_skin(frame):
    try:
        face_region = analyze_face_region(frame)
        if face_region is None or face_region.size == 0:
            return False, 0.0

        color_ok, color_score = check_color_space(face_region)
        texture_ok, texture_score = check_texture(face_region)
        freq_ok, freq_score = check_frequency(face_region)
        reflection_ok, reflection_score = check_eye_reflection(face_region)
        screen_ok, screen_score = check_screen_artifact(face_region)

        final_score = (
            color_score      * 0.20 +
            texture_score    * 0.30 +
            freq_score       * 0.15 +
            reflection_score * 0.10 +
            screen_score     * 0.25
        )

        # Agar color score bahut low hai → seedha screen/fake
        if color_score < 45.0:
            print(f"[Spoof] FAKE — Color too low: {color_score}")
            return False, round(final_score, 2)

        # Agar screen artifact detect hua → seedha fake
        if not screen_ok:
            print(f"[Spoof] FAKE — Screen detected: {screen_score}")
            return False, round(final_score, 2)

        # Texture bhi fail ho → fake
        if not texture_ok:
            print(f"[Spoof] FAKE — Texture failed: {texture_score}")
            return False, round(final_score, 2)

        is_real = final_score >= 68.0

        print(f"[Spoof] Color:{color_score:.1f} "
              f"Texture:{texture_score:.1f} "
              f"Freq:{freq_score:.1f} "
              f"Eye:{reflection_score:.1f} "
              f"Screen:{screen_score:.1f} "
              f"Final:{final_score:.1f} "
              f"→ {'REAL' if is_real else 'FAKE'}")

        return is_real, round(final_score, 2)

    except Exception as e:
        print(f"Spoof detector error: {e}")
        return False, 0.0


def check_color_space(frame):
    try:
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
        upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
        mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)

        lower_hsv = np.array([0, 15, 60], dtype=np.uint8)
        upper_hsv = np.array([25, 255, 255], dtype=np.uint8)
        mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)

        combined = cv2.bitwise_or(mask_ycrcb, mask_hsv)
        total_pixels = frame.shape[0] * frame.shape[1]
        skin_ratio = np.sum(combined > 0) / total_pixels

        score = min(skin_ratio * 300, 100.0)

        print(f"[Color] skin_ratio:{skin_ratio:.3f} score:{score:.1f}")
        return skin_ratio > 0.08, round(score, 2)

    except Exception as e:
        print(f"Color check error: {e}")
        return False, 0.0


def check_texture(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        lap_var = laplacian.var()

        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        sobel_mag = np.sqrt(sobelx**2 + sobely**2)
        sobel_mean = sobel_mag.mean()

        kernel = np.array([[-1,-1,-1],
                           [-1, 8,-1],
                           [-1,-1,-1]], dtype=np.float32)
        high_freq = cv2.filter2D(gray, -1, kernel)
        micro_var = np.var(high_freq.astype(np.float32))

        lap_score   = min(lap_var / 10, 100.0)
        sobel_score = min(sobel_mean * 2, 100.0)
        micro_score = min(micro_var / 15, 100.0)

        score = (lap_score * 0.40 +
                 sobel_score * 0.30 +
                 micro_score * 0.30)

        is_ok = (lap_var > 150 and
                 sobel_mean > 15 and
                 micro_var > 100)

        print(f"[Texture] lap:{lap_var:.1f} sobel:{sobel_mean:.1f} micro:{micro_var:.1f} ok:{is_ok}")
        return is_ok, round(score, 2)

    except Exception as e:
        print(f"Texture check error: {e}")
        return False, 0.0


def check_frequency(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_float = np.float32(gray)

        dft = cv2.dft(gray_float, flags=cv2.DFT_COMPLEX_OUTPUT)
        dft_shift = np.fft.fftshift(dft)

        magnitude = cv2.magnitude(
            dft_shift[:, :, 0],
            dft_shift[:, :, 1]
        )
        magnitude_log = np.log(magnitude + 1)

        h, w = magnitude_log.shape
        ch, cw = h // 2, w // 2
        r = 30

        center = magnitude_log[ch-r:ch+r, cw-r:cw+r]
        total_energy = np.sum(magnitude_log)
        center_energy = np.sum(center)

        if total_energy > 0:
            high_freq = 1 - (center_energy / total_energy)
        else:
            high_freq = 0

        score = min(high_freq * 300, 100.0)
        return high_freq > 0.25, round(score, 2)

    except Exception as e:
        print(f"Frequency check error: {e}")
        return False, 0.0


def check_screen_artifact(frame):
    """
    Screen detection:
    1. Moire pattern — screen pe hota hai
    2. Color channel uniformity — screen pe uniform hoti hai
    3. Saturation variation — screen pe kam hoti hai
    4. Blue channel dominance — LED screen mein blue zyada hoti hai
    """
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Moire pattern
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        diff = cv2.absdiff(gray, blur)
        moire_val = np.mean(diff)

        # Color channels
        b, g, r = cv2.split(frame)
        b_mean = float(np.mean(b))
        g_mean = float(np.mean(g))
        r_mean = float(np.mean(r))
        channel_std = float(np.std([b_mean, g_mean, r_mean]))

        # Saturation
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        sat_std = float(np.std(hsv[:, :, 1]))

        # Blue dominance check — LED screens mein blue channel high hoti hai
        blue_dominance = b_mean - r_mean

        # Real face conditions
        moire_ok = moire_val > 1.5
        channel_ok = channel_std > 0.1
        sat_ok     = sat_std > 12.0
        blue_ok    = blue_dominance < 25.0  # Screen pe blue zyada hota hai

        score = (
            min(moire_val * 10, 35.0) +
            min(channel_std * 2.5, 35.0) +
            min(sat_std * 1.5, 30.0)
        )

        is_real = moire_ok and channel_ok and sat_ok and blue_ok

        print(f"[Screen] moire:{moire_val:.2f} ch_std:{channel_std:.2f} "
              f"sat_std:{sat_std:.2f} blue_dom:{blue_dominance:.2f} "
              f"ok:{is_real} score:{score:.1f}")

        return is_real, round(score, 2)

    except Exception as e:
        print(f"Screen artifact error: {e}")
        return False, 0.0


def check_eye_reflection(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        eyes = eye_cascade.detectMultiScale(gray, 1.1, 5)

        if len(eyes) == 0:
            return True, 55.0

        reflection_scores = []
        for (ex, ey, ew, eh) in eyes[:2]:
            eye_region = gray[ey:ey+eh, ex:ex+ew]
            _, bright = cv2.threshold(
                eye_region, 220, 255, cv2.THRESH_BINARY
            )
            bright_ratio = np.sum(bright > 0) / (ew * eh)
            reflection_scores.append(bright_ratio)

        avg_ref = float(np.mean(reflection_scores))
        score = min(avg_ref * 2000, 100.0)
        if score < 10.0:
            score = 60.0
           
        return True, round(score, 2)

    except Exception as e:
        print(f"Eye reflection error: {e}")
        return True, 55.0


def analyze_face_region(frame):
    try:
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            return frame

        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

        padding = 20
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(frame.shape[1], x + w + padding)
        y2 = min(frame.shape[0], y + h + padding)

        return frame[y1:y2, x1:x2]

    except Exception as e:
        print(f"Face region error: {e}")
        return frame
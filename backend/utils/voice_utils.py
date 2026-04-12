import numpy as np
import os
import tempfile
import subprocess
import librosa

VOICE_PHRASE    = "My voice is my password, verify me now"
SAMPLE_RATE     = 16000
MFCC_N_MFCC     = 40
MATCH_THRESHOLD = 0.83   # Strict threshold

# Full path to ffmpeg on Windows
FFMPEG_PATH = r"C:\ffmpeg\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"


# ── FEATURE EXTRACTION ────────────────────────────────

def extract_voice_features(audio_bytes: bytes):
    """
    Extract rich speaker-identity features from raw audio bytes.

    Features (256 dims total):
      - MFCC mean + std           (40+40 = 80 dims)
      - Delta MFCC mean + std     (40+40 = 80 dims)
      - Delta-Delta MFCC mean+std (40+40 = 80 dims)  ← NEW: acceleration
      - Spectral contrast         (7+7   = 14 dims)  ← NEW: very speaker-specific
      - Chroma mean + std         (12+12 = 24 dims)  ← NEW: tonal identity  
      - Spectral centroid         (2 dims)
      - ZCR                       (2 dims)
      - Pitch mean + std          (2 dims)
      Total: ~284 dims
    """
    tmp_in_path  = None
    tmp_out_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".webm", ".wav")

        result = subprocess.run(
            [FFMPEG_PATH, "-y", "-i", tmp_in_path,
             "-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "wav", tmp_out_path],
            capture_output=True, timeout=15
        )
        if result.returncode != 0:
            print(f"[Voice] ffmpeg error: {result.stderr.decode()}")
            return None

        y, sr = librosa.load(tmp_out_path, sr=SAMPLE_RATE, mono=True)

        max_val = np.max(np.abs(y))
        if max_val > 0:
            y = y / max_val

        if len(y) < SAMPLE_RATE * 0.3:
            print("[Voice] Audio too short")
            return None

        # ── MFCC (80 dims) ─────────────────────────────
        mfcc           = librosa.feature.mfcc(y=y, sr=SAMPLE_RATE, n_mfcc=MFCC_N_MFCC)
        mfcc_mean      = np.mean(mfcc, axis=1)
        mfcc_std       = np.std(mfcc,  axis=1)

        # ── Delta MFCC (80 dims) ────────────────────────
        delta          = librosa.feature.delta(mfcc)
        delta_mean     = np.mean(delta, axis=1)
        delta_std      = np.std(delta,  axis=1)

        # ── Delta-Delta MFCC (80 dims) — NEW ───────────
        delta2         = librosa.feature.delta(mfcc, order=2)
        delta2_mean    = np.mean(delta2, axis=1)
        delta2_std     = np.std(delta2,  axis=1)

        # ── Spectral Contrast (14 dims) — NEW ──────────
        # Very speaker-specific — captures resonance of vocal tract
        contrast       = librosa.feature.spectral_contrast(y=y, sr=SAMPLE_RATE)
        contrast_mean  = np.mean(contrast, axis=1)
        contrast_std   = np.std(contrast,  axis=1)

        # ── Chroma (24 dims) — NEW ──────────────────────
        # Captures tonal/pitch fingerprint unique to speaker
        chroma         = librosa.feature.chroma_stft(y=y, sr=SAMPLE_RATE)
        chroma_mean    = np.mean(chroma, axis=1)
        chroma_std     = np.std(chroma, axis=1)

        # ── Spectral Centroid (2 dims) ──────────────────
        centroid       = librosa.feature.spectral_centroid(y=y, sr=SAMPLE_RATE)[0]
        centroid_mean  = float(np.mean(centroid))
        centroid_std   = float(np.std(centroid))

        # ── ZCR (2 dims) ────────────────────────────────
        zcr            = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean       = float(np.mean(zcr))
        zcr_std        = float(np.std(zcr))

        # ── Pitch (2 dims) ──────────────────────────────
        try:
            pitches, magnitudes = librosa.piptrack(y=y, sr=SAMPLE_RATE)
            pitch_vals = []
            for t in range(pitches.shape[1]):
                idx = magnitudes[:, t].argmax()
                p   = pitches[idx, t]
                if 80 < p < 400:
                    pitch_vals.append(p)
            if len(pitch_vals) > 5:
                pitch_mean = float(np.mean(pitch_vals))
                pitch_std  = float(np.std(pitch_vals))
            else:
                pitch_mean = 150.0
                pitch_std  = 30.0
        except Exception:
            pitch_mean = 150.0
            pitch_std  = 30.0

        print(f"[Voice] pitch_mean={pitch_mean:.1f}Hz | pitch_vals_count={len(pitch_vals) if 'pitch_vals' in dir() else 0}")

        # ── Combine all features ────────────────────────
        extra = np.array([
            centroid_mean, centroid_std,
            zcr_mean,      zcr_std,
            pitch_mean,    pitch_std,
        ], dtype=np.float32)

        features = np.concatenate([
            mfcc_mean,    mfcc_std,       # 80
            delta_mean,   delta_std,      # 80
            delta2_mean,  delta2_std,     # 80
            contrast_mean, contrast_std,  # 14
            chroma_mean,  chroma_std,     # 24
            extra                         # 6
        ])

        norm = np.linalg.norm(features)
        if norm > 0:
            features = features / norm

        print(f"[Voice] Features extracted: {len(features)} dims | pitch={pitch_mean:.1f}Hz")
        return features.astype(np.float32)

    except Exception as e:
        print(f"[Voice] Feature extraction error: {e}")
        return None

    finally:
        try:
            if tmp_in_path  and os.path.exists(tmp_in_path):  os.unlink(tmp_in_path)
            if tmp_out_path and os.path.exists(tmp_out_path): os.unlink(tmp_out_path)
        except Exception:
            pass


# ── VOICE MATCH ───────────────────────────────────────

def match_voice(new_features, stored_features):
    """
    Compare speaker feature vectors using cosine similarity.
    Score mapped [-1,1] → [0,100].
    Threshold: 83% — strict speaker verification.
    """
    try:
        if new_features is None or stored_features is None:
            return False, 0.0

        min_len = min(len(new_features), len(stored_features))

        if abs(len(new_features) - len(stored_features)) > 10:
            print(f"[Voice] Dimension mismatch: {len(new_features)} vs {len(stored_features)} — re-enroll voice")
            return False, 0.0

        a = new_features[:min_len]
        b = stored_features[:min_len]

        dot = np.dot(a, b)
        na  = np.linalg.norm(a)
        nb  = np.linalg.norm(b)

        if na == 0 or nb == 0:
            return False, 0.0

        similarity = dot / (na * nb)

        # Map [-1,1] → [0,100]
        score = float((similarity + 1) / 2) * 100

        print(f"[Voice] Match score: {score:.2f}% | threshold: {MATCH_THRESHOLD * 100}%")
        return score >= (MATCH_THRESHOLD * 100), score

    except Exception as e:
        print(f"[Voice] Match error: {e}")
        return False, 0.0


# ── AVERAGE ENROLLMENTS ───────────────────────────────

def average_voice_features(feature_list: list):
    """Average multiple voice feature vectors into one enrollment profile."""
    try:
        if not feature_list:
            return None
        stacked = np.stack(feature_list, axis=0)
        avg     = np.mean(stacked, axis=0)
        norm    = np.linalg.norm(avg)
        if norm > 0:
            avg = avg / norm
        return avg.astype(np.float32)
    except Exception as e:
        print(f"[Voice] Average error: {e}")
        return None
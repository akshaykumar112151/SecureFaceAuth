from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from extensions import db, mail
from models.user import User
from models.auth_log import AuthLog
import base64
import numpy as np
import cv2
from datetime import datetime, timezone, timedelta

auth_bp = Blueprint('auth', __name__)

# ===== IST TIME HELPER =====
def get_ist_time():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%d %b %Y, %I:%M:%S %p")

# ===== SEND EMAIL HELPER =====
def send_auth_email(user_email, user_name, status, reason, scores=None):
    try:
        ist_time = get_ist_time()
        if status == 'success':
            subject = "✅ Login Successful — SecureFaceAuth"
            body = f"""
Hello {user_name},

Your SecureFaceAuth account was successfully accessed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Time       : {ist_time}
  Status     : SUCCESS ✅
  Face Match : {scores.get('face_match', '—')}%
  Liveness   : {scores.get('liveness', '—')}%
  Skin Score : {scores.get('skin', '—')}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If this was not you, please contact admin immediately.

— SecureFaceAuth System
            """
        else:
            subject = "🚨 Alert: Failed Login Attempt — SecureFaceAuth"
            body = f"""
Hello {user_name},

A failed authentication attempt was detected on your account.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Time   : {ist_time}
  Status : {status.upper()} ❌
  Reason : {reason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If this was not you, please contact admin immediately.

— SecureFaceAuth System
            """
        msg = Message(subject=subject, recipients=[user_email], body=body)
        mail.send(msg)
        print(f"[Email] Sent to {user_email} — {status}")
    except Exception as e:
        print(f"[Email] Failed to send: {e}")


# ===== REGISTER =====
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Name, email and password are required'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email is already registered'}), 409
    new_user = User(
        name=data['name'], email=data['email'],
        password=generate_password_hash(data['password']), role='user'
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully!', 'user_id': new_user.id}), 201


# ===== LOGIN =====
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not check_password_hash(user.password, data.get('password')):
        return jsonify({'message': 'Incorrect email or password'}), 401
    if not user.is_active:
        return jsonify({'message': 'Account has been disabled'}), 403
    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful!', 'token': token,
        'user': {
            'id': user.id, 'name': user.name, 'email': user.email,
            'role': user.role, 'is_face_enrolled': user.is_face_enrolled,
            'is_voice_enrolled': user.is_voice_enrolled,
            'face_encodings_count': user.face_encodings_count
        }
    }), 200


# ===== GET CHALLENGE =====
@auth_bp.route('/get-challenge', methods=['GET'])
def get_challenge():
    from utils.liveness import get_random_challenge
    challenge = get_random_challenge()
    return jsonify({'challenge_key': challenge['key'], 'challenge_label': challenge['label']}), 200


# ===== ENROLL FACE =====
@auth_bp.route('/enroll-face', methods=['POST'])
@jwt_required()
def enroll_face():
    from utils.face_utils import extract_face_encoding
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    data = request.get_json()
    image_data = data.get('image')
    angle = data.get('angle', 'front')
    if not image_data:
        return jsonify({'message': 'Image is required'}), 400
    if angle not in ['front', 'left', 'right', 'up', 'down']:
        return jsonify({'message': 'Invalid angle'}), 400
    img_bytes = base64.b64decode(image_data.split(',')[1])
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, 1)
    encoding, err = extract_face_encoding(frame)
    if err == "multiple_faces":
        return jsonify({'message': 'Multiple faces detected'}), 400
    if encoding is None:
        return jsonify({'message': f'Face not detected for {angle} angle'}), 400
    user.set_face_encoding(encoding, angle)
    db.session.commit()
    enrolled_angles = [a for a in ['front','left','right','up','down'] if user.get_face_encoding(a) is not None]
    return jsonify({
        'message': f'{angle} angle enrolled!',
        'enrolled_angles': enrolled_angles,
        'count': user.face_encodings_count,
        'is_complete': user.is_face_enrolled
    }), 200


# ===== ENROLL VOICE =====
@auth_bp.route('/enroll-voice', methods=['POST'])
@jwt_required()
def enroll_voice():
    from utils.voice_utils import extract_voice_features, average_voice_features
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    data = request.get_json()
    audio_samples = data.get('audio_samples', [])
    if not audio_samples:
        return jsonify({'message': 'At least 1 audio sample required'}), 400
    feature_list = []
    for sample_b64 in audio_samples:
        try:
            features = extract_voice_features(base64.b64decode(sample_b64))
            if features is not None:
                feature_list.append(features)
        except Exception as e:
            print(f"[VoiceEnroll] Sample error: {e}")
    if not feature_list:
        return jsonify({'message': 'Voice not detected — please speak clearly'}), 400
    avg_features = average_voice_features(feature_list)
    if avg_features is None:
        return jsonify({'message': 'Voice enrollment failed — try again'}), 400
    user.set_voice_encoding(avg_features)
    db.session.commit()
    return jsonify({'message': 'Voice enrolled!', 'samples_used': len(feature_list), 'is_voice_enrolled': True}), 200


# ===== VOICE STATUS =====
@auth_bp.route('/voice-status', methods=['GET'])
@jwt_required()
def voice_status():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'is_voice_enrolled': user.is_voice_enrolled}), 200


# ===== ENROLL STATUS =====
@auth_bp.route('/enroll-status', methods=['GET'])
@jwt_required()
def enroll_status():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    enrolled_angles = [a for a in ['front','left','right','up','down'] if user.get_face_encoding(a) is not None]
    return jsonify({
        'enrolled_angles': enrolled_angles,
        'count': user.face_encodings_count,
        'is_complete': user.is_face_enrolled,
        'is_voice_enrolled': user.is_voice_enrolled
    }), 200


# ===== RECENT ACTIVITY =====
@auth_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def recent_activity():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    logs = AuthLog.query.filter_by(user_id=user.id).order_by(AuthLog.timestamp.desc()).limit(5).all()
    ist = timezone(timedelta(hours=5, minutes=30))
    activity = []
    for log in logs:
        ts_utc = log.timestamp.replace(tzinfo=timezone.utc) if log.timestamp.tzinfo is None else log.timestamp
        ts_ist = ts_utc.astimezone(ist)
        activity.append({
            'status': log.status, 'reason': log.reason,
            'time': ts_ist.strftime("%d %b, %I:%M %p"),
            'face_score': round(log.face_match_score, 1) if log.face_match_score else 0,
        })
    return jsonify({'activity': activity}), 200


# ═══════════════════════════════════════════════════════
# ===== STEP-WISE AUTH ROUTES (NEW) =====================
# ═══════════════════════════════════════════════════════

def _decode_image(image_data):
    """Helper: base64 image → cv2 frame"""
    img_bytes = base64.b64decode(image_data.split(',')[1])
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(img_array, 1)

def _decode_frames(frames_data):
    """Helper: list of base64 images → list of cv2 frames"""
    frames = []
    for fd in frames_data:
        try:
            fb = base64.b64decode(fd.split(',')[1])
            fa = np.frombuffer(fb, dtype=np.uint8)
            f  = cv2.imdecode(fa, 1)
            if f is not None:
                frames.append(f)
        except Exception:
            continue
    return frames


# ── STEP 1: Face Match + Blink ────────────────────────
@auth_bp.route('/step/blink', methods=['POST'])
def step_blink():
    """
    Checks:
      1. Face detected
      2. Face matches enrolled user
      3. Blink detected (liveness)
    Returns: pass/fail immediately
    """
    from utils.face_utils import extract_face_encoding
    from utils.liveness import check_blink, check_blink_sequence

    data        = request.get_json()
    email       = data.get('email')
    image_data  = data.get('image')
    frames_data = data.get('frames', [])

    if not email or not image_data:
        return jsonify({'message': 'Email and image required', 'step': 'face_match'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_face_enrolled:
        return jsonify({'message': 'User not found or face not enrolled', 'step': 'face_match'}), 404

    frame = _decode_image(image_data)

    # ── 1A. Face encoding ──
    encoding, err = extract_face_encoding(frame)
    if err == "multiple_faces":
        _log(user.id, 'spoof', 'Multiple faces detected', 0, 0, 0)
        send_auth_email(user.email, user.name, 'spoof', 'Multiple faces detected')
        return jsonify({'message': '🚨 Spoof Alert: Multiple faces detected!', 'step': 'face_match', 'passed': False}), 401
    if encoding is None:
        _log(user.id, 'failed', 'Face not detected', 0, 0, 0)
        return jsonify({'message': 'Face not detected — look straight at camera', 'step': 'face_match', 'passed': False}), 400

    # ── 1B. Face match ──
    match, face_score = user.get_best_match_score(encoding)
    if not match:
        _log(user.id, 'failed', 'Face match failed', face_score, 0, 0)
        send_auth_email(user.email, user.name, 'failed', 'Face match failed')
        return jsonify({'message': '🚨 Spoof Alert: Face not recognized!', 'step': 'face_match', 'passed': False, 'score': round(face_score, 2)}), 401

    # ── 1C. Blink ──
    frames = _decode_frames(frames_data)
    if len(frames) >= 3:
        blink_ok, liveness_score = check_blink_sequence(frames)
    else:
        blink_ok, liveness_score = check_blink(frame)

    if not blink_ok:
        _log(user.id, 'spoof', 'Blink not detected', face_score, liveness_score, 0)
        send_auth_email(user.email, user.name, 'spoof', 'Blink not detected')
        return jsonify({'message': '🚨 Spoof Alert: Please blink naturally!', 'step': 'liveness', 'passed': False, 'score': round(liveness_score, 2)}), 401

    # ── PASS ──
    print(f"[Step-Blink] PASS | face:{face_score:.1f}% liveness:{liveness_score:.1f}%")
    return jsonify({
        'message': 'Face & Liveness verified ✅',
        'passed': True,
        'face_score': round(face_score, 2),
        'liveness_score': round(liveness_score, 2),
        'user_id': user.id,
        'is_voice_enrolled': user.is_voice_enrolled,
    }), 200


# ── STEP 2: Challenge ─────────────────────────────────
@auth_bp.route('/step/challenge', methods=['POST'])
def step_challenge():
    """
    Checks random challenge action in frames.
    Returns: pass/fail immediately
    """
    from utils.liveness import check_challenge, get_random_challenge

    data                  = request.get_json()
    email                 = data.get('email')
    challenge_key         = data.get('challenge_key', '')
    challenge_frames_data = data.get('challenge_frames', [])

    if not email:
        return jsonify({'message': 'Email required', 'step': 'challenge'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found', 'step': 'challenge'}), 404

    if not challenge_key or not challenge_frames_data:
        return jsonify({'message': 'Challenge data missing', 'step': 'challenge', 'passed': False}), 400

    frames = _decode_frames(challenge_frames_data)
    if not frames:
        return jsonify({'message': 'No valid frames received', 'step': 'challenge', 'passed': False}), 400

    challenge_ok, challenge_score = check_challenge(frames, challenge_key)

    if not challenge_ok:
        _log(user.id, 'spoof', f'Challenge failed: {challenge_key}', 0, 0, 0)
        send_auth_email(user.email, user.name, 'spoof', f'Challenge failed: {challenge_key}')
        return jsonify({'message': f'🚨 Spoof Alert: Challenge not performed correctly!', 'step': 'challenge', 'passed': False, 'score': round(challenge_score, 2)}), 401

    print(f"[Step-Challenge] PASS | score:{challenge_score:.1f}%")
    return jsonify({'message': 'Challenge passed ✅', 'passed': True, 'score': round(challenge_score, 2)}), 200


# ── STEP 3: Voice Match ───────────────────────────────
@auth_bp.route('/step/voice', methods=['POST'])
def step_voice():
    """
    Checks voice match against enrolled profile.
    Only called if user has voice enrolled.
    Returns: pass/fail immediately
    """
    from utils.voice_utils import extract_voice_features, match_voice

    data       = request.get_json()
    email      = data.get('email')
    voice_data = data.get('voice')

    if not email or not voice_data:
        return jsonify({'message': 'Email and voice required', 'step': 'voice_match'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found', 'step': 'voice_match'}), 404

    if not user.is_voice_enrolled:
        # Voice not enrolled — skip this step
        return jsonify({'message': 'Voice not enrolled — skipped', 'passed': True, 'skipped': True}), 200

    try:
        audio_bytes    = base64.b64decode(voice_data)
        voice_features = extract_voice_features(audio_bytes)
        stored_voice   = user.get_voice_encoding()

        if voice_features is None or stored_voice is None:
            return jsonify({'message': 'Could not extract voice features — try again', 'step': 'voice_match', 'passed': False}), 400

        voice_ok, voice_score = match_voice(voice_features, stored_voice)
        print(f"[Step-Voice] score:{voice_score:.2f}% | ok:{voice_ok}")

        if not voice_ok:
            _log(user.id, 'spoof', 'Voice match failed', 0, 0, 0)
            send_auth_email(user.email, user.name, 'spoof', 'Voice match failed')
            return jsonify({'message': '🚨 Spoof Alert: Voice not recognized!', 'step': 'voice_match', 'passed': False, 'score': round(voice_score, 2)}), 401

        return jsonify({'message': 'Voice verified ✅', 'passed': True, 'score': round(voice_score, 2)}), 200

    except Exception as e:
        print(f"[Step-Voice] Error: {e}")
        return jsonify({'message': 'Voice check error — try again', 'step': 'voice_match', 'passed': False}), 500


# ── STEP 4: Skin Check + Grant Access ─────────────────
@auth_bp.route('/step/final', methods=['POST'])
def step_final():
    """
    Final step:
      - Skin/spoof analysis
      - If pass → generate token, log success, send email
    """
    from utils.spoof_detector import check_real_skin

    data       = request.get_json()
    email      = data.get('email')
    image_data = data.get('image')  # same blink image reuse

    # scores from previous steps (for logging)
    face_score     = data.get('face_score', 0)
    liveness_score = data.get('liveness_score', 0)
    voice_score    = data.get('voice_score', 0)

    if not email or not image_data:
        return jsonify({'message': 'Email and image required', 'step': 'skin_check'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found', 'step': 'skin_check'}), 404

    frame = _decode_image(image_data)
    skin_ok, skin_score = check_real_skin(frame)

    if not skin_ok:
        _log(user.id, 'spoof', 'Real skin not detected', face_score, liveness_score, skin_score)
        send_auth_email(user.email, user.name, 'spoof', 'Real skin not detected')
        return jsonify({'message': '🚨 Spoof Alert: Fake skin detected!', 'step': 'skin_check', 'passed': False, 'score': round(skin_score, 2)}), 401

    # ── ALL PASSED — Grant Access ──
    token = create_access_token(identity=str(user.id))
    _log(user.id, 'success', 'Authentication successful', face_score, liveness_score, skin_score)
    send_auth_email(user.email, user.name, 'success', 'Authentication successful', {
        'face_match': round(face_score, 2),
        'liveness':   round(liveness_score, 2),
        'skin':       round(skin_score, 2),
    })

    return jsonify({
        'message': 'Access Granted! ✅',
        'passed': True,
        'token': token,
        'user': {
            'id': user.id, 'name': user.name, 'email': user.email,
            'role': user.role, 'is_face_enrolled': user.is_face_enrolled,
            'is_voice_enrolled': user.is_voice_enrolled,
        },
        'scores': {
            'face_match': round(face_score, 2),
            'liveness':   round(liveness_score, 2),
            'skin':       round(skin_score, 2),
            'voice':      round(voice_score, 2),
        }
    }), 200


# ===== OLD FACE-AUTH (keep for backward compat) =====
@auth_bp.route('/face-auth', methods=['POST'])
def face_authenticate():
    from utils.face_utils import extract_face_encoding
    from utils.liveness import check_blink, check_blink_sequence, check_challenge
    from utils.spoof_detector import check_real_skin
    from utils.voice_utils import extract_voice_features, match_voice

    data                  = request.get_json()
    email                 = data.get('email')
    image_data            = data.get('image')
    frames_data           = data.get('frames', [])
    challenge_frames_data = data.get('challenge_frames', [])
    challenge_key         = data.get('challenge_key', '')
    voice_data            = data.get('voice', None)

    if not email or not image_data:
        return jsonify({'message': 'Email and image are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_face_enrolled:
        return jsonify({'message': 'User not found or face not enrolled'}), 404

    frame = _decode_image(image_data)

    encoding, err = extract_face_encoding(frame)
    if err == "multiple_faces":
        _log(user.id, 'spoof', 'Multiple faces detected', 0, 0, 0)
        send_auth_email(user.email, user.name, 'spoof', 'Multiple faces detected')
        return jsonify({'message': 'Alert: Multiple faces detected!', 'step': 'face_match'}), 401
    if encoding is None:
        _log(user.id, 'failed', 'Face not detected', 0, 0, 0)
        return jsonify({'message': 'Face not detected', 'step': 'face_match'}), 400

    match, score = user.get_best_match_score(encoding)
    if not match:
        _log(user.id, 'failed', 'Face match failed', score, 0, 0)
        send_auth_email(user.email, user.name, 'failed', 'Face match failed')
        return jsonify({'message': 'Alert: Face match failed!', 'step': 'face_match'}), 401

    frames = _decode_frames(frames_data)
    if len(frames) >= 3:
        blink_ok, liveness_score = check_blink_sequence(frames)
    else:
        blink_ok, liveness_score = check_blink(frame)

    if not blink_ok:
        _log(user.id, 'spoof', 'Blink not detected', score, liveness_score, 0)
        send_auth_email(user.email, user.name, 'spoof', 'Blink not detected')
        return jsonify({'message': 'Alert: Spoof detected — please blink!', 'step': 'liveness'}), 401

    if challenge_key and challenge_frames_data:
        cframes = _decode_frames(challenge_frames_data)
        if cframes:
            challenge_ok, challenge_score = check_challenge(cframes, challenge_key)
            liveness_score = (liveness_score + challenge_score) / 2.0
            if not challenge_ok:
                _log(user.id, 'spoof', f'Challenge failed: {challenge_key}', score, liveness_score, 0)
                send_auth_email(user.email, user.name, 'spoof', f'Challenge failed: {challenge_key}')
                return jsonify({'message': 'Alert: Challenge failed!', 'step': 'challenge'}), 401

    voice_score = 0.0
    if user.is_voice_enrolled and voice_data:
        try:
            voice_features = extract_voice_features(base64.b64decode(voice_data))
            stored_voice   = user.get_voice_encoding()
            if voice_features is not None and stored_voice is not None:
                voice_ok, voice_score = match_voice(voice_features, stored_voice)
                if not voice_ok:
                    _log(user.id, 'spoof', 'Voice match failed', score, liveness_score, 0)
                    send_auth_email(user.email, user.name, 'spoof', 'Voice match failed')
                    return jsonify({'message': 'Alert: Voice not recognized!', 'step': 'voice_match'}), 401
        except Exception as e:
            print(f"[Voice] Error: {e}")

    skin_ok, skin_score = check_real_skin(frame)
    if not skin_ok:
        _log(user.id, 'spoof', 'Real skin not detected', score, liveness_score, skin_score)
        send_auth_email(user.email, user.name, 'spoof', 'Real skin not detected')
        return jsonify({'message': 'Alert: Spoof detected — fake skin!', 'step': 'skin_check'}), 401

    token = create_access_token(identity=str(user.id))
    _log(user.id, 'success', 'Authentication successful', score, liveness_score, skin_score)
    send_auth_email(user.email, user.name, 'success', 'Authentication successful', {
        'face_match': round(score, 2), 'liveness': round(liveness_score, 2), 'skin': round(skin_score, 2)
    })
    return jsonify({
        'message': 'Access Granted!', 'token': token,
        'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role,
                 'is_face_enrolled': user.is_face_enrolled, 'is_voice_enrolled': user.is_voice_enrolled},
        'scores': {'face_match': round(score,2), 'liveness': round(liveness_score,2),
                   'skin': round(skin_score,2), 'voice': round(voice_score,2)}
    }), 200


# ===== HELPER =====
def _log(user_id, status, reason, face_score, liveness_score, skin_score):
    log = AuthLog(
        user_id=user_id, status=status, reason=reason,
        face_match_score=face_score, liveness_score=liveness_score,
        skin_score=skin_score, ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
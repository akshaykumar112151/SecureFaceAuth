from datetime import datetime
from extensions import db
import json
import numpy as np


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')

    # ── Face Encodings ────────────────────────────────
    face_encoding_front = db.Column(db.Text, nullable=True)
    face_encoding_left  = db.Column(db.Text, nullable=True)
    face_encoding_right = db.Column(db.Text, nullable=True)
    face_encoding_up    = db.Column(db.Text, nullable=True)
    face_encoding_down  = db.Column(db.Text, nullable=True)
    face_encodings_count = db.Column(db.Integer, default=0)
    is_face_enrolled    = db.Column(db.Boolean, default=False)

    # ── Voice Encoding ────────────────────────────────
    voice_encoding      = db.Column(db.Text, nullable=True)   # averaged MFCC profile
    is_voice_enrolled   = db.Column(db.Boolean, default=False)

    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active   = db.Column(db.Boolean, default=True)

    # ── Face Methods ──────────────────────────────────

    def set_face_encoding(self, encoding_array, angle='front'):
        encoding_json = json.dumps(encoding_array.tolist())
        if angle == 'front':
            self.face_encoding_front = encoding_json
        elif angle == 'left':
            self.face_encoding_left = encoding_json
        elif angle == 'right':
            self.face_encoding_right = encoding_json
        elif angle == 'up':
            self.face_encoding_up = encoding_json
        elif angle == 'down':
            self.face_encoding_down = encoding_json

        count = sum(1 for e in [
            self.face_encoding_front,
            self.face_encoding_left,
            self.face_encoding_right,
            self.face_encoding_up,
            self.face_encoding_down
        ] if e is not None)
        self.face_encodings_count = count
        self.is_face_enrolled = count >= 5

    def get_face_encoding(self, angle='front'):
        encoding_map = {
            'front': self.face_encoding_front,
            'left':  self.face_encoding_left,
            'right': self.face_encoding_right,
            'up':    self.face_encoding_up,
            'down':  self.face_encoding_down,
        }
        enc = encoding_map.get(angle)
        if enc:
            return np.array(json.loads(enc))
        return None

    def get_all_encodings(self):
        encodings = []
        for angle in ['front', 'left', 'right', 'up', 'down']:
            enc = self.get_face_encoding(angle)
            if enc is not None:
                encodings.append(enc)
        return encodings

    def get_best_match_score(self, new_encoding):
        from utils.face_utils import match_face
        all_encodings = self.get_all_encodings()
        if not all_encodings:
            return False, 0.0
        best_score = 0.0
        for stored_enc in all_encodings:
            match, score = match_face(new_encoding, stored_enc)
            if score > best_score:
                best_score = score
        return best_score >= 60.0, best_score

    # ── Voice Methods ─────────────────────────────────

    def set_voice_encoding(self, encoding_array):
        """Store averaged voice MFCC profile."""
        self.voice_encoding    = json.dumps(encoding_array.tolist())
        self.is_voice_enrolled = True

    def get_voice_encoding(self):
        """Return voice encoding as numpy array, or None."""
        if self.voice_encoding:
            return np.array(json.loads(self.voice_encoding), dtype=np.float32)
        return None

    def __repr__(self):
        return f'<User {self.email}>'
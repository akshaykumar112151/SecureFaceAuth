from datetime import datetime
from extensions import db

class AuthLog(db.Model):
    __tablename__ = 'auth_logs'

    id = db.Column(db.Integer, primary_key=True)
    
    # Kis user ne try kiya
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    user = db.relationship('User', backref='auth_logs')
    
    # Auth result
    status = db.Column(db.String(20), nullable=False)  # 'success', 'failed', 'spoof'
    reason = db.Column(db.String(255), nullable=True)  # Failure reason
    
    # Anti-spoofing scores
    face_match_score = db.Column(db.Float, nullable=True)
    liveness_score = db.Column(db.Float, nullable=True)
    skin_score = db.Column(db.Float, nullable=True)
    
    # Extra info
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'status': self.status,
            'reason': self.reason,
            'face_match_score': self.face_match_score,
            'liveness_score': self.liveness_score,
            'skin_score': self.skin_score,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

    def __repr__(self):
        return f'<AuthLog {self.status} - {self.timestamp}>'
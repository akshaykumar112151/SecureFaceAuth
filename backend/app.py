from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, jwt, mail
from models.user import User
from models.auth_log import AuthLog
from routes.auth import auth_bp
from routes.admin import admin_bp
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── Flask-Mail Config ──────────────────────────
    app.config['MAIL_SERVER']   = 'smtp.gmail.com'
    app.config['MAIL_PORT']     = 587
    app.config['MAIL_USE_TLS']  = True
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_EMAIL')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_EMAIL')
    # ──────────────────────────────────────────────

    # CORS — sabse pehle initialize karo
    CORS(app,
         origins=["http://localhost:5173", "http://127.0.0.1:5173"],
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         supports_credentials=True
    )

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    with app.app_context():
        db.create_all()
        print("✅ Database tables created!")
        create_admin()

    return app

def create_admin():
    from werkzeug.security import generate_password_hash
    admin = User.query.filter_by(email='admin@faceauth.com').first()
    if not admin:
        admin = User(
            name='Admin',
            email='admin@faceauth.com',
            password=generate_password_hash('admin123'),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin user created!")

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
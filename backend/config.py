import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'faceauth_db')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'admin123')
    
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'faceauth_secure_key_32bytes_ok!!')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # Flask
    DEBUG = os.getenv('FLASK_DEBUG', True)
    SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'faceauth_secure_key_32bytes_ok!!')

# SecureFaceAuth — Multi-Layer Biometric Authentication System with Real-Time Anti-Spoofing

> **Final Year Engineering Project**
> Hindustan College of Science and Technology
> Developed by **Group 11** — Akshay Kumar, Aryan Singh, Chetanya Kaushik, Gaurav Singh

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-black?logo=flask)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)](https://postgresql.org)
[![DeepFace](https://img.shields.io/badge/DeepFace-Facenet512-orange)](https://github.com/serengil/deepface)

---

## Overview

**SecureFaceAuth** is a production-grade, web-based biometric authentication system that protects user accounts through a **5-step sequential verification pipeline**. Each step must pass independently — failure at any layer immediately triggers a **Spoof Alert**, denies access, and logs the attempt with full forensic detail.

The system is designed to resist the full spectrum of biometric spoofing attacks including printed photographs, screen replay, video deepfakes, and impersonation — without relying on any cloud facial recognition services.

### Why SecureFaceAuth?

Traditional password-based authentication is vulnerable to phishing, credential stuffing, and brute force. Single-factor biometrics (face unlock alone) are trivially defeated with a photograph. SecureFaceAuth addresses this by combining **five independent biometric and behavioral signals** that must all pass simultaneously — making it exponentially harder to spoof than any single-factor system.

---

## Key Innovations

- **DeepFace Facenet512 Integration** — 512-dimensional deep neural face embeddings with 82% cosine similarity threshold. Significantly more robust than traditional handcrafted features.
- **Step-wise Auth Pipeline** — Each of the 5 steps is evaluated independently via separate API endpoints. A spoof alert fires immediately upon any step failure — not at the end.
- **7-Action Randomized Challenge** — Random behavioral challenge (look left/right/up/down, wink left/right, open mouth) selected per session. Defeats static video replay attacks.
- **5-Layer Skin Spoof Detector** — Custom weighted scoring across color space analysis, screen artifact detection (Moiré patterns), texture analysis, frequency domain analysis, and corneal reflection detection.
- **Multi-Angle Face Enrollment** — Users enroll from 5 angles (front, left, right, up, down). Authentication matches against all angles and uses the best score.
- **Real-Time Alert System** — Spoof attempts trigger immediate email notifications to the account holder with timestamp, failure reason, and IP address.
- **Admin Dashboard** — Full audit trail with per-attempt scores, IST timestamps, and user management.

---

## Authentication Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    FACE AUTHENTICATION                       │
│                    5-Step Pipeline                           │
└─────────────────────────────────────────────────────────────┘

  Camera Input
       │
       ▼
┌─────────────────────────────────────────┐
│  STEP 1: Face Match                     │
│  DeepFace Facenet512 (512-dim)          │
│  Cosine Similarity ≥ 82%               │
│  Multi-angle best-score matching        │
│  ✅ Pass → Step 2   ❌ Fail → SPOOF    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  STEP 2: Liveness Detection             │
│  EAR (Eye Aspect Ratio) via MediaPipe   │
│  10-frame blink sequence analysis       │
│  OPEN → CLOSED → OPEN pattern required  │
│  ✅ Pass → Step 3   ❌ Fail → SPOOF    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  STEP 3: Behavioral Challenge           │
│  7 randomized actions per session       │
│  look_left / look_right / look_up /     │
│  look_down / wink_left / wink_right /   │
│  mouth_open                             │
│  Wrong direction = immediate FAIL       │
│  ✅ Pass → Step 4   ❌ Fail → SPOOF    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  STEP 4: Voice Match (Experimental)     │
│  MFCC + Delta + Spectral features       │
│  284-dimensional feature vector         │
│  Cosine Similarity ≥ 83%               │
│  Only triggered if voice enrolled       │
│  ✅ Pass → Step 5   ❌ Fail → SPOOF    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  STEP 5: Skin / Anti-Spoof Analysis     │
│  5-layer weighted detector              │
│  Final Score ≥ 68%                     │
│  ✅ Pass → ACCESS GRANTED              │
│  ❌ Fail → SPOOF                       │
└────────────────────┬────────────────────┘
                     │
                     ▼
              🎉 JWT Token Issued
              📧 Success Email Sent
              📋 Logged to DB
```

---

## Tech Stack

### Backend

| Technology         | Version | Purpose                                     |
| ------------------ | ------- | ------------------------------------------- |
| Python             | 3.10    | Core backend language                       |
| Flask              | 3.1.3   | REST API framework                          |
| Flask-JWT-Extended | 4.7.1   | JWT authentication (24-hour tokens)         |
| Flask-SQLAlchemy   | 3.1.1   | ORM for PostgreSQL                          |
| Flask-Mail         | 0.10.0  | Email alert system                          |
| Flask-CORS         | 6.0.2   | Cross-origin request handling               |
| DeepFace           | latest  | Facenet512 face embeddings                  |
| OpenCV             | 4.8.0   | Image processing                            |
| MediaPipe          | 0.10.9  | FaceMesh landmarks for liveness & challenge |
| TensorFlow-CPU     | 2.15.0  | CNN backend for DeepFace & skin detector    |
| librosa            | latest  | Voice feature extraction (MFCC)             |
| NumPy              | 1.26.4  | Feature vector computation                  |
| PostgreSQL         | 17      | Relational database                         |
| psycopg2-binary    | 2.9.11  | PostgreSQL adapter                          |

### Frontend

| Technology         | Purpose             |
| ------------------ | ------------------- |
| React.js 18 + Vite | UI framework        |
| react-webcam       | Camera feed access  |
| axios              | API communication   |
| react-router-dom   | Client-side routing |
| Lucide React       | Icons               |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)                            │
│  LoginPage │ RegisterPage │ FaceAuthPage │ DashboardPage │ AdminPage │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTP REST (JSON)
                             │ JWT Bearer Token
┌────────────────────────────▼─────────────────────────────────────────┐
│                      FLASK BACKEND (Python 3.10)                     │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │  auth.py    │    │  admin.py    │    │  JWT Middleware         │  │
│  │  (Routes)   │    │  (Routes)    │    │  Flask-Mail Alerts      │  │
│  └──────┬──────┘    └──────┬───────┘    └────────────────────────┘  │
│         │                  │                                         │
│  ┌──────▼──────────────────▼──────────────────────────────────┐     │
│  │                    Utils Layer                              │     │
│  │  face_utils.py   │ liveness.py │ voice_utils.py            │     │
│  │  (DeepFace       │ (EAR blink  │ (MFCC 284-dim)            │     │
│  │   Facenet512)    │  + challenge│                            │     │
│  │                  │  detection) │ spoof_detector.py          │     │
│  │                               │ (5-layer skin analysis)    │     │
│  └───────────────────────────────┬────────────────────────────┘     │
│                                  │                                   │
│  ┌───────────────────────────────▼────────────────────────────┐     │
│  │                  PostgreSQL Database                        │     │
│  │  users table (face_encoding_*, voice_encoding)             │     │
│  │  auth_logs table (scores, reason, ip, timestamp IST)       │     │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Feature Details

### Step 1: Face Match — DeepFace Facenet512

The face matching engine uses **DeepFace with the Facenet512 model**, producing a 512-dimensional embedding for each face. Authentication computes cosine similarity between the live frame embedding and all 5 stored enrollment angle embeddings, selecting the best score.

```
Embedding dimensions : 512
Similarity metric    : Cosine similarity
Match threshold      : 82.0%
Enrollment angles    : front, left, right, up, down
Matching strategy    : Best score across all enrolled angles
```

Multi-person detection is applied before matching — if more than one face is detected in the frame, the attempt is immediately flagged as a spoof.

---

### Step 2: Liveness Detection — EAR Blink Sequence

Liveness is verified using **Eye Aspect Ratio (EAR)** computed from MediaPipe FaceMesh landmarks over a 10-frame sequence.

```
EAR = (||p2 - p6|| + ||p3 - p5||) / (2 × ||p1 - p4||)
```

A genuine blink requires the OPEN → CLOSED → OPEN transition within the frame sequence. The system detects both clean blinks (EAR drops below 0.19) and partial blinks (significant EAR range variation).

```
Clean blink score  : 81–95% (based on blink depth)
Partial blink score: 68–78%
No blink           : FAIL → Spoof Alert
```

---

### Step 3: Behavioral Challenge — 7 Random Actions

A random action is selected from 7 options per authentication session:

| Challenge  | Detection Method                        |
| ---------- | --------------------------------------- |
| Look Left  | Nose tip X offset from face center      |
| Look Right | Nose tip X offset from face center      |
| Look Up    | Nose tip Y offset from face center      |
| Look Down  | Nose tip Y offset from face center      |
| Wink Left  | Left EAR significantly lower than right |
| Wink Right | Right EAR significantly lower than left |
| Mouth Open | Mouth aspect ratio threshold            |

Actions are verified across 10 frames. Performing the **opposite** action (e.g., looking right when told left) immediately fails the challenge — preventing random guessing attacks.

---

### Step 4: Voice Match — Experimental Feature

Voice authentication extracts a **284-dimensional feature vector** from the enrolled phrase _"My voice is my password, verify me now"_ and compares it using cosine similarity.

```
Features: MFCC mean+std (80) + Delta MFCC (80) + Delta-Delta MFCC (80)
        + Spectral Contrast (14) + Chroma (24) + Centroid/ZCR/Pitch (6)
Total   : 284 dimensions
Threshold: 83%
Enrollment: 3-sample averaged profile
```

> ⚠️ **Note:** The current MFCC-based voice matching is phrase-dependent rather than fully speaker-independent. Full speaker verification using a pretrained neural model (e.g., ECAPA-TDNN via cloud API) is planned as future work.

---

### Step 5: Anti-Spoof Skin Analysis — 5-Layer Detector

A custom 5-layer weighted scoring system analyzes the captured frame for signs of spoofing:

```
Final Score = (Color × 0.20) + (Texture × 0.30) + (Frequency × 0.15)
            + (Eye Reflection × 0.10) + (Screen Artifact × 0.25)
Threshold: ≥ 68.0
```

| Layer                | Weight | What It Detects                                                                        |
| -------------------- | ------ | -------------------------------------------------------------------------------------- |
| Color Space Analysis | 0.20   | Skin pixel ratio in YCrCb/HSV — printed photos have flat color                         |
| Texture Analysis     | 0.30   | Laplacian variance, Sobel edges, micro-texture — screens lack real texture             |
| Frequency Domain     | 0.15   | DFT high-frequency analysis — printed media shows abnormal frequency patterns          |
| Eye Reflection       | 0.10   | Corneal specular reflection — real eyes have natural catchlight                        |
| Screen Artifact      | 0.25   | Moiré patterns, channel std, saturation uniformity — digital screens produce artifacts |

---

## Attack Resistance

| Attack Vector             | Blocking Layer  | Method                                   |
| ------------------------- | --------------- | ---------------------------------------- |
| Printed photo (color)     | Step 1 + Step 5 | Face embedding mismatch + color analysis |
| Printed photo (B&W)       | Step 5          | Texture analysis — no micro-texture      |
| Phone screen (live video) | Step 3 + Step 5 | Challenge randomness + Moiré detection   |
| Static image on screen    | Step 2 + Step 5 | No blink detected + screen artifacts     |
| Different person's face   | Step 1          | Cosine similarity < 82%                  |
| Eye-closed photo          | Step 2          | No OPEN→CLOSED→OPEN pattern              |
| Pre-recorded blink video  | Step 3          | Random challenge defeats replay          |
| Multiple people           | Step 1          | Multi-face detection triggers spoof      |

---

## Project Structure

```
D:\FaceAuth\
├── .gitignore
├── README.md
├── requirements.txt
│
├── backend\
│   ├── app.py                  ← Flask entry point, DB auto-create
│   ├── config.py               ← DB URI, JWT secret, Mail config
│   ├── extensions.py           ← SQLAlchemy, JWT, Mail init
│   │
│   ├── models\
│   │   ├── user.py             ← User model, face/voice encoding storage
│   │   └── auth_log.py         ← Auth event logging with scores
│   │
│   ├── routes\
│   │   ├── auth.py             ← Step-wise auth + enrollment endpoints
│   │   └── admin.py            ← Stats, users, logs, toggle, delete
│   │
│   └── utils\
│       ├── face_utils.py       ← DeepFace Facenet512, multi-angle matching
│       ├── liveness.py         ← EAR blink + 7-action challenge detection
│       ├── voice_utils.py      ← MFCC 284-dim feature extraction & matching
│       └── spoof_detector.py   ← 5-layer weighted skin analysis
│
└── frontend\
    ├── index.html
    ├── package.json
    ├── vite.config.js
    │
    └── src\
        ├── App.jsx             ← Routes, protected route guards
        ├── main.jsx
        ├── App.css / index.css
        │
        ├── components\
        │   ├── Navbar.jsx      ← Top nav with live IST clock
        │   └── CameraFeed.jsx  ← Webcam feed with multi-frame capture
        │
        ├── pages\
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── FaceAuthPage.jsx    ← Full 5-step auth UI with step bar
        │   ├── DashboardPage.jsx   ← Security score, recent activity
        │   └── AdminPage.jsx       ← Analytics, user mgmt, auth logs
        │
        └── utils\
            └── api.js          ← Axios client, JWT interceptor, step APIs
```

---

## Requirements

### System Requirements

| Requirement | Version / Details                    |
| ----------- | ------------------------------------ |
| OS          | Windows 10/11 or Linux (Ubuntu 20+)  |
| Python      | 3.10                                 |
| Node.js     | 18+                                  |
| PostgreSQL  | 17                                   |
| FFmpeg      | Latest (required for voice features) |
| RAM         | Minimum 8GB recommended              |
| Webcam      | Required for face + liveness steps   |
| Microphone  | Required for voice authentication    |

### Python Dependencies (requirements.txt)

```
flask==3.1.3
flask-jwt-extended==4.7.1
flask-sqlalchemy==3.1.1
flask-mail==0.10.0
flask-cors==6.0.2
deepface
opencv-python==4.8.0.76
mediapipe==0.10.9
tensorflow-cpu==2.15.0
librosa
numpy==1.26.4
psycopg2-binary==2.9.11
```

### Frontend Dependencies (package.json)

```
react 18
vite
react-webcam
axios
react-router-dom
lucide-react
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/akshaykumar112151/SecureFaceAuth.git
cd SecureFaceAuth
```

### 2. Create Python Virtual Environment

```powershell
# Windows PowerShell
python -m venv venv
D:\<your-path>\SecureFaceAuth\venv\Scripts\Activate.ps1
```

```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies

```powershell
pip install -r requirements.txt
```

> ⚠️ First run will download the DeepFace Facenet512 model (~250MB). Ensure you have internet access.

### 4. Install FFmpeg (Required for Voice Features)

**Windows:**

1. Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg\`
3. Verify: `C:\ffmpeg\ffmpeg-<version>\bin\ffmpeg.exe` exists

If your FFmpeg path differs, update this line in `backend/utils/voice_utils.py`:

```python
FFMPEG_PATH = r"C:\ffmpeg\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
```

### 5. Configure PostgreSQL

Create the database:

```sql
CREATE DATABASE faceauth_db;
```

Update `backend/config.py` if your credentials differ:

```python
SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:admin123@localhost/faceauth_db'
```

### 6. Configure Email Alerts (Optional)

In `backend/config.py`, set your Gmail credentials:

```python
MAIL_USERNAME = 'your-email@gmail.com'
MAIL_PASSWORD = 'your-app-password'   # Gmail App Password, not your main password
```

> To generate a Gmail App Password: Google Account → Security → 2-Step Verification → App Passwords

### 7. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

---

## How to Run

### Terminal 1 — Backend

```powershell
cd D:\FaceAuth
D:\FaceAuth\venv\Scripts\Activate.ps1
cd backend
python app.py
```

Flask starts at `http://127.0.0.1:5000`. Database tables are auto-created on first run. A default admin account is also created automatically.

### Terminal 2 — Frontend

```powershell
cd D:\FaceAuth\frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Default Credentials

| Role  | Email              | Password |
| ----- | ------------------ | -------- |
| Admin | admin@faceauth.com | admin123 |

> ⚠️ Change admin credentials before any production or public deployment.

---

## User Flow

```
1. Register         → /register (name, email, password)
2. Login            → /login (email + password → JWT token)
3. Enroll Face      → /face-auth?mode=enroll (5 angles)
4. Enroll Voice     → /face-auth?mode=voice (3 samples, optional)
5. Authenticate     → /face-auth?mode=auth (5-step pipeline)
6. Dashboard        → /dashboard (security score, activity)
```

---

## API Endpoints

### Authentication (`/api/auth/`)

| Method | Endpoint           | Auth | Description                  |
| ------ | ------------------ | ---- | ---------------------------- |
| POST   | `/register`        | None | Register new user            |
| POST   | `/login`           | None | Login → JWT token            |
| POST   | `/enroll-face`     | JWT  | Enroll one face angle        |
| POST   | `/enroll-voice`    | JWT  | Enroll voice (3 samples)     |
| GET    | `/enroll-status`   | JWT  | Get enrollment status        |
| GET    | `/voice-status`    | JWT  | Get voice enrollment status  |
| GET    | `/get-challenge`   | None | Get random challenge         |
| POST   | `/step/blink`      | None | Step 1+2: Face + Liveness    |
| POST   | `/step/challenge`  | None | Step 3: Behavioral challenge |
| POST   | `/step/voice`      | None | Step 4: Voice match          |
| POST   | `/step/final`      | None | Step 5: Skin check + token   |
| GET    | `/recent-activity` | JWT  | Last 5 auth attempts         |

### Admin (`/api/admin/`)

| Method | Endpoint            | Auth      | Description         |
| ------ | ------------------- | --------- | ------------------- |
| GET    | `/stats`            | JWT Admin | System statistics   |
| GET    | `/users`            | JWT Admin | All users list      |
| GET    | `/logs`             | JWT Admin | All auth logs       |
| POST   | `/toggle-user/<id>` | JWT Admin | Enable/disable user |
| DELETE | `/delete-user/<id>` | JWT Admin | Delete user         |

---

## Admin Panel

The admin panel provides complete system oversight:

- **Overview Cards** — Total users, total attempts, success count, failed count, spoof-blocked count
- **Real-Time Analytics** — Auth attempt trends, success vs failure ratio
- **User Management** — View all users with enrollment status, disable/enable or delete accounts
- **Auth Logs** — Complete forensic history — face score, liveness score, skin score, voice score, failure reason, IP address, IST timestamp for every attempt

---

## Email Alert System

Every authentication event triggers an email to the account holder:

**On Success:**

```
Subject: ✅ Login Successful — SecureFaceAuth
- Timestamp (IST)
- Face Match score
- Liveness score
- Skin Analysis score
```

**On Failure / Spoof:**

```
Subject: 🚨 Alert: Failed Login Attempt — SecureFaceAuth
- Timestamp (IST)
- Status: SPOOF ❌
- Reason: [specific failure reason]
```

---

## Security Considerations

- JWT tokens expire after 24 hours
- All authentication scores are logged for forensic analysis
- Admin-only routes are protected by role-based JWT validation
- Multi-person detection prevents group spoofing
- Step-wise failure means partial spoofs are caught early (not just at the end)
- Email alerts notify users of any unauthorized access attempt in real time

---

## Known Limitations

- **Voice verification** is MFCC-based (phrase-dependent) and not fully speaker-independent. Full neural speaker verification is planned as future work (see below).
- **Lighting sensitivity** — Extreme lighting (very dark/bright) reduces face match accuracy.
- **EAR threshold** — Calibrated at 0.19 for general use; users with naturally narrow eyes may need adjustment.
- **Single-machine deployment** — Currently tested on localhost. Production deployment requires WSGI server (Gunicorn) and HTTPS.

---

## Future Scope

- **Neural Speaker Verification** — Replace MFCC matching with a cloud-based speaker recognition API (Azure Speaker Recognition, AssemblyAI) for true speaker-independent voice auth
- **Iris Recognition** — Add iris pattern matching as a 6th authentication layer
- **Deep Learning Face Detector** — Replace Haar cascade with MTCNN or RetinaFace for better side-angle detection
- **Mobile Application** — React Native frontend for mobile biometric authentication
- **Cloud Deployment** — Production deployment on AWS/GCP with Gunicorn + Nginx + HTTPS
- **GDPR Compliance** — Encrypted face embedding storage at rest
- **Multi-User Stress Testing** — Large-scale testing with diverse demographics

---

## Authors — Group 11

| Name             | Roll Number   | Role                               | GitHub                                                       |
| ---------------- | ------------- | ---------------------------------- | ------------------------------------------------------------ |
| Akshay Kumar     | 2200640100014 | Backend & Database                 | [@akshaykumar112151](https://github.com/akshaykumar112151)   |
| Aryan Singh      | 2200640100032 | Backend & Documentation            | [@aryansingh200529](https://github.com/aryansingh200529)     |
| Chetanya Kaushik | 2200640100045 | Frontend & Testing                 | [@ChetanyaKaushik944](https://github.com/ChetanyaKaushik944) |
| Gaurav Singh     | 2200640100058 | Frontend, Documentation & Research | [@Gaurav-singh9719](https://github.com/Gaurav-singh9719)     |

**Institution:** Hindustan College of Science and Technology
**Department:** Computer Science and Engineering
**GitHub:** [@akshaykumar12151](https://github.com/akshaykumar112151)

---

_Built with Python, Flask, React, DeepFace, MediaPipe, TensorFlow, librosa, and PostgreSQL._
_5-step biometric pipeline — face match, liveness, behavioral challenge, voice, and anti-spoof skin analysis._

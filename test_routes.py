"""
SecureFaceAuth — Backend Route Tester
Run: python test_routes.py
Flask server must be running on localhost:5000
"""

import requests
import json

BASE = "http://localhost:5000/api"
EMAIL = "akshaykumar112151@gmail.com"

# ── Colors for terminal ──
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):   print(f"  {GREEN}✅ PASS{RESET} — {msg}")
def fail(msg): print(f"  {RED}❌ FAIL{RESET} — {msg}")
def info(msg): print(f"  {CYAN}ℹ️  {msg}{RESET}")
def head(msg): print(f"\n{BOLD}{YELLOW}{'='*50}{RESET}\n{BOLD}{msg}{RESET}\n{'='*50}")

results = []

def test(name, passed, detail=""):
    results.append((name, passed))
    if passed:
        ok(f"{name} {detail}")
    else:
        fail(f"{name} {detail}")

# ════════════════════════════════════════════════
# TEST 1 — Server reachable
# ════════════════════════════════════════════════
head("TEST 1: Server Health Check")
try:
    r = requests.get(f"{BASE}/auth/enroll-status", timeout=3)
    # 401 = server is up but no token — that's fine
    test("Server reachable", r.status_code in [200, 401, 422], f"Status: {r.status_code}")
except Exception as e:
    test("Server reachable", False, f"Cannot connect: {e}")
    print(f"\n{RED}⛔ Flask server nahi chal raha! Pehle start karo:{RESET}")
    print("  cd D:\\FaceAuth\\backend && python app.py")
    exit(1)

# ════════════════════════════════════════════════
# TEST 2 — All step routes exist (405/400 = route exists)
# ════════════════════════════════════════════════
head("TEST 2: Step Routes Exist")

routes = [
    ("POST /auth/step/blink",     "post",  f"{BASE}/auth/step/blink"),
    ("POST /auth/step/challenge", "post",  f"{BASE}/auth/step/challenge"),
    ("POST /auth/step/voice",     "post",  f"{BASE}/auth/step/voice"),
    ("POST /auth/step/final",     "post",  f"{BASE}/auth/step/final"),
]

for name, method, url in routes:
    try:
        r = requests.post(url, json={}, timeout=3)
        # 400 = route exists but bad input (expected!)
        # 404 = route NOT found (bad!)
        # 500 = route exists but crashed
        exists = r.status_code != 404
        test(name, exists, f"Status: {r.status_code} {'(route found ✓)' if exists else '(route NOT found!)'}")
    except Exception as e:
        test(name, False, str(e))

# ════════════════════════════════════════════════
# TEST 3 — Step/blink with no data → should return 400 with correct fields
# ════════════════════════════════════════════════
head("TEST 3: Step/Blink — Validation")

try:
    r = requests.post(f"{BASE}/auth/step/blink", json={}, timeout=3)
    data = r.json()
    test("Returns JSON",          isinstance(data, dict),           str(data))
    test("Has 'message' field",   "message" in data,                str(data.get("message", "MISSING")))
    test("Has 'step' field",      "step" in data,                   str(data.get("step", "MISSING")))
    test("Status 400 (no input)", r.status_code == 400,             f"Got: {r.status_code}")
except Exception as e:
    test("Step/blink validation", False, str(e))

# ════════════════════════════════════════════════
# TEST 4 — Step/blink with wrong email → 404
# ════════════════════════════════════════════════
head("TEST 4: Step/Blink — Wrong Email")

try:
    r = requests.post(f"{BASE}/auth/step/blink", json={
        "email": "doesnotexist@test.com",
        "image": "data:image/jpeg;base64,/9j/fake",
        "frames": []
    }, timeout=3)
    data = r.json()
    test("Wrong email → 404",     r.status_code == 404,             f"Got: {r.status_code}")
    test("Has message",           "message" in data,                data.get("message",""))
except Exception as e:
    test("Step/blink wrong email", False, str(e))

# ════════════════════════════════════════════════
# TEST 5 — Step/challenge validation
# ════════════════════════════════════════════════
head("TEST 5: Step/Challenge — Validation")

try:
    r = requests.post(f"{BASE}/auth/step/challenge", json={"email": EMAIL}, timeout=3)
    data = r.json()
    # challenge_key missing → 400
    test("Missing challenge_key → 400", r.status_code == 400, f"Got: {r.status_code} | {data.get('message','')}")
except Exception as e:
    test("Step/challenge validation", False, str(e))

# ════════════════════════════════════════════════
# TEST 6 — Step/voice validation
# ════════════════════════════════════════════════
head("TEST 6: Step/Voice — Validation")

try:
    r = requests.post(f"{BASE}/auth/step/voice", json={"email": EMAIL}, timeout=3)
    data = r.json()
    # voice missing → 400
    test("Missing voice → 400", r.status_code == 400, f"Got: {r.status_code} | {data.get('message','')}")
except Exception as e:
    test("Step/voice validation", False, str(e))

# ════════════════════════════════════════════════
# TEST 7 — Step/final validation
# ════════════════════════════════════════════════
head("TEST 7: Step/Final — Validation")

try:
    r = requests.post(f"{BASE}/auth/step/final", json={"email": EMAIL}, timeout=3)
    data = r.json()
    # image missing → 400
    test("Missing image → 400", r.status_code == 400, f"Got: {r.status_code} | {data.get('message','')}")
except Exception as e:
    test("Step/final validation", False, str(e))

# ════════════════════════════════════════════════
# TEST 8 — Other existing routes still work
# ════════════════════════════════════════════════
head("TEST 8: Existing Routes Still Working")

try:
    r = requests.get(f"{BASE}/auth/get-challenge", timeout=3)
    data = r.json()
    test("GET /get-challenge works",        r.status_code == 200,              f"Status: {r.status_code}")
    test("Returns challenge_key",           "challenge_key" in data,           data.get("challenge_key","MISSING"))
    test("Returns challenge_label",         "challenge_label" in data,         data.get("challenge_label","MISSING"))
    valid_keys = ["mouth_open","look_left","look_right","look_up","look_down","wink_left","wink_right"]
    test("challenge_key is valid",          data.get("challenge_key") in valid_keys, data.get("challenge_key",""))
except Exception as e:
    test("GET /get-challenge", False, str(e))

# ════════════════════════════════════════════════
# TEST 9 — Login route
# ════════════════════════════════════════════════
head("TEST 9: Login Route")

try:
    r = requests.post(f"{BASE}/auth/login", json={
        "email": EMAIL,
        "password": "akshay@14"
    }, timeout=3)
    data = r.json()
    test("Login works",         r.status_code == 200,      f"Status: {r.status_code}")
    test("Token returned",      "token" in data,            "JWT token present" if "token" in data else "NO TOKEN!")
    test("User returned",       "user" in data,             f"Name: {data.get('user',{}).get('name','?')}")
    if "token" in data:
        info(f"Token (first 40 chars): {data['token'][:40]}...")
        info(f"Voice enrolled: {data['user'].get('is_voice_enrolled', False)}")
        info(f"Face enrolled:  {data['user'].get('is_face_enrolled', False)}")
except Exception as e:
    test("Login route", False, str(e))

# ════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════
head("FINAL SUMMARY")

passed = sum(1 for _, p in results if p)
total  = len(results)
pct    = int(passed/total*100) if total else 0

print(f"\n  Total Tests : {total}")
print(f"  {GREEN}Passed{RESET}      : {passed}")
print(f"  {RED}Failed{RESET}      : {total - passed}")
print(f"  Score       : {GREEN if pct == 100 else YELLOW}{pct}%{RESET}")

if pct == 100:
    print(f"\n  {GREEN}{BOLD}🎉 Sab kuch sahi hai! Backend ready hai!{RESET}")
else:
    print(f"\n  {RED}Kuch tests fail hue — upar dekho kya issue hai{RESET}")
    for name, p in results:
        if not p:
            print(f"  {RED}✗ {name}{RESET}")
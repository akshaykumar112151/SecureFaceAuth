lines = open('liveness.py', 'r', encoding='utf-8').readlines()
rest = ''.join(lines[6:])
new_top = (
    "import cv2\n"
    "import numpy as np\n"
    "\n"
    "try:\n"
    "    import mediapipe.python.solutions.face_mesh as _face_mesh_module\n"
    "    class _Mp:\n"
    "        class solutions:\n"
    "            face_mesh = _face_mesh_module\n"
    "    mp_face_mesh = _Mp.solutions.face_mesh\n"
    "    MEDIAPIPE_OK = True\n"
    "except Exception as e:\n"
    "    MEDIAPIPE_OK = False\n"
    "\n"
)
open('liveness.py', 'w', encoding='utf-8').write(new_top + rest)
print('Done!')

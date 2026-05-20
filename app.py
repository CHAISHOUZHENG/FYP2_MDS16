import io
import time
import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
import os
import json
import gc
from google import genai
from dotenv import load_dotenv
from models.senet import SENet18
import re

from fastapi import FastAPI, File, UploadFile, HTTPException
try:
    from mediapipe.python.solutions import face_detection as mp_face_detection
    from mediapipe.python.solutions import face_mesh as mp_face_mesh
except ImportError:
    mp_face_detection = None
    mp_face_mesh = None

try:
    from retinaface import RetinaFace
except ImportError:
    RetinaFace = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY is missing. Check your .env file.")

gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
gemini_client = genai.Client(api_key=gemini_api_key)

emotions = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "sad",
    "surprise",
    "neutral"
]

stress_weights = {
    "angry": 0.90,
    "disgust": 0.75,
    "fear": 1.00,
    "happy": 0.10,
    "sad": 0.85,
    "surprise": 0.40,
    "neutral": 0.20
}

# load model
torch.set_num_threads(1)
model = SENet18()
checkpoint = torch.load("best_checkpoint.tar", map_location="cpu")
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()
del checkpoint
gc.collect()


def preprocess_face_for_model(face_image: Image.Image) -> torch.Tensor:
    face_image = face_image.resize((40, 40))
    arr = np.asarray(face_image, dtype=np.float32) / 255.0
    arr = arr / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


try:
    if mp_face_detection is None or mp_face_mesh is None:
        raise RuntimeError("mediapipe is not installed")

    face_detector = mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.6
    )

    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    )
except RuntimeError as e:
    print("[MEDIAPIPE INIT ERROR]", str(e))
    face_detector = None
    face_mesh = None


def validate_facial_obstruction(image: np.ndarray) -> tuple[bool, str, any]:
    if face_mesh is None:
        print("[DEBUG OBSTRUCTION] MediaPipe FaceMesh unavailable; skipping landmark obstruction check")
        return True, "ok", None

    results = face_mesh.process(image)

    if not results.multi_face_landmarks:
        return False, "no_face", None

    landmarks = results.multi_face_landmarks[0].landmark


    # --- Frontality check ---
    # Nose tip should be roughly centered between both eyes
    nose_tip = landmarks[4]
    left_eye_outer = landmarks[33]
    right_eye_outer = landmarks[263]

    eye_center_x = (left_eye_outer.x + right_eye_outer.x) / 2
    nose_offset = abs(nose_tip.x - eye_center_x)

    print(f"[DEBUG OBSTRUCTION] Nose offset from eye center: {nose_offset:.4f}")
    if nose_offset > 0.12:
        print(f"[DEBUG OBSTRUCTION] REJECTED — face not frontal: {nose_offset:.4f}")
        return False, "face_not_frontal", None

    # --- Eye openness check ---
    # Eye aspect ratio: vertical distance / horizontal distance
    # If EAR is too low, eyes are closed
    def eye_aspect_ratio(top_idx, bottom_idx, left_idx, right_idx):
        top = landmarks[top_idx]
        bottom = landmarks[bottom_idx]
        left = landmarks[left_idx]
        right = landmarks[right_idx]
        vertical = abs(top.y - bottom.y)
        horizontal = abs(left.x - right.x)
        if horizontal == 0:
            return 0
        return vertical / horizontal

    left_ear = eye_aspect_ratio(159, 145, 33, 133)
    right_ear = eye_aspect_ratio(386, 374, 362, 263)

    print(f"[DEBUG OBSTRUCTION] Left EAR: {left_ear:.4f}, Right EAR: {right_ear:.4f}")
    if left_ear < 0.05 and right_ear < 0.05:
        print(f"[DEBUG OBSTRUCTION] REJECTED — both eyes closed")
        return False, "eyes_closed", None

    # --- Nose visibility check ---
    nose_tip_lm = landmarks[4]
    if nose_tip_lm.x < 0 or nose_tip_lm.x > 1 or nose_tip_lm.y < 0 or nose_tip_lm.y > 1:
        print(f"[DEBUG OBSTRUCTION] REJECTED — nose not visible")
        return False, "face_obstructed", None
    

    # --- Full face exposure check using landmark positions ---
    key_landmarks = {
        "forehead": 10,
        "left_eye": 33,
        "right_eye": 263,
        "nose_tip": 4,
        "left_cheek": 234,
        "right_cheek": 454,
        "mouth_center": 13,
        "chin": 152,
    }

    outside_points = []

    for region, idx in key_landmarks.items():
        lm = landmarks[idx]

        print(
            f"[DEBUG OBSTRUCTION] {region} coords: "
            f"x={lm.x:.4f}, y={lm.y:.4f}"
        )

        if lm.x < 0 or lm.x > 1 or lm.y < 0 or lm.y > 1:
            outside_points.append(region)

    critical_regions = ["left_eye", "right_eye", "nose_tip", "mouth_center"]

    missing_critical = [
        region for region in outside_points
        if region in critical_regions
    ]

    if len(missing_critical) >= 1:
        return False, "face_obstructed", None 
    

    # --- Mouth visibility / mask check ---
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    mouth_indices = [61, 291, 13, 14, 78, 308, 82, 312]

    xs = [int(landmarks[i].x * w) for i in mouth_indices]
    ys = [int(landmarks[i].y * h) for i in mouth_indices]

    x1 = max(min(xs) - 12, 0)
    y1 = max(min(ys) - 12, 0)
    x2 = min(max(xs) + 12, w)
    y2 = min(max(ys) + 12, h)

    if x2 <= x1 or y2 <= y1:
        return False, "face_obstructed", None

    mouth = gray[y1:y2, x1:x2]

    mouth_texture = cv2.Laplacian(mouth, cv2.CV_64F).var()
    mouth_brightness = mouth.mean()

    print(f"[DEBUG OBSTRUCTION] Mouth texture: {mouth_texture:.2f}")
    print(f"[DEBUG OBSTRUCTION] Mouth brightness: {mouth_brightness:.2f}")

    if mouth_texture < 8 and (mouth_brightness < 45 or mouth_brightness > 220):
        print("[DEBUG OBSTRUCTION] REJECTED — possible mask or mouth obstruction")
        return False, "face_obstructed", None


    # --- Extreme sunglasses / eye obstruction check ---

    def crop_eye(indices, padding=8):
        xs = [int(landmarks[i].x * w) for i in indices]
        ys = [int(landmarks[i].y * h) for i in indices]

        x1 = max(min(xs) - padding, 0)
        y1 = max(min(ys) - padding, 0)
        x2 = min(max(xs) + padding, w)
        y2 = min(max(ys) + padding, h)

        if x2 <= x1 or y2 <= y1:
            return None

        return gray[y1:y2, x1:x2]

    left_eye = crop_eye([33, 133, 159, 145])
    right_eye = crop_eye([362, 263, 386, 374])

    if left_eye is None or right_eye is None:
        return False, "face_obstructed", None

    left_eye_brightness = left_eye.mean()
    right_eye_brightness = right_eye.mean()

    left_eye_texture = cv2.Laplacian(left_eye, cv2.CV_64F).var()
    right_eye_texture = cv2.Laplacian(right_eye, cv2.CV_64F).var()

    print(f"[DEBUG OBSTRUCTION] Left eye brightness: {left_eye_brightness:.2f}")
    print(f"[DEBUG OBSTRUCTION] Right eye brightness: {right_eye_brightness:.2f}")
    print(f"[DEBUG OBSTRUCTION] Left eye texture: {left_eye_texture:.2f}")
    print(f"[DEBUG OBSTRUCTION] Right eye texture: {right_eye_texture:.2f}")


    # --- One-side obstruction check (hand / object covering face) ---
    eye_brightness_diff = abs(left_eye_brightness - right_eye_brightness)

    eye_texture_ratio = max(left_eye_texture, right_eye_texture) / max(
        1,
        min(left_eye_texture, right_eye_texture)
    )

    print(f"[DEBUG OBSTRUCTION] Eye brightness diff: {eye_brightness_diff:.2f}")
    print(f"[DEBUG OBSTRUCTION] Eye texture ratio: {eye_texture_ratio:.2f}")

    if eye_brightness_diff > 60 and eye_texture_ratio > 5.5:
        print("[DEBUG OBSTRUCTION] REJECTED — possible hand/object covering one side of face")
        return False, "face_obstructed", None


    # Case 1 — dark non-reflective lenses: low brightness AND low texture
    if (
        left_eye_brightness < 65 and
        right_eye_brightness < 65 and
        left_eye_texture < 35 and
        right_eye_texture < 35
    ):
        print("[DEBUG OBSTRUCTION] REJECTED — dark non-reflective sunglasses")
        return False, "face_obstructed", None

    # Case 2 — both eyes are very dark, which is more likely sunglasses than natural shadow
    if (
        left_eye_brightness < 40 and
        right_eye_brightness < 40
    ):
        print("[DEBUG OBSTRUCTION] REJECTED — very dark or reflective sunglasses")
        return False, "face_obstructed", None
        
    return True, "ok", landmarks


def detect_and_crop_face(image: np.ndarray):
    if face_detector is None:
        if RetinaFace is not None:
            print("[DEBUG] MediaPipe FaceDetection unavailable; using RetinaFace fallback")
            return detect_and_crop_face_retina(image)
        print("[DEBUG] No face detector is available")
        return None, None, "no_face"

    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        work_img = cv2.resize(image, (int(w * scale), int(h * scale)))
    else:
        work_img = image.copy()

    wh, ww = work_img.shape[:2]
    
    results = face_detector.process(work_img)

    print(f"[DEBUG] Detections found: {len(results.detections) if results.detections else 0}")

    if not results.detections:
        print("[DEBUG] REJECTED — no detections at all")
        return None, None, "no_face"  
    
    if len(results.detections) > 1:
        print(f"[DEBUG] REJECTED — multiple faces detected: {len(results.detections)}")
        return None, None, "multiple_faces"
    
    det = results.detections[0]

    confidence = det.score[0]
    print(f"[DEBUG] Confidence score: {confidence:.4f}")
    if confidence < 0.65:
        print(f"[DEBUG] REJECTED — confidence too low: {confidence:.4f}")
        return None, None, "low_confidence"

    bbox = det.location_data.relative_bounding_box
    x = int(bbox.xmin * ww)
    y = int(bbox.ymin * wh)
    bw = int(bbox.width * ww)
    bh = int(bbox.height * wh)

    # Reject if face is too small
    if bw < 80 or bh < 80:
        return None, None, "no_face" 

    # Reject if face area is less than 3% of total image — too far away
    face_area_ratio = (bw * bh) / (ww * wh)
    if face_area_ratio < 0.03:
        return None, None, "too_far"


    x1 = x
    y1 = y
    x2 = x + bw
    y2 = y + bh

    print(f"[DEBUG] Bbox coords — x1={x1}, y1={y1}, x2={x2}, y2={y2}")
    print(f"[DEBUG] Image bounds — ww={ww}, wh={wh}")
    print(f"[DEBUG] Overflow — left={x1<0}, top={y1<0}, right={x2>ww}, bottom={y2>wh}")

    # Allow up to 5px overflow on any edge — catches rounding errors from MediaPipe
    # Only reject if a significant portion of the face is genuinely outside the frame
    overflow_left = max(0, -x1)
    overflow_top = max(0, -y1)
    overflow_right = max(0, x2 - ww)
    overflow_bottom = max(0, y2 - wh)

    print(f"[DEBUG] Overflow pixels — left={overflow_left}, top={overflow_top}, right={overflow_right}, bottom={overflow_bottom}")

    tolerance = max(5, int(0.03 * min(ww, wh)))

    if (
        overflow_left > tolerance or
        overflow_top > tolerance or
        overflow_right > tolerance or
        overflow_bottom > tolerance
    ):
        return None, None, "face_cut_off"

    # Clamp coordinates to image boundaries
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(ww, x2)
    y2 = min(wh, y2)
    print(f"[DEBUG] Clamped coords — x1={x1}, y1={y1}, x2={x2}, y2={y2}")

    # Check head rotation angle using eye keypoints
    kps = det.location_data.relative_keypoints
    rx, ry = kps[0].x * ww, kps[0].y * wh  # right eye
    lx, ly = kps[1].x * ww, kps[1].y * wh  # left eye
    angle = np.degrees(np.arctan2(ly - ry, lx - rx))
    print(f"[DEBUG] Head rotation angle: {angle:.2f}°")

    if abs(angle) > 45:
        print(f"[DEBUG] REJECTED — head rotated too much: {angle:.2f}°")
        return None, None, "face_rotated"

    # Correct small tilt BEFORE cropping
    if abs(angle) > 2.0:
        eye_cx, eye_cy = (rx + lx) / 2, (ry + ly) / 2
        M = cv2.getRotationMatrix2D((eye_cx, eye_cy), angle, 1.0)
        work_img = cv2.warpAffine(
            work_img, M, (ww, wh),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT_101
        )

    # Crop AFTER rotation is applied
    crop = work_img[y1:y2, x1:x2]

    # Pad to square
    ch, cw = crop.shape[:2]
    if ch != cw:
        side = max(ch, cw)
        pad_top = (side - ch) // 2
        pad_bot = side - ch - pad_top
        pad_left = (side - cw) // 2
        pad_right = side - cw - pad_left
        crop = cv2.copyMakeBorder(
            crop, pad_top, pad_bot, pad_left, pad_right,
            cv2.BORDER_REFLECT_101
        )

    print(f"[DEBUG] Crop size: {crop.shape[1]}x{crop.shape[0]}")
    return crop, work_img, "ok"


def detect_and_crop_face_retina(image: np.ndarray):
    if RetinaFace is None:
        return None, None, "no_face"

    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        work_img = cv2.resize(image, (int(w * scale), int(h * scale)))
    else:
        work_img = image.copy()

    wh, ww = work_img.shape[:2]

    # RetinaFace usually works better with BGR input
    bgr_img = cv2.cvtColor(work_img, cv2.COLOR_RGB2BGR)

    try:
        detections = RetinaFace.detect_faces(bgr_img)
    except Exception as e:
        print("[RETINA ERROR]", str(e))
        return None, None, "no_face" 

    if not isinstance(detections, dict) or len(detections) == 0:
        return None, None, "no_face" 

    if len(detections) > 1:
        return None, None, "multiple_faces"

    det = list(detections.values())[0]

    confidence = det.get("score", 0)
    print(f"[RETINA] Confidence: {confidence:.4f}")

    if confidence < 0.80:
        return None, None, "low_confidence"

    x1, y1, x2, y2 = det["facial_area"]

    bw = x2 - x1
    bh = y2 - y1

    if bw < 80 or bh < 80:
        return None, None, "no_face"

    face_area_ratio = (bw * bh) / (ww * wh)
    if face_area_ratio < 0.03:
        return None, None, "too_far"

    # Check if face is cut off
    tolerance = max(5, int(0.03 * min(ww, wh)))

    if x1 < -tolerance or y1 < -tolerance or x2 > ww + tolerance or y2 > wh + tolerance:
        return None, None, "face_cut_off"

    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(ww, x2)
    y2 = min(wh, y2)


    # Head rotation using RetinaFace eye landmarks
    landmarks = det.get("landmarks", {})
    if "left_eye" in landmarks and "right_eye" in landmarks:
        lx, ly = landmarks["left_eye"]
        rx, ry = landmarks["right_eye"]

        angle = np.degrees(np.arctan2(ly - ry, lx - rx))
        print(f"[RETINA] Head rotation angle: {angle:.2f}°")

        if abs(angle) > 45:
            return None, None, "face_rotated"

        if abs(angle) > 2.0:
            eye_cx, eye_cy = (rx + lx) / 2, (ry + ly) / 2
            M = cv2.getRotationMatrix2D((eye_cx, eye_cy), angle, 1.0)
            work_img = cv2.warpAffine(
                work_img,
                M,
                (ww, wh),
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT_101
            )

    crop = work_img[y1:y2, x1:x2]

    ch, cw = crop.shape[:2]
    if ch != cw:
        side = max(ch, cw)
        pad_top = (side - ch) // 2
        pad_bot = side - ch - pad_top
        pad_left = (side - cw) // 2
        pad_right = side - cw - pad_left

        crop = cv2.copyMakeBorder(
            crop,
            pad_top,
            pad_bot,
            pad_left,
            pad_right,
            cv2.BORDER_REFLECT_101
        )

    print(f"[RETINA] Crop size: {crop.shape[1]}x{crop.shape[0]}")
    return crop, work_img, "ok"


def validate_face_crop_completeness(face: np.ndarray) -> tuple[bool, str]:
    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    h, w = gray.shape
    top = gray[:h // 3, :]
    middle = gray[h // 3: 2 * h // 3, :]
    bottom = gray[2 * h // 3:, :]

    top_texture = cv2.Laplacian(top, cv2.CV_64F).var()
    middle_texture = cv2.Laplacian(middle, cv2.CV_64F).var()
    bottom_texture = cv2.Laplacian(bottom, cv2.CV_64F).var()

    print(f"[DEBUG COMPLETE] top texture: {top_texture:.2f}")
    print(f"[DEBUG COMPLETE] middle texture: {middle_texture:.2f}")
    print(f"[DEBUG COMPLETE] bottom texture: {bottom_texture:.2f}")

    # If crop only contains eyes/mouth from a screen/phone, one region is often missing/flat
    if top_texture < 10 or middle_texture < 10 or bottom_texture < 10:
        print("[DEBUG COMPLETE] REJECTED — incomplete face crop")
        return False, "face_obstructed"

    return True, "ok"


def validate_face_quality(face: np.ndarray) -> dict:
    h, w = face.shape[:2]

    print(f"[DEBUG QUALITY] Crop size: {w}x{h}")

    # 1. Resolution check — must have enough detail for the model
    if h < 80 or w < 80:
        print(f"[DEBUG QUALITY] REJECTED — resolution too low: {w}x{h}")
        return {
            "ok": False,
            "message": "Face resolution is too low. Please use a higher quality image or move closer to the camera."
        }

    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    # 2. Brightness check
    brightness = gray.mean()
    contrast = gray.std()
    print(f"[DEBUG QUALITY] Brightness: {brightness:.2f}")

    if brightness < 35 and contrast < 25:
        print(f"[DEBUG QUALITY] REJECTED — too dark: {brightness:.2f}")
        return {
            "ok": False,
            "message": "Image is too dark. Please upload an image with better lighting."
        }

    if brightness > 225 and contrast < 20:
        return {
            "ok": False,
            "message": "Image is too bright. Please upload an image with better lighting."
        }

    # 3. Uneven lighting check
    mid = gray.shape[1] // 2
    left_brightness = gray[:, :mid].mean()
    right_brightness = gray[:, mid:].mean()
    lighting_diff = abs(float(left_brightness) - float(right_brightness))
    print(f"[DEBUG QUALITY] Lighting diff: {lighting_diff:.2f}")

    if lighting_diff > 80:
        print(f"[DEBUG QUALITY] REJECTED — uneven lighting: {lighting_diff:.2f}")
        return {
            "ok": False,
            "message": "Uneven lighting detected. Please ensure your face is evenly lit from the front."
        }

    # 4. Contrast check
    print(f"[DEBUG QUALITY] Contrast: {contrast:.2f}")

    if contrast < 20:
        print(f"[DEBUG QUALITY] REJECTED — low contrast: {contrast:.2f}")
        return {
            "ok": False,
            "message": "Image appears washed out or low contrast. Please upload a clearer photo."
        }

    # 5. Noise check
    denoised = cv2.GaussianBlur(gray, (5, 5), 0)
    noise_level = np.std(gray.astype(float) - denoised.astype(float))
    print(f"[DEBUG QUALITY] Noise level: {noise_level:.2f}")

    if noise_level > 15:
        print(f"[DEBUG QUALITY] REJECTED — too noisy: {noise_level:.2f}")
        return {
            "ok": False,
            "message": "Image appears too noisy. Please take the photo in better lighting conditions."
        }

    # 6. Blur check
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    avg_dim = (h + w) / 2
    blur_threshold = int(max(40, min(80, avg_dim * 0.4)))
    print(f"[DEBUG QUALITY] Blur score: {blur_score:.2f}, threshold: {blur_threshold}")

    if blur_score < blur_threshold:
        print(f"[DEBUG QUALITY] REJECTED — too blurry: {blur_score:.2f}")
        return {
            "ok": False,
            "message": "Face appears blurry. Please upload a sharper image."
        }
    
    print(f"[DEBUG QUALITY] PASSED — all checks passed")
    return {
        "ok": True,
        "message": "Face quality is acceptable."
    }

def compute_landmark_stress_signal(landmarks) -> float:
    """
    Geometric stress signal from Face Mesh landmarks.
    Returns 0.0 (calm) to 1.0 (stressed).
    Signals: eyebrow furrow (AU4) + lip compression
    """

    # --- Eyebrow furrow (AU4) ---
    # 105 = left inner brow, 159 = left upper eyelid
    # 334 = right inner brow, 386 = right upper eyelid
    # Smaller distance = more furrowed = more stressed
    left_brow_dist  = landmarks[159].y - landmarks[105].y
    right_brow_dist = landmarks[386].y - landmarks[334].y
    avg_brow_dist   = (left_brow_dist + right_brow_dist) / 2

    # Relaxed ~0.06-0.08, furrowed ~0.02-0.04
    brow_stress = max(0.0, min(1.0, 1.0 - (avg_brow_dist / 0.07)))

    # --- Lip compression ---
    # 13 = upper lip center, 14 = lower lip center
    # Smaller gap = more tense/compressed lips
    lip_dist = abs(landmarks[14].y - landmarks[13].y)

    # Relaxed ~0.02-0.04, compressed ~0.005-0.015
    mouth_stress = max(0.0, min(1.0, 1.0 - (lip_dist / 0.03)))

    # Eyebrow is stronger stress signal than lips
    landmark_stress = (brow_stress * 0.70) + (mouth_stress * 0.30)

    print(f"[DEBUG LANDMARK] Avg brow dist: {avg_brow_dist:.4f} → brow stress: {brow_stress:.4f}")
    print(f"[DEBUG LANDMARK] Lip dist: {lip_dist:.4f} → mouth stress: {mouth_stress:.4f}")
    print(f"[DEBUG LANDMARK] Combined landmark stress: {landmark_stress:.4f}")

    return round(landmark_stress, 4)


def compute_stress_score(probabilities: dict, landmark_signal: float = 0.0) -> float:
    """
    Late fusion: 80% SENet18 emotion score + 20% geometric landmark signal.
    landmark_signal defaults to 0.0 if landmarks unavailable.
    """
    emotion_score = 0.0
    for emotion, prob in probabilities.items():
        emotion_score += prob * stress_weights[emotion]

    # Late fusion blend
    final_score = (emotion_score * 0.80) + (landmark_signal * 0.20)

    print(f"[DEBUG FUSION] Emotion score: {emotion_score:.4f}")
    print(f"[DEBUG FUSION] Landmark signal: {landmark_signal:.4f}")
    print(f"[DEBUG FUSION] Final fused score: {final_score:.4f}")

    return round(final_score * 100, 2)


def get_stress_level(score: float) -> str:
    if score < 20:
        return "Normal"
    elif score < 35:
        return "Mild"
    elif score < 55:
        return "Moderate"
    elif score < 75:
        return "High"
    return "Severe"


def get_stress_suggestion(
    stress_score: float,
    stress_level: str,
    predicted_emotion: str,
    probabilities: dict
) -> dict:
    prompt = f"""
You are a clinical wellbeing assistant trained in stress management.

Results:
- Stress score: {stress_score}/100
- Stress level: {stress_level} (scale: Normal < 20, Mild 20-34, Moderate 35-54, High 55-74, Severe 75+)
- Primary emotion: {predicted_emotion}
- Emotion probabilities: {json.dumps(probabilities)}


Tailor your advice specifically to the stress level:
- Normal/Mild: gentle maintenance tips, positive reinforcement
- Moderate: actionable stress reduction techniques
- High: immediate intervention strategies
- Severe: urgent coping strategies and professional help guidance


Return ONLY valid JSON, no markdown:
{{
  "summary": "1-2 sentence clinical-tone observation about the patient's state",
  "urgency_note": "brief note if high stress, else null",
  "categories": [
    {{
      "category": "Breathing & Immediate Relief",
      "icon": "wind",
      "tip": "specific actionable advice"
    }},
    {{
      "category": "Physical Wellbeing",
      "icon": "heart",
      "tip": "specific actionable advice"
    }},
    {{
      "category": "Mental Reframe",
      "icon": "brain",
      "tip": "specific actionable advice"
    }},
    {{
      "category": "Rest & Recovery",
      "icon": "moon",
      "tip": "specific actionable advice"
    }}
  ],
  "when_to_seek_help": "brief guidance on when to see a professional"
}}
"""

    try:
        response = gemini_client.models.generate_content(
            model=gemini_model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )


        print("\n===== GEMINI RAW RESPONSE =====")
        print(response)
        print("===== END RAW RESPONSE =====\n")

        text = response.text.strip()

        print("\n===== GEMINI TEXT =====")
        print(text)
        print("===== END TEXT =====\n")

        # Handle case where model wraps JSON in markdown code fences
        text = re.sub(r"```(?:json)?", "", text).strip()

        data = json.loads(text)

        print("\n===== GEMINI JSON =====")
        print(data)
        print("===== END JSON =====\n")

        return data

    except Exception as e:
        print("[GEMINI ERROR]", str(e))
        return {
            "title": "Suggestion unavailable",
            "advice": [f"Could not generate suggestion: {str(e)}"]
        }

@app.get("/")
def home():
    return {"message": "Stress Detector Backend is running."}

    
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    total_start = time.perf_counter()

    # 1. Read image
    t0 = time.perf_counter()
    contents = await file.read()
    print(f"[TIME] read_file: {time.perf_counter() - t0:.4f}s")

    # 2. Open image
    t0 = time.perf_counter()
    try:
        img = Image.open(io.BytesIO(contents))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    img = np.array(img)
    print(f"[TIME] open_image: {time.perf_counter() - t0:.4f}s")

    # 2.5. Full image brightness check — before face detection
    gray_full = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    full_brightness = gray_full.mean()
    if full_brightness < 12:
        raise HTTPException(status_code=400, detail="The image is too dark. Please take the photo in a brighter environment.")
    if full_brightness > 245:
        raise HTTPException(status_code=400, detail="The image is too bright or overexposed. Please avoid direct light facing the camera.")
    
    
    # 3. Face detection
    t0 = time.perf_counter()
    face, check_img, face_status = detect_and_crop_face(img)
    print("[FACE STATUS - MEDIAPIPE]", face_status)
    print(f"[TIME] mediapipe_detect_face: {time.perf_counter() - t0:.4f}s")

    print(f"[TIME] total_detect_face: {time.perf_counter() - t0:.4f}s")


    # Run facial obstruction validation only once after final detector result
    landmark_signal = 0.0
    face_landmarks = None

    if face_status == "ok":
        obstruction_t0 = time.perf_counter()

        # Pass full resized image, NOT the face crop
        obstruction_ok, obstruction_status, face_landmarks = validate_facial_obstruction(check_img)

        print(f"[DEBUG] Final obstruction check — ok={obstruction_ok}, status={obstruction_status}")
        print(f"[TIME] validate_facial_obstruction: {time.perf_counter() - obstruction_t0:.4f}s")

        if not obstruction_ok:
            face_status = obstruction_status

        # Compute landmark stress signal if face passed obstruction check
        if obstruction_ok and face_landmarks is not None:
            landmark_signal = compute_landmark_stress_signal(face_landmarks)
            print(f"[DEBUG] Landmark stress signal: {landmark_signal:.4f}")

        
        # --- Face completeness validation ---
    if face_status == "ok":
        complete_ok, complete_status = validate_face_crop_completeness(face)

        print(
            f"[DEBUG] Face completeness — "
            f"ok={complete_ok}, status={complete_status}"
        )

        if not complete_ok:
            face_status = complete_status
        
    
    face_error_messages = {
        "no_face": "No face detected. Please upload a clear photo with your full face visible.",
        "multiple_faces": "Multiple people detected. Please upload an image with only one person.",
        "low_confidence": "Face appears partially covered or blocked. Please ensure nothing is covering your face.",
        "face_obstructed": "Your face is not clearly visible. Please remove masks, sunglasses, hands, or anything blocking your face.",
        "too_close": "Your face is too close to the camera. Please move back so your full face fits in the frame.",
        "too_far": "Your face is too far from the camera. Please move closer so your face fills more of the frame.",
        "face_cut_off": "Part of your face is outside the frame. Please center your face fully in the image.",
        "face_rotated": "Your head is tilted too much. Please face the camera directly.",
        "eyes_closed": "Your eyes appear to be closed. Please keep your eyes open and facing the camera.",
        "face_not_frontal": "Please face the camera directly. Your face appears to be turned to the side.",
    }

    if face_status in face_error_messages:
        raise HTTPException(status_code=400, detail=face_error_messages[face_status])

    # 4. Quality validation
    t0 = time.perf_counter()
    quality_result = validate_face_quality(face)
    print(f"[TIME] validate_face_quality: {time.perf_counter() - t0:.4f}s")

    if not quality_result["ok"]:
        raise HTTPException(status_code=400, detail=quality_result["message"])

    # 5. Preprocessing
    t0 = time.perf_counter()
    face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    face = clahe.apply(face)
    face = Image.fromarray(face)
    face_tensor = preprocess_face_for_model(face)
    x = face_tensor.unsqueeze(0)
    print(f"[TIME] preprocessing: {time.perf_counter() - t0:.4f}s")

    # 6. Model inference
    t0 = time.perf_counter()
    with torch.no_grad():
        output = model(x)
        prob = torch.softmax(output, dim=1)
    print(f"[TIME] model_inference: {time.perf_counter() - t0:.4f}s")

    # 7. Post-processing
    t0 = time.perf_counter()
    pred = torch.argmax(prob, dim=1).item()
    prob_list = prob[0].tolist()

    probabilities = {
        emotions[i]: round(prob_list[i], 4)
        for i in range(len(emotions))
    }

    stress_score = compute_stress_score(probabilities, landmark_signal)
    stress_level = get_stress_level(stress_score)

    top_2 = sorted(
        probabilities.items(),
        key=lambda item: item[1],
        reverse=True
    )[:2]
    print(f"[TIME] postprocessing: {time.perf_counter() - t0:.4f}s")

    # 8. Gemini suggestion
    t0 = time.perf_counter()
    suggestion = get_stress_suggestion(
        stress_score=stress_score,
        stress_level=stress_level,
        predicted_emotion=emotions[pred],
        probabilities=probabilities
    )
    print(f"[TIME] gemini_suggestion: {time.perf_counter() - t0:.4f}s")

    print(f"[TIME] total_request: {time.perf_counter() - total_start:.4f}s")

    return {
        "predicted_emotion": emotions[pred],
        "stress_score": stress_score,
        "stress_level": stress_level,
        "probabilities": probabilities,
        "top_2_predictions": [
            {"emotion": top_2[0][0], "probability": top_2[0][1]},
            {"emotion": top_2[1][0], "probability": top_2[1][1]}
        ],
        "landmark_stress_signal": landmark_signal,
        "suggestion": suggestion
    }

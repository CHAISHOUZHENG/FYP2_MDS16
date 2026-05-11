import io

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms

import os
import json
import time
import math
from google import genai
from dotenv import load_dotenv

from models.senet import SENet18

import tempfile


os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "matplotlib"))

from retinaface import RetinaFace

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# Gemini client will automatically read GEMINI_API_KEY from environment
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

NO_VALID_FACE_MESSAGE = (
    "No valid human face detected. Please upload one real, clear front-facing face."
)
MULTIPLE_FACES_MESSAGE = (
    "Multiple face regions detected. Please upload an image with only one face."
)
FACE_QUALITY_MESSAGE = (
    "Image quality issue. Please upload a clearer photo with an unblocked front-facing face."
)

# load model
model = SENet18()
checkpoint = torch.load("best_checkpoint.tar", map_location="cpu")
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

transform = transforms.Compose([
    transforms.Resize((40, 40)),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0,), std=(255,))
])


profile_face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_profileface.xml"
)
frontal_face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
)


def expanded_face_bounds(
    image_shape: tuple[int, int, int],
    box: tuple[int, int, int, int]
) -> tuple[int, int, int, int]:
    h, w = image_shape[:2]
    x, y, bw, bh = box

    margin = 0.18
    x1 = max(0, int(x - bw * margin))
    y1 = max(0, int(y - bh * margin))
    x2 = min(w, int(x + bw * (1 + margin)))
    y2 = min(h, int(y + bh * (1 + margin)))

    return x1, y1, x2, y2


def crop_face_from_box(image: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    x1, y1, x2, y2 = expanded_face_bounds(image.shape, box)
    return image[y1:y2, x1:x2]


def detector_keypoints_in_crop(candidate: dict, crop_bounds: tuple[int, int, int, int]) -> dict:
    x1, y1, _, _ = crop_bounds
    landmarks = candidate.get("landmarks", {})
    required = ("right_eye", "left_eye", "nose", "mouth")
    if not all(name in landmarks for name in required):
        return {}

    return {
        name: (
            float(landmarks[name][0] - x1),
            float(landmarks[name][1] - y1)
        )
        for name in required
    }


def box_iou(
    box_a: tuple[int, int, int, int],
    box_b: tuple[int, int, int, int]
) -> float:
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b

    x1 = max(ax, bx)
    y1 = max(ay, by)
    x2 = min(ax + aw, bx + bw)
    y2 = min(ay + ah, by + bh)

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    if intersection == 0:
        return 0.0

    area_a = aw * ah
    area_b = bw * bh
    return intersection / float(area_a + area_b - intersection)


def merge_face_candidates(candidates: list[dict]) -> list[dict]:
    merged = []

    for candidate in sorted(candidates, key=lambda item: item["score"], reverse=True):
        if any(box_iou(candidate["box"], existing["box"]) > 0.35 for existing in merged):
            continue
        merged.append(candidate)

    return merged


def retinaface_candidates(image: np.ndarray) -> list[dict]:
    h, w = image.shape[:2]
    candidates = []

    try:
        detections = RetinaFace.detect_faces(
            cv2.cvtColor(image, cv2.COLOR_RGB2BGR),
            threshold=0.90
        )
    except Exception:
        return []

    if not isinstance(detections, dict):
        return []

    for det in detections.values():
        facial_area = det.get("facial_area")
        raw_landmarks = det.get("landmarks", {})
        if not facial_area or len(facial_area) != 4:
            continue

        x1, y1, x2, y2 = [int(value) for value in facial_area]
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))
        bw = x2 - x1
        bh = y2 - y1

        if bw < 35 or bh < 35:
            continue

        if not all(name in raw_landmarks for name in ("right_eye", "left_eye", "nose")):
            continue

        mouth_left = raw_landmarks.get("mouth_left")
        mouth_right = raw_landmarks.get("mouth_right")
        if mouth_left is not None and mouth_right is not None:
            mouth = (
                (float(mouth_left[0]) + float(mouth_right[0])) / 2,
                (float(mouth_left[1]) + float(mouth_right[1])) / 2
            )
        else:
            mouth = (x1 + bw / 2, y1 + bh * 0.75)

        landmarks = {
            "right_eye": tuple(float(value) for value in raw_landmarks["right_eye"]),
            "left_eye": tuple(float(value) for value in raw_landmarks["left_eye"]),
            "nose": tuple(float(value) for value in raw_landmarks["nose"]),
            "mouth": mouth
        }

        candidates.append({
            "box": (x1, y1, bw, bh),
            "score": float(det.get("score", 0.0)),
            "landmarks": landmarks,
            "source": "retinaface",
            "image_width": w,
            "image_height": h
        })

    return merge_face_candidates(candidates)


def profile_face_candidates(image: np.ndarray) -> list[dict]:
    if profile_face_detector.empty():
        return []

    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    boxes = []

    for x, y, bw, bh in profile_face_detector.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=4,
        minSize=(35, 35)
    ):
        boxes.append({
            "box": (int(x), int(y), int(bw), int(bh)),
            "score": 0.5,
            "detection": None,
            "source": "profile",
            "image_width": w,
            "image_height": h
        })

    flipped = cv2.flip(gray, 1)
    for x, y, bw, bh in profile_face_detector.detectMultiScale(
        flipped,
        scaleFactor=1.08,
        minNeighbors=4,
        minSize=(35, 35)
    ):
        boxes.append({
            "box": (int(w - x - bw), int(y), int(bw), int(bh)),
            "score": 0.5,
            "detection": None,
            "source": "profile",
            "image_width": w,
            "image_height": h
        })

    return merge_face_candidates(boxes)


def frontal_face_candidates(image: np.ndarray) -> list[dict]:
    if frontal_face_detector.empty():
        return []

    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    boxes = []

    for x, y, bw, bh in frontal_face_detector.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=4,
        minSize=(50, 50)
    ):
        x, y, bw, bh = int(x), int(y), int(bw), int(bh)
        landmarks = {
            "right_eye": (x + bw * 0.35, y + bh * 0.40),
            "left_eye": (x + bw * 0.65, y + bh * 0.40),
            "nose": (x + bw * 0.50, y + bh * 0.58),
            "mouth": (x + bw * 0.50, y + bh * 0.76),
        }
        boxes.append({
            "box": (x, y, bw, bh),
            "score": 0.45,
            "detection": None,
            "landmarks": landmarks,
            "source": "opencv_frontal",
            "image_width": w,
            "image_height": h
        })

    return merge_face_candidates(boxes)


def is_front_facing(candidate: dict) -> bool:
    x, y, bw, bh = candidate["box"]
    landmarks = candidate.get("landmarks", {})
    if bw <= 0 or not all(name in landmarks for name in ("right_eye", "left_eye", "nose")):
        return False

    right_eye = landmarks["right_eye"]
    left_eye = landmarks["left_eye"]
    nose = landmarks["nose"]
    mouth = landmarks.get("mouth")
    if bh <= 0:
        return False

    eye_dx = left_eye[0] - right_eye[0]
    eye_dy = left_eye[1] - right_eye[1]
    eye_distance = math.hypot(eye_dx, eye_dy)
    eye_distance_in_box = eye_distance / bw
    if eye_distance_in_box < 0.18:
        return False

    eye_angle = abs(math.degrees(math.atan2(eye_dy, eye_dx)))
    if eye_angle > 15:
        return False

    nose_in_box = (nose[0] - x) / bw
    nose_y_in_box = (nose[1] - y) / bh
    eye_center_y = (left_eye[1] + right_eye[1]) / 2
    nose_below_eye_line = (nose[1] - eye_center_y) / bh
    if nose_y_in_box < 0.30 or nose_below_eye_line < 0.05:
        return False

    eye_center_x = (left_eye[0] + right_eye[0]) / 2
    nose_offset = abs(nose[0] - eye_center_x) / max(eye_distance, 1e-6)
    if nose_offset > 0.35:
        return False

    if mouth is not None:
        mouth_below_nose = (mouth[1] - nose[1]) / bh
        if mouth_below_nose < 0.08:
            return False

        mouth_offset = abs(mouth[0] - nose[0]) / max(eye_distance, 1e-6)
        if mouth_offset > 0.45:
            return False

    return eye_distance_in_box >= 0.18 and 0.25 <= nose_in_box <= 0.70


def detect_face(image: np.ndarray):
    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
        h, w = image.shape[:2]

    candidates = retinaface_candidates(image)
    if len(candidates) == 0:
        candidates = frontal_face_candidates(image)

    profile_candidates = profile_face_candidates(image)

    for profile_candidate in profile_candidates:
        if not any(box_iou(profile_candidate["box"], candidate["box"]) > 0.25 for candidate in candidates):
            candidates.append(profile_candidate)

    if len(candidates) == 0:
        return None, "no_face", None

    candidates = sorted(
        candidates,
        key=lambda candidate: candidate["box"][2] * candidate["box"][3],
        reverse=True
    )
    largest_area = candidates[0]["box"][2] * candidates[0]["box"][3]
    significant_candidates = [
        candidate for candidate in candidates
        if candidate["box"][2] * candidate["box"][3] >= 0.35 * largest_area
    ]

    if len(significant_candidates) > 1:
        return None, "multiple_faces", None

    if not is_front_facing(candidates[0]):
        return None, "side_face", None

    crop_bounds = expanded_face_bounds(image.shape, candidates[0]["box"])
    cropped_face = image[crop_bounds[1]:crop_bounds[3], crop_bounds[0]:crop_bounds[2]]
    return cropped_face, "ok", {
        "box": candidates[0]["box"],
        "image_shape": image.shape,
        "feature_points": detector_keypoints_in_crop(candidates[0], crop_bounds)
    }


def validate_face_framing(face_info: dict) -> dict:
    x, y, bw, bh = face_info["box"]
    image_h, image_w = face_info["image_shape"][:2]

    width_ratio = bw / max(image_w, 1)
    height_ratio = bh / max(image_h, 1)
    area_ratio = (bw * bh) / max(image_w * image_h, 1)

    if bw < 50 or bh < 60:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    if area_ratio < 0.008 and (width_ratio < 0.10 or height_ratio < 0.10):
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    touches_edge = (
        x <= image_w * 0.015
        or y <= image_h * 0.015
        or x + bw >= image_w * 0.985
        or y + bh >= image_h * 0.985
    )
    if touches_edge and (width_ratio > 0.90 or height_ratio > 0.90):
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    return {
        "ok": True,
        "message": "Face framing is acceptable."
    }


def validate_face_quality(face: np.ndarray) -> dict:
    h, w = face.shape[:2]

    if h < 70 or w < 70:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    if h < 120 or w < 120:
        blur_threshold = 35
    else:
        blur_threshold = 55

    if blur_score < blur_threshold:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    brightness = gray.mean()
    contrast = gray.std()
    overexposed_ratio = np.mean(gray > 245)
    underexposed_ratio = np.mean(gray < 10)

    if brightness < 35:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    if brightness > 225:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    if overexposed_ratio > 0.32:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    if underexposed_ratio > 0.45:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    if contrast > 100 and (overexposed_ratio > 0.28 or underexposed_ratio > 0.35):
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    return {
        "ok": True,
        "message": "Face quality is acceptable."
    }


def feature_patch(face: np.ndarray, center: tuple[float, float], x_radius: float, y_radius: float):
    h, w = face.shape[:2]
    cx, cy = center
    x1 = max(0, int(cx - w * x_radius))
    y1 = max(0, int(cy - h * y_radius))
    x2 = min(w, int(cx + w * x_radius))
    y2 = min(h, int(cy + h * y_radius))

    if x2 <= x1 or y2 <= y1:
        return None

    return face[y1:y2, x1:x2]


def patch_quality_metrics(patch: np.ndarray) -> dict:
    gray = cv2.cvtColor(patch, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(patch, cv2.COLOR_RGB2HSV)
    local_detail = np.mean(
        np.abs(
            gray.astype(np.float32)
            - cv2.GaussianBlur(gray, (0, 0), 2).astype(np.float32)
        )
    )

    skin_like_mask = (
        (hsv[:, :, 0] < 25)
        & (hsv[:, :, 1] > 25)
        & (hsv[:, :, 2] > 50)
    )
    saturated_mask = (hsv[:, :, 1] > 80) & (hsv[:, :, 2] > 50)

    return {
        "dark_ratio": float(np.mean(gray < 55)),
        "very_dark_ratio": float(np.mean(gray < 35)),
        "bright_ratio": float(np.mean(gray > 240)),
        "detail": float(local_detail),
        "edge_ratio": float(np.mean(cv2.Canny(gray, 50, 150) > 0)),
        "skin_like_ratio": float(np.mean(skin_like_mask)),
        "saturated_ratio": float(np.mean(saturated_mask))
    }


def eye_patch_clear(patch: np.ndarray) -> bool:
    metrics = patch_quality_metrics(patch)
    return not (
        (
            metrics["dark_ratio"] > 0.60
            and metrics["skin_like_ratio"] < 0.60
        )
        or (
            metrics["dark_ratio"] > 0.60
            and metrics["detail"] < 4.5
            and metrics["edge_ratio"] < 0.05
        )
        or (
            metrics["detail"] < 3.0
            and metrics["edge_ratio"] < 0.04
        )
        or metrics["very_dark_ratio"] > 0.38
        or metrics["bright_ratio"] > 0.75
    )


def feature_patch_clear(patch: np.ndarray) -> bool:
    metrics = patch_quality_metrics(patch)
    return not (
        metrics["dark_ratio"] > 0.72
        or metrics["very_dark_ratio"] > 0.38
        or metrics["bright_ratio"] > 0.78
        or (
            metrics["detail"] < 2.5
            and metrics["edge_ratio"] < 0.035
        )
        or (
            metrics["skin_like_ratio"] < 0.35
            and metrics["saturated_ratio"] > 0.50
        )
    )


def validate_detector_feature_visibility(face: np.ndarray, face_info: dict) -> dict:
    feature_points = face_info.get("feature_points", {})
    required_points = ("right_eye", "left_eye", "nose", "mouth")
    if not all(point in feature_points for point in required_points):
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    eye_metrics = []
    for eye_name in ("right_eye", "left_eye"):
        patch = feature_patch(face, feature_points[eye_name], x_radius=0.09, y_radius=0.08)
        if patch is None:
            return {
                "ok": False,
                "message": FACE_QUALITY_MESSAGE
            }

        metrics = patch_quality_metrics(patch)
        eye_metrics.append(metrics)
        if not eye_patch_clear(patch):
            return {
                "ok": False,
                "message": FACE_QUALITY_MESSAGE
            }

    min_face_size = min(face.shape[:2])
    skin_colored_eye_occlusion_count = sum(
        1
        for metrics in eye_metrics
        if (
            metrics["skin_like_ratio"] > 0.84
            and metrics["saturated_ratio"] > 0.75
            and metrics["detail"] < 13.0
            and metrics["edge_ratio"] < 0.23
        )
    )
    if min_face_size < 180 and skin_colored_eye_occlusion_count >= 2:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    avg_eye_detail = float(np.mean([metrics["detail"] for metrics in eye_metrics]))
    avg_eye_edge_ratio = float(np.mean([metrics["edge_ratio"] for metrics in eye_metrics]))
    if avg_eye_detail < 5.0 and avg_eye_edge_ratio < 0.08:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    feature_specs = [
        ("nose", 0.10, 0.09),
        ("mouth", 0.13, 0.08)
    ]
    for feature_name, x_radius, y_radius in feature_specs:
        patch = feature_patch(face, feature_points[feature_name], x_radius, y_radius)
        if patch is None or not feature_patch_clear(patch):
            return {
                "ok": False,
                "message": FACE_QUALITY_MESSAGE
            }

    return {
        "ok": True,
        "message": "Face features are visible."
    }


def validate_photo_likeness(face: np.ndarray, face_info: dict | None = None) -> dict:
    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(face, cv2.COLOR_RGB2HSV)
    brightness = gray.mean()
    contrast = gray.std()
    overexposed_ratio = np.mean(gray > 245)
    local_detail = np.mean(
        np.abs(
            gray.astype(np.float32)
            - cv2.GaussianBlur(gray, (0, 0), 3).astype(np.float32)
        )
    )

    edges = cv2.Canny(gray, 50, 150)
    edge_ratio = np.mean(edges > 0)

    looks_smooth_generated = brightness > 155 and contrast < 42 and local_detail < 7
    looks_line_art = overexposed_ratio > 0.25 and edge_ratio > 0.025 and local_detail < 18
    skin_like_ratio = np.mean(
        (hsv[:, :, 0] < 25)
        & (hsv[:, :, 1] > 25)
        & (hsv[:, :, 2] > 50)
    )
    looks_smooth_3d_render = (
        brightness > 165
        and contrast < 45
        and local_detail < 8.5
        and edge_ratio < 0.11
        and skin_like_ratio > 0.80
    )
    looks_avatar_like = False

    feature_points = (face_info or {}).get("feature_points", {})
    if "right_eye" in feature_points and "left_eye" in feature_points:
        eye_metrics = []
        for eye_name in ("right_eye", "left_eye"):
            patch = feature_patch(face, feature_points[eye_name], x_radius=0.09, y_radius=0.08)
            if patch is not None:
                eye_metrics.append(patch_quality_metrics(patch))

        if len(eye_metrics) == 2:
            both_eyes_are_art_like = all(
                metrics["dark_ratio"] > 0.30
                and metrics["very_dark_ratio"] > 0.22
                and metrics["skin_like_ratio"] < 0.50
                for metrics in eye_metrics
            )
            looks_avatar_like = (
                local_detail < 7.5
                and edge_ratio < 0.075
                and both_eyes_are_art_like
            )

    if looks_smooth_generated or looks_line_art or looks_smooth_3d_render or looks_avatar_like:
        return {
            "ok": False,
            "message": NO_VALID_FACE_MESSAGE
        }

    return {
        "ok": True,
        "message": "Image appears photo-like."
    }


def validate_image_lighting(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    brightness = gray.mean()
    dark_pixel_ratio = np.mean(gray < 45)

    if brightness < 55 and dark_pixel_ratio > 0.55:
        return {
            "ok": False,
            "message": FACE_QUALITY_MESSAGE
        }

    return {
        "ok": True,
        "message": "Image lighting is acceptable."
    }


def compute_stress_score(probabilities: dict) -> float:
    score = 0.0
    for emotion, prob in probabilities.items():
        score += prob * stress_weights[emotion]
    return round(score * 100, 2)


def get_stress_level(score: float) -> str:
    if score < 35:
        return "Low"
    elif score < 65:
        return "Medium"
    return "High"


def get_stress_suggestion(
    stress_score: float,
    stress_level: str,
    predicted_emotion: str,
    probabilities: dict
) -> dict:
    prompt = f"""
You are a supportive wellbeing assistant.

A facial emotion system produced these results:
- Stress score: {stress_score}
- Stress level: {stress_level}
- Predicted emotion: {predicted_emotion}
- Probabilities: {json.dumps(probabilities)}

Give a short, gentle, non-medical suggestion for the user.

Rules:
- Do not diagnose any mental or physical condition.
- Do not claim certainty.
- Use gentle language like "you may be feeling..."
- Keep it practical and brief.
- Return valid JSON only in this format:
{{
  "title": "short heading",
  "advice": ["tip 1", "tip 2", "tip 3"]
}}
"""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )

        text = response.text.strip()

        # Handle case where model wraps JSON in markdown code fences
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()

        data = json.loads(text)
        return data

    except Exception as e:
        return {
            "title": "Suggestion unavailable",
            "advice": [f"Could not generate suggestion: {str(e)}"]
        }
    

@app.get("/")
def home():
    return {"message": "Stress Detector Backend is running."}

    
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    request_start = time.perf_counter()
    last_step = request_start
    request_label = file.filename or "uploaded-image"

    def log_step(step: str):
        nonlocal last_step
        now = time.perf_counter()
        step_ms = (now - last_step) * 1000
        total_ms = (now - request_start) * 1000
        print(
            f"[predict] {request_label} | {step}: "
            f"+{step_ms:.1f} ms | total {total_ms:.1f} ms",
            flush=True
        )
        last_step = now

    contents = await file.read()
    log_step("read upload")

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        log_step("invalid image")
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = np.array(img)
    log_step("decode image")

    face, face_status, face_info = detect_face(img)
    log_step(f"retinaface detection ({face_status})")

    if face_status == "no_face":
        lighting_result = validate_image_lighting(img)
        log_step("no-face lighting validation")
        if not lighting_result["ok"]:
            log_step("reject: quality issue")
            raise HTTPException(status_code=400, detail=lighting_result["message"])

        log_step("reject: no valid face")
        raise HTTPException(status_code=400, detail=NO_VALID_FACE_MESSAGE)

    if face_status == "multiple_faces":
        log_step("reject: multiple faces")
        raise HTTPException(status_code=400, detail=MULTIPLE_FACES_MESSAGE)

    if face_status == "side_face":
        log_step("reject: side face")
        raise HTTPException(status_code=400, detail=FACE_QUALITY_MESSAGE)

    framing_result = validate_face_framing(face_info)
    log_step("framing validation")
    if not framing_result["ok"]:
        log_step("reject: framing")
        raise HTTPException(status_code=400, detail=framing_result["message"])

    photo_result = validate_photo_likeness(face, face_info)
    log_step("photo-likeness validation")
    if not photo_result["ok"]:
        log_step("reject: no valid human face")
        raise HTTPException(status_code=400, detail=photo_result["message"])

    quality_result = validate_face_quality(face)
    log_step("quality validation")
    if not quality_result["ok"]:
        log_step("reject: quality")
        raise HTTPException(status_code=400, detail=quality_result["message"])

    feature_result = validate_detector_feature_visibility(face, face_info)
    log_step("feature visibility validation")
    if not feature_result["ok"]:
        log_step("reject: blocked features")
        raise HTTPException(status_code=400, detail=feature_result["message"])

    face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    # improve contrast
    face = cv2.equalizeHist(face)

    face = Image.fromarray(face)

    face_tensor = transform(face)
    x = face_tensor.unsqueeze(0)
    log_step("preprocess FER input")

    with torch.no_grad():
        output = model(x)
        prob = torch.softmax(output, dim=1)
    log_step("FER model inference")

    prob_list = prob[0].tolist()

    fer_probabilities = {
        emotions[i]: round(prob_list[i], 4)
        for i in range(len(emotions))
    }
    probabilities = fer_probabilities

    stress_score = compute_stress_score(probabilities)
    stress_level = get_stress_level(stress_score)
    predicted_emotion = max(probabilities, key=probabilities.get)

    top_2 = sorted(
        probabilities.items(),
        key=lambda item: item[1],
        reverse=True
    )[:2]
    log_step("stress score calculation")

    suggestion = get_stress_suggestion(
        stress_score=stress_score,
        stress_level=stress_level,
        predicted_emotion=predicted_emotion,
        probabilities=probabilities
    )
    log_step("Gemini suggestion")
    log_step("request complete")

    return {
        "emotion_source": "fer_model",
        "predicted_emotion": predicted_emotion,
        "stress_score": stress_score,
        "stress_score_breakdown": {
            "formula": "stress_score = original stress formula applied to FER model emotion probabilities"
        },
        "fer_probabilities": fer_probabilities,
        "stress_level": stress_level,
        "probabilities": probabilities,
        "top_2_predictions": [
            {"emotion": top_2[0][0], "probability": top_2[0][1]},
            {"emotion": top_2[1][0], "probability": top_2[1][1]}
        ],
        "suggestion": suggestion
    }

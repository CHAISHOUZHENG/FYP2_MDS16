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
from google import genai
from dotenv import load_dotenv

from models.senet import SENet18

import sys
import tempfile
import types


def install_tensorflow_doc_controls_stub():
    """Let MediaPipe import without loading TensorFlow's docgen-only helper."""
    doc_controls = types.ModuleType("tensorflow.tools.docs.doc_controls")
    doc_controls.do_not_generate_docs = lambda obj: obj

    sys.modules.setdefault("tensorflow", types.ModuleType("tensorflow"))
    sys.modules.setdefault("tensorflow.tools", types.ModuleType("tensorflow.tools"))
    sys.modules.setdefault("tensorflow.tools.docs", types.ModuleType("tensorflow.tools.docs"))
    sys.modules.setdefault("tensorflow.tools.docs.doc_controls", doc_controls)


os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "matplotlib"))
install_tensorflow_doc_controls_stub()

import mediapipe as mp

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

FER_STRESS_WEIGHT = 0.80
LANDMARK_STRESS_WEIGHT = 0.20
FER_EMOTION_WEIGHT = 0.80
LANDMARK_EMOTION_WEIGHT = 0.20

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


mp_face_detection = mp.solutions.face_detection
face_detector_short = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.45
)
face_detector_full = mp_face_detection.FaceDetection(
    model_selection=1,
    min_detection_confidence=0.45
)

profile_face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_profileface.xml"
)
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

LEFT_EYE_LANDMARKS = [33, 133, 159, 145]
RIGHT_EYE_LANDMARKS = [362, 263, 386, 374]
NOSE_LANDMARKS = [1, 4, 98, 327]
MOUTH_LANDMARKS = [61, 291, 13, 14]
FACE_OVAL_LANDMARKS = [10, 152, 234, 454]


def crop_face_from_box(image: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    h, w = image.shape[:2]
    x, y, bw, bh = box

    margin = 0.18
    x1 = max(0, int(x - bw * margin))
    y1 = max(0, int(y - bh * margin))
    x2 = min(w, int(x + bw * (1 + margin)))
    y2 = min(h, int(y + bh * (1 + margin)))

    return image[y1:y2, x1:x2]


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


def mediapipe_candidates(image: np.ndarray) -> list[dict]:
    h, w = image.shape[:2]
    candidates = []

    for detector in (face_detector_short, face_detector_full):
        results = detector.process(image)
        if not results.detections:
            continue

        for det in results.detections:
            bbox = det.location_data.relative_bounding_box

            x = int(bbox.xmin * w)
            y = int(bbox.ymin * h)
            bw = int(bbox.width * w)
            bh = int(bbox.height * h)

            if bw < 35 or bh < 35:
                continue

            x = max(0, x)
            y = max(0, y)
            bw = min(bw, w - x)
            bh = min(bh, h - y)

            if bw > 0 and bh > 0:
                candidates.append({
                    "box": (x, y, bw, bh),
                    "score": float(det.score[0]),
                    "detection": det,
                    "source": "mediapipe",
                    "image_width": w
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
            "image_width": w
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
            "image_width": w
        })

    return merge_face_candidates(boxes)


def is_front_facing(candidate: dict) -> bool:
    det = candidate["detection"]
    if det is None:
        return False

    x, _, bw, _ = candidate["box"]
    image_width = candidate.get("image_width", 0)
    keypoints = det.location_data.relative_keypoints
    if len(keypoints) < 3 or bw <= 0 or image_width <= 0:
        return False

    right_eye = keypoints[0]
    left_eye = keypoints[1]
    nose = keypoints[2]

    eye_distance = abs(left_eye.x - right_eye.x)
    # MediaPipe keypoints are image-relative. Convert nose x to face-box-relative.
    box_left = x / image_width
    box_width = bw / image_width
    nose_box_x = nose.x
    right_eye_box_x = right_eye.x
    left_eye_box_x = left_eye.x

    # Approximate frontal faces have both eyes visible and enough eye separation.
    if eye_distance < 0.035:
        return False

    # Nose should not sit too close to either side of the detected face box.
    # This catches strong side-profile faces, which are unreliable for emotion.
    if box_width <= 0:
        return False

    nose_in_box = (nose_box_x - box_left) / box_width
    left_eye_in_box = (left_eye_box_x - box_left) / box_width
    right_eye_in_box = (right_eye_box_x - box_left) / box_width
    eye_distance_in_box = abs(left_eye_in_box - right_eye_in_box)

    return eye_distance_in_box >= 0.18 and 0.25 <= nose_in_box <= 0.70


def detect_face(image: np.ndarray):
    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
        h, w = image.shape[:2]

    candidates = mediapipe_candidates(image)
    profile_candidates = profile_face_candidates(image)

    for profile_candidate in profile_candidates:
        if not any(box_iou(profile_candidate["box"], candidate["box"]) > 0.25 for candidate in candidates):
            candidates.append(profile_candidate)

    if len(candidates) == 0:
        return None, "no_face"

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
        return None, "multiple_faces"

    if not is_front_facing(candidates[0]):
        return None, "side_face"

    cropped_face = crop_face_from_box(image, candidates[0]["box"])
    return cropped_face, "ok"


def validate_face_quality(face: np.ndarray) -> dict:
    h, w = face.shape[:2]

    if h < 70 or w < 70:
        return {
            "ok": False,
            "message": "Face is too small or low resolution. Please upload a clearer image."
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
            "message": "Face appears blurry. Please upload a sharper image."
        }

    brightness = gray.mean()
    contrast = gray.std()
    overexposed_ratio = np.mean(gray > 245)
    underexposed_ratio = np.mean(gray < 10)

    if brightness < 35:
        return {
            "ok": False,
            "message": "Image is too dark. Please upload an image with better lighting."
        }

    if brightness > 225:
        return {
            "ok": False,
            "message": "Image is too bright. Please upload an image with better lighting."
        }

    if overexposed_ratio > 0.32:
        return {
            "ok": False,
            "message": "Face is overexposed or washed out. Please upload a clearer image with softer lighting."
        }

    if underexposed_ratio > 0.45:
        return {
            "ok": False,
            "message": "Face has too many dark areas. Please upload an image with more even lighting."
        }

    if contrast > 100 and (overexposed_ratio > 0.28 or underexposed_ratio > 0.35):
        return {
            "ok": False,
            "message": "Face details are unclear due to harsh lighting or motion blur. Please upload a clearer front-facing image."
        }

    return {
        "ok": True,
        "message": "Face quality is acceptable."
    }


def validate_photo_likeness(face: np.ndarray) -> dict:
    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
    brightness = gray.mean()
    contrast = gray.std()
    local_detail = np.mean(
        np.abs(
            gray.astype(np.float32)
            - cv2.GaussianBlur(gray, (0, 0), 3).astype(np.float32)
        )
    )

    if brightness > 155 and contrast < 42 and local_detail < 7:
        return {
            "ok": False,
            "message": "Image appears to be a cartoon or stylized face. Please upload a real human face photo."
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
            "message": "Image lighting is too low. Please upload a brighter, clearer front-facing face."
        }

    return {
        "ok": True,
        "message": "Image lighting is acceptable."
    }


def get_landmark_points(face: np.ndarray):
    results = face_mesh.process(face)
    if not results.multi_face_landmarks:
        return None

    h, w = face.shape[:2]
    landmarks = results.multi_face_landmarks[0].landmark
    return np.array(
        [(landmark.x * w, landmark.y * h, landmark.z * w) for landmark in landmarks],
        dtype=np.float32
    )


def landmarks_visible(points: np.ndarray, indexes: list[int], width: int, height: int) -> bool:
    selected = points[indexes]
    x_tolerance = width * 0.08
    y_tolerance = height * 0.08

    return bool(
        np.all(selected[:, 0] >= -x_tolerance)
        and np.all(selected[:, 0] < width + x_tolerance)
        and np.all(selected[:, 1] >= -y_tolerance)
        and np.all(selected[:, 1] < height + y_tolerance)
    )


def eye_open_ratio(points: np.ndarray, indexes: list[int]) -> float:
    outer, inner, upper, lower = points[indexes]
    width = np.linalg.norm(outer[:2] - inner[:2])
    height = np.linalg.norm(upper[:2] - lower[:2])
    return float(height / max(width, 1e-6))


def mouth_open_ratio(points: np.ndarray) -> float:
    left, right, upper, lower = points[MOUTH_LANDMARKS]
    width = np.linalg.norm(left[:2] - right[:2])
    height = np.linalg.norm(upper[:2] - lower[:2])
    return float(height / max(width, 1e-6))


def compute_smile_score(points: np.ndarray) -> float:
    mouth_left, mouth_right, mouth_upper, mouth_lower = points[MOUTH_LANDMARKS]
    _, _, face_left, face_right = points[FACE_OVAL_LANDMARKS]
    face_top, face_bottom, _, _ = points[FACE_OVAL_LANDMARKS]

    face_width = np.linalg.norm(face_left[:2] - face_right[:2])
    face_height = np.linalg.norm(face_top[:2] - face_bottom[:2])
    mouth_width = np.linalg.norm(mouth_left[:2] - mouth_right[:2])
    mouth_center_y = (mouth_upper[1] + mouth_lower[1]) / 2
    mouth_corner_y = (mouth_left[1] + mouth_right[1]) / 2

    mouth_width_ratio = mouth_width / max(face_width, 1e-6)
    mouth_ratio = mouth_open_ratio(points)
    corner_lift = (mouth_center_y - mouth_corner_y) / max(face_height, 1e-6)

    width_score = np.clip((mouth_width_ratio - 0.34) / 0.18, 0, 1)
    lift_score = np.clip((corner_lift - 0.005) / 0.04, 0, 1)
    open_smile_score = np.clip((mouth_ratio - 0.05) / 0.18, 0, 1)

    return float(
        (0.55 * width_score)
        + (0.30 * lift_score)
        + (0.15 * open_smile_score)
    )


def validate_face_landmarks(face: np.ndarray) -> dict:
    points = get_landmark_points(face)
    if points is None:
        return {
            "ok": False,
            "message": "Facial landmarks are not clear. Please upload a sharper front-facing face."
        }

    h, w = face.shape[:2]
    feature_groups = [
        LEFT_EYE_LANDMARKS,
        RIGHT_EYE_LANDMARKS,
        NOSE_LANDMARKS,
        MOUTH_LANDMARKS
    ]

    if not all(landmarks_visible(points, indexes, w, h) for indexes in feature_groups):
        return {
            "ok": False,
            "message": "Eyes, nose, or mouth are not fully visible. Please upload a clear front-facing face."
        }

    left_eye = points[[33, 133]]
    right_eye = points[[362, 263]]
    nose = points[1]
    mouth_center = points[[13, 14]].mean(axis=0)
    face_top, face_bottom, face_left, face_right = points[FACE_OVAL_LANDMARKS]

    eye_center = np.vstack([left_eye, right_eye]).mean(axis=0)
    face_width = np.linalg.norm(face_left[:2] - face_right[:2])
    face_height = np.linalg.norm(face_top[:2] - face_bottom[:2])
    eye_distance = np.linalg.norm(left_eye.mean(axis=0)[:2] - right_eye.mean(axis=0)[:2])

    if face_width < 1 or face_height < 1:
        return {
            "ok": False,
            "message": "Face landmarks are not stable enough. Please upload a clearer face."
        }

    nose_offset = abs(nose[0] - eye_center[0]) / face_width
    mouth_offset = abs(mouth_center[0] - nose[0]) / face_width

    if eye_distance / face_width < 0.20 or nose_offset > 0.25 or mouth_offset > 0.25:
        return {
            "ok": False,
            "message": "Face is not front-facing enough. Please upload a clearer front-facing face."
        }

    return {
        "ok": True,
        "message": "Facial landmarks are clear.",
        "points": points
    }


def compute_landmark_stress_score(points: np.ndarray) -> float:
    left_eye_ratio = eye_open_ratio(points, LEFT_EYE_LANDMARKS)
    right_eye_ratio = eye_open_ratio(points, RIGHT_EYE_LANDMARKS)
    avg_eye_ratio = (left_eye_ratio + right_eye_ratio) / 2
    mouth_ratio = mouth_open_ratio(points)

    brow_left = points[70]
    brow_right = points[300]
    eye_left_upper = points[159]
    eye_right_upper = points[386]
    face_top, face_bottom, _, _ = points[FACE_OVAL_LANDMARKS]
    face_height = np.linalg.norm(face_top[:2] - face_bottom[:2])
    brow_eye_gap = (
        abs(brow_left[1] - eye_left_upper[1])
        + abs(brow_right[1] - eye_right_upper[1])
    ) / (2 * max(face_height, 1e-6))

    eye_tension = np.clip((0.28 - avg_eye_ratio) / 0.18, 0, 1)
    mouth_tension = np.clip((mouth_ratio - 0.08) / 0.22, 0, 1)
    brow_tension = np.clip((0.08 - brow_eye_gap) / 0.05, 0, 1)
    smile_score = compute_smile_score(points)

    # A genuine smile often narrows the eyes and opens/widens the mouth.
    # Reduce those tension cues when smile geometry is strong.
    eye_tension *= (1 - 0.55 * smile_score)
    mouth_tension *= (1 - 0.85 * smile_score)

    score = (
        0.40 * eye_tension
        + 0.35 * mouth_tension
        + 0.25 * brow_tension
    ) * 100
    score *= (1 - 0.45 * smile_score)

    return round(float(score), 2)


def compute_landmark_emotion_probabilities(points: np.ndarray) -> dict:
    left_eye_ratio = eye_open_ratio(points, LEFT_EYE_LANDMARKS)
    right_eye_ratio = eye_open_ratio(points, RIGHT_EYE_LANDMARKS)
    avg_eye_ratio = (left_eye_ratio + right_eye_ratio) / 2
    mouth_ratio = mouth_open_ratio(points)
    smile_score = compute_smile_score(points)

    brow_left = points[70]
    brow_right = points[300]
    eye_left_upper = points[159]
    eye_right_upper = points[386]
    face_top, face_bottom, _, _ = points[FACE_OVAL_LANDMARKS]
    face_height = np.linalg.norm(face_top[:2] - face_bottom[:2])
    brow_eye_gap = (
        abs(brow_left[1] - eye_left_upper[1])
        + abs(brow_right[1] - eye_right_upper[1])
    ) / (2 * max(face_height, 1e-6))

    eye_tension = np.clip((0.28 - avg_eye_ratio) / 0.18, 0, 1)
    mouth_open = np.clip((mouth_ratio - 0.08) / 0.25, 0, 1)
    brow_tension = np.clip((0.08 - brow_eye_gap) / 0.05, 0, 1)
    non_smile_factor = 1 - smile_score

    scores = {
        "angry": 0.05 + non_smile_factor * ((0.45 * brow_tension) + (0.20 * eye_tension)),
        "disgust": 0.03 + non_smile_factor * (0.20 * brow_tension),
        "fear": 0.04 + non_smile_factor * ((0.25 * mouth_open) + (0.25 * eye_tension)),
        "happy": 0.05 + (2.20 * smile_score),
        "sad": 0.04 + non_smile_factor * (0.20 * eye_tension),
        "surprise": 0.08 + (0.45 * mouth_open * (1 - smile_score)),
        "neutral": 0.15 * non_smile_factor
    }

    total = sum(scores.values())
    if total <= 0:
        return {emotion: round(1 / len(emotions), 4) for emotion in emotions}

    return {
        emotion: round(scores[emotion] / total, 4)
        for emotion in emotions
    }


def combine_emotion_probabilities(
    fer_probabilities: dict,
    landmark_probabilities: dict
) -> dict:
    combined = {
        emotion: (
            FER_EMOTION_WEIGHT * fer_probabilities[emotion]
            + LANDMARK_EMOTION_WEIGHT * landmark_probabilities[emotion]
        )
        for emotion in emotions
    }
    total = sum(combined.values())
    if total <= 0:
        return fer_probabilities

    return {
        emotion: round(combined[emotion] / total, 4)
        for emotion in emotions
    }


def combine_stress_scores(fer_score: float, landmark_score: float) -> float:
    return round(
        (FER_STRESS_WEIGHT * fer_score)
        + (LANDMARK_STRESS_WEIGHT * landmark_score),
        2
    )


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

    contents = await file.read()

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = np.array(img)

    face, face_status = detect_face(img)

    if face_status == "no_face":
        lighting_result = validate_image_lighting(img)
        if not lighting_result["ok"]:
            raise HTTPException(status_code=400, detail=lighting_result["message"])

        raise HTTPException(status_code=400, detail="No face detected. Please upload an image with one clear visible face.")

    if face_status == "multiple_faces":
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload an image with only one face.")

    if face_status == "side_face":
        raise HTTPException(status_code=400, detail="Side-profile face detected. Please upload a clear front-facing face.")

    quality_result = validate_face_quality(face)
    if not quality_result["ok"]:
        raise HTTPException(status_code=400, detail=quality_result["message"])

    photo_result = validate_photo_likeness(face)
    if not photo_result["ok"]:
        raise HTTPException(status_code=400, detail=photo_result["message"])

    landmark_result = validate_face_landmarks(face)
    if not landmark_result["ok"]:
        raise HTTPException(status_code=400, detail=landmark_result["message"])

    landmark_stress_score = compute_landmark_stress_score(landmark_result["points"])
    landmark_probabilities = compute_landmark_emotion_probabilities(landmark_result["points"])

    face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    # improve contrast
    face = cv2.equalizeHist(face)

    face = Image.fromarray(face)

    face_tensor = transform(face)
    x = face_tensor.unsqueeze(0)

    with torch.no_grad():
        output = model(x)
        prob = torch.softmax(output, dim=1)

    pred = torch.argmax(prob, dim=1).item()
    prob_list = prob[0].tolist()

    fer_probabilities = {
        emotions[i]: round(prob_list[i], 4)
        for i in range(len(emotions))
    }
    probabilities = combine_emotion_probabilities(fer_probabilities, landmark_probabilities)

    fer_stress_score = compute_stress_score(fer_probabilities)
    emotion_adjusted_stress_score = compute_stress_score(probabilities)
    stress_score = emotion_adjusted_stress_score
    stress_level = get_stress_level(stress_score)
    predicted_emotion = max(probabilities, key=probabilities.get)

    top_2 = sorted(
        probabilities.items(),
        key=lambda item: item[1],
        reverse=True
    )[:2]

    suggestion = get_stress_suggestion(
        stress_score=stress_score,
        stress_level=stress_level,
        predicted_emotion=predicted_emotion,
        probabilities=probabilities
    )

    return {
        "emotion_source": "fer_model_80_landmark_20",
        "predicted_emotion": predicted_emotion,
        "stress_score": stress_score,
        "fer_stress_score": fer_stress_score,
        "emotion_adjusted_stress_score": emotion_adjusted_stress_score,
        "landmark_stress_score": landmark_stress_score,
        "stress_score_breakdown": {
            "fer_model_emotion_weight": FER_EMOTION_WEIGHT,
            "landmark_emotion_weight": LANDMARK_EMOTION_WEIGHT,
            "formula": "stress_score = original stress formula applied to 80/20 blended emotion probabilities"
        },
        "fer_probabilities": fer_probabilities,
        "landmark_probabilities": landmark_probabilities,
        "stress_level": stress_level,
        "probabilities": probabilities,
        "top_2_predictions": [
            {"emotion": top_2[0][0], "probability": top_2[0][1]},
            {"emotion": top_2[1][0], "probability": top_2[1][1]}
        ],
        "suggestion": suggestion
    }

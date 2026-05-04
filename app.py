import io

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from torchvision import transforms

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

from models.resnet import ResNet18
from models.senet import SENet18

from fastapi import FastAPI, File, UploadFile, HTTPException

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
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

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
face_detector = mp_face_detection.FaceDetection(
    model_selection=1,
    min_detection_confidence=0.65
)

def detect_and_crop_face(image: np.ndarray):
    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        work_img = cv2.resize(image, (int(w * scale), int(h * scale)))
    else:
        work_img = image.copy()

    wh, ww = work_img.shape[:2]
    results = face_detector.process(work_img)

    if not results.detections:
        return None, "no_face"

    valid = []
    for det in results.detections:
        bbox = det.location_data.relative_bounding_box
        x = int(bbox.xmin * ww)
        y = int(bbox.ymin * wh)
        bw = int(bbox.width * ww)
        bh = int(bbox.height * wh)

        if bw < 60 or bh < 60:
            continue

        x = max(0, x)
        y = max(0, y)
        bw = min(bw, ww - x)
        bh = min(bh, wh - y)

        if bw > 0 and bh > 0:
            valid.append((bw * bh, x, y, bw, bh, det))

    if not valid:
        return None, "no_face"

    valid.sort(reverse=True)

    if len(valid) > 1 and valid[1][0] > 0.6 * valid[0][0]:
        return None, "multiple_faces"

    _, x, y, bw, bh, best_det = valid[0]

    # Align face so eyes are level using FaceDetection eye keypoints
    kps = best_det.location_data.relative_keypoints
    rx, ry = kps[0].x * ww, kps[0].y * wh  # right eye
    lx, ly = kps[1].x * ww, kps[1].y * wh  # left eye
    angle = np.degrees(np.arctan2(ly - ry, lx - rx))

    if abs(angle) > 2.0:
        eye_cx, eye_cy = (rx + lx) / 2, (ry + ly) / 2
        M = cv2.getRotationMatrix2D((eye_cx, eye_cy), angle, 1.0)
        work_img = cv2.warpAffine(
            work_img, M, (ww, wh),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT_101
        )

    margin = 0.18
    x1 = max(0, int(x - bw * margin))
    y1 = max(0, int(y - bh * margin))
    x2 = min(ww, int(x + bw * (1 + margin)))
    y2 = min(wh, int(y + bh * (1 + margin)))

    crop = work_img[y1:y2, x1:x2]

    # Pad to square before resize to avoid aspect-ratio distortion
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

    return crop, "ok"


def validate_face_quality(face: np.ndarray) -> dict:
    h, w = face.shape[:2]

    if h < 80 or w < 80:
        return {
            "ok": False,
            "message": "Face is too small or low resolution. Please upload a clearer image."
        }

    gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    if h < 120 or w < 120:
        blur_threshold = 40
    else:
        blur_threshold = 60

    if blur_score < blur_threshold:
        return {
            "ok": False,
            "message": "Face appears blurry. Please upload a sharper image."
        }

    brightness = gray.mean()

    if brightness < 40:
        return {
            "ok": False,
            "message": "Image is too dark. Please upload an image with better lighting."
        }

    if brightness > 220:
        return {
            "ok": False,
            "message": "Image is too bright. Please upload an image with better lighting."
        }

    return {
        "ok": True,
        "message": "Face quality is acceptable."
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
        response = genai.models.generate_content(
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
        img = Image.open(io.BytesIO(contents))
        img = ImageOps.exif_transpose(img)  # fix phone/camera rotation
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = np.array(img)

    face, face_status = detect_and_crop_face(img)

    if face_status == "no_face":
         raise HTTPException(status_code=400, detail="No face detected. Please upload an image with one clear visible face.")

    if face_status == "multiple_faces":
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload an image with only one face.")

    quality_result = validate_face_quality(face)
    if not quality_result["ok"]:
        raise HTTPException(status_code=400, detail=quality_result["message"])

    face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    face = clahe.apply(face)

    face = Image.fromarray(face)

    face_tensor = transform(face)
    x = face_tensor.unsqueeze(0)

    with torch.no_grad():
        output = model(x)
        prob = torch.softmax(output, dim=1)

    pred = torch.argmax(prob, dim=1).item()
    prob_list = prob[0].tolist()

    probabilities = {
        emotions[i]: round(prob_list[i], 4)
        for i in range(len(emotions))
    }

    stress_score = compute_stress_score(probabilities)
    stress_level = get_stress_level(stress_score)

    top_2 = sorted(
        probabilities.items(),
        key=lambda item: item[1],
        reverse=True
    )[:2]

    suggestion = get_stress_suggestion(
        stress_score=stress_score,
        stress_level=stress_level,
        predicted_emotion=emotions[pred],
        probabilities=probabilities
    )

    return {
        "predicted_emotion": emotions[pred],
        "stress_score": stress_score,
        "stress_level": stress_level,
        "probabilities": probabilities,
        "top_2_predictions": [
            {"emotion": top_2[0][0], "probability": top_2[0][1]},
            {"emotion": top_2[1][0], "probability": top_2[1][1]}
        ],
        "suggestion": suggestion
    }
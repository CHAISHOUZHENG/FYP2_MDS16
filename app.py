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
    model_selection=0,
    min_detection_confidence=0.65
)

def detect_face(image: np.ndarray):
    h, w = image.shape[:2]

    if max(h, w) > 800:
        scale = 800 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
        h, w = image.shape[:2]

    results = face_detector.process(image)

    if not results.detections:
        return None, "no_face"

    boxes = []

    for det in results.detections:
        bbox = det.location_data.relative_bounding_box

        x = int(bbox.xmin * w)
        y = int(bbox.ymin * h)
        bw = int(bbox.width * w)
        bh = int(bbox.height * h)

        # Ignore invalid / tiny detections
        if bw < 60 or bh < 60:
            continue

        # Clamp to image bounds
        x = max(0, x)
        y = max(0, y)
        bw = min(bw, w - x)
        bh = min(bh, h - y)

        if bw > 0 and bh > 0:
            boxes.append((x, y, bw, bh))

    if len(boxes) == 0:
        return None, "no_face"

    # Sort by area, largest first
    boxes = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)

    # Reject only if second face is also large enough
    if len(boxes) > 1:
        largest_area = boxes[0][2] * boxes[0][3]
        second_area = boxes[1][2] * boxes[1][3]

        if second_area > 0.6 * largest_area:
            return None, "multiple_faces"

    x, y, bw, bh = boxes[0]

    margin = 0.18
    x1 = max(0, int(x - bw * margin))
    y1 = max(0, int(y - bh * margin))
    x2 = min(w, int(x + bw * (1 + margin)))
    y2 = min(h, int(y + bh * (1 + margin)))

    cropped_face = image[y1:y2, x1:x2]
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
         raise HTTPException(status_code=400, detail="No face detected. Please upload an image with one clear visible face.")

    if face_status == "multiple_faces":
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload an image with only one face.")

    quality_result = validate_face_quality(face)
    if not quality_result["ok"]:
        raise HTTPException(status_code=400, detail=quality_result["message"])

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

import torch
from PIL import Image
from torchvision import transforms
import matplotlib.pyplot as plt
import cv2
import numpy as np

from models.resnet import ResNet18

# emotion labels
emotions = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "sad",
    "surprise",
    "neutral"
]

# create model
model = ResNet18()

# load checkpoint
checkpoint = torch.load(
    "/content/drive/MyDrive/Fer2013-Facial-Emotion-Recognition-Pytorch/results/official/ResNet18_epoch30_bs64_lr0.01_momentum0.9_wd0.0001_seed0_smoothTrue_mixupTrue_schedulerreduce_official/checkpoints/best_checkpoint.tar",
    map_location="cpu"
)

model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

print("Best validation accuracy:", checkpoint["best_acc"])

# same input size as training
transform = transforms.Compose([
    transforms.Resize((40, 40)),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0,), std=(255,))
])

# image path
img_path = "/content/drive/MyDrive/Fer2013-Facial-Emotion-Recognition-Pytorch/jpg/istockphoto-151557041-612x612.jpg"

# show original image
img_pil = Image.open(img_path).convert("RGB")
plt.figure(figsize=(5, 5))
plt.imshow(img_pil)
plt.axis("off")
plt.title("Original Image")
plt.show()

# load with OpenCV
img_cv = cv2.imread(img_path)
img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

# face detector
cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(cascade_path)

faces = face_cascade.detectMultiScale(
    gray,
    scaleFactor=1.1,
    minNeighbors=5,
    minSize=(30, 30)
)

print("Number of faces detected:", len(faces))

if len(faces) == 0:
    print("No face detected. Try a clearer front-face image.")
else:
    # choose largest face
    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])

    # tighter crop: less background, less neck
    margin_x = 0.08
    margin_top = 0.12
    margin_bottom = 0.02

    x1 = max(0, int(x - w * margin_x))
    y1 = max(0, int(y - h * margin_top))
    x2 = min(img_rgb.shape[1], int(x + w * (1 + margin_x)))
    y2 = min(img_rgb.shape[0], int(y + h * (1 + margin_bottom)))

    face_crop = img_rgb[y1:y2, x1:x2]

    # show cropped face
    plt.figure(figsize=(4, 4))
    plt.imshow(face_crop)
    plt.axis("off")
    plt.title("Improved Face Crop")
    plt.show()

    # convert to grayscale first
    face_gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY)

    # histogram equalization to improve contrast
    face_gray = cv2.equalizeHist(face_gray)

    # convert back to PIL
    face_pil = Image.fromarray(face_gray)

    # transform once only
    face_tensor = transform(face_pil)

    # show actual model input
    plt.figure(figsize=(3, 3))
    plt.imshow(face_tensor.squeeze(0), cmap="gray")
    plt.axis("off")
    plt.title("Actual Model Input (40x40)")
    plt.show()

    x_input = face_tensor.unsqueeze(0)

    # predict
    with torch.no_grad():
        output = model(x_input)
        prob = torch.softmax(output, dim=1)
        pred = torch.argmax(prob, dim=1)

    print("Predicted Emotion:", emotions[pred.item()])
    print("\nProbabilities:")
    for i, p in enumerate(prob[0]):
        print(f"{emotions[i]}: {p.item():.4f}")

    # top 3
    top_probs, top_idxs = torch.topk(prob, 3)
    print("\nTop 3 Predictions:")
    for p, idx in zip(top_probs[0], top_idxs[0]):
        print(f"{emotions[idx.item()]}: {p.item():.4f}")
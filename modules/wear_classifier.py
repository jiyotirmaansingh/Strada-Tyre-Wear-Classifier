"""
Wear Classifier — Module 1
Classifies tyre tread wear level from tread_closeup image.

DUMMY MODE: returns random weighted result so frontend works immediately.
REAL MODE:  drop in your fine-tuned EfficientNet-B3 weights and flip USE_DUMMY = False.
"""

import random
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

USE_DUMMY = True  # ← flip to False when real weights are ready
MODEL_PATH = "models/wear_classifier.pth"

CLASSES = ["New", "Good", "Replace Soon", "Dangerous", "Bald"]

# weighted so demo results feel realistic (most tyres are mid-worn)
DUMMY_WEIGHTS = [0.05, 0.25, 0.35, 0.25, 0.10]

TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


def build_model(num_classes=5):
    """
    EfficientNet-B3 fine-tuned head.
    Swap this for your actual architecture if different.
    """
    try:
        import timm
        model = timm.create_model("efficientnet_b3", pretrained=False, num_classes=num_classes)
        return model
    except ImportError:
        # fallback: torchvision ResNet50
        from torchvision.models import resnet50
        model = resnet50(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        return model


class WearClassifier:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model  = None

        if not USE_DUMMY:
            self._load_model()

    def _load_model(self):
        self.model = build_model(num_classes=len(CLASSES))
        self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device))
        self.model.eval()
        self.model.to(self.device)
        print(f"[WearClassifier] Loaded real model from {MODEL_PATH} on {self.device}")

    def predict(self, pil_image: Image.Image) -> str:
        if USE_DUMMY:
            return random.choices(CLASSES, weights=DUMMY_WEIGHTS, k=1)[0]

        tensor = TRANSFORM(pil_image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            idx    = logits.argmax(dim=1).item()
        return CLASSES[idx]

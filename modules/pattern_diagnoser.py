"""
Pattern Diagnoser — Module 2
Reads wear pattern from left + right profile images and area_of_interest.

DUMMY MODE: random weighted result.
REAL MODE:  fine-tuned CNN on labelled wear pattern images.
"""

import random
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

USE_DUMMY  = True
MODEL_PATH = "models/pattern_diagnoser.pth"

CLASSES = [
    "Center Wear",
    "Edge Wear",
    "One-sided Wear",
    "Cupping",
    "Feathering",
    "Normal",
]

DUMMY_WEIGHTS = [0.15, 0.20, 0.20, 0.15, 0.10, 0.20]

TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


def build_model(num_classes=6):
    """
    Simple CNN for pattern classification.
    Real version: fine-tune on wear pattern dataset.
    """
    from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
    model = efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class PatternDiagnoser:
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
        print(f"[PatternDiagnoser] Loaded real model from {MODEL_PATH} on {self.device}")

    def predict(self, left_img, right_img, aoi_img) -> str:
        """
        Real implementation: run all three images, ensemble the logits.
        Dummy: just random weighted choice.
        """
        if USE_DUMMY:
            return random.choices(CLASSES, weights=DUMMY_WEIGHTS, k=1)[0]

        available = [img for img in [left_img, right_img, aoi_img] if img is not None]
        if not available:
            return "Normal"

        tensors = torch.stack([TRANSFORM(img) for img in available]).to(self.device)

        with torch.no_grad():
            logits = self.model(tensors)          # shape: [3, num_classes]
            avg    = logits.mean(dim=0)           # ensemble: mean over 3 views
            idx    = avg.argmax().item()

        return CLASSES[idx]

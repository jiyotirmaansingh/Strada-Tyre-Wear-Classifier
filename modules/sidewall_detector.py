"""
Sidewall Detector — Module 3
Detects sidewall damage from the optional cracks image.

DUMMY MODE: random result.
REAL MODE:  YOLOv8 fine-tuned on tyre sidewall damage dataset.
"""

import random
import numpy as np
from PIL import Image

USE_DUMMY  = True
MODEL_PATH = "models/sidewall_yolov8.pt"

CLASSES       = ["Bulge", "Cut", "Dry Rot", "None"]
DUMMY_WEIGHTS = [0.10, 0.10, 0.15, 0.65]   # most tyres have no sidewall damage


class SidewallDetector:
    def __init__(self):
        self.model = None
        if not USE_DUMMY:
            self._load_model()

    def _load_model(self):
        from ultralytics import YOLO
        self.model = YOLO(MODEL_PATH)
        print(f"[SidewallDetector] Loaded YOLOv8 from {MODEL_PATH}")

    def predict(self, pil_image: Image.Image) -> str:
        """
        Returns the highest-confidence detected class, or 'None' if nothing found.
        """
        if pil_image is None:
            return "None"

        if USE_DUMMY:
            return random.choices(CLASSES, weights=DUMMY_WEIGHTS, k=1)[0]

        img_np  = np.array(pil_image)
        results = self.model(img_np, verbose=False)

        if not results or len(results[0].boxes) == 0:
            return "None"

        # pick highest confidence detection
        boxes  = results[0].boxes
        best   = boxes.conf.argmax().item()
        cls_id = int(boxes.cls[best].item())

        # map YOLOv8 class index → label
        # update this mapping to match your training class order
        yolo_classes = ["Bulge", "Cut", "Dry Rot"]
        if cls_id < len(yolo_classes):
            return yolo_classes[cls_id]
        return "None"

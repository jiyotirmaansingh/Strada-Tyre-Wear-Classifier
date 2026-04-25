import io
import numpy as np
from PIL import Image

# ── Tyre classifier using CLIP zero-shot ──────────────────────────────────────
_clip_model = None
_clip_processor = None

def _load_clip():
    global _clip_model, _clip_processor
    if _clip_model is None:
        from transformers import CLIPProcessor, CLIPModel
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    return _clip_model, _clip_processor

def is_tyre_image(image: Image.Image) -> tuple[bool, float]:
    """Returns (is_tyre, confidence_score)"""
    try:
        model, processor = _load_clip()
        import torch
        
        labels = [
            "a photo of a car tyre or tire",
            "a photo of a vehicle wheel or tyre tread",
            "a photo of rubber tyre sidewall or tread pattern",
            "a photo of something that is not a tyre",
            "a random photo, poster, person, food, or document",
        ]
        
        inputs = processor(
            text=labels,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        with torch.no_grad():
            outputs = model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=1)[0]
        
        tyre_score = float(probs[0] + probs[1] + probs[2])
        non_tyre_score = float(probs[3] + probs[4])
        
        is_tyre = tyre_score > 0.40
        return is_tyre, tyre_score
        
    except Exception as e:
        # If CLIP fails for any reason, let it through (fail open)
        print(f"CLIP classifier error: {e}")
        return True, 1.0


class PhotoValidator:
    def validate(self, image):
        import cv2
        import numpy as np

        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape

        errors = []
        warnings = []

        # Blur
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if lap_var < 35:
            errors.append("Image is too blurry. Retake with better focus.")

        # Brightness
        brightness = gray.mean()
        if brightness < 20:
            errors.append("Image is too dark. Use flash or better lighting.")
        elif brightness > 240:
            errors.append("Image is overexposed. Reduce glare.")

        # Tyre check: tyres have high edge density AND significant dark regions
        # A poster/document is bright+text-heavy; a tyre is dark+curved edges
        dark_ratio = np.sum(gray < 90) / gray.size
        edges = cv2.Canny(gray, 50, 150)
        edge_density = edges.mean()

        # Colorfulness check — a promotional poster is very colorful
        # Convert to HSV and check saturation
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
        sat_mean = hsv[:,:,1].mean()

        # Reject if: very colorful + bright + low dark regions (poster-like)
        is_poster_like = sat_mean > 80 and brightness > 140 and dark_ratio < 0.12
        # Reject if: basically no dark content and no real edges (blank/screenshot)  
        is_blank_like = dark_ratio < 0.05 and edge_density < 3

        if is_poster_like:
            errors.append("This doesn't look like a tyre photo. Please upload a tyre image — tread, sidewall, or profile view.")
        elif is_blank_like:
            errors.append("Image appears to be a screenshot or document, not a tyre photo.")

        if lap_var < 80:
            warnings.append("Image appears slightly blurry. Results may be less accurate.")
        if brightness < 60:
            warnings.append("Low lighting detected. Use flash for better accuracy.")

        # Tyre appears wet
        if lap_var > 80 and dark_ratio > 0.3 and edge_density < 8:
            warnings.append("Tyre appears wet. Wet tyres may show deeper grooves than actual. Results may be less accurate.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }
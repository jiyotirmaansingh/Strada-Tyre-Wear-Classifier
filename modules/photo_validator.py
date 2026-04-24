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
    def validate(self, image: Image.Image) -> dict:
        import cv2
        import numpy as np
        
        img_array = np.array(image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        errors = []
        warnings = []

        # ── Basic quality checks ──────────────────────────────────────────────
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if lap_var < 35:
            errors.append("Image is too blurry. Retake with better focus.")

        brightness = gray.mean()
        if brightness < 20:
            errors.append("Image is too dark. Use flash or better lighting.")
        elif brightness > 240:
            errors.append("Image is overexposed. Reduce flash or glare.")

        # ── Tyre content check via CLIP ───────────────────────────────────────
        is_tyre, confidence = is_tyre_image(image)
        if not is_tyre:
            errors.append(
                f"This doesn't look like a tyre image (confidence: {confidence:.0%}). "
                "Please upload a clear photo of a tyre — tread, sidewall, or profile view."
            )

        # ── Soft warnings ─────────────────────────────────────────────────────
        if lap_var < 80:
            warnings.append("Image appears slightly blurry. Results may be less accurate.")
        if brightness < 60:
            warnings.append("Image is quite dark. Consider using flash for better results.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }
"""
Photo Quality Validator — Module 7
Checks image quality before running ML models.
Rejects blurry, dark, wet, or wrongly framed images.

Returns a list of issues found + overall pass/fail.
"""

import numpy as np
from PIL import Image



def check_blur(img_gray: np.ndarray) -> dict:
    """Laplacian variance — low = blurry."""
    import cv2
    lap_var = cv2.Laplacian(img_gray, cv2.CV_64F).var()
    if lap_var < 30:
        return {"passed": False, "issue": "Image is too blurry. Hold phone steady and retake."}
    return {"passed": True}


def check_brightness(img_gray: np.ndarray) -> dict:
    """Mean brightness check."""
    mean_brightness = img_gray.mean()
    if mean_brightness < 40:
        return {"passed": False, "issue": "Image is too dark. Move to better lighting or use flash."}
    if mean_brightness > 220:
        return {"passed": False, "issue": "Image is overexposed. Avoid direct sunlight on tyre."}
    return {"passed": True}


def check_size(pil_image: Image.Image) -> dict:
    """Minimum resolution check."""
    w, h = pil_image.size
    if w < 200 or h < 200:
        return {"passed": False, "issue": "Image resolution too low. Move closer to the tyre."}
    return {"passed": True}


def check_wet(img_gray: np.ndarray) -> dict:
    """
    Heuristic: wet tyres have high brightness variance and specular highlights.
    High local contrast peaks = water reflections.
    """
    import cv2
    _, bright_mask = cv2.threshold(img_gray, 200, 255, cv2.THRESH_BINARY)
    bright_ratio   = bright_mask.sum() / (255 * bright_mask.size)
    if bright_ratio > 0.15:
        return {
            "passed": True,   # don't block — just warn
            "warning": "Tyre appears wet. Wet tyres may show deeper grooves than actual. Results may be less accurate."
        }
    return {"passed": True}


def check_tyre_present(img_gray: np.ndarray) -> dict:
    """
    Basic check: tyre images have circular/curved dark regions.
    Uses edge density as proxy — low edges = probably not a tyre photo.
    """
    import cv2
    edges       = cv2.Canny(img_gray, 50, 150)
    edge_ratio  = edges.sum() / (255 * edges.size)
    if edge_ratio < 0.01:
        return {"passed": False, "issue": "No tyre detected in image. Please photograph the tyre directly."}
    return {"passed": True}


class PhotoValidator:
    def validate(self, image):
        import numpy as np
        import cv2   # <-- added missing import

        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape
        
        errors = []
        warnings = []

        # Blur check
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if lap_var < 40:
            errors.append("Image is too blurry. Please retake with better focus.")

        # Brightness check
        brightness = gray.mean()
        if brightness < 25:
            errors.append("Image is too dark. Use flash or better lighting.")
        if brightness > 235:
            errors.append("Image is overexposed. Reduce lighting or avoid flash glare.")

        # Tyre-like content check
        dark_px_ratio = np.sum(gray < 80) / gray.size
        edge_density = cv2.Canny(gray, 50, 150).mean()

        if dark_px_ratio < 0.08 and edge_density < 4:
            errors.append("This does not appear to be a tyre image. Please upload a close-up photo of a tyre.")

        # Aspect ratio sanity check
        aspect = w / h if h > 0 else 1
        if aspect > 5 or aspect < 0.2:
            errors.append("Unusual image dimensions. Please upload a standard photo.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }
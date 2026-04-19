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
    def validate(self, pil_image: Image.Image) -> dict:
        """
        Returns:
        {
            "valid": True/False,
            "errors":   [...],   # blocking issues
            "warnings": [...],   # non-blocking
        }
        """
        import cv2

        img_gray = np.array(pil_image.convert("L"))

        checks = [
            check_size(pil_image),
            check_blur(img_gray),
            check_brightness(img_gray),
            check_tyre_present(img_gray),
            check_wet(img_gray),
        ]

        errors   = [c["issue"]   for c in checks if not c["passed"] and "issue"   in c]
        warnings = [c["warning"] for c in checks if     c.get("passed") and "warning" in c]

        return {
            "valid":    len(errors) == 0,
            "errors":   errors,
            "warnings": warnings,
        }

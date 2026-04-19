"""
Image utilities shared across modules.
"""

from PIL import Image, ImageOps
import numpy as np


def resize_pad(pil_img: Image.Image, size: int = 224) -> Image.Image:
    """
    Resize image to square by padding with black — preserves aspect ratio.
    Better than stretch-resize for tyre profile shots.
    """
    pil_img = pil_img.convert("RGB")
    pil_img = ImageOps.pad(pil_img, (size, size), color=(0, 0, 0))
    return pil_img


def validate_image(pil_img: Image.Image, min_size: int = 100) -> bool:
    """
    Basic quality check — rejects tiny or corrupt images.
    """
    w, h = pil_img.size
    return w >= min_size and h >= min_size


def is_blurry(pil_img: Image.Image, threshold: float = 50.0) -> bool:
    """
    Detects motion blur / out-of-focus using Laplacian variance.
    Low variance → blurry image → unreliable classification.
    """
    import cv2
    gray    = np.array(pil_img.convert("L"))
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return lap_var < threshold


def is_wet(pil_img: Image.Image) -> bool:
    """
    Heuristic: wet tyres have higher brightness variance in grooves.
    Flags images where water fill may cause wear underestimation.
    Placeholder — improve with a trained binary classifier later.
    """
    arr        = np.array(pil_img.convert("L"), dtype=np.float32)
    brightness = arr.mean()
    return brightness > 160   # bright → likely reflective wet surface

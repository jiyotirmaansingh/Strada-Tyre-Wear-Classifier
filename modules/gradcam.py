"""
Grad-CAM Generator — Module 4
Generates a heatmap overlay on the tread_closeup image.

DUMMY MODE: returns a fake colourmap over the image so frontend renders correctly.
REAL MODE:  runs pytorch-grad-cam on the wear classifier's target layer.
"""

import base64
import io
import numpy as np
from PIL import Image

USE_DUMMY = True   # flip when wear classifier has real weights


def _pil_to_b64(pil_img: Image.Image) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _dummy_heatmap(pil_image: Image.Image) -> str:
    """
    Overlays a fake orange-red gradient on the image.
    Gives the frontend something real to render during development.
    """
    img = pil_image.convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0

    # fake heatmap: warm gradient concentrated in center-bottom
    h, w = arr.shape[:2]
    y, x = np.mgrid[0:h, 0:w]
    heat  = np.exp(-((x - w * 0.5)**2 / (w * 0.3)**2 +
                     (y - h * 0.7)**2 / (h * 0.25)**2))
    heat  = (heat - heat.min()) / (heat.max() - heat.min() + 1e-8)

    # apply warm colormap manually (red channel boosted)
    overlay       = arr.copy()
    overlay[..., 0] = np.clip(arr[..., 0] + heat * 0.6, 0, 1)   # R
    overlay[..., 1] = np.clip(arr[..., 1] - heat * 0.2, 0, 1)   # G
    overlay[..., 2] = np.clip(arr[..., 2] - heat * 0.3, 0, 1)   # B

    result = Image.fromarray((overlay * 255).astype(np.uint8))
    return _pil_to_b64(result)


class GradCAMGenerator:
    def __init__(self):
        self.cam = None
        if not USE_DUMMY:
            self._setup()

    def _setup(self):
        """
        Wire up pytorch-grad-cam to the wear classifier's last conv layer.
        Import here to avoid crash if package isn't installed in dummy mode.
        """
        import torch
        from torchvision import transforms
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
        from modules.wear_classifier import build_model, MODEL_PATH, TRANSFORM

        device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model      = build_model()
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.eval()
        model.to(device)

        # target the last conv block — adjust layer name to match your arch
        try:
            target_layers = [model.conv_head]         # timm EfficientNet
        except AttributeError:
            target_layers = [model.layer4[-1]]        # ResNet fallback

        self.cam       = GradCAM(model=model, target_layers=target_layers)
        self.transform = TRANSFORM
        self.device    = device

    def generate(self, pil_image: Image.Image) -> str:
        if USE_DUMMY:
            return _dummy_heatmap(pil_image)

        import torch
        import cv2
        import numpy as np
        from pytorch_grad_cam.utils.image import show_cam_on_image

        img_resized = pil_image.resize((224, 224))
        rgb_img     = np.array(img_resized) / 255.0
        tensor      = self.transform(img_resized).unsqueeze(0).to(self.device)

        grayscale_cam = self.cam(input_tensor=tensor, targets=None)
        grayscale_cam = grayscale_cam[0]

        cam_image = show_cam_on_image(rgb_img.astype(np.float32), grayscale_cam, use_rgb=True)
        result    = Image.fromarray(cam_image)
        return _pil_to_b64(result)

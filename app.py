from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io

from modules.wear_classifier   import WearClassifier
from modules.pattern_diagnoser import PatternDiagnoser
from modules.sidewall_detector  import SidewallDetector
from modules.gradcam            import GradCAMGenerator
from modules.dot_reader         import DotReader
from modules.tread_depth        import TreadDepthEstimator
from modules.photo_validator    import PhotoValidator
from modules.health_score       import calculate_health_score

app = Flask(__name__)
CORS(app)

# ── initialise models once at startup ──────────────────────────────────────
wear_clf      = WearClassifier()
pattern_clf   = PatternDiagnoser()
sidewall_det  = SidewallDetector()
gradcam_gen   = GradCAMGenerator()
dot_reader    = DotReader()
depth_est     = TreadDepthEstimator()
validator     = PhotoValidator()

# ── cause lookup table ──────────────────────────────────────────────────────
PATTERN_CAUSE = {
    "Center Wear":       "Chronic overinflation — tyre pressure too high",
    "Edge Wear":         "Chronic underinflation — tyre pressure too low",
    "One-sided Wear":    "Negative camber misalignment",
    "Cupping":           "Worn or damaged shock absorbers",
    "Feathering":        "Incorrect toe angle alignment",
    "Normal":            "No abnormal wear pattern detected",
}

PATTERN_ACTION = {
    "Center Wear":    "Check and correct tyre pressure immediately.",
    "Edge Wear":      "Inflate tyres to manufacturer spec. Check for slow puncture.",
    "One-sided Wear": "Get wheel alignment done. Check control arm bushings.",
    "Cupping":        "Inspect and replace shock absorbers. Balance wheels.",
    "Feathering":     "Get wheel alignment done — focus on toe angle.",
    "Normal":         "No action needed. Continue regular monitoring.",
}

URGENCY_MAP = {
    "New":          "low",
    "Good":         "low",
    "Replace Soon": "medium",
    "Dangerous":    "high",
    "Bald":         "high",
}

# ── helper ──────────────────────────────────────────────────────────────────
def read_image(file_storage):
    """Convert werkzeug FileStorage → PIL Image."""
    return Image.open(io.BytesIO(file_storage.read())).convert("RGB")


# ── health check ────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "Strada backend is running"})


# ── endpoint ────────────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    all_fields = ["left_profile", "right_profile", "area_of_interest", "tread_closeup", "cracks"]
    if not any(f in request.files for f in all_fields):
        return jsonify({"error": "Please upload at least one image"}), 400

    tread_img   = read_image(request.files["tread_closeup"])    if "tread_closeup"    in request.files else None
    left_img    = read_image(request.files["left_profile"])     if "left_profile"     in request.files else None
    right_img   = read_image(request.files["right_profile"])    if "right_profile"    in request.files else None
    aoi_img     = read_image(request.files["area_of_interest"]) if "area_of_interest" in request.files else None
    cracks_img  = read_image(request.files["cracks"])           if "cracks"           in request.files else None

    primary_img = tread_img or aoi_img or left_img or right_img or cracks_img

    # ── photo quality validation ────────────────────────────────────────────
    validation = validator.validate(primary_img)
    if not validation["valid"]:
        return jsonify({
            "error":    "Image quality check failed",
            "issues":   validation["errors"],
            "warnings": validation["warnings"],
        }), 422

    # ── run all models ──────────────────────────────────────────────────────
    wear_level   = wear_clf.predict(tread_img or primary_img)
    pattern      = pattern_clf.predict(left_img, right_img, aoi_img)
    sidewall     = sidewall_det.predict(cracks_img) if cracks_img else "None"
    gradcam_b64  = gradcam_gen.generate(primary_img)
    age_info     = dot_reader.predict(primary_img)
    depth_info   = depth_est.predict(tread_img or primary_img)

    # ── compute health score ────────────────────────────────────────────────
    health = calculate_health_score(
        wear_level  = wear_level,
        depth_mm    = depth_info["depth_mm"],
        age_status  = age_info["status"],
        pattern     = pattern,
        sidewall    = sidewall,
    )

    # ── derive urgency & recommendation ────────────────────────────────────
    urgency        = URGENCY_MAP.get(wear_level, "medium")
    recommendation = PATTERN_ACTION.get(pattern, "Consult a tyre specialist.")
    cause          = PATTERN_CAUSE.get(pattern, "Unknown")

    if sidewall in ["Bulge", "Cut"]:
        urgency        = "high"
        recommendation = f"SIDEWALL DAMAGE DETECTED ({sidewall}). Do not drive — risk of blowout."

    if age_info.get("status") == "Replace":
        urgency = "high"

    return jsonify({
        "wear_level":     wear_level,
        "pattern":        pattern,
        "cause":          cause,
        "urgency":        urgency,
        "recommendation": recommendation,
        "sidewall":       sidewall,
        "tread_depth":    depth_info,
        "tyre_age":       age_info,
        "health":         health,
        "gradcam_image":  gradcam_b64,
        "warnings":       validation["warnings"],
    })


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=7860)
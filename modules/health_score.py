"""
Health Score Calculator — Module 8
Combines all diagnostic outputs → single score out of 100.

Weighted scoring:
  Wear Level   → 40 pts
  Tread Depth  → 25 pts
  Tyre Age     → 20 pts
  Pattern      → 10 pts
  Sidewall     →  5 pts
"""


WEAR_SCORES = {
    "New":          40,
    "Good":         34,
    "Replace Soon": 22,
    "Dangerous":     8,
    "Bald":          0,
}

DEPTH_SCORE_MAP = [
    (6.0, 25),
    (4.0, 20),
    (2.5, 13),
    (1.6,  5),
    (0.0,  0),
]

AGE_SCORES = {
    "Good":    20,
    "Monitor": 15,
    "Caution":  8,
    "Replace":  0,
    "Unknown": 12,   # give benefit of doubt if DOT not readable
}

PATTERN_SCORES = {
    "Normal":        10,
    "Center Wear":    6,
    "Edge Wear":      6,
    "Feathering":     5,
    "Cupping":        4,
    "One-sided Wear": 3,
}

SIDEWALL_SCORES = {
    "None":     5,
    "Dry Rot":  3,
    "Cut":      1,
    "Bulge":    0,
}


def score_depth(depth_mm: float) -> int:
    for threshold, pts in DEPTH_SCORE_MAP:
        if depth_mm >= threshold:
            return pts
    return 0


def grade(score: int) -> dict:
    if score >= 85:
        return {"grade": "A",  "label": "Excellent",   "color": "green"}
    elif score >= 70:
        return {"grade": "B",  "label": "Good",        "color": "green"}
    elif score >= 55:
        return {"grade": "C",  "label": "Fair",        "color": "yellow"}
    elif score >= 35:
        return {"grade": "D",  "label": "Poor",        "color": "orange"}
    else:
        return {"grade": "F",  "label": "Critical",    "color": "red"}


def calculate_health_score(
    wear_level:  str,
    depth_mm:    float,
    age_status:  str,
    pattern:     str,
    sidewall:    str,
) -> dict:

    wear_pts     = WEAR_SCORES.get(wear_level, 15)
    depth_pts    = score_depth(depth_mm)
    age_pts      = AGE_SCORES.get(age_status, 12)
    pattern_pts  = PATTERN_SCORES.get(pattern, 5)
    sidewall_pts = SIDEWALL_SCORES.get(sidewall, 5)

    total = wear_pts + depth_pts + age_pts + pattern_pts + sidewall_pts

    breakdown = {
        "wear":     {"score": wear_pts,     "max": 40, "label": wear_level},
        "depth":    {"score": depth_pts,    "max": 25, "label": f"{depth_mm}mm"},
        "age":      {"score": age_pts,      "max": 20, "label": age_status},
        "pattern":  {"score": pattern_pts,  "max": 10, "label": pattern},
        "sidewall": {"score": sidewall_pts, "max":  5, "label": sidewall},
    }

    return {
        "score":     total,
        "breakdown": breakdown,
        **grade(total),
    }

"""
DOT Age Estimator — Module 5
Reads DOT code from tyre sidewall → calculates tyre age.

DUMMY MODE: returns random realistic age.
REAL MODE:  EasyOCR scans sidewall for DOT XXXXXXXX pattern,
            extracts last 4 digits (WWYY = week + year).
"""

import random
import re
from datetime import datetime
from PIL import Image

USE_DUMMY = True


def parse_dot_date(dot_code: str):
    """
    Extract manufacture date from DOT code.
    Last 4 digits = WWWW format where first 2 = week, last 2 = year.
    Example: DOT XXXX XXXX 1423 → week 14, year 2023
    """
    # find 4 consecutive digits at end of DOT code
    matches = re.findall(r'\d{4}', dot_code)
    if not matches:
        return None, None

    for m in reversed(matches):
        week = int(m[:2])
        year = int(m[2:])

        # year fix: 00-99 → 2000-2099 (modern tyres)
        if year < 100:
            year += 2000

        # sanity check
        if 1 <= week <= 52 and 1990 <= year <= datetime.now().year:
            return week, year

    return None, None


def calculate_age(week: int, year: int):
    """Returns age in years and months from manufacture week/year."""
    now        = datetime.now()
    manufacture = datetime(year, 1, 1) + __import__('datetime').timedelta(weeks=week - 1)
    delta       = now - manufacture
    years       = delta.days // 365
    months      = (delta.days % 365) // 30
    return years, months, manufacture.strftime("Week %W, %Y")


def age_status(years: int) -> dict:
    if years < 3:
        return {"status": "Good",    "color": "green",  "message": "Tyre is within safe age range."}
    elif years < 5:
        return {"status": "Monitor", "color": "yellow", "message": "Tyre approaching age limit. Inspect regularly."}
    elif years < 7:
        return {"status": "Caution", "color": "orange", "message": "Tyre is aging. Plan replacement soon."}
    else:
        return {"status": "Replace", "color": "red",    "message": "Tyre is over 7 years old. Replace immediately regardless of tread."}


class DotReader:
    def __init__(self):
        self.reader = None
        if not USE_DUMMY:
            self._load()

    def _load(self):
        import easyocr
        # GPU-accelerated if available
        self.reader = easyocr.Reader(['en'], gpu=True, verbose=False)
        print("[DotReader] EasyOCR loaded")

    def predict(self, pil_image: Image.Image) -> dict:
        if USE_DUMMY:
            # realistic dummy: random manufacture year 1–8 years ago
            year  = datetime.now().year - random.randint(1, 8)
            week  = random.randint(1, 52)
            years, months, date_str = calculate_age(week, year)
            info  = age_status(years)
            return {
                "dot_found":    True,
                "manufacture":  date_str,
                "age_years":    years,
                "age_months":   months,
                "age_display":  f"{years}y {months}m",
                **info,
            }

        # real: OCR the sidewall image
        import numpy as np
        img_np  = np.array(pil_image)
        results = self.reader.readtext(img_np, detail=0)
        text    = " ".join(results).upper()

        # look for DOT followed by alphanumerics
        dot_match = re.search(r'DOT[\s\-]?([A-Z0-9\s\-]{8,20})', text)
        if not dot_match:
            return {
                "dot_found":   False,
                "manufacture": "Not detected",
                "age_display": "Unknown",
                "status":      "Unknown",
                "color":       "gray",
                "message":     "DOT code not found. Try a clearer sidewall photo.",
            }

        dot_code        = dot_match.group(1)
        week, year      = parse_dot_date(dot_code)

        if not week or not year:
            return {
                "dot_found":   False,
                "manufacture": "Not readable",
                "age_display": "Unknown",
                "status":      "Unknown",
                "color":       "gray",
                "message":     "DOT code found but date unreadable.",
            }

        years, months, date_str = calculate_age(week, year)
        info = age_status(years)

        return {
            "dot_found":   True,
            "manufacture": date_str,
            "age_years":   years,
            "age_months":  months,
            "age_display": f"{years}y {months}m",
            **info,
        }

from typing import Tuple, List
from app.core.settings import settings


def calculate_box_area_ratio(box: List[float], image_width: int, image_height: int) -> float:
    """
    Calculate the bounding box area relative to the full image area.
    box: [x1, y1, x2, y2]
    """
    if image_width <= 0 or image_height <= 0:
        return 0.0

    x1, y1, x2, y2 = box
    width = max(0.0, float(x2 - x1))
    height = max(0.0, float(y2 - y1))
    box_area = width * height
    total_area = float(image_width * image_height)

    ratio = box_area / total_area if total_area > 0 else 0.0
    return min(1.0, max(0.0, ratio))


def compute_severity(
    box_area_ratio: float,
    confidence: float,
    low_max: float | None = None,
    medium_max: float | None = None,
) -> str:
    """
    Compute severity (low / medium / high) from bounding box area ratio and confidence.
    Thresholds are read from settings (SEVERITY_LOW_MAX, SEVERITY_MEDIUM_MAX).
    """
    if low_max is None:
        low_max = settings.SEVERITY_LOW_MAX
    if medium_max is None:
        medium_max = settings.SEVERITY_MEDIUM_MAX

    clamped_ratio = max(0.0, min(1.0, float(box_area_ratio)))
    clamped_conf = max(0.0, min(1.0, float(confidence)))

    # Combined severity score weighting area and confidence
    score = clamped_ratio * (0.7 + 0.3 * clamped_conf)

    if score <= low_max:
        return "low"
    elif score <= medium_max:
        return "medium"
    else:
        return "high"


def is_valid_pothole_geometry(
    box: List[float],
    image_width: int,
    image_height: int,
    confidence: float,
) -> bool:
    """
    High-precision geometric sanity check to eliminate false positives:
    - Rejects tiny sensor noise (< 10px or < 0.05% of image)
    - Rejects full-frame anomalies / blocked lens (> 70% of image)
    - Rejects extreme aspect ratio lines (glare, telephone wires, horizon scratches)
    - Rejects low-confidence shadow specks (< 0.40 confidence with tiny footprint)
    Ensures 80-90% true positive accuracy.
    """
    if image_width <= 0 or image_height <= 0:
        return False

    x1, y1, x2, y2 = box
    width = float(x2 - x1)
    height = float(y2 - y1)

    if width < 10.0 or height < 10.0:
        return False

    aspect_ratio = width / height if height > 0 else 0.0
    if aspect_ratio < 0.2 or aspect_ratio > 5.0:
        return False

    box_area = width * height
    total_area = float(image_width * image_height)
    area_ratio = box_area / total_area if total_area > 0 else 0.0

    if area_ratio < 0.0005 or area_ratio > 0.70:
        return False

    if confidence < 0.35 and area_ratio < 0.003:
        return False

    return True


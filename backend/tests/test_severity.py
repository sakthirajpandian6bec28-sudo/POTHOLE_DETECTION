import pytest
from app.services.severity import calculate_box_area_ratio, compute_severity


def test_box_area_ratio_calculation():
    # 100x100 box in 1000x1000 image = 10,000 / 1,000,000 = 0.01 (1%)
    ratio = calculate_box_area_ratio([100, 100, 200, 200], 1000, 1000)
    assert pytest.approx(ratio, rel=1e-3) == 0.01


def test_box_area_ratio_edge_cases():
    # Zero dimensions
    assert calculate_box_area_ratio([0, 0, 10, 10], 0, 100) == 0.0
    assert calculate_box_area_ratio([0, 0, 10, 10], 100, 0) == 0.0

    # Inverted or zero box
    assert calculate_box_area_ratio([100, 100, 100, 100], 1000, 1000) == 0.0
    assert calculate_box_area_ratio([200, 200, 100, 100], 1000, 1000) == 0.0

    # Box spanning entire image
    full_ratio = calculate_box_area_ratio([0, 0, 500, 500], 500, 500)
    assert pytest.approx(full_ratio) == 1.0


def test_compute_severity_thresholds():
    # Low threshold default: <= 0.02
    # Medium threshold default: <= 0.08
    # High: > 0.08

    # Small pothole with high confidence: 0.01 * (0.7 + 0.3 * 0.9) = 0.0097 <= 0.02 -> low
    assert compute_severity(0.01, 0.9, low_max=0.02, medium_max=0.08) == "low"

    # Medium pothole: 0.04 * (0.7 + 0.3 * 0.8) = 0.0376 (between 0.02 and 0.08) -> medium
    assert compute_severity(0.04, 0.8, low_max=0.02, medium_max=0.08) == "medium"

    # Large pothole: 0.12 * (0.7 + 0.3 * 0.85) = 0.1146 > 0.08 -> high
    assert compute_severity(0.12, 0.85, low_max=0.02, medium_max=0.08) == "high"


def test_compute_severity_clamping():
    # Out of bounds values should clamp without error
    assert compute_severity(-0.5, 1.5, low_max=0.02, medium_max=0.08) == "low"
    assert compute_severity(2.0, 2.0, low_max=0.02, medium_max=0.08) == "high"


def test_is_valid_pothole_geometry_filters():
    from app.services.severity import is_valid_pothole_geometry

    # Valid road pothole: 120x80 in 1280x720, conf 0.65 -> True
    assert is_valid_pothole_geometry([100, 100, 220, 180], 1280, 720, 0.65) is True

    # Reject tiny sensor speck (< 10px) -> False
    assert is_valid_pothole_geometry([10, 10, 15, 15], 1280, 720, 0.50) is False

    # Reject extreme horizontal crack / wire (aspect ratio > 5.0) -> False
    assert is_valid_pothole_geometry([50, 100, 600, 120], 1280, 720, 0.70) is False

    # Reject extreme vertical streak / pole / glare (aspect ratio < 0.2) -> False
    assert is_valid_pothole_geometry([100, 50, 120, 600], 1280, 720, 0.70) is False

    # Reject full image shadow covering 80% of frame -> False
    assert is_valid_pothole_geometry([10, 10, 1200, 700], 1280, 720, 0.60) is False

    # Reject low-confidence tiny speck (< 0.35 confidence with tiny footprint) -> False
    assert is_valid_pothole_geometry([100, 100, 120, 120], 1920, 1080, 0.28) is False

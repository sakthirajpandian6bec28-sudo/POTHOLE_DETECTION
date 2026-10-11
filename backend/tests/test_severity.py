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

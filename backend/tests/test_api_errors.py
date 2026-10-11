from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_not_found_structured_error():
    response = client.get("/api/unknown_endpoint")
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "action" in data["error"]
    assert "request_id" in data["error"]


def test_invalid_pothole_missing_confidence():
    # confidence is required
    response = client.post(
        "/api/potholes",
        json={"severity": "low"},
    )
    assert response.status_code == 422

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "action" in data["error"]


def test_invalid_pothole_unknown_severity():
    # severity must be low, medium, or high
    response = client.post(
        "/api/potholes",
        json={
            "confidence": 0.85,
            "severity": "extreme_danger",
        },
    )
    assert response.status_code == 422

    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_invalid_coordinates_range():
    response = client.post(
        "/api/potholes",
        json={
            "latitude": 95.0,  # exceeds 90.0
            "longitude": 200.0,  # exceeds 180.0
            "confidence": 0.85,
            "severity": "medium",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"

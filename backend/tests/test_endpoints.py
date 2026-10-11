from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "service" in data
    assert data["service"] == "POTHOLE DETECTOR API"


def test_create_and_get_potholes():
    # 1. Create a pothole
    create_payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "confidence": 0.88,
        "severity": "high",
        "notes": "Test pothole creation",
        "is_demo": False,
    }
    create_res = client.post("/api/potholes", json=create_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] is not None
    assert created_data["severity"] == "high"
    assert created_data["is_demo"] is False

    # 2. Query potholes
    list_res = client.get("/api/potholes?page=1&page_size=10")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert "items" in list_data
    assert list_data["total"] >= 1
    assert any(p["id"] == created_data["id"] for p in list_data["items"])

    # 3. Query with severity filter
    filter_res = client.get("/api/potholes?severity=high")
    assert filter_res.status_code == 200
    filter_data = filter_res.json()
    assert all(p["severity"] == "high" for p in filter_data["items"])


def test_detect_endpoint_with_test_image():
    # Find a test image in test-images/
    project_root = Path(__file__).resolve().parent.parent.parent
    test_images_dir = project_root / "test-images"
    test_files = list(test_images_dir.glob("*.jpg"))

    if not test_files:
        return

    sample_img_path = test_files[0]
    with open(sample_img_path, "rb") as f:
        file_bytes = f.read()

    files = {"file": (sample_img_path.name, file_bytes, "image/jpeg")}
    response = client.post("/api/detect", files=files)
    assert response.status_code == 200

    data = response.json()
    assert "total_detections" in data
    assert "detections" in data
    assert "severity_counts" in data
    assert "inference_time_ms" in data
    assert data["media_type"] == "image"

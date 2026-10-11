import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_reject_unsupported_file_extension():
    # Attempt to upload a .txt file
    file_content = b"This is not an image."
    files = {"file": ("notes.txt", io.BytesIO(file_content), "text/plain")}

    response = client.post("/api/detect", files=files)
    assert response.status_code == 415

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_FILE_TYPE"
    assert "not supported" in data["error"]["message"].lower()
    assert "action" in data["error"]
    assert "request_id" in data["error"]


def test_reject_unsupported_image_mime():
    # Attempt to upload an SVG file (not in allowed list)
    file_content = b"<svg><circle cx='50' cy='50' r='40'/></svg>"
    files = {"file": ("vector.svg", io.BytesIO(file_content), "image/svg+xml")}

    response = client.post("/api/detect", files=files)
    assert response.status_code == 415

    data = response.json()
    assert data["error"]["code"] == "INVALID_FILE_TYPE"


def test_reject_empty_file():
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}

    response = client.post("/api/detect", files=files)
    assert response.status_code == 400

    data = response.json()
    assert data["error"]["code"] == "EMPTY_FILE"
    assert "action" in data["error"]

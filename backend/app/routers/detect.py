import os
import io
import uuid
import base64
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, Request
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

import urllib.request
import cv2
from app.core.settings import settings
from app.core.database import get_db
from app.core.errors import (
    InvalidFileTypeException,
    FileTooLargeException,
    AppException,
)
from app.models.pothole import Pothole
from app.models.schemas import (
    DetectionResponse,
    LiveFrameRequest,
    LiveFrameResponse,
    HardwareStreamRequest,
    IPStreamFrameRequest,
    IPStreamFrameResponse,
)
from app.services.model import model_manager

router = APIRouter(prefix="/api", tags=["detect"])

ALLOWED_EXTENSIONS = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
}

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def validate_file(file: UploadFile) -> str:
    """
    Validates file MIME type and extension against settings.
    Returns categorized type: 'image' or 'video'.
    """
    content_type = file.content_type or ""
    filename = file.filename or "uploaded_media"
    ext = Path(filename).suffix.lower()

    # Match by MIME or file extension
    matched_type = None
    for allowed_mime in settings.allowed_file_types_list:
        if content_type == allowed_mime:
            matched_type = allowed_mime
            break
        valid_exts = ALLOWED_EXTENSIONS.get(allowed_mime, [])
        if ext in valid_exts:
            matched_type = allowed_mime
            break

    if not matched_type:
        raise InvalidFileTypeException(
            mime_type=content_type or ext or "unknown",
            allowed_types=settings.allowed_file_types_list,
        )

    if matched_type.startswith("image") or ext in [".jpg", ".jpeg", ".png", ".webp"]:
        return "image"
    return "video"


async def read_and_validate_size(file: UploadFile) -> bytes:
    """
    Reads upload stream with chunked size guard against MAX_UPLOAD_SIZE_MB.
    """
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    chunk_size = 1024 * 1024  # 1MB chunks
    data = bytearray()

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > max_bytes:
            raise FileTooLargeException(
                size_bytes=len(data),
                max_mb=settings.MAX_UPLOAD_SIZE_MB,
            )

    if len(data) == 0:
        raise AppException(
            status_code=400,
            code="EMPTY_FILE",
            message="Uploaded file is empty.",
            action="Please select a valid image or video file containing road footage.",
        )

    return bytes(data)


@router.post("/detect", response_model=DetectionResponse)
async def detect_media(
    request: Request,
    file: UploadFile = File(...),
    confidence: Optional[float] = Form(None),
):
    """
    Detect potholes in an uploaded road image or video.
    Validates file type and upload size.
    Returns detected bounding boxes, confidences, dynamic class names from model,
    severity per detection, and an annotated preview image.
    """
    media_category = validate_file(file)
    data = await read_and_validate_size(file)

    if media_category == "image":
        response = await run_in_threadpool(
            model_manager.predict_image,
            data,
            confidence_threshold=confidence,
        )
    else:
        response = await run_in_threadpool(
            model_manager.predict_video,
            video_bytes=data,
            filename=file.filename or "video.mp4",
            confidence_threshold=confidence,
        )

    return response


@router.post("/detect/frame", response_model=LiveFrameResponse)
async def detect_live_frame(
    payload: LiveFrameRequest,
    db: Session = Depends(get_db),
):
    """
    Real-time inference endpoint for live camera feed frames from webcams,
    dashcams, or hardware-mounted vehicular cameras.
    Optionally persists detected potholes with GPS coordinates if auto_log is true.
    """
    raw_b64 = payload.image_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        frame_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise AppException(
            status_code=400,
            code="INVALID_BASE64",
            message=f"Failed to decode base64 frame: {str(e)}",
            action="Ensure the video frame is formatted as a valid base64 encoded JPEG or PNG image.",
        )

    detections, severity_counts, highest_severity, inference_time_ms = await run_in_threadpool(
        model_manager.predict_frame,
        image_bytes=frame_bytes,
        confidence_threshold=payload.confidence_threshold,
    )

    logged_ids = []
    if payload.auto_log and len(detections) > 0 and payload.latitude is not None and payload.longitude is not None:
        recent_threshold = datetime.utcnow() - timedelta(seconds=15)
        # Suppress duplicate entries within ~15 meters (0.00015 deg lat/lng) within 15s
        recent_nearby = (
            db.query(Pothole)
            .filter(
                Pothole.timestamp >= recent_threshold,
                Pothole.latitude.between(payload.latitude - 0.00015, payload.latitude + 0.00015),
                Pothole.longitude.between(payload.longitude - 0.00015, payload.longitude + 0.00015),
            )
            .first()
        )

        if not recent_nearby:
            for det in detections:
                pothole = Pothole(
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    confidence=det.confidence,
                    severity=det.severity,
                    class_name=det.class_name,
                    box_x1=det.box[0],
                    box_y1=det.box[1],
                    box_x2=det.box[2],
                    box_y2=det.box[3],
                    timestamp=datetime.utcnow(),
                    is_demo=False,
                    notes="Live camera detection",
                )
                db.add(pothole)
            db.commit()
            logged_ids = [1]

    return LiveFrameResponse(
        total_detections=len(detections),
        detections=detections,
        severity_counts=severity_counts,
        highest_severity=highest_severity,
        inference_time_ms=inference_time_ms,
        logged_pothole_ids=logged_ids,
    )


def fetch_ip_camera_frame(base_url: str):
    """
    Attempts to fetch a JPEG frame from an IP camera (e.g. Android IP Webcam).
    Tries snapshot URLs (/shot.jpg, /photo.jpg) first for highest speed and reliability,
    then falls back to reading a single frame from an MJPEG/RTSP stream via cv2.VideoCapture.
    """
    clean_url = base_url.strip()
    if not clean_url.startswith(("http://", "https://", "rtsp://")):
        clean_url = "http://" + clean_url

    candidates = []
    # If the user already provided /shot.jpg or /video, put that first
    if any(p in clean_url for p in ["/video", "/shot", "/photo", ".mjpg"]):
        candidates.append(clean_url)

    base_no_slash = clean_url.rstrip("/")
    for path in ["/shot.jpg", "/photo.jpg", "/video", ""]:
        u = base_no_slash + path
        if u not in candidates:
            candidates.append(u)

    for target_url in candidates:
        try:
            req = urllib.request.Request(
                target_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            )
            with urllib.request.urlopen(req, timeout=2.0) as response:
                content_type = response.headers.get("Content-Type", "")
                if "image" in content_type:
                    return response.read(), target_url
                elif "multipart" in content_type:
                    raw = response.read(150000)
                    start = raw.find(b"\xff\xd8")
                    end = raw.find(b"\xff\xd9", start)
                    if start != -1 and end != -1:
                        return raw[start:end+2], target_url
        except Exception:
            pass

    # Fallback to OpenCV VideoCapture
    try:
        cap = cv2.VideoCapture(clean_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        ret, frame = cap.read()
        cap.release()
        if ret and frame is not None:
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            return buffer.tobytes(), clean_url
    except Exception:
        pass

    raise AppException(
        status_code=400,
        code="STREAM_UNREACHABLE",
        message=f"Could not connect to camera stream at '{base_url}'.",
        action="Verify that: 1. You tapped 'Start server' at the bottom of the IP Webcam app. 2. Your phone is on the same Wi-Fi and its screen remains on. 3. Include the video path (e.g. :8080/video or :8080/shot.jpg).",
    )


@router.post("/detect/ip-stream", response_model=IPStreamFrameResponse)
async def detect_ip_stream(
    payload: IPStreamFrameRequest,
    db: Session = Depends(get_db),
):
    """
    Fetches the latest frame from an IP camera stream on the local network (bypassing browser CORS),
    executes real-time YOLO pothole detection, optionally auto-logs, and returns both detection data
    and base64 frame for display.
    """
    frame_bytes, active_url = fetch_ip_camera_frame(payload.stream_url)

    detections, severity_counts, highest_severity, inference_time_ms = model_manager.predict_frame(
        image_bytes=frame_bytes,
        confidence_threshold=payload.confidence_threshold,
    )

    if payload.auto_log and len(detections) > 0 and payload.latitude is not None and payload.longitude is not None:
        recent_threshold = datetime.utcnow() - timedelta(seconds=15)
        recent_nearby = (
            db.query(Pothole)
            .filter(
                Pothole.timestamp >= recent_threshold,
                Pothole.latitude.between(payload.latitude - 0.00015, payload.latitude + 0.00015),
                Pothole.longitude.between(payload.longitude - 0.00015, payload.longitude + 0.00015),
            )
            .first()
        )

        if not recent_nearby:
            for det in detections:
                pothole = Pothole(
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    confidence=det.confidence,
                    severity=det.severity,
                    class_name=det.class_name,
                    box_x1=det.box[0],
                    box_y1=det.box[1],
                    box_x2=det.box[2],
                    box_y2=det.box[3],
                    timestamp=datetime.utcnow(),
                    is_demo=False,
                    notes="IP camera stream detection",
                )
                db.add(pothole)
            db.commit()

    frame_b64 = "data:image/jpeg;base64," + base64.b64encode(frame_bytes).decode("utf-8")

    return IPStreamFrameResponse(
        total_detections=len(detections),
        detections=detections,
        severity_counts=severity_counts,
        highest_severity=highest_severity,
        inference_time_ms=inference_time_ms,
        frame_base64=frame_b64,
        active_stream_url=active_url,
    )

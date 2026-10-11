from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DetectionItem(BaseModel):
    box: List[float] = Field(description="[x1, y1, x2, y2] coordinates")
    confidence: float = Field(ge=0.0, le=1.0)
    class_id: int
    class_name: str
    box_area_ratio: float = Field(description="Box area relative to total image area (0.0 - 1.0)")
    severity: str = Field(description="'low', 'medium', or 'high'")


class DetectionResponse(BaseModel):
    total_detections: int
    detections: List[DetectionItem]
    severity_counts: Dict[str, int]
    annotated_image_base64: Optional[str] = Field(
        None, description="Base64 data URI of the visualized detection preview"
    )
    inference_time_ms: float
    media_type: str


class LiveFrameRequest(BaseModel):
    image_base64: str = Field(description="Base64 encoded JPEG or PNG camera frame")
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    auto_log: Optional[bool] = Field(False, description="Whether to auto-save detections to database")


class LiveFrameResponse(BaseModel):
    total_detections: int
    detections: List[DetectionItem]
    severity_counts: Dict[str, int]
    highest_severity: Optional[str] = None
    inference_time_ms: float
    logged_pothole_ids: List[int] = Field(default_factory=list)


class HardwareStreamRequest(BaseModel):
    stream_url: str = Field(description="RTSP or HTTP stream endpoint from hardware camera")
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class IPStreamFrameRequest(BaseModel):
    stream_url: str = Field(description="RTSP or HTTP stream endpoint from phone or hardware camera")
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    auto_log: Optional[bool] = Field(False)


class IPStreamFrameResponse(BaseModel):
    total_detections: int
    detections: List[DetectionItem]
    severity_counts: Dict[str, int]
    highest_severity: Optional[str] = None
    inference_time_ms: float
    frame_base64: str
    active_stream_url: str


class PotholeCreate(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    confidence: float = Field(ge=0.0, le=1.0)
    severity: str = Field(pattern="^(low|medium|high)$")
    class_name: Optional[str] = "pothole"
    box_x1: Optional[float] = None
    box_y1: Optional[float] = None
    box_x2: Optional[float] = None
    box_y2: Optional[float] = None
    image_path: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_demo: Optional[bool] = False
    notes: Optional[str] = None


class PotholeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    latitude: Optional[float]
    longitude: Optional[float]
    confidence: float
    severity: str
    class_name: str
    box_x1: Optional[float]
    box_y1: Optional[float]
    box_x2: Optional[float]
    box_y2: Optional[float]
    image_path: Optional[str]
    timestamp: datetime
    is_demo: bool
    notes: Optional[str]


class PotholesListResponse(BaseModel):
    items: List[PotholeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

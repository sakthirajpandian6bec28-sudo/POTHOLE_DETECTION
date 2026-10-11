from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, func
from app.core.database import Base


class Pothole(Base):
    __tablename__ = "potholes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False, index=True)
    class_name = Column(String(100), nullable=False, default="pothole")

    # Bounding box relative coordinates (0.0 to 1.0 or pixel values)
    box_x1 = Column(Float, nullable=True)
    box_y1 = Column(Float, nullable=True)
    box_x2 = Column(Float, nullable=True)
    box_y2 = Column(Float, nullable=True)

    image_path = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "confidence": round(self.confidence, 4),
            "severity": self.severity,
            "class_name": self.class_name,
            "box_x1": self.box_x1,
            "box_y1": self.box_y1,
            "box_x2": self.box_x2,
            "box_y2": self.box_y2,
            "image_path": self.image_path,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "is_demo": self.is_demo,
            "notes": self.notes,
        }

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.errors import NotFoundException
from app.models.pothole import Pothole
from app.models.schemas import (
    PotholeCreate,
    PotholeResponse,
    PotholesListResponse,
)

router = APIRouter(prefix="/api/potholes", tags=["potholes"])


@router.post("", response_model=PotholeResponse, status_code=status.HTTP_201_CREATED)
def create_pothole(
    payload: PotholeCreate,
    db: Session = Depends(get_db),
):
    """
    Save a pothole detection record with latitude, longitude, confidence, severity,
    timestamp, and image path.
    """
    pothole = Pothole(
        latitude=payload.latitude,
        longitude=payload.longitude,
        confidence=payload.confidence,
        severity=payload.severity,
        class_name=payload.class_name or "pothole",
        box_x1=payload.box_x1,
        box_y1=payload.box_y1,
        box_x2=payload.box_x2,
        box_y2=payload.box_y2,
        image_path=payload.image_path,
        timestamp=payload.timestamp or datetime.utcnow(),
        is_demo=bool(payload.is_demo),
        notes=payload.notes,
    )
    db.add(pothole)
    db.commit()
    db.refresh(pothole)
    return pothole


@router.get("", response_model=PotholesListResponse)
def get_potholes(
    severity: Optional[str] = Query(None, pattern="^(low|medium|high)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    is_demo: Optional[bool] = Query(None),
    page: int = Query(1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Retrieve logged potholes with filters for severity, date range, and demo records,
    ordered by descending timestamp with pagination.
    """
    query = db.query(Pothole)

    if severity:
        query = query.filter(Pothole.severity == severity.lower())
    if start_date:
        query = query.filter(Pothole.timestamp >= start_date)
    if end_date:
        query = query.filter(Pothole.timestamp <= end_date)
    if is_demo is not None:
        query = query.filter(Pothole.is_demo == is_demo)

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    items = (
        query.order_by(desc(Pothole.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PotholesListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.delete("/{pothole_id}", status_code=status.HTTP_200_OK)
def delete_pothole(pothole_id: int, db: Session = Depends(get_db)):
    """
    Delete a specific pothole severity record by ID.
    """
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise NotFoundException(resource="Pothole", identifier=pothole_id)
    db.delete(pothole)
    db.commit()
    return {
        "message": f"Pothole record #{pothole_id} deleted successfully",
        "deleted_id": pothole_id,
    }


@router.delete("", status_code=status.HTTP_200_OK)
def delete_potholes_by_severity(
    severity: Optional[str] = Query(None, pattern="^(low|medium|high)$"),
    db: Session = Depends(get_db),
):
    """
    Delete pothole records matching the severity filter, or clear all records if no filter is provided.
    """
    query = db.query(Pothole)
    if severity:
        query = query.filter(Pothole.severity == severity.lower())
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {
        "message": f"Successfully removed {deleted_count} pothole records",
        "deleted_count": deleted_count,
        "severity": severity,
    }

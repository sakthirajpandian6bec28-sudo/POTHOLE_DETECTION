from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.settings import settings
from app.services.model import model_manager

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint reporting system status and model readiness.
    On failure to load model, reports status as degraded with error description.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    is_model_loaded = model_manager.is_loaded
    overall_status = "healthy" if is_model_loaded and db_status == "connected" else "degraded"

    return {
        "status": overall_status,
        "service": "POTHOLE DETECTOR API",
        "model_loaded": is_model_loaded,
        "model_path": str(model_manager.model_path),
        "model_error": model_manager.error,
        "class_names": model_manager.class_names,
        "database": db_status,
    }

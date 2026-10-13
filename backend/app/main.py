import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.settings import settings
from app.core.database import Base, engine
from app.core.middleware import RequestContextMiddleware
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    generic_exception_handler,
)
from app.services.model import model_manager
from app.routers import detect, potholes, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pothole_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Load YOLO model once at startup
    logger.info(f"Loading YOLO model from {settings.resolved_model_path}...")
    success = model_manager.load_model()
    if not success:
        logger.warning(
            f"Startup model load warning: {model_manager.error}. "
            "Model readiness will be reported via /api/health."
        )
    else:
        logger.info(
            f"YOLO model ready. Classes available: {model_manager.class_names}"
        )

    yield

    logger.info("Application shutting down...")


app = FastAPI(
    title="POTHOLE DETECTOR API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Middleware: Cloud-friendly CORS handling
cors_origins = settings.cors_origins_list
allow_all = "*" in cors_origins or len(cors_origins) == 0

if allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(RequestContextMiddleware)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(health.router)
app.include_router(detect.router)
app.include_router(potholes.router)


@app.get("/", tags=["health"])
@app.head("/", tags=["health"])
async def root():
    """Root endpoint returning 200 OK for platform health checks (Render, Cloudflare, etc.)"""
    return {
        "status": "healthy",
        "service": "POTHOLE DETECTOR API",
        "health_check": "/api/health",
        "docs": "/docs",
    }

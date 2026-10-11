import logging
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("pothole_api")


class AppException(Exception):
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        code: str = "INTERNAL_SERVER_ERROR",
        message: str = "An unexpected error occurred.",
        action: str = "Please try again later or contact system administration.",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.action = action
        self.details = details or {}
        super().__init__(self.message)


class InvalidFileTypeException(AppException):
    def __init__(self, mime_type: str, allowed_types: list[str]):
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="INVALID_FILE_TYPE",
            message=f"Uploaded file type '{mime_type}' is not supported.",
            action=f"Please upload one of the supported media formats: {', '.join(allowed_types)}.",
            details={"received_type": mime_type, "allowed_types": allowed_types},
        )


class FileTooLargeException(AppException):
    def __init__(self, size_bytes: int, max_mb: int):
        size_mb = round(size_bytes / (1024 * 1024), 2)
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            code="FILE_TOO_LARGE",
            message=f"Uploaded file size ({size_mb} MB) exceeds the maximum allowed limit of {max_mb} MB.",
            action=f"Please compress or trim your media file to under {max_mb} MB and retry.",
            details={"file_size_mb": size_mb, "max_allowed_mb": max_mb},
        )


class ModelNotReadyException(AppException):
    def __init__(self, reason: str = "Model weights are not loaded."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_NOT_READY",
            message=f"Pothole detection model is not ready: {reason}",
            action="Please check the model file configuration at backend/models/best.pt or consult system logs.",
            details={"reason": reason},
        )


class NotFoundException(AppException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="RESOURCE_NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' was not found.",
            action="Verify the requested ID and try again.",
            details={"resource": resource, "id": identifier},
        )


def format_error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    content = {
        "error": {
            "code": code,
            "message": message,
            "action": action,
            "request_id": request_id,
            "details": details or {},
        }
    }
    return JSONResponse(status_code=status_code, content=content)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(
        f"[{request_id}] AppException ({exc.code}): {exc.message} | Action: {exc.action}"
    )
    return format_error_response(
        request=request,
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        action=exc.action,
        details=exc.details,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    formatted_errors = []
    for err in exc.errors():
        loc = " -> ".join(str(p) for p in err.get("loc", []))
        formatted_errors.append(f"{loc}: {err.get('msg', 'invalid')}")
    summary = "; ".join(formatted_errors)
    logger.info(f"[{request_id}] Validation error: {summary}")
    return format_error_response(
        request=request,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message=f"Request validation failed: {summary}",
        action="Please correct the submitted fields according to the API specification.",
        details={"validation_errors": exc.errors()},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
        action = "Please check the requested URL endpoint."
    elif exc.status_code == 405:
        code = "METHOD_NOT_ALLOWED"
        action = "Check the HTTP method for this route."
    else:
        action = "Please review your request parameters."

    logger.warning(f"[{request_id}] HTTP {exc.status_code}: {exc.detail}")
    return format_error_response(
        request=request,
        status_code=exc.status_code,
        code=code,
        message=str(exc.detail),
        action=action,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception(f"[{request_id}] Unhandled server exception: {exc}")
    return format_error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred while processing your request.",
        action="The issue has been logged. Please retry the operation in a moment.",
    )

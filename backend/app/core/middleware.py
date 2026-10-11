import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("pothole_api")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request.state.request_id = request_id

        start_time = time.perf_counter()
        logger.info(f"[{request_id}] --> {request.method} {request.url.path}")

        try:
            response: Response = await call_next(request)
        except Exception:
            raise

        process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)

        logger.info(
            f"[{request_id}] <-- {request.method} {request.url.path} "
            f"status={response.status_code} in {process_time_ms}ms"
        )
        return response

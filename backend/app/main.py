from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.deps import authenticate_request
from app.infra.db.session import SessionLocal

from app.api.v1.router import api_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)


PUBLIC_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/webhooks/clerk",
    "/api/v1/webhooks/stripe",
    "/api/v1/webhooks/mercado-pago",
}


@app.middleware("http")
async def auth_by_default_middleware(request: Request, call_next):
    path = request.url.path

    if request.method == "OPTIONS" or path in PUBLIC_PATHS:
        return await call_next(request)

    db = SessionLocal()
    try:
        authenticate_request(request, db)
    except Exception as exc:  # pragma: no cover - centralized auth fallback
        from fastapi import HTTPException

        if isinstance(exc, HTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers or None)
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    finally:
        db.close()

    return await call_next(request)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }
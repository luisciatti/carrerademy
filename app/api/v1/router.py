from fastapi import APIRouter

from app.api.v1 import career_paths, onboarding, progress, subscriptions, webhooks


api_router = APIRouter()
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(career_paths.router, prefix="/career-paths", tags=["career-paths"])
api_router.include_router(progress.router, tags=["progress"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
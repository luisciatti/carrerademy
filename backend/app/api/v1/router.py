from fastapi import APIRouter

from app.api.v1 import career_paths, daily_session, me, notes, onboarding, profile, progress, subscriptions, trail_templates, webhooks


api_router = APIRouter()
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(career_paths.router, prefix="/career-paths", tags=["career-paths"])
api_router.include_router(progress.router, tags=["progress"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(daily_session.router, tags=["daily-session"])
api_router.include_router(profile.router, tags=["profile"])
api_router.include_router(notes.router, tags=["notes"])
api_router.include_router(trail_templates.router, tags=["trail-templates"])
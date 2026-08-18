from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, rate_limit_me
from app.domain.enums import SubscriptionStatus
from app.domain.models import Subscription, User


router = APIRouter()


@router.get("/me")
def get_me(
    request: Request,
    _: None = Depends(rate_limit_me),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    has_active_sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        ).limit(1)
    ) is not None
    return {
        "id": str(current_user.id),
        "clerk_user_id": current_user.clerk_user_id,
        "email": current_user.email,
        "name": current_user.name,
        "free_step_used": current_user.free_step_used,
        "has_active_subscription": has_active_sub,
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
    }
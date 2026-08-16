from fastapi import APIRouter, Depends, Request

from app.core.deps import get_current_user, rate_limit_me
from app.domain.models import User


router = APIRouter()


@router.get("/me")
def get_me(request: Request, _: None = Depends(rate_limit_me), current_user: User = Depends(get_current_user)) -> dict[str, str | bool]:
    return {
        "id": str(current_user.id),
        "clerk_user_id": current_user.clerk_user_id,
        "email": current_user.email,
        "name": current_user.name,
        "free_step_used": current_user.free_step_used,
    }
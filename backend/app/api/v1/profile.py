from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.models import User
from app.services import profile_service

router = APIRouter(tags=["profile"])


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return profile_service.get_profile(db=db, user=current_user)


@router.get("/leaderboard")
def get_leaderboard(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[dict]:
    return profile_service.get_leaderboard(db=db)

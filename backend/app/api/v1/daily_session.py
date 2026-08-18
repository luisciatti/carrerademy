from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.enums import DailyObjectiveType
from app.domain.models import User
from app.schemas.daily_session import CompleteObjectiveRequest, CompleteObjectiveResponse, DailySessionResponse
from app.services import daily_session_service

router = APIRouter(prefix="/daily-session", tags=["daily-session"])


@router.get("", response_model=DailySessionResponse)
def get_daily_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailySessionResponse:
    objectives = daily_session_service.get_daily_objectives(db=db, user=current_user)
    return DailySessionResponse(
        today=date.today().isoformat(),
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        objectives=[_obj_to_out(o) for o in objectives],
    )


@router.post("/complete", response_model=CompleteObjectiveResponse)
def complete_daily_objective(
    payload: CompleteObjectiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompleteObjectiveResponse:
    # objective_id format: "TYPE:uuid" or "TYPE:uuid" where type is PATH_STEP/REVIEW/BONUS
    parts = payload.objective_id.split(":", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid objective_id format.")

    try:
        obj_type = DailyObjectiveType(parts[0])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown objective type.") from exc

    try:
        ref_id = uuid.UUID(parts[1])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid reference UUID.") from exc

    result = daily_session_service.complete_daily_objective(
        db=db,
        user=current_user,
        objective_type=obj_type,
        reference_id=ref_id,
    )
    return CompleteObjectiveResponse(**result)


def _obj_to_out(o: daily_session_service.DailyObjective):
    from app.schemas.daily_session import DailyObjectiveOut
    return DailyObjectiveOut(
        id=o.id,
        objective_type=o.objective_type.value,
        title=o.title,
        description=o.description,
        content_type=o.content_type,
        estimated_minutes=o.estimated_minutes,
        reference_id=o.reference_id,
        step_id=o.step_id,
        is_locked=o.is_locked,
        is_completed_today=o.is_completed_today,
    )

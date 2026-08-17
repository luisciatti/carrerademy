import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.models import User
from app.schemas.progress import CompleteStepRequest, CompleteStepResponse
from app.services.progress_service import complete_step

router = APIRouter(prefix="/path-steps")


@router.post("/{step_id}/complete", response_model=CompleteStepResponse)
def complete_path_step(
	step_id: uuid.UUID,
	payload: CompleteStepRequest,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> CompleteStepResponse:
	result = complete_step(db=db, user=current_user, step_id=step_id, content_item_id=payload.content_item_id)
	return CompleteStepResponse(**result)
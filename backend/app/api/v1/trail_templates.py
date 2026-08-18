import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.models import User
from app.schemas.trail_template import AddedTrailTemplateResponse, TrailTemplateView
from app.services.trail_template_service import add_template_to_user, list_templates_for_user


router = APIRouter(prefix="/trail-templates")


@router.get("", response_model=list[TrailTemplateView])
def get_trail_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, object]]:
    return list_templates_for_user(db=db, user=current_user)


@router.post("/{template_id}/add", response_model=AddedTrailTemplateResponse)
def add_trail_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AddedTrailTemplateResponse:
    path = add_template_to_user(db=db, user=current_user, template_id=template_id)
    return AddedTrailTemplateResponse(
        career_path_id=path.id,
        title=path.title,
        kind=path.kind.value,
        status=path.status.value,
    )

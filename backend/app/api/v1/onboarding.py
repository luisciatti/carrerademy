from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.models import User
from app.schemas.onboarding import OnboardingCreate, OnboardingCreateResponse
from app.services.onboarding_service import create_onboarding_and_generate_path

router = APIRouter()


@router.post("", response_model=OnboardingCreateResponse)
def create_onboarding(
	payload: OnboardingCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> OnboardingCreateResponse:
	standard_path, ai_path = create_onboarding_and_generate_path(db=db, current_user=current_user, payload=payload)
	return OnboardingCreateResponse(
		standard_career_path_id=standard_path.id,
		ai_career_path_id=ai_path.id,
		standard_status=standard_path.status.value,
		ai_status=ai_path.status.value,
		message="Onboarding recebido. Sua trilha de soft skills ja esta pronta e a trilha personalizada esta sendo gerada.",
	)
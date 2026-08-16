from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.enums import CareerPathStatus
from app.domain.models import CareerPath, OnboardingResponse, User
from app.schemas.onboarding import OnboardingCreate
from app.shared.rate_limit import enforce_rate_limit
from app.tasks.generate_career_path import generate_career_path_task


def create_onboarding_and_generate_path(*, db: Session, current_user: User, payload: OnboardingCreate) -> CareerPath:
	settings = get_settings()
	enforce_rate_limit(
		key=f"onboarding-generate:{current_user.id}",
		max_requests=settings.onboarding_generation_daily_limit,
		window_seconds=24 * 60 * 60,
	)

	active_paths = list(
		db.scalars(
			select(CareerPath)
			.where(CareerPath.user_id == current_user.id, CareerPath.status == CareerPathStatus.ACTIVE)
			.order_by(desc(CareerPath.generated_at))
		)
	)
	for active_path in active_paths:
		active_path.status = CareerPathStatus.ARCHIVED

	onboarding = OnboardingResponse(
		user_id=current_user.id,
		current_job=payload.current_job,
		dream_job=payload.dream_job,
		goal=payload.goal,
		experience_level=payload.experience_level,
		weekly_time_availability=payload.weekly_time_availability,
	)
	db.add(onboarding)
	db.flush()

	career_path = CareerPath(
		user_id=current_user.id,
		onboarding_response_id=onboarding.id,
		title="Gerando sua trilha personalizada...",
		status=CareerPathStatus.GENERATING,
	)
	db.add(career_path)
	db.commit()
	db.refresh(career_path)

	generate_career_path_task.delay(str(career_path.id))

	return career_path
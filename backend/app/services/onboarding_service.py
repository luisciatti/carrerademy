from __future__ import annotations

from collections.abc import Sequence
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.enums import CareerPathKind, CareerPathStatus, CareerType, PathStepStatus
from app.domain.models import CareerPath, ContentItem, OnboardingResponse, PathStep, User
from app.schemas.onboarding import OnboardingCreate
from app.shared.rate_limit import enforce_rate_limit
from app.tasks.generate_career_path import generate_career_path_task


def create_onboarding_and_generate_path(*, db: Session, current_user: User, payload: OnboardingCreate) -> tuple[CareerPath, CareerPath]:
	settings = get_settings()
	enforce_rate_limit(
		key=f"onboarding-generate:{current_user.id}",
		max_requests=settings.onboarding_generation_daily_limit,
		window_seconds=24 * 60 * 60,
	)

	_archive_active_paths_for_kind(db=db, user=current_user, kind=CareerPathKind.STANDARD_SOFT_SKILLS)
	_archive_active_paths_for_kind(db=db, user=current_user, kind=CareerPathKind.AI_PERSONALIZED)

	onboarding = OnboardingResponse(
		user_id=current_user.id,
		current_job=payload.current_job,
		dream_job=payload.dream_job,
		career_type=payload.career_type,
		goal=payload.goal,
		experience_level=payload.experience_level,
		weekly_time_availability=payload.weekly_time_availability,
	)
	db.add(onboarding)
	db.flush()

	standard_path = CareerPath(
		user_id=current_user.id,
		onboarding_response_id=onboarding.id,
		title=_standard_path_title(payload.career_type),
		kind=CareerPathKind.STANDARD_SOFT_SKILLS,
		status=CareerPathStatus.ACTIVE,
	)
	db.add(standard_path)
	db.flush()

	for step in _build_standard_soft_skills_steps(db=db, career_path_id=standard_path.id, career_type=payload.career_type):
		db.add(step)

	ai_path = CareerPath(
		user_id=current_user.id,
		onboarding_response_id=onboarding.id,
		title="Gerando sua trilha personalizada...",
		kind=CareerPathKind.AI_PERSONALIZED,
		status=CareerPathStatus.GENERATING,
	)
	db.add(ai_path)
	db.commit()
	db.refresh(standard_path)
	db.refresh(ai_path)

	try:
		generate_career_path_task.delay(str(ai_path.id))
	except Exception as exc:
		db.delete(ai_path)
		db.delete(standard_path)
		db.delete(onboarding)
		db.commit()
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Nao foi possivel iniciar a geracao da trilha agora. Tente novamente em instantes.",
		) from exc

	return standard_path, ai_path


def _archive_active_paths_for_kind(*, db: Session, user: User, kind: CareerPathKind) -> None:
	active_paths = list(
		db.scalars(
			select(CareerPath)
			.where(
				CareerPath.user_id == user.id,
				CareerPath.kind == kind,
				CareerPath.status == CareerPathStatus.ACTIVE,
			)
			.order_by(desc(CareerPath.generated_at))
		)
	)
	for active_path in active_paths:
		active_path.status = CareerPathStatus.ARCHIVED


def _standard_path_title(career_type: CareerType) -> str:
	labels = {
		CareerType.TECH: "Soft Skills para Tecnologia",
		CareerType.DESIGN: "Soft Skills para Design",
		CareerType.MARKETING: "Soft Skills para Marketing",
		CareerType.SALES: "Soft Skills para Vendas",
		CareerType.FINANCE: "Soft Skills para Financas",
		CareerType.OPERATIONS: "Soft Skills para Operacoes",
		CareerType.OTHER: "Soft Skills Essenciais de Carreira",
	}
	return labels[career_type]


def _build_standard_soft_skills_steps(*, db: Session, career_path_id: uuid.UUID, career_type: CareerType) -> Sequence[PathStep]:
	career_tag = f"career-type:{career_type.value.lower()}"
	items = [
		item
		for item in db.scalars(select(ContentItem).where(ContentItem.is_active.is_(True)))
		if "soft-skill" in {tag.lower() for tag in item.tags} and career_tag in {tag.lower() for tag in item.tags}
	]

	def _sort_key(item: ContentItem) -> tuple[int, int, str]:
		# Keep video-based anchor content first so the trail starts with the YouTube experience.
		is_video = 0 if item.type.value == "VIDEO" else 1
		has_follow_up = 0 if item.follow_up_content_item_id is not None else 1
		return (is_video, has_follow_up, item.title.lower())

	items = sorted(items, key=_sort_key)

	selected_items = items[:6]
	steps: list[PathStep] = []
	for index, item in enumerate(selected_items):
		steps.append(
			PathStep(
				career_path_id=career_path_id,
				order_index=index,
				title=item.title,
				description=item.description,
				content_reference_id=item.id,
				is_free=True,
				status=PathStepStatus.UNLOCKED if index == 0 else PathStepStatus.LOCKED,
			)
		)

	return steps
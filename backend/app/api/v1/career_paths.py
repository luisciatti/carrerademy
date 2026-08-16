from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, get_db
from app.domain.enums import CareerPathStatus, SubscriptionStatus
from app.domain.models import CareerPath, Subscription, User
from app.schemas.career_path import CareerPathView, PublicPathStep

router = APIRouter()


@router.get("/me", response_model=CareerPathView)
def get_my_career_path(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> CareerPathView:
	career_path = _get_priority_career_path(db=db, user_id=current_user.id)
	if career_path is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career path not found.")

	return _serialize_career_path(db=db, user=current_user, career_path=career_path)


@router.get("/{career_path_id}", response_model=CareerPathView)
def get_career_path_by_id(
	career_path_id: uuid.UUID,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> CareerPathView:
	career_path = db.scalar(
		select(CareerPath)
		.options(selectinload(CareerPath.steps))
		.where(CareerPath.id == career_path_id, CareerPath.user_id == current_user.id)
	)
	if career_path is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career path not found.")

	return _serialize_career_path(db=db, user=current_user, career_path=career_path)


def _get_priority_career_path(*, db: Session, user_id: uuid.UUID) -> CareerPath | None:
	prioritized = db.scalar(
		select(CareerPath)
		.options(selectinload(CareerPath.steps))
		.where(
			CareerPath.user_id == user_id,
			CareerPath.status.in_([CareerPathStatus.GENERATING, CareerPathStatus.ACTIVE]),
		)
		.order_by(desc(CareerPath.generated_at))
	)
	if prioritized is not None:
		return prioritized

	return db.scalar(
		select(CareerPath)
		.options(selectinload(CareerPath.steps))
		.where(CareerPath.user_id == user_id)
		.order_by(desc(CareerPath.generated_at))
	)


def _serialize_career_path(*, db: Session, user: User, career_path: CareerPath) -> CareerPathView:
	has_active_subscription = _has_active_subscription(db=db, user=user)

	response_steps: list[PublicPathStep] = []
	for step in career_path.steps:
		hide_description = step.order_index > 0 and not has_active_subscription
		response_steps.append(
			PublicPathStep(
				id=step.id,
				order_index=step.order_index,
				title=step.title,
				description=step.description if not hide_description else "Conteudo completo disponivel para assinantes.",
				status=step.status.value,
				is_free=step.is_free,
				is_description_locked=hide_description,
			)
		)

	return CareerPathView(
		id=career_path.id,
		title=career_path.title,
		status=career_path.status.value,
		generation_status=career_path.status.value,
		steps=response_steps,
	)


def _has_active_subscription(*, db: Session, user: User) -> bool:
	subscription = db.scalar(
		select(Subscription)
		.where(Subscription.user_id == user.id, Subscription.status == SubscriptionStatus.ACTIVE)
		.limit(1)
	)
	return subscription is not None
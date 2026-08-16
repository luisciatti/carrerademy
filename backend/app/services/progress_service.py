from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.enums import PathStepStatus, SubscriptionStatus
from app.domain.models import PathStep, Subscription, User, UserProgress


def complete_step(*, db: Session, user: User, step_id: uuid.UUID) -> dict[str, object]:
	step = db.scalar(
		select(PathStep)
		.join(PathStep.career_path)
		.where(
			PathStep.id == step_id,
			PathStep.career_path.has(user_id=user.id),
		)
	)
	if step is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path step not found.")

	if step.status == PathStepStatus.LOCKED:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path step is locked.")

	progress = db.scalar(select(UserProgress).where(UserProgress.user_id == user.id, UserProgress.path_step_id == step.id))
	if progress is None:
		progress = UserProgress(user_id=user.id, path_step_id=step.id)
		db.add(progress)

	step.status = PathStepStatus.COMPLETED

	if step.is_free and not user.free_step_used:
		user.free_step_used = True

	next_step = db.scalar(
		select(PathStep).where(
			PathStep.career_path_id == step.career_path_id,
			PathStep.order_index == step.order_index + 1,
		)
	)

	has_active_subscription = _has_active_subscription(db, user)
	next_unlocked = False
	next_blocked_by_paywall = False

	if next_step is not None:
		if _can_access_step(user=user, step=next_step, has_active_subscription=has_active_subscription):
			next_step.status = PathStepStatus.UNLOCKED
			next_unlocked = True
		else:
			next_blocked_by_paywall = True

	db.add(user)
	db.commit()

	return {
		"completed_step_id": str(step.id),
		"completed": True,
		"next_step_id": str(next_step.id) if next_step else None,
		"next_step_unlocked": next_unlocked,
		"next_step_blocked_by_paywall": next_blocked_by_paywall,
		"user_free_step_used": user.free_step_used,
	}


def _has_active_subscription(db: Session, user: User) -> bool:
	subscription = db.scalar(
		select(Subscription)
		.where(Subscription.user_id == user.id, Subscription.status == SubscriptionStatus.ACTIVE)
		.limit(1)
	)
	return subscription is not None


def _can_access_step(*, user: User, step: PathStep, has_active_subscription: bool) -> bool:
	if step.is_free:
		return not user.free_step_used
	return has_active_subscription
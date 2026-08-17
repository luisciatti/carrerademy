from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.enums import CareerPathKind, PathStepStatus, SubscriptionStatus
from app.domain.models import CareerPath, ContentItem, PathStep, Subscription, User, UserProgress


def complete_step(*, db: Session, user: User, step_id: uuid.UUID, content_item_id: str | None = None) -> dict[str, object]:
	step = db.scalar(
		select(PathStep)
		.options(selectinload(PathStep.career_path), selectinload(PathStep.content_item))
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
	chain = _build_content_chain(step.content_item)
	chain_ids = [item.id for item in chain]

	if progress is None and chain_ids:
		progress = UserProgress(user_id=user.id, path_step_id=step.id, current_content_item_id=chain_ids[0])
		db.add(progress)
		db.flush()
	if progress is None:
		progress = UserProgress(user_id=user.id, path_step_id=step.id)
		db.add(progress)
		db.flush()

	if chain_ids:
		current_id = _resolve_current_chain_item_id(progress=progress, chain_ids=chain_ids, payload_content_item_id=content_item_id)
		current_index = chain_ids.index(current_id)
		is_last_stage = current_index == len(chain_ids) - 1

		if not is_last_stage:
			next_content_item_id = chain_ids[current_index + 1]
			progress.current_content_item_id = next_content_item_id
			db.add(progress)
			db.commit()
			return {
				"completed_step_id": str(step.id),
				"completed": False,
				"next_step_id": str(step.id),
				"next_step_unlocked": True,
				"next_step_blocked_by_paywall": False,
				"user_free_step_used": user.free_step_used,
				"current_content_item_id": str(progress.current_content_item_id),
				"next_content_item_id": str(next_content_item_id),
				"chain_position": current_index + 2,
				"chain_total": len(chain_ids),
			}

	step.status = PathStepStatus.COMPLETED
	progress.current_content_item_id = None
	progress.completed_at = datetime.now(timezone.utc)

	if step.is_free and step.career_path.kind == CareerPathKind.AI_PERSONALIZED and not user.free_step_used:
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
		if _can_access_step(user=user, current_path=step.career_path, step=next_step, has_active_subscription=has_active_subscription):
			next_step.status = PathStepStatus.UNLOCKED
			next_unlocked = True
		else:
			next_blocked_by_paywall = True

	db.add(user)
	db.add(progress)
	db.commit()

	chain_position = len(chain_ids) if chain_ids else None
	chain_total = len(chain_ids) if chain_ids else None
	return {
		"completed_step_id": str(step.id),
		"completed": True,
		"next_step_id": str(next_step.id) if next_step else None,
		"next_step_unlocked": next_unlocked,
		"next_step_blocked_by_paywall": next_blocked_by_paywall,
		"user_free_step_used": user.free_step_used,
		"current_content_item_id": None,
		"next_content_item_id": None,
		"chain_position": chain_position,
		"chain_total": chain_total,
	}


def _has_active_subscription(db: Session, user: User) -> bool:
	subscription = db.scalar(
		select(Subscription)
		.where(Subscription.user_id == user.id, Subscription.status == SubscriptionStatus.ACTIVE)
		.limit(1)
	)
	return subscription is not None


def _can_access_step(*, user: User, current_path: CareerPath, step: PathStep, has_active_subscription: bool) -> bool:
	if current_path.kind == CareerPathKind.STANDARD_SOFT_SKILLS:
		return True
	if step.is_free:
		return not user.free_step_used
	return has_active_subscription


def _build_content_chain(item: ContentItem | None) -> list[ContentItem]:
	if item is None:
		return []

	chain: list[ContentItem] = []
	visited: set[uuid.UUID] = set()
	current = item
	while current is not None and current.id not in visited:
		chain.append(current)
		visited.add(current.id)
		current = current.follow_up_content_item
	return chain


def _resolve_current_chain_item_id(*, progress: UserProgress, chain_ids: list[uuid.UUID], payload_content_item_id: str | None) -> uuid.UUID:
	if payload_content_item_id:
		try:
			parsed = uuid.UUID(payload_content_item_id)
		except ValueError as exc:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid content_item_id.") from exc
		if parsed not in chain_ids:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Content item does not belong to this step chain.")
		return parsed

	if progress.current_content_item_id and progress.current_content_item_id in chain_ids:
		return progress.current_content_item_id

	return chain_ids[0]
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, get_db
from app.domain.enums import CareerPathKind, CareerPathStatus, PathStepStatus, SubscriptionStatus
from app.domain.models import CareerPath, ContentItem, PathStep, Subscription, User, UserProgress
from app.schemas.career_path import CareerPathView, ContentStageView, PublicPathStep

router = APIRouter()


@router.get("/me", response_model=list[CareerPathView])
def get_my_career_path(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> list[CareerPathView]:
	career_paths = _get_priority_career_paths(db=db, user_id=current_user.id)
	if not career_paths:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career path not found.")

	return [_serialize_career_path(db=db, user=current_user, career_path=career_path) for career_path in career_paths]


@router.get("/{career_path_id}", response_model=CareerPathView)
def get_career_path_by_id(
	career_path_id: uuid.UUID,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> CareerPathView:
	career_path = db.scalar(
		select(CareerPath)
		.options(selectinload(CareerPath.steps).selectinload(PathStep.content_item))
		.where(CareerPath.id == career_path_id, CareerPath.user_id == current_user.id)
	)
	if career_path is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career path not found.")

	return _serialize_career_path(db=db, user=current_user, career_path=career_path)


def _get_priority_career_paths(*, db: Session, user_id: uuid.UUID) -> list[CareerPath]:
	paths = list(
		db.scalars(
			select(CareerPath)
			.options(selectinload(CareerPath.steps).selectinload(PathStep.content_item))
			.where(
				CareerPath.user_id == user_id,
				CareerPath.status.in_([CareerPathStatus.GENERATING, CareerPathStatus.ACTIVE]),
			)
			.order_by(CareerPath.kind.asc(), desc(CareerPath.generated_at))
		)
	)
	if paths:
		return paths

	return list(
		db.scalars(
			select(CareerPath)
			.options(selectinload(CareerPath.steps).selectinload(PathStep.content_item))
			.where(CareerPath.user_id == user_id)
			.order_by(CareerPath.kind.asc(), desc(CareerPath.generated_at))
		)
	)


def _serialize_career_path(*, db: Session, user: User, career_path: CareerPath) -> CareerPathView:
	has_active_subscription = _has_active_subscription(db=db, user=user)
	progress_map = {
		progress.path_step_id: progress
		for progress in db.scalars(
			select(UserProgress).where(
				UserProgress.user_id == user.id,
				UserProgress.path_step_id.in_([step.id for step in career_path.steps]),
			)
		)
	}

	response_steps: list[PublicPathStep] = []
	for step in career_path.steps:
		hide_description = (
			career_path.kind != CareerPathKind.STANDARD_SOFT_SKILLS
			and step.order_index > 0
			and not has_active_subscription
		)
		chain_items = _build_content_chain(step.content_item)
		chain_total = len(chain_items)
		progress = progress_map.get(step.id)
		current_content_item_id = progress.current_content_item_id if progress is not None else None

		if current_content_item_id is None and chain_items:
			if step.status == PathStepStatus.COMPLETED:
				current_content_item_id = chain_items[-1].id
			else:
				current_content_item_id = chain_items[0].id

		response_steps.append(
			PublicPathStep(
				id=step.id,
				order_index=step.order_index,
				title=step.title,
				description=step.description if not hide_description else "Conteudo completo disponivel para assinantes.",
				status=step.status.value,
				is_free=step.is_free,
				is_description_locked=hide_description,
				content_item_id=step.content_item.id if step.content_item else None,
				current_content_item_id=current_content_item_id,
				chain_total_stages=chain_total,
				content_type=step.content_item.type.value if step.content_item else None,
				external_url=step.content_item.external_url if step.content_item else None,
				video_url=step.content_item.video_url if step.content_item else None,
				quiz_schema=step.content_item.quiz_schema if step.content_item else None,
				diagram_url=step.content_item.diagram_url if step.content_item else None,
				form_schema=step.content_item.form_schema if step.content_item else None,
				scenario_schema=step.content_item.scenario_schema if step.content_item else None,
				rules_schema=step.content_item.rules_schema if step.content_item else None,
				matching_schema=step.content_item.matching_schema if step.content_item else None,
				dialogue_schema=step.content_item.dialogue_schema if step.content_item else None,
				follow_up_content_item_id=step.content_item.follow_up_content_item_id if step.content_item else None,
				chain_items=[
					_build_content_stage(item=chain_item, hide_description=hide_description)
					for chain_item in chain_items
				],
			)
		)

	return CareerPathView(
		id=career_path.id,
		title=career_path.title,
		kind=career_path.kind.value,
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


def _build_content_stage(*, item: ContentItem, hide_description: bool) -> ContentStageView:
	return ContentStageView(
		id=item.id,
		title=item.title,
		description=item.description if not hide_description else "Conteudo completo disponivel para assinantes.",
		content_type=item.type.value,
		external_url=item.external_url,
		video_url=item.video_url,
		quiz_schema=item.quiz_schema,
		diagram_url=item.diagram_url,
		form_schema=item.form_schema,
		scenario_schema=item.scenario_schema,
		rules_schema=item.rules_schema,
		matching_schema=item.matching_schema,
		dialogue_schema=item.dialogue_schema,
		follow_up_content_item_id=item.follow_up_content_item_id,
	)
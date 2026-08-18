from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.domain.enums import CareerPathKind, CareerPathStatus, CareerType, PathStepStatus
from app.domain.models import CareerPath, OnboardingResponse, PathStep, TrailTemplate, TrailTemplateStep, User


def list_templates_for_user(*, db: Session, user: User) -> list[dict[str, object]]:
    templates = list(
        db.scalars(
            select(TrailTemplate)
            .where(TrailTemplate.is_active.is_(True))
            .order_by(TrailTemplate.is_starter.desc(), TrailTemplate.category.asc(), TrailTemplate.title.asc())
        )
    )

    added_template_ids = {
        template_id
        for template_id in db.scalars(
            select(CareerPath.source_trail_template_id).where(
                CareerPath.user_id == user.id,
                CareerPath.source_trail_template_id.is_not(None),
                CareerPath.status != CareerPathStatus.ARCHIVED,
            )
        )
        if template_id is not None
    }

    return [
        {
            "id": template.id,
            "title": template.title,
            "description": template.description,
            "category": template.category,
            "career_type_tags": template.career_type_tags,
            "icon": template.icon,
            "is_starter": template.is_starter,
            "already_added": template.id in added_template_ids,
        }
        for template in templates
    ]


def add_template_to_user(*, db: Session, user: User, template_id: uuid.UUID) -> CareerPath:
    template = db.scalar(
        select(TrailTemplate)
        .options(selectinload(TrailTemplate.steps).joinedload(TrailTemplateStep.content_item))
        .where(TrailTemplate.id == template_id, TrailTemplate.is_active.is_(True))
    )
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trail template not found.")

    already_added = db.scalar(
        select(CareerPath.id).where(
            CareerPath.user_id == user.id,
            CareerPath.source_trail_template_id == template.id,
            CareerPath.status != CareerPathStatus.ARCHIVED,
        )
    )
    if already_added is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Template already added.")

    onboarding = _latest_onboarding(db=db, user=user)
    if onboarding is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete o onboarding antes de adicionar novas trilhas.")

    new_path = clone_template_to_path(
        db=db,
        user=user,
        onboarding_response_id=onboarding.id,
        template=template,
        title_override=None,
    )
    db.commit()
    db.refresh(new_path)
    return new_path


def choose_starter_template(*, db: Session, career_type: CareerType) -> TrailTemplate | None:
    starters = list(
        db.scalars(
            select(TrailTemplate)
            .options(selectinload(TrailTemplate.steps).joinedload(TrailTemplateStep.content_item))
            .where(TrailTemplate.is_active.is_(True), TrailTemplate.is_starter.is_(True))
            .order_by(TrailTemplate.title.asc())
        )
    )
    if not starters:
        return None

    tag = career_type.value.upper()
    tagged = [template for template in starters if tag in {t.upper() for t in template.career_type_tags}]
    return tagged[0] if tagged else starters[0]


def clone_template_to_path(
    *,
    db: Session,
    user: User,
    onboarding_response_id: uuid.UUID,
    template: TrailTemplate,
    title_override: str | None,
) -> CareerPath:
    if not template.steps:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template sem etapas configuradas.")

    path = CareerPath(
        user_id=user.id,
        onboarding_response_id=onboarding_response_id,
        title=title_override or template.title,
        kind=CareerPathKind.STANDARD_SOFT_SKILLS,
        status=CareerPathStatus.ACTIVE,
        source_trail_template_id=template.id,
    )
    db.add(path)
    db.flush()

    for index, template_step in enumerate(sorted(template.steps, key=lambda step: step.order_index)):
        item = template_step.content_item
        db.add(
            PathStep(
                career_path_id=path.id,
                order_index=index,
                title=item.title,
                description=item.description,
                content_reference_id=item.id,
                is_free=True,
                status=PathStepStatus.UNLOCKED if index == 0 else PathStepStatus.LOCKED,
            )
        )

    return path


def _latest_onboarding(*, db: Session, user: User) -> OnboardingResponse | None:
    return db.scalar(
        select(OnboardingResponse)
        .where(OnboardingResponse.user_id == user.id)
        .order_by(desc(OnboardingResponse.created_at))
        .limit(1)
    )

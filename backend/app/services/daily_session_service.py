from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, load_only, selectinload

from app.domain.enums import CareerPathStatus, ContentItemType, DailyObjectiveType, PathStepStatus, SubscriptionStatus
from app.domain.models import CareerPath, ContentItem, DailyActivityLog, PathStep, Subscription, User, UserProgress


@dataclass
class DailyObjective:
    id: str
    objective_type: DailyObjectiveType
    title: str
    description: str
    content_type: str | None
    estimated_minutes: int
    reference_id: str | None
    step_id: str | None
    is_locked: bool
    is_completed_today: bool


def get_daily_objectives(*, db: Session, user: User) -> list[DailyObjective]:
    today = date.today()
    has_sub = _has_active_subscription(db, user)
    completed_today = _completed_today_types(db, user, today)

    obj1 = _objective_continue_trail(db, user, completed_today)
    obj2 = _objective_review(db, user, completed_today)
    obj3 = _objective_bonus(db, user, has_sub, completed_today)

    return [o for o in [obj1, obj2, obj3] if o is not None]


def complete_daily_objective(*, db: Session, user: User, objective_type: DailyObjectiveType, reference_id: uuid.UUID | None) -> dict:
    today = date.today()

    log = DailyActivityLog(
        user_id=user.id,
        activity_date=today,
        objective_type=objective_type,
        reference_id=reference_id,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(log)
    _update_streak(user, today)
    db.add(user)
    db.commit()

    return {
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
    }


def _update_streak(user: User, today: date) -> None:
    from datetime import timedelta
    last = user.last_activity_date
    if last is None or last < today - timedelta(days=1):
        user.current_streak = 1
    elif last == today - timedelta(days=1):
        user.current_streak += 1
    # last == today → already counted today, keep streak
    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak
    if last != today:
        user.last_activity_date = today


def _has_active_subscription(db: Session, user: User) -> bool:
    return db.scalar(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        ).limit(1)
    ) is not None


def _completed_today_types(db: Session, user: User, today: date) -> set[DailyObjectiveType]:
    rows = db.scalars(
        select(DailyActivityLog.objective_type).where(
            DailyActivityLog.user_id == user.id,
            DailyActivityLog.activity_date == today,
        )
    )
    return set(rows)


def _objective_continue_trail(db: Session, user: User, completed_today: set[DailyObjectiveType]) -> DailyObjective | None:
    # Most recently touched active path first.
    paths = db.scalars(
        select(CareerPath)
        .options(selectinload(CareerPath.steps).selectinload(PathStep.content_item))
        .where(CareerPath.user_id == user.id, CareerPath.status == CareerPathStatus.ACTIVE)
        .order_by(desc(CareerPath.generated_at))
    )
    for path in paths:
        for step in sorted(path.steps, key=lambda s: s.order_index):
            if step.status == PathStepStatus.UNLOCKED:
                item = step.content_item
                return DailyObjective(
                    id=f"PATH_STEP:{step.id}",
                    objective_type=DailyObjectiveType.PATH_STEP,
                    title=step.title,
                    description=step.description[:120] if step.description else "",
                    content_type=item.type.value if item else None,
                    estimated_minutes=_estimate_minutes(item),
                    reference_id=str(step.id),
                    step_id=str(step.id),
                    is_locked=False,
                    is_completed_today=DailyObjectiveType.PATH_STEP in completed_today,
                )
    return None


def _objective_review(db: Session, user: User, completed_today: set[DailyObjectiveType]) -> DailyObjective | None:
    # Pick a previously-completed QUIZ or MATCHING_GAME content item pseudo-randomly (hash of user_id + today).
    review_types = [ContentItemType.QUIZ, ContentItemType.MATCHING_GAME]
    completed_step_ids = db.scalars(
        select(UserProgress.path_step_id).where(
            UserProgress.user_id == user.id,
            UserProgress.completed_at.isnot(None),
        )
        .order_by(UserProgress.completed_at.desc())
        .limit(200)
    )
    completed_ids = list(completed_step_ids)
    if not completed_ids:
        return None

    steps_with_review = list(db.scalars(
        select(PathStep)
        .options(selectinload(PathStep.content_item))
        .where(
            PathStep.id.in_(completed_ids),
            PathStep.content_reference_id.isnot(None),
        )
    ))

    review_steps = [s for s in steps_with_review if s.content_item and s.content_item.type in review_types]
    if not review_steps:
        return None

    # Deterministic daily pick
    seed = int.from_bytes(user.id.bytes[:4], "big") + int(date.today().strftime("%Y%m%d"))
    chosen = review_steps[seed % len(review_steps)]
    item = chosen.content_item

    return DailyObjective(
        id=f"REVIEW:{chosen.id}",
        objective_type=DailyObjectiveType.REVIEW,
        title=f"Revisao: {item.title if item else chosen.title}",
        description="Reforce o que voce ja aprendeu com uma revisao rapida.",
        content_type=item.type.value if item else None,
        estimated_minutes=5,
        reference_id=str(item.id) if item else None,
        step_id=str(chosen.id),
        is_locked=False,
        is_completed_today=DailyObjectiveType.REVIEW in completed_today,
    )


def _objective_bonus(db: Session, user: User, has_sub: bool, completed_today: set[DailyObjectiveType]) -> DailyObjective | None:
    bonus_types = [ContentItemType.DIALOGUE_SIMULATOR, ContentItemType.SCENARIO_BUILDER]

    # Prefer a content item from a different career_type area
    active_path = db.scalar(
        select(CareerPath)
        .where(CareerPath.user_id == user.id, CareerPath.status == CareerPathStatus.ACTIVE)
        .order_by(desc(CareerPath.generated_at))
    )
    onboarding = active_path.onboarding_response if active_path else None
    user_career_tag = f"career-type:{onboarding.career_type.value.lower()}" if onboarding else None

    candidates = list(db.scalars(
        select(ContentItem)
        .options(load_only(ContentItem.id, ContentItem.type, ContentItem.title, ContentItem.description, ContentItem.tags))
        .where(
            ContentItem.type.in_(bonus_types),
            ContentItem.is_active.is_(True),
        )
        .limit(250)
    ))

    if not candidates:
        return None

    # Prefer different career area
    other_area = [c for c in candidates if user_career_tag and not any(t.lower() == user_career_tag for t in c.tags)]
    pool = other_area if other_area else candidates

    seed = int.from_bytes(user.id.bytes[4:8], "big") + int(date.today().strftime("%Y%m%d"))
    chosen = pool[seed % len(pool)]

    return DailyObjective(
        id=f"BONUS:{chosen.id}",
        objective_type=DailyObjectiveType.BONUS,
        title=chosen.title,
        description=chosen.description[:120] if chosen.description else "",
        content_type=chosen.type.value,
        estimated_minutes=10,
        reference_id=str(chosen.id),
        step_id=None,
        is_locked=not has_sub,
        is_completed_today=DailyObjectiveType.BONUS in completed_today,
    )


def _estimate_minutes(item: ContentItem | None) -> int:
    if item is None:
        return 5
    mapping = {
        ContentItemType.VIDEO: 8,
        ContentItemType.QUIZ: 5,
        ContentItemType.INTERACTIVE_FORM: 7,
        ContentItemType.SCENARIO_BUILDER: 8,
        ContentItemType.RULES_RADIAL: 5,
        ContentItemType.MATCHING_GAME: 6,
        ContentItemType.DIALOGUE_SIMULATOR: 10,
        ContentItemType.DIAGRAM: 5,
        ContentItemType.ARTICLE: 10,
        ContentItemType.COURSE: 15,
        ContentItemType.CERTIFICATION: 20,
        ContentItemType.ACTION_TASK: 10,
    }
    return mapping.get(item.type, 5)

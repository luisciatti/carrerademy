from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session, selectinload

from app.domain.achievements import ACHIEVEMENTS
from app.domain.enums import CareerPathKind, CareerPathStatus, ContentItemType
from app.domain.models import CareerPath, ContentItem, PathStep, Subscription, User, UserProgress


def get_profile(*, db: Session, user: User) -> dict:
    progress = _load_progress_with_steps(db, user)
    career_paths = _load_paths(db, user)
    subscriptions = _load_subscriptions(db, user)

    steps_completed = len([p for p in progress if p.completed_at is not None])
    points_this_month = _points_this_month(db, user)
    paths_completed = sum(1 for p in career_paths if p.status == CareerPathStatus.COMPLETED)

    unlocked_achievements = [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "icon": a.icon,
            "unlocked": True,
            "unlocked_at": _achievement_unlocked_at(
                achievement_id=a.id,
                progress=progress,
                career_paths=career_paths,
                subscriptions=subscriptions,
            ),
        }
        for a in ACHIEVEMENTS
        if a.check(user=user, progress=progress, career_paths=career_paths, subscriptions=subscriptions)
    ]
    locked_achievements = [
        {"id": a.id, "title": a.title, "description": a.description, "icon": a.icon, "unlocked": False}
        for a in ACHIEVEMENTS
        if not a.check(user=user, progress=progress, career_paths=career_paths, subscriptions=subscriptions)
    ]

    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
        },
        "stats": {
            "steps_completed": steps_completed,
            "points_this_month": points_this_month,
            "best_streak": user.longest_streak,
            "paths_completed": paths_completed,
        },
        "achievements": unlocked_achievements + locked_achievements,
        "paths": [
            {
                "id": str(p.id),
                "title": p.title,
                "kind": p.kind.value,
                "status": p.status.value,
                "steps_total": len(p.steps),
                "steps_completed": sum(1 for s in p.steps if s.status.value == "COMPLETED"),
            }
            for p in career_paths
        ],
    }


def get_leaderboard(*, db: Session) -> list[dict]:
    today = date.today()
    rows = db.execute(
        select(UserProgress.user_id, func.count(UserProgress.id).label("points"))
        .where(
            extract("year", UserProgress.completed_at) == today.year,
            extract("month", UserProgress.completed_at) == today.month,
            UserProgress.completed_at.isnot(None),
        )
        .group_by(UserProgress.user_id)
        .order_by(func.count(UserProgress.id).desc())
        .limit(10)
    ).all()

    if not rows:
        return []

    user_ids = [r.user_id for r in rows]
    from app.domain.models import User as UserModel
    users_map = {
        u.id: u.name
        for u in db.scalars(select(UserModel).where(UserModel.id.in_(user_ids)))
    }

    return [
        {"rank": idx + 1, "name": users_map.get(r.user_id, "Anonimo"), "points": r.points}
        for idx, r in enumerate(rows)
    ]


def _load_progress_with_steps(db: Session, user: User) -> list[UserProgress]:
    return list(db.scalars(
        select(UserProgress)
        .options(
            selectinload(UserProgress.path_step)
            .selectinload(PathStep.content_item)
        )
        .where(UserProgress.user_id == user.id)
    ))


def _load_paths(db: Session, user: User) -> list[CareerPath]:
    return list(db.scalars(
        select(CareerPath)
        .options(selectinload(CareerPath.steps))
        .where(CareerPath.user_id == user.id)
    ))


def _load_subscriptions(db: Session, user: User) -> list[Subscription]:
    return list(db.scalars(
        select(Subscription).where(Subscription.user_id == user.id)
    ))


def _points_this_month(db: Session, user: User) -> int:
    today = date.today()
    return db.scalar(
        select(func.count(UserProgress.id)).where(
            UserProgress.user_id == user.id,
            UserProgress.completed_at.isnot(None),
            extract("year", UserProgress.completed_at) == today.year,
            extract("month", UserProgress.completed_at) == today.month,
        )
    ) or 0


def _achievement_unlocked_at(*, achievement_id: str, progress: list[UserProgress], career_paths: list[CareerPath], subscriptions: list[Subscription]) -> str | None:
    completed = sorted([p.completed_at for p in progress if p.completed_at is not None])

    if achievement_id == "first_step":
        return completed[0].isoformat() if completed else None

    if achievement_id == "ten_steps":
        return completed[9].isoformat() if len(completed) >= 10 else None

    if achievement_id == "soft_trail_done":
        soft_paths = [p for p in career_paths if p.kind == CareerPathKind.STANDARD_SOFT_SKILLS and p.status == CareerPathStatus.COMPLETED]
        if not soft_paths:
            return None
        progress_by_step = {p.path_step_id: p.completed_at for p in progress if p.completed_at is not None}
        moments: list[datetime] = []
        for path in soft_paths:
            for step in path.steps:
                when = progress_by_step.get(step.id)
                if when is not None:
                    moments.append(when)
        return max(moments).isoformat() if moments else None

    if achievement_id == "explorer":
        required = {
            ContentItemType.VIDEO,
            ContentItemType.QUIZ,
            ContentItemType.SCENARIO_BUILDER,
            ContentItemType.DIALOGUE_SIMULATOR,
            ContentItemType.MATCHING_GAME,
        }
        first_seen: dict[ContentItemType, datetime] = {}
        for entry in sorted(
            [p for p in progress if p.completed_at is not None and p.path_step and p.path_step.content_item],
            key=lambda p: p.completed_at,
        ):
            content_type = entry.path_step.content_item.type
            if content_type in required and content_type not in first_seen:
                first_seen[content_type] = entry.completed_at  # type: ignore[assignment]
        if not required.issubset(first_seen.keys()):
            return None
        return max(first_seen.values()).isoformat()

    if achievement_id == "subscriber":
        active = [s.created_at for s in subscriptions if s.status.value == "ACTIVE"]
        return min(active).isoformat() if active else None

    return None

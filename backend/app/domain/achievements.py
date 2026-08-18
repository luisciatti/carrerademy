"""Static achievement catalog — evaluated on demand, never stored in DB."""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from app.domain.models import User, UserProgress


@dataclass(frozen=True)
class Achievement:
    id: str
    title: str
    description: str
    icon: str
    check: Callable[..., bool]


def _first_step(progress: list[UserProgress], **_kw) -> bool:
    return len(progress) >= 1


def _soft_trail_done(career_paths, **_kw) -> bool:
    from app.domain.enums import CareerPathKind, CareerPathStatus
    return any(
        p.kind == CareerPathKind.STANDARD_SOFT_SKILLS and p.status == CareerPathStatus.COMPLETED
        for p in career_paths
    )


def _streak_7(user: User, **_kw) -> bool:
    return user.longest_streak >= 7


def _streak_30(user: User, **_kw) -> bool:
    return user.longest_streak >= 30


def _explorer(progress: list[UserProgress], **_kw) -> bool:
    from app.domain.enums import ContentItemType
    types_seen = {
        p.path_step.content_item.type
        for p in progress
        if p.path_step and p.path_step.content_item
    }
    required = {
        ContentItemType.VIDEO,
        ContentItemType.QUIZ,
        ContentItemType.SCENARIO_BUILDER,
        ContentItemType.DIALOGUE_SIMULATOR,
        ContentItemType.MATCHING_GAME,
    }
    return required.issubset(types_seen)


def _subscriber(subscriptions, **_kw) -> bool:
    from app.domain.enums import SubscriptionStatus
    return any(s.status == SubscriptionStatus.ACTIVE for s in subscriptions)


def _ten_steps(progress: list[UserProgress], **_kw) -> bool:
    return len(progress) >= 10


ACHIEVEMENTS: list[Achievement] = [
    Achievement(
        id="first_step",
        title="Primeiro Passo",
        description="Concluiu sua primeira etapa da trilha.",
        icon="footprints",
        check=_first_step,
    ),
    Achievement(
        id="ten_steps",
        title="Em Ritmo",
        description="Concluiu 10 etapas no total.",
        icon="zap",
        check=_ten_steps,
    ),
    Achievement(
        id="soft_trail_done",
        title="Trilha de Soft Skills Completa",
        description="Finalizou 100% da trilha Always Free.",
        icon="award",
        check=_soft_trail_done,
    ),
    Achievement(
        id="streak_7",
        title="Sequencia de 7 dias",
        description="Manteve uma sequencia de 7 dias consecutivos.",
        icon="flame",
        check=_streak_7,
    ),
    Achievement(
        id="streak_30",
        title="Habito de 30 dias",
        description="30 dias seguidos de atividade — isso e dedicacao real.",
        icon="star",
        check=_streak_30,
    ),
    Achievement(
        id="explorer",
        title="Explorador",
        description="Completou pelo menos 1 atividade de cada tipo de conteudo.",
        icon="compass",
        check=_explorer,
    ),
    Achievement(
        id="subscriber",
        title="Assinante",
        description="Ativou a trilha personalizada por IA.",
        icon="sparkles",
        check=_subscriber,
    ),
]

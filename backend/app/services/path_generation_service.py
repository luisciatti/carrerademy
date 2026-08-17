from __future__ import annotations

import json
import math
import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select

from app.domain.enums import CareerPathStatus, ContentItemType, GoalType, PathStepStatus
from app.domain.models import AIGenerationLog, CareerPath, ContentItem, OnboardingResponse, PathStep
from app.infra.ai_provider.client import AIProviderClient
from app.infra.db.session import SessionLocal


_GOAL_TAG_HINTS: dict[GoalType, set[str]] = {
    GoalType.GROW_CURRENT_JOB: {"growth", "leadership", "performance", "career"},
    GoalType.SWITCH_JOB: {"transition", "portfolio", "interview", "reskilling"},
    GoalType.FIND_JOB_ABROAD: {"english", "international", "remote", "visa", "global"},
    GoalType.MOVE_ABROAD: {"relocation", "visa", "culture", "international", "planning"},
}

_RICH_CONTENT_TYPES = (
    ContentItemType.VIDEO,
    ContentItemType.QUIZ,
    ContentItemType.DIAGRAM,
    ContentItemType.INTERACTIVE_FORM,
)


def generate_career_path(career_path_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        career_path = db.scalar(select(CareerPath).where(CareerPath.id == career_path_id))
        if career_path is None:
            return

        onboarding = db.scalar(select(OnboardingResponse).where(OnboardingResponse.id == career_path.onboarding_response_id))
        if onboarding is None:
            return

        candidates = _select_content_candidates(db, onboarding.goal)
        prompt = _build_generation_prompt(onboarding, candidates)

        client = AIProviderClient()
        raw_response = client.generate(prompt)
        structured = _parse_generation_response(raw_response, candidates)

        for old_step in list(career_path.steps):
            db.delete(old_step)

        created_steps = _to_steps(career_path_id=career_path.id, structured=structured, candidates=candidates)
        if not created_steps:
            created_steps = _fallback_steps(career_path.id, candidates)

        created_steps = _ensure_variety(created_steps=created_steps, candidates=candidates, career_path_id=career_path.id, onboarding=onboarding)

        for step in created_steps:
            db.add(step)

        career_path.title = structured.get("title") or "Trilha Personalizada"
        career_path.status = CareerPathStatus.ACTIVE

        prompt_tokens = _estimate_tokens(prompt)
        completion_tokens = _estimate_tokens(raw_response)
        db.add(
            AIGenerationLog(
                user_id=career_path.user_id,
                career_path_id=career_path.id,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_estimate=_estimate_cost(prompt_tokens, completion_tokens),
            )
        )

        db.commit()
    finally:
        db.close()


def _select_content_candidates(db, goal: GoalType) -> list[ContentItem]:
    active_items = list(db.scalars(select(ContentItem).where(ContentItem.is_active.is_(True))))
    if not active_items:
        return []

    goal_tags = _GOAL_TAG_HINTS.get(goal, set())

    def score(item: ContentItem) -> tuple[int, int]:
        tags = {tag.lower() for tag in item.tags}
        overlap = len(tags.intersection(goal_tags))
        rich_bonus = 1 if item.type in _RICH_CONTENT_TYPES else 0
        return overlap, rich_bonus, len(tags)

    ranked = sorted(active_items, key=score, reverse=True)
    rich_items = [item for item in ranked if item.type in _RICH_CONTENT_TYPES][:6]
    other_items = [item for item in ranked if item.type not in _RICH_CONTENT_TYPES][:8]
    merged: list[ContentItem] = []
    seen_ids: set[uuid.UUID] = set()
    for item in [*rich_items, *other_items]:
        if item.id in seen_ids:
            continue
        seen_ids.add(item.id)
        merged.append(item)
    return merged[:14]


def _build_generation_prompt(onboarding: OnboardingResponse, candidates: list[ContentItem]) -> str:
    candidate_payload = [
        {
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            "type": item.type.value,
            "tags": item.tags,
            "external_url": item.external_url,
			"video_url": item.video_url,
			"diagram_url": item.diagram_url,
			"has_quiz": item.quiz_schema is not None,
			"has_form": item.form_schema is not None,
        }
        for item in candidates
    ]

    # Use JSON payload blocks to reduce prompt-injection risk from free-text fields.
    onboarding_payload = {
        "current_job": onboarding.current_job,
        "dream_job": onboarding.dream_job,
        "goal": onboarding.goal.value,
        "experience_level": onboarding.experience_level,
        "weekly_time_availability": onboarding.weekly_time_availability,
    }

    return (
        "You are building a learning career path using only curated content items.\n"
        "Rules:\n"
        "1) Do not invent external learning items.\n"
        "2) Select and order steps only from provided candidates.\n"
        "3) Prefer a varied path, mixing passive and active content.\n"
        "4) Return only valid JSON.\n"
        "JSON format:\n"
        '{"title":"string","steps":[{"content_item_id":"uuid","title":"string","description":"1-2 short sentences explaining why this step comes now for this user"}]}\n\n'
        f"ONBOARDING_JSON_START\n{json.dumps(onboarding_payload, ensure_ascii=True)}\nONBOARDING_JSON_END\n\n"
        f"CANDIDATES_JSON_START\n{json.dumps(candidate_payload, ensure_ascii=True)}\nCANDIDATES_JSON_END\n"
    )


def _parse_generation_response(raw_response: str, candidates: list[ContentItem]) -> dict:
    try:
        payload = json.loads(raw_response)
    except json.JSONDecodeError:
        return {"title": "Trilha Personalizada", "steps": []}

    if not isinstance(payload, dict):
        return {"title": "Trilha Personalizada", "steps": []}

    steps = payload.get("steps")
    if not isinstance(steps, list):
        payload["steps"] = []

    valid_ids = {str(item.id) for item in candidates}
    sanitized_steps = []
    for step in payload.get("steps", []):
        if not isinstance(step, dict):
            continue
        content_item_id = str(step.get("content_item_id") or "").strip()
        if content_item_id not in valid_ids:
            continue
        title = str(step.get("title") or "").strip()
        description = str(step.get("description") or "").strip()
        if not title or not description:
            continue
        sanitized_steps.append(
            {
                "content_item_id": content_item_id,
                "title": title,
                "description": description,
            }
        )

    return {
        "title": str(payload.get("title") or "Trilha Personalizada"),
        "steps": sanitized_steps,
    }


def _to_steps(career_path_id: uuid.UUID, structured: dict, candidates: list[ContentItem]) -> list[PathStep]:
    candidate_map = {str(item.id): item for item in candidates}
    created: list[PathStep] = []

    for idx, step in enumerate(structured.get("steps", [])):
        content_item_id = step["content_item_id"]
        source_item = candidate_map.get(content_item_id)
        if source_item is None:
            continue

        created.append(
            PathStep(
                career_path_id=career_path_id,
                order_index=idx,
                title=step["title"],
                description=step["description"],
                content_reference_id=source_item.id,
                is_free=idx == 0,
                status=PathStepStatus.UNLOCKED if idx == 0 else PathStepStatus.LOCKED,
            )
        )

    return created


def _fallback_steps(career_path_id: uuid.UUID, candidates: list[ContentItem]) -> list[PathStep]:
    fallback_items = candidates[:6]
    steps: list[PathStep] = []
    for idx, item in enumerate(fallback_items):
        steps.append(
            PathStep(
                career_path_id=career_path_id,
                order_index=idx,
                title=item.title,
                description=_default_step_context(item=item, order_index=idx),
                content_reference_id=item.id,
                is_free=idx == 0,
                status=PathStepStatus.UNLOCKED if idx == 0 else PathStepStatus.LOCKED,
            )
        )

    return steps


def _ensure_variety(*, created_steps: list[PathStep], candidates: list[ContentItem], career_path_id: uuid.UUID, onboarding: OnboardingResponse) -> list[PathStep]:
    if not created_steps:
        return created_steps

    candidate_map = {item.id: item for item in candidates}
    selected_ids = {step.content_reference_id for step in created_steps if step.content_reference_id is not None}
    rich_types_present = {
        candidate_map[step.content_reference_id].type
        for step in created_steps
        if step.content_reference_id in candidate_map and candidate_map[step.content_reference_id].type in _RICH_CONTENT_TYPES
    }

    if len(rich_types_present) >= 2:
        return _reindex_steps(created_steps)

    by_type: dict[ContentItemType, list[ContentItem]] = defaultdict(list)
    for candidate in candidates:
        by_type[candidate.type].append(candidate)

    replacements: list[ContentItem] = []
    for rich_type in _RICH_CONTENT_TYPES:
        if rich_type in rich_types_present:
            continue
        for candidate in by_type.get(rich_type, []):
            if candidate.id not in selected_ids:
                replacements.append(candidate)
                selected_ids.add(candidate.id)
                break
        if len(rich_types_present) + len(replacements) >= 2:
            break

    for replacement in replacements:
        replace_index = next((index for index, step in enumerate(created_steps[1:], start=1) if step.content_reference_id is not None and candidate_map.get(step.content_reference_id, replacement).type not in _RICH_CONTENT_TYPES), None)
        new_step = PathStep(
            career_path_id=career_path_id,
            order_index=replace_index if replace_index is not None else len(created_steps),
            title=replacement.title,
            description=_default_step_context(item=replacement, order_index=replace_index or len(created_steps), onboarding=onboarding),
            content_reference_id=replacement.id,
            is_free=False,
            status=PathStepStatus.LOCKED,
        )

        if replace_index is None:
            created_steps.append(new_step)
        else:
            created_steps[replace_index] = new_step

    return _reindex_steps(created_steps)


def _reindex_steps(steps: list[PathStep]) -> list[PathStep]:
    for idx, step in enumerate(steps):
        step.order_index = idx
        step.is_free = idx == 0
        if idx == 0 and step.status == PathStepStatus.LOCKED:
            step.status = PathStepStatus.UNLOCKED
    return steps


def _default_step_context(*, item: ContentItem, order_index: int, onboarding: OnboardingResponse | None = None) -> str:
    goal_text = onboarding.goal.value.replace("_", " ").lower() if onboarding is not None else "seu objetivo"
    if item.type == ContentItemType.VIDEO:
        return f"Comece com um video rapido para ganhar contexto pratico antes das proximas etapas focadas em {goal_text}."
    if item.type == ContentItemType.QUIZ:
        return "Use este quiz para testar sua base atual e identificar rapidamente o que precisa de reforco."
    if item.type == ContentItemType.DIAGRAM:
        return "Visualize o mapa completo desta etapa para entender a jornada antes de executar as acoes seguintes."
    if item.type == ContentItemType.INTERACTIVE_FORM:
        return "Preencha este exercicio para transformar aprendizado passivo em um artefato util para sua carreira."
    return f"Etapa {order_index + 1} pensada para avancar com consistencia rumo a {goal_text}."


def _estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))


def _estimate_cost(prompt_tokens: int, completion_tokens: int) -> Decimal:
    prompt_cost = Decimal(prompt_tokens) * Decimal("0.00000015")
    completion_cost = Decimal(completion_tokens) * Decimal("0.00000060")
    return prompt_cost + completion_cost
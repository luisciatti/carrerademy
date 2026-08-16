from __future__ import annotations

import json
import math
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.domain.enums import CareerPathStatus, GoalType, PathStepStatus
from app.domain.models import AIGenerationLog, CareerPath, ContentItem, OnboardingResponse, PathStep
from app.infra.ai_provider.client import AIProviderClient
from app.infra.db.session import SessionLocal


_GOAL_TAG_HINTS: dict[GoalType, set[str]] = {
    GoalType.GROW_CURRENT_JOB: {"growth", "leadership", "performance", "career"},
    GoalType.SWITCH_JOB: {"transition", "portfolio", "interview", "reskilling"},
    GoalType.FIND_JOB_ABROAD: {"english", "international", "remote", "visa", "global"},
    GoalType.MOVE_ABROAD: {"relocation", "visa", "culture", "international", "planning"},
}


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
        return overlap, len(tags)

    ranked = sorted(active_items, key=score, reverse=True)
    return ranked[:12]


def _build_generation_prompt(onboarding: OnboardingResponse, candidates: list[ContentItem]) -> str:
    candidate_payload = [
        {
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            "type": item.type.value,
            "tags": item.tags,
            "external_url": item.external_url,
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
        "3) Return only valid JSON.\n"
        "JSON format:\n"
        '{"title":"string","steps":[{"content_item_id":"uuid","title":"string","description":"string"}]}\n\n'
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
    fallback_items = candidates[:5]
    steps: list[PathStep] = []
    for idx, item in enumerate(fallback_items):
        steps.append(
            PathStep(
                career_path_id=career_path_id,
                order_index=idx,
                title=item.title,
                description=item.description,
                content_reference_id=item.id,
                is_free=idx == 0,
                status=PathStepStatus.UNLOCKED if idx == 0 else PathStepStatus.LOCKED,
            )
        )

    return steps


def _estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))


def _estimate_cost(prompt_tokens: int, completion_tokens: int) -> Decimal:
    prompt_cost = Decimal(prompt_tokens) * Decimal("0.00000015")
    completion_cost = Decimal(completion_tokens) * Decimal("0.00000060")
    return prompt_cost + completion_cost
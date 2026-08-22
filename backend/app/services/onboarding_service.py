from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
import json
import re
from urllib.parse import quote_plus
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.enums import CareerPathKind, CareerPathStatus, CareerType, PathStepStatus
from app.domain.models import CareerPath, ContentItem, OnboardingResponse, PathStep, SalaryBenchmark, User
from app.infra.ai_provider.client import AIProviderClient
from app.schemas.onboarding import OnboardingCreate
from app.services.trail_template_service import choose_starter_template, clone_template_to_path
from app.shared.rate_limit import enforce_rate_limit
from app.tasks.generate_career_path import generate_career_path_task


def create_onboarding_and_generate_path(*, db: Session, current_user: User, payload: OnboardingCreate) -> tuple[OnboardingResponse, CareerPath, CareerPath]:
	onboarding = upsert_onboarding_draft(db=db, current_user=current_user, payload=payload)
	standard_path, ai_path = start_paths_for_onboarding(db=db, current_user=current_user, onboarding=onboarding)
	return onboarding, standard_path, ai_path


def upsert_onboarding_draft(*, db: Session, current_user: User, payload: OnboardingCreate, onboarding_id: uuid.UUID | None = None) -> OnboardingResponse:
	settings = get_settings()
	enforce_rate_limit(
		key=f"identity-statement-draft:{current_user.id}",
		max_requests=settings.identity_statement_daily_limit,
		window_seconds=24 * 60 * 60,
	)

	onboarding = _resolve_onboarding_for_draft(
		db=db,
		current_user=current_user,
		onboarding_id=onboarding_id,
	)

	if onboarding is None:
		onboarding = OnboardingResponse(
			user_id=current_user.id,
			current_job=payload.current_job,
			dream_job=payload.dream_job,
			career_type=payload.career_type,
			goal=payload.goal,
			experience_level=payload.experience_level,
			weekly_time_availability=payload.weekly_time_availability,
		)
		db.add(onboarding)
	else:
		onboarding.current_job = payload.current_job
		onboarding.dream_job = payload.dream_job
		onboarding.career_type = payload.career_type
		onboarding.goal = payload.goal
		onboarding.experience_level = payload.experience_level
		onboarding.weekly_time_availability = payload.weekly_time_availability

	db.flush()
	onboarding.identity_statement = _generate_identity_statement(onboarding)
	onboarding.identity_statement_generated_at = datetime.now(timezone.utc)
	db.commit()
	db.refresh(onboarding)
	return onboarding


def start_paths_for_onboarding(*, db: Session, current_user: User, onboarding: OnboardingResponse) -> tuple[CareerPath, CareerPath]:
	existing_standard = db.scalar(
		select(CareerPath).where(
			CareerPath.onboarding_response_id == onboarding.id,
			CareerPath.kind == CareerPathKind.STANDARD_SOFT_SKILLS,
		)
	)
	existing_ai = db.scalar(
		select(CareerPath).where(
			CareerPath.onboarding_response_id == onboarding.id,
			CareerPath.kind == CareerPathKind.AI_PERSONALIZED,
		)
	)
	if existing_standard is not None and existing_ai is not None:
		return existing_standard, existing_ai

	settings = get_settings()
	enforce_rate_limit(
		key=f"onboarding-generate:{current_user.id}",
		max_requests=settings.onboarding_generation_daily_limit,
		window_seconds=24 * 60 * 60,
	)

	_archive_active_paths_for_kind(db=db, user=current_user, kind=CareerPathKind.STANDARD_SOFT_SKILLS)
	_archive_active_paths_for_kind(db=db, user=current_user, kind=CareerPathKind.AI_PERSONALIZED)

	starter_template = choose_starter_template(db=db, career_type=onboarding.career_type)
	if starter_template is not None:
		standard_path = clone_template_to_path(
			db=db,
			user=current_user,
			onboarding_response_id=onboarding.id,
			template=starter_template,
			title_override=_standard_path_title(onboarding.career_type),
		)
	else:
		standard_path = CareerPath(
			user_id=current_user.id,
			onboarding_response_id=onboarding.id,
			title=_standard_path_title(onboarding.career_type),
			kind=CareerPathKind.STANDARD_SOFT_SKILLS,
			status=CareerPathStatus.ACTIVE,
		)
		db.add(standard_path)
		db.flush()

		for step in _build_standard_soft_skills_steps(db=db, career_path_id=standard_path.id, career_type=onboarding.career_type):
			db.add(step)

	ai_path = CareerPath(
		user_id=current_user.id,
		onboarding_response_id=onboarding.id,
		title="Gerando sua trilha personalizada...",
		kind=CareerPathKind.AI_PERSONALIZED,
		status=CareerPathStatus.GENERATING,
	)
	db.add(ai_path)
	db.commit()
	db.refresh(standard_path)
	db.refresh(ai_path)

	try:
		generate_career_path_task.delay(str(ai_path.id))
	except Exception as exc:
		db.delete(ai_path)
		db.delete(standard_path)
		db.commit()
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Nao foi possivel iniciar a geracao da trilha agora. Tente novamente em instantes.",
		) from exc

	return standard_path, ai_path


def get_identity_statement(*, db: Session, current_user: User, onboarding_id: uuid.UUID) -> OnboardingResponse:
	onboarding = _owned_onboarding(db=db, current_user=current_user, onboarding_id=onboarding_id)
	if not onboarding.identity_statement:
		onboarding.identity_statement = _generate_identity_statement(onboarding)
		onboarding.identity_statement_generated_at = datetime.now(timezone.utc)
		db.commit()
		db.refresh(onboarding)
	return onboarding


def regenerate_identity_statement(*, db: Session, current_user: User, onboarding_id: uuid.UUID) -> OnboardingResponse:
	settings = get_settings()
	enforce_rate_limit(
		key=f"identity-statement:{current_user.id}",
		max_requests=settings.identity_statement_daily_limit,
		window_seconds=24 * 60 * 60,
	)
	onboarding = _owned_onboarding(db=db, current_user=current_user, onboarding_id=onboarding_id)
	onboarding.identity_statement = _generate_identity_statement(onboarding)
	onboarding.identity_statement_generated_at = datetime.now(timezone.utc)
	db.commit()
	db.refresh(onboarding)
	return onboarding


def _owned_onboarding(*, db: Session, current_user: User, onboarding_id: uuid.UUID) -> OnboardingResponse:
	onboarding = db.scalar(
		select(OnboardingResponse).where(
			OnboardingResponse.id == onboarding_id,
			OnboardingResponse.user_id == current_user.id,
		)
	)
	if onboarding is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding nao encontrado.")
	return onboarding


def _resolve_onboarding_for_draft(*, db: Session, current_user: User, onboarding_id: uuid.UUID | None) -> OnboardingResponse | None:
	if onboarding_id is not None:
		return _owned_onboarding(db=db, current_user=current_user, onboarding_id=onboarding_id)

	return db.scalar(
		select(OnboardingResponse)
		.where(OnboardingResponse.user_id == current_user.id)
		.order_by(desc(OnboardingResponse.created_at))
	)


def get_latest_onboarding_context(*, db: Session, current_user: User) -> OnboardingResponse:
	onboarding = db.scalar(
		select(OnboardingResponse)
		.where(OnboardingResponse.user_id == current_user.id)
		.order_by(desc(OnboardingResponse.created_at))
	)
	if onboarding is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding nao encontrado.")
	return onboarding


def get_paywall_teaser(*, db: Session, current_user: User) -> tuple[OnboardingResponse, SalaryBenchmark | None, str, str]:
	onboarding = get_latest_onboarding_context(db=db, current_user=current_user)
	benchmark = _select_salary_benchmark(db=db, onboarding=onboarding)
	search_query = _build_live_jobs_query(onboarding=onboarding, benchmark=benchmark)
	search_url = f"https://www.linkedin.com/jobs/search/?keywords={quote_plus(search_query)}&location={quote_plus('Brasil')}"
	return onboarding, benchmark, search_query, search_url


def _generate_identity_statement(onboarding: OnboardingResponse) -> str:
	prompt = _build_identity_statement_prompt(onboarding)
	fallback = json.dumps({"statement": _fallback_identity_statement(onboarding)}, ensure_ascii=True)
	client = AIProviderClient()
	raw = client.generate(prompt, fallback_response=fallback)
	return _parse_identity_statement(raw, onboarding)


def _select_salary_benchmark(*, db: Session, onboarding: OnboardingResponse) -> SalaryBenchmark | None:
	benchmarks = list(
		db.scalars(
			select(SalaryBenchmark)
			.where(
				SalaryBenchmark.career_type == onboarding.career_type,
				SalaryBenchmark.region == "Brasil",
			)
			.order_by(desc(SalaryBenchmark.updated_at), SalaryBenchmark.role_title)
		)
	)
	if not benchmarks:
		return None

	targets = [value for value in (onboarding.dream_job, onboarding.current_job) if value]
	if not targets:
		return benchmarks[0]

	best = max(benchmarks, key=lambda item: _benchmark_match_score(item.role_title, targets))
	if _benchmark_match_score(best.role_title, targets) > 0:
		return best
	return benchmarks[0]


def _benchmark_match_score(role_title: str, targets: Sequence[str]) -> int:
	role_tokens = set(_normalize_tokens(role_title))
	if not role_tokens:
		return 0

	score = 0
	role_text = " ".join(role_tokens)
	for target in targets:
		target_tokens = set(_normalize_tokens(target))
		if not target_tokens:
			continue
		score = max(score, len(role_tokens & target_tokens))
		target_text = " ".join(target_tokens)
		if target_text and (target_text in role_text or role_text in target_text):
			score = max(score, len(target_tokens) + 1)
	return score


def _normalize_tokens(value: str) -> list[str]:
	clean = re.sub(r"[^a-z0-9]+", " ", value.lower())
	return [token for token in clean.split() if len(token) > 1]


def _build_live_jobs_query(*, onboarding: OnboardingResponse, benchmark: SalaryBenchmark | None) -> str:
	if onboarding.dream_job:
		return onboarding.dream_job
	if benchmark is not None:
		return benchmark.role_title
	goal_queries = {
		"GROW_CURRENT_JOB": onboarding.current_job,
		"SWITCH_JOB": f"{onboarding.current_job} {onboarding.career_type.value}",
		"FIND_JOB_ABROAD": f"{onboarding.current_job} international",
		"MOVE_ABROAD": f"{onboarding.current_job} relocation",
	}
	return goal_queries.get(onboarding.goal.value, onboarding.current_job)


def _build_identity_statement_prompt(onboarding: OnboardingResponse) -> str:
	payload = {
		"current_job": onboarding.current_job,
		"dream_job": onboarding.dream_job,
		"career_type": onboarding.career_type.value,
		"goal": onboarding.goal.value,
		"experience_level": onboarding.experience_level,
		"weekly_time_availability": onboarding.weekly_time_availability,
	}
	return (
		"You write one short, warm, specific career identity statement in Brazilian Portuguese.\n"
		"Rules:\n"
		"1) Return only valid JSON.\n"
		"2) Keep it between 2 and 4 sentences.\n"
		"3) Sound encouraging and practical, not corporate.\n"
		"4) Mention the user's current role, direction, and realistic pace.\n"
		"5) Do not use bullet points.\n"
		"JSON format:\n"
		'{"statement":"string"}\n\n'
		f"ONBOARDING_JSON_START\n{json.dumps(payload, ensure_ascii=True)}\nONBOARDING_JSON_END\n"
	)


def _parse_identity_statement(raw: str, onboarding: OnboardingResponse) -> str:
	try:
		payload = json.loads(raw)
	except json.JSONDecodeError:
		return _fallback_identity_statement(onboarding)

	if isinstance(payload, dict):
		statement = str(payload.get("statement") or "").strip()
		if statement:
			return statement

	return _fallback_identity_statement(onboarding)


def _fallback_identity_statement(onboarding: OnboardingResponse) -> str:
	dream_fragment = f" em direcao a {onboarding.dream_job}" if onboarding.dream_job else " para o seu proximo passo profissional"
	goal_labels = {
		"GROW_CURRENT_JOB": "crescer com mais impacto no trabalho atual",
		"SWITCH_JOB": "migrar com seguranca para uma nova funcao",
		"FIND_JOB_ABROAD": "abrir caminho para oportunidades internacionais",
		"MOVE_ABROAD": "planejar uma transicao de carreira para fora do pais",
	}
	goal_text = goal_labels.get(onboarding.goal.value, "avancar na carreira com clareza")
	return (
		f"Voce ja traz a base de quem atua como {onboarding.current_job}{dream_fragment}. "
		f"Agora sua energia esta em {goal_text}, sem perder o pe no que cabe na sua rotina de {onboarding.weekly_time_availability} horas por semana. "
		"Seu caminho aqui foi pensado para transformar esse objetivo em progresso pratico, etapa por etapa."
	)


def _archive_active_paths_for_kind(*, db: Session, user: User, kind: CareerPathKind) -> None:
	active_paths = list(
		db.scalars(
			select(CareerPath)
			.where(
				CareerPath.user_id == user.id,
				CareerPath.kind == kind,
				CareerPath.status == CareerPathStatus.ACTIVE,
			)
			.order_by(desc(CareerPath.generated_at))
		)
	)
	for active_path in active_paths:
		active_path.status = CareerPathStatus.ARCHIVED


def _standard_path_title(career_type: CareerType) -> str:
	labels = {
		CareerType.TECH: "Soft Skills para Tecnologia",
		CareerType.DESIGN: "Soft Skills para Design",
		CareerType.MARKETING: "Soft Skills para Marketing",
		CareerType.SALES: "Soft Skills para Vendas",
		CareerType.FINANCE: "Soft Skills para Financas",
		CareerType.OPERATIONS: "Soft Skills para Operacoes",
		CareerType.OTHER: "Soft Skills Essenciais de Carreira",
	}
	return labels[career_type]


def _build_standard_soft_skills_steps(*, db: Session, career_path_id: uuid.UUID, career_type: CareerType) -> Sequence[PathStep]:
	career_tag = f"career-type:{career_type.value.lower()}"
	items = [
		item
		for item in db.scalars(select(ContentItem).where(ContentItem.is_active.is_(True)))
		if "soft-skill" in {tag.lower() for tag in item.tags} and career_tag in {tag.lower() for tag in item.tags}
	]

	def _sort_key(item: ContentItem) -> tuple[int, int, str]:
		# Keep video-based anchor content first so the trail starts with the YouTube experience.
		is_video = 0 if item.type.value == "VIDEO" else 1
		has_follow_up = 0 if item.follow_up_content_item_id is not None else 1
		return (is_video, has_follow_up, item.title.lower())

	items = sorted(items, key=_sort_key)

	selected_items = items[:6]
	steps: list[PathStep] = []
	for index, item in enumerate(selected_items):
		steps.append(
			PathStep(
				career_path_id=career_path_id,
				order_index=index,
				title=item.title,
				description=item.description,
				content_reference_id=item.id,
				is_free=True,
				status=PathStepStatus.UNLOCKED if index == 0 else PathStepStatus.LOCKED,
			)
		)

	return steps
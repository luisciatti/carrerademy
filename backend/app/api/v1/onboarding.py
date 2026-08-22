from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.domain.models import User
from app.schemas.onboarding import (
	IdentityStatementResponse,
	OnboardingCreate,
	OnboardingCreateResponse,
	OnboardingContextResponse,
	OnboardingDraftResponse,
	OnboardingExploreResponse,
	PaywallTeaserResponse,
	SalaryBenchmarkTeaserResponse,
	LiveJobsTeaserResponse,
)
from app.services.onboarding_service import (
	create_onboarding_and_generate_path,
	get_latest_onboarding_context,
	get_paywall_teaser,
	get_identity_statement,
	regenerate_identity_statement,
	start_paths_for_onboarding,
	upsert_onboarding_draft,
	_owned_onboarding,
)

router = APIRouter()


@router.post("", response_model=OnboardingCreateResponse)
def create_onboarding(
	payload: OnboardingCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> OnboardingCreateResponse:
	onboarding, standard_path, ai_path = create_onboarding_and_generate_path(db=db, current_user=current_user, payload=payload)
	return OnboardingCreateResponse(
		onboarding_response_id=onboarding.id,
		standard_career_path_id=standard_path.id,
		ai_career_path_id=ai_path.id,
		standard_status=standard_path.status.value,
		ai_status=ai_path.status.value,
		identity_statement=onboarding.identity_statement or "",
		identity_statement_generated_at=onboarding.identity_statement_generated_at,
		message="Onboarding recebido. Sua trilha de soft skills ja esta pronta e a trilha personalizada esta sendo gerada.",
	)


@router.get("/{onboarding_id}/identity-statement", response_model=IdentityStatementResponse)
def read_identity_statement(
	onboarding_id: UUID,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> IdentityStatementResponse:
	onboarding = get_identity_statement(db=db, current_user=current_user, onboarding_id=onboarding_id)
	return IdentityStatementResponse(
		onboarding_response_id=onboarding.id,
		identity_statement=onboarding.identity_statement or "",
		identity_statement_generated_at=onboarding.identity_statement_generated_at,
	)


@router.post("/{onboarding_id}/identity-statement", response_model=IdentityStatementResponse)
def refresh_identity_statement(
	onboarding_id: UUID,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> IdentityStatementResponse:
	onboarding = regenerate_identity_statement(db=db, current_user=current_user, onboarding_id=onboarding_id)
	return IdentityStatementResponse(
		onboarding_response_id=onboarding.id,
		identity_statement=onboarding.identity_statement or "",
		identity_statement_generated_at=onboarding.identity_statement_generated_at,
	)


@router.post("/draft", response_model=OnboardingDraftResponse)
def upsert_onboarding_draft_route(
	payload: OnboardingCreate,
	onboarding_id: UUID | None = None,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> OnboardingDraftResponse:
	onboarding = upsert_onboarding_draft(
		db=db,
		current_user=current_user,
		payload=payload,
		onboarding_id=onboarding_id,
	)
	return OnboardingDraftResponse(
		onboarding_response_id=onboarding.id,
		identity_statement=onboarding.identity_statement or "",
		identity_statement_generated_at=onboarding.identity_statement_generated_at,
	)


@router.post("/{onboarding_id}/explore", response_model=OnboardingExploreResponse)
def explore_from_onboarding(
	onboarding_id: UUID,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> OnboardingExploreResponse:
	onboarding = _owned_onboarding(db=db, current_user=current_user, onboarding_id=onboarding_id)
	standard_path, ai_path = start_paths_for_onboarding(db=db, current_user=current_user, onboarding=onboarding)
	return OnboardingExploreResponse(
		onboarding_response_id=onboarding.id,
		standard_career_path_id=standard_path.id,
		ai_career_path_id=ai_path.id,
		standard_status=standard_path.status.value,
		ai_status=ai_path.status.value,
		message="Suas trilhas foram preparadas. A trilha de soft skills esta pronta e a trilha de IA segue em geracao.",
	)


@router.get("/context/latest", response_model=OnboardingContextResponse)
def latest_onboarding_context(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> OnboardingContextResponse:
	onboarding = get_latest_onboarding_context(db=db, current_user=current_user)
	return OnboardingContextResponse(
		onboarding_response_id=onboarding.id,
		career_type=onboarding.career_type.value,
		goal=onboarding.goal.value,
		current_job=onboarding.current_job,
		dream_job=onboarding.dream_job,
		weekly_time_availability=onboarding.weekly_time_availability,
		identity_statement=onboarding.identity_statement or "",
	)


@router.get("/paywall/teaser", response_model=PaywallTeaserResponse)
def paywall_teaser(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> PaywallTeaserResponse:
	onboarding, benchmark, search_query, search_url = get_paywall_teaser(db=db, current_user=current_user)
	return PaywallTeaserResponse(
		onboarding_context=OnboardingContextResponse(
			onboarding_response_id=onboarding.id,
			career_type=onboarding.career_type.value,
			goal=onboarding.goal.value,
			current_job=onboarding.current_job,
			dream_job=onboarding.dream_job,
			weekly_time_availability=onboarding.weekly_time_availability,
			identity_statement=onboarding.identity_statement or "",
		),
		salary_benchmark=(
			SalaryBenchmarkTeaserResponse(
				role_title=benchmark.role_title,
				region=benchmark.region,
				visible_salary_min=benchmark.salary_min,
				visible_salary_max_hint=_format_brl(benchmark.salary_max),
				masked_salary_range=_masked_salary_range(benchmark.salary_min, benchmark.salary_max),
				source=benchmark.source,
				updated_at=benchmark.updated_at,
			)
			if benchmark is not None
			else None
		),
		live_jobs=LiveJobsTeaserResponse(
			provider="LinkedIn Jobs",
			search_query=search_query,
			search_url=search_url,
		),
	)


def _masked_salary_range(salary_min: int, salary_max: int) -> str:
	visible_min = _format_brl(salary_min)
	masked_max = _mask_brl(salary_max)
	return f"R$ {visible_min} - R$ {masked_max}/ano"


def _format_brl(value: int) -> str:
	return f"{value:,}".replace(",", ".")


def _mask_brl(value: int) -> str:
	formatted = _format_brl(value)
	return "".join("█" if char.isdigit() else char for char in formatted)
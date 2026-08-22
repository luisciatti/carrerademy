from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import CareerType, GoalType


class OnboardingCreate(BaseModel):
	current_job: str = Field(min_length=2, max_length=255)
	dream_job: str | None = Field(default=None, max_length=255)
	career_type: CareerType
	goal: GoalType
	experience_level: str = Field(min_length=2, max_length=100)
	weekly_time_availability: int = Field(ge=1, le=80)


class OnboardingCreateResponse(BaseModel):
	onboarding_response_id: UUID
	standard_career_path_id: UUID
	ai_career_path_id: UUID
	standard_status: str
	ai_status: str
	identity_statement: str
	identity_statement_generated_at: datetime | None
	message: str


class IdentityStatementResponse(BaseModel):
	onboarding_response_id: UUID
	identity_statement: str
	identity_statement_generated_at: datetime | None


class OnboardingDraftResponse(BaseModel):
	onboarding_response_id: UUID
	identity_statement: str
	identity_statement_generated_at: datetime | None


class OnboardingExploreResponse(BaseModel):
	onboarding_response_id: UUID
	standard_career_path_id: UUID
	ai_career_path_id: UUID
	standard_status: str
	ai_status: str
	message: str


class OnboardingContextResponse(BaseModel):
	onboarding_response_id: UUID
	career_type: str
	goal: str
	current_job: str
	dream_job: str | None
	weekly_time_availability: int
	identity_statement: str


class SalaryBenchmarkTeaserResponse(BaseModel):
	role_title: str
	region: str
	visible_salary_min: int
	visible_salary_max_hint: str
	masked_salary_range: str
	source: str
	updated_at: date


class LiveJobsTeaserResponse(BaseModel):
	provider: str
	search_query: str
	search_url: str


class PaywallTeaserResponse(BaseModel):
	onboarding_context: OnboardingContextResponse
	salary_benchmark: SalaryBenchmarkTeaserResponse | None
	live_jobs: LiveJobsTeaserResponse


class ContentStageView(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: UUID
	title: str
	description: str
	content_type: str
	external_url: str | None
	video_url: str | None
	quiz_schema: dict | None
	diagram_url: str | None
	form_schema: dict | None
	scenario_schema: dict | None
	rules_schema: dict | None
	matching_schema: dict | None
	dialogue_schema: dict | None
	follow_up_content_item_id: UUID | None
	reward_description: str | None


class PublicPathStep(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: UUID
	order_index: int
	title: str
	description: str
	status: str
	is_free: bool
	is_description_locked: bool
	content_item_id: UUID | None
	current_content_item_id: UUID | None
	chain_total_stages: int
	content_type: str | None
	external_url: str | None
	video_url: str | None
	quiz_schema: dict | None
	diagram_url: str | None
	form_schema: dict | None
	scenario_schema: dict | None
	rules_schema: dict | None
	matching_schema: dict | None
	dialogue_schema: dict | None
	follow_up_content_item_id: UUID | None
	chain_items: list[ContentStageView]
	reward_description: str | None


class CareerPathView(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: UUID
	title: str
	kind: str
	status: str
	generation_status: str
	steps: list[PublicPathStep]
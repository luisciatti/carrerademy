from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import GoalType


class OnboardingCreate(BaseModel):
	current_job: str = Field(min_length=2, max_length=255)
	dream_job: str | None = Field(default=None, max_length=255)
	goal: GoalType
	experience_level: str = Field(min_length=2, max_length=100)
	weekly_time_availability: int = Field(ge=1, le=80)


class OnboardingCreateResponse(BaseModel):
	career_path_id: UUID
	status: str
	message: str


class PublicPathStep(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: UUID
	order_index: int
	title: str
	description: str
	status: str
	is_free: bool
	is_description_locked: bool


class CareerPathView(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: UUID
	title: str
	status: str
	generation_status: str
	steps: list[PublicPathStep]
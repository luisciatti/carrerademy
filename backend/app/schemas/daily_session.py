from pydantic import BaseModel


class DailyObjectiveOut(BaseModel):
    id: str
    objective_type: str
    title: str
    description: str
    content_type: str | None
    estimated_minutes: int
    reference_id: str | None
    step_id: str | None
    is_locked: bool
    is_completed_today: bool


class DailySessionResponse(BaseModel):
    today: str
    current_streak: int
    longest_streak: int
    objectives: list[DailyObjectiveOut]


class CompleteObjectiveRequest(BaseModel):
    objective_id: str


class CompleteObjectiveResponse(BaseModel):
    current_streak: int
    longest_streak: int

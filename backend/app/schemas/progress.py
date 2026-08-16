from pydantic import BaseModel


class CompleteStepResponse(BaseModel):
    completed_step_id: str
    completed: bool
    next_step_id: str | None
    next_step_unlocked: bool
    next_step_blocked_by_paywall: bool
    user_free_step_used: bool
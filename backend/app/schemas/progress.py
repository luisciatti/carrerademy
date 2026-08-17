from pydantic import Field

from pydantic import BaseModel


class CompleteStepRequest(BaseModel):
    content_item_id: str | None = Field(default=None)


class CompleteStepResponse(BaseModel):
    completed_step_id: str
    completed: bool
    next_step_id: str | None
    next_step_unlocked: bool
    next_step_blocked_by_paywall: bool
    user_free_step_used: bool
    current_content_item_id: str | None = None
    next_content_item_id: str | None = None
    chain_position: int | None = None
    chain_total: int | None = None
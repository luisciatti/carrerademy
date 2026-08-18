from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TrailTemplateView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str
    category: str
    career_type_tags: list[str]
    icon: str
    is_starter: bool
    already_added: bool


class AddedTrailTemplateResponse(BaseModel):
    career_path_id: UUID
    title: str
    kind: str
    status: str

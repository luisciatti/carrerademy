from types import SimpleNamespace
from uuid import uuid4

from app.domain.enums import CareerPathKind, CareerPathStatus, CareerType, ContentItemType, PathStepStatus
from app.domain.models import CareerPath, ContentItem, PathStep, User
from app.services.onboarding_service import _build_standard_soft_skills_steps


class FakeScalarResult:
    def __init__(self, values):
        self._values = values

    def __iter__(self):
        return iter(self._values)


class FakeDB:
    def __init__(self, items):
        self._items = items

    def scalars(self, _query):
        return FakeScalarResult(self._items)


def _make_item(title: str, tags: list[str], item_type: ContentItemType = ContentItemType.ARTICLE) -> ContentItem:
    return ContentItem(
        id=uuid4(),
        type=item_type,
        title=title,
        description=f"Descricao de {title}",
        external_url=None,
        video_url=None,
        quiz_schema=None,
        diagram_url=None,
        form_schema=None,
        scenario_schema=None,
        rules_schema=None,
        tags=tags,
        is_active=True,
    )


def test_standard_soft_skills_steps_are_all_free_and_unlockable():
    items = [
        _make_item("Tech item 1", ["soft-skill", "career-type:tech"]),
        _make_item("Tech item 2", ["soft-skill", "career-type:tech"], ContentItemType.VIDEO),
        _make_item("Tech item 3", ["soft-skill", "career-type:tech"], ContentItemType.QUIZ),
        _make_item("Tech item 4", ["soft-skill", "career-type:tech"], ContentItemType.SCENARIO_BUILDER),
        _make_item("Tech item 5", ["soft-skill", "career-type:tech"], ContentItemType.RULES_RADIAL),
        _make_item("Tech item 6", ["soft-skill", "career-type:tech"], ContentItemType.INTERACTIVE_FORM),
    ]
    db = FakeDB(items)

    steps = list(_build_standard_soft_skills_steps(db=db, career_path_id=uuid4(), career_type=CareerType.TECH))

    assert len(steps) == 6
    assert all(step.is_free is True for step in steps)
    assert steps[0].status == PathStepStatus.UNLOCKED
    assert all(step.status in {PathStepStatus.UNLOCKED, PathStepStatus.LOCKED} for step in steps[1:])


def test_standard_soft_skills_serialization_never_hides_content():
    user = User(id=uuid4(), clerk_user_id="clerk_123", email="user@example.com", name="User", password_hash=None)
    content_item = _make_item("Tech item 1", ["soft-skill", "career-type:tech"])
    path = CareerPath(
        id=uuid4(),
        user_id=user.id,
        onboarding_response_id=uuid4(),
        title="Soft Skills para Tecnologia",
        kind=CareerPathKind.STANDARD_SOFT_SKILLS,
        status=CareerPathStatus.ACTIVE,
    )
    steps = [
        PathStep(id=uuid4(), career_path_id=path.id, order_index=0, title="Etapa 1", description="Descricao completa 1", content_reference_id=content_item.id, is_free=True, status=PathStepStatus.UNLOCKED, content_item=content_item),
        PathStep(id=uuid4(), career_path_id=path.id, order_index=1, title="Etapa 2", description="Descricao completa 2", content_reference_id=content_item.id, is_free=True, status=PathStepStatus.LOCKED, content_item=content_item),
    ]
    path.steps = steps

    from app.api.v1.career_paths import _serialize_career_path

    class FakeSession:
        def scalar(self, *_args, **_kwargs):
            return None

        def scalars(self, *_args, **_kwargs):
            return []

    serialized = _serialize_career_path(db=FakeSession(), user=user, career_path=path)

    assert all(step.is_description_locked is False for step in serialized.steps)
    assert serialized.steps[1].description == "Descricao completa 2"

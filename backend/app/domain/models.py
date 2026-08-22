import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CareerPathKind, CareerPathStatus, CareerType, ContentItemType, DailyObjectiveType, GoalType, PathStepStatus, PaymentProvider, PaymentStatus, SubscriptionPlan, SubscriptionStatus
from app.infra.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    free_step_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    onboarding_responses: Mapped[list["OnboardingResponse"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    career_paths: Mapped[list["CareerPath"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress_logs: Mapped[list["UserProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    ai_generation_logs: Mapped[list["AIGenerationLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    daily_activity_logs: Mapped[list["DailyActivityLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notes: Mapped[list["Note"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class OnboardingResponse(Base):
    __tablename__ = "onboarding_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    current_job: Mapped[str] = mapped_column(String(255), nullable=False)
    dream_job: Mapped[str | None] = mapped_column(String(255), nullable=True)
    career_type: Mapped[CareerType] = mapped_column(SQLEnum(CareerType, name="career_type"), nullable=False)
    goal: Mapped[GoalType] = mapped_column(SQLEnum(GoalType, name="goal_type"), nullable=False)
    experience_level: Mapped[str] = mapped_column(String(100), nullable=False)
    weekly_time_availability: Mapped[int] = mapped_column(Integer, nullable=False)
    identity_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    identity_statement_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="onboarding_responses")
    career_paths: Mapped[list["CareerPath"]] = relationship(back_populates="onboarding_response", cascade="all, delete-orphan")


class SalaryBenchmark(Base):
    __tablename__ = "salary_benchmarks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_title: Mapped[str] = mapped_column(String(255), nullable=False)
    career_type: Mapped[CareerType] = mapped_column(SQLEnum(CareerType, name="career_type"), nullable=False, index=True)
    region: Mapped[str] = mapped_column(String(100), nullable=False, default="Brasil")
    salary_min: Mapped[int] = mapped_column(Integer, nullable=False)
    salary_max: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[date] = mapped_column(Date, nullable=False)


class CareerPath(Base):
    __tablename__ = "career_paths"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    onboarding_response_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_responses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[CareerPathKind] = mapped_column(SQLEnum(CareerPathKind, name="career_path_kind"), nullable=False)
    source_trail_template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trail_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: Mapped[CareerPathStatus] = mapped_column(
        SQLEnum(CareerPathStatus, name="career_path_status"),
        default=CareerPathStatus.ACTIVE,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="career_paths")
    onboarding_response: Mapped[OnboardingResponse] = relationship(back_populates="career_paths")
    source_trail_template: Mapped["TrailTemplate | None"] = relationship(back_populates="career_paths")
    steps: Mapped[list["PathStep"]] = relationship(
        back_populates="career_path",
        cascade="all, delete-orphan",
        order_by="PathStep.order_index",
    )
    ai_generation_logs: Mapped[list["AIGenerationLog"]] = relationship(back_populates="career_path", cascade="all, delete-orphan")


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[ContentItemType] = mapped_column(SQLEnum(ContentItemType, name="content_item_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    external_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    quiz_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    diagram_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    form_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    scenario_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    rules_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matching_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    dialogue_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    follow_up_content_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True)
    reward_description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    path_steps: Mapped[list["PathStep"]] = relationship(back_populates="content_item")
    follow_up_content_item: Mapped["ContentItem | None"] = relationship(remote_side="ContentItem.id", foreign_keys=[follow_up_content_item_id])


class PathStep(Base):
    __tablename__ = "path_steps"
    __table_args__ = (UniqueConstraint("career_path_id", "order_index", name="uq_path_steps_career_path_order_index"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    career_path_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    content_reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[PathStepStatus] = mapped_column(
        SQLEnum(PathStepStatus, name="path_step_status"),
        default=PathStepStatus.LOCKED,
        nullable=False,
    )

    career_path: Mapped[CareerPath] = relationship(back_populates="steps")
    content_item: Mapped[ContentItem | None] = relationship(back_populates="path_steps")
    progress_logs: Mapped[list["UserProgress"]] = relationship(back_populates="path_step", cascade="all, delete-orphan")


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = (UniqueConstraint("user_id", "path_step_id", name="uq_user_progress_user_step"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    path_step_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("path_steps.id", ondelete="CASCADE"), nullable=False, index=True)
    current_content_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="progress_logs")
    path_step: Mapped[PathStep] = relationship(back_populates="progress_logs")
    current_content_item: Mapped["ContentItem | None"] = relationship(foreign_keys=[current_content_item_id])


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan: Mapped[SubscriptionPlan] = mapped_column(SQLEnum(SubscriptionPlan, name="subscription_plan"), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(SQLEnum(SubscriptionStatus, name="subscription_status"), nullable=False)
    provider: Mapped[PaymentProvider] = mapped_column(SQLEnum(PaymentProvider, name="payment_provider"), nullable=False)
    provider_subscription_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="subscriptions")
    payments: Mapped[list["Payment"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SQLEnum(PaymentStatus, name="payment_status"), nullable=False)
    provider_payment_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    subscription: Mapped[Subscription] = relationship(back_populates="payments")


class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    career_path_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_estimate: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="ai_generation_logs")
    career_path: Mapped[CareerPath] = relationship(back_populates="ai_generation_logs")


class DailyActivityLog(Base):
    __tablename__ = "daily_activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    objective_type: Mapped[DailyObjectiveType] = mapped_column(SQLEnum(DailyObjectiveType, name="daily_objective_type"), nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="daily_activity_logs")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    path_step_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("path_steps.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="notes")
    path_step: Mapped["PathStep | None"] = relationship()


class TrailTemplate(Base):
    __tablename__ = "trail_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    career_type_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    icon: Mapped[str] = mapped_column(String(80), nullable=False)
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    steps: Mapped[list["TrailTemplateStep"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TrailTemplateStep.order_index",
    )
    career_paths: Mapped[list[CareerPath]] = relationship(back_populates="source_trail_template")


class TrailTemplateStep(Base):
    __tablename__ = "trail_template_steps"
    __table_args__ = (UniqueConstraint("trail_template_id", "order_index", name="uq_template_step_order"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trail_template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trail_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    template: Mapped[TrailTemplate] = relationship(back_populates="steps")
    content_item: Mapped[ContentItem] = relationship()
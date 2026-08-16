import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CareerPathStatus, ContentItemType, GoalType, PathStepStatus, PaymentProvider, PaymentStatus, SubscriptionPlan, SubscriptionStatus
from app.infra.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    free_step_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    onboarding_responses: Mapped[list["OnboardingResponse"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    career_paths: Mapped[list["CareerPath"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress_logs: Mapped[list["UserProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    ai_generation_logs: Mapped[list["AIGenerationLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class OnboardingResponse(Base):
    __tablename__ = "onboarding_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    current_job: Mapped[str] = mapped_column(String(255), nullable=False)
    dream_job: Mapped[str | None] = mapped_column(String(255), nullable=True)
    goal: Mapped[GoalType] = mapped_column(SQLEnum(GoalType, name="goal_type"), nullable=False)
    experience_level: Mapped[str] = mapped_column(String(100), nullable=False)
    weekly_time_availability: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="onboarding_responses")
    career_path: Mapped["CareerPath | None"] = relationship(back_populates="onboarding_response")


class CareerPath(Base):
    __tablename__ = "career_paths"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    onboarding_response_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_responses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: Mapped[CareerPathStatus] = mapped_column(
        SQLEnum(CareerPathStatus, name="career_path_status"),
        default=CareerPathStatus.ACTIVE,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="career_paths")
    onboarding_response: Mapped[OnboardingResponse] = relationship(back_populates="career_path")
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
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    path_steps: Mapped[list["PathStep"]] = relationship(back_populates="content_item")


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
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="progress_logs")
    path_step: Mapped[PathStep] = relationship(back_populates="progress_logs")


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
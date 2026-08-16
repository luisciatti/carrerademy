import enum


class GoalType(str, enum.Enum):
    GROW_CURRENT_JOB = "GROW_CURRENT_JOB"
    SWITCH_JOB = "SWITCH_JOB"
    FIND_JOB_ABROAD = "FIND_JOB_ABROAD"
    MOVE_ABROAD = "MOVE_ABROAD"


class CareerPathStatus(str, enum.Enum):
    GENERATING = "GENERATING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class PathStepStatus(str, enum.Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    COMPLETED = "COMPLETED"


class ContentItemType(str, enum.Enum):
    COURSE = "COURSE"
    CERTIFICATION = "CERTIFICATION"
    ARTICLE = "ARTICLE"
    ACTION_TASK = "ACTION_TASK"


class SubscriptionPlan(str, enum.Enum):
    FREE = "FREE"
    PREMIUM = "PREMIUM"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    PAST_DUE = "PAST_DUE"


class PaymentProvider(str, enum.Enum):
    STRIPE = "STRIPE"
    MERCADO_PAGO = "MERCADO_PAGO"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"
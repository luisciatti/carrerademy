import enum


class GoalType(str, enum.Enum):
    GROW_CURRENT_JOB = "GROW_CURRENT_JOB"
    SWITCH_JOB = "SWITCH_JOB"
    FIND_JOB_ABROAD = "FIND_JOB_ABROAD"
    MOVE_ABROAD = "MOVE_ABROAD"


class CareerType(str, enum.Enum):
    TECH = "TECH"
    DESIGN = "DESIGN"
    MARKETING = "MARKETING"
    SALES = "SALES"
    FINANCE = "FINANCE"
    OPERATIONS = "OPERATIONS"
    OTHER = "OTHER"


class CareerPathKind(str, enum.Enum):
    STANDARD_SOFT_SKILLS = "STANDARD_SOFT_SKILLS"
    AI_PERSONALIZED = "AI_PERSONALIZED"


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
    VIDEO = "VIDEO"
    QUIZ = "QUIZ"
    DIAGRAM = "DIAGRAM"
    INTERACTIVE_FORM = "INTERACTIVE_FORM"
    SCENARIO_BUILDER = "SCENARIO_BUILDER"
    RULES_RADIAL = "RULES_RADIAL"
    MATCHING_GAME = "MATCHING_GAME"
    DIALOGUE_SIMULATOR = "DIALOGUE_SIMULATOR"


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
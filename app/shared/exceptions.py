class DomainError(Exception):
    """Base exception for domain-related application errors."""


class FreeStepAlreadyUsedError(DomainError):
    """Raised when a user tries to consume a second free step."""
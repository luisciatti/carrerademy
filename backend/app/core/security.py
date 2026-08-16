from typing import Any

from app.infra.auth.clerk import get_clerk_verifier


def get_password_hash(password: str) -> str:
    raise NotImplementedError("Password hashing is not used when Clerk is the auth provider.")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    raise NotImplementedError("Password verification is not used when Clerk is the auth provider.")


def verify_token(token: str) -> dict[str, Any]:
    return get_clerk_verifier().verify_token(token)
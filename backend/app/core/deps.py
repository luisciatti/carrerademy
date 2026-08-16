from collections.abc import Generator
from typing import Any

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import User
from app.infra.auth.clerk import get_clerk_verifier
from app.infra.db.session import SessionLocal
from app.shared.rate_limit import enforce_rate_limit


_auth_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _unauthorized(detail: str = "Invalid or missing authentication token.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise _unauthorized("Missing Authorization header.")

    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("Invalid Authorization header format.")

    return token


def _get_display_name(claims: dict[str, Any]) -> str:
    full_name = str(claims.get("name") or "").strip()
    if full_name:
        return full_name

    given_name = str(claims.get("given_name") or "").strip()
    family_name = str(claims.get("family_name") or "").strip()
    candidate = f"{given_name} {family_name}".strip()
    if candidate:
        return candidate

    return "Clerk User"


def _sync_user_from_claims(db: Session, claims: dict[str, Any]) -> User:
    clerk_user_id = str(claims.get("sub") or "").strip()
    if not clerk_user_id:
        raise _unauthorized("Token missing subject claim.")

    user = db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
    if user:
        return user

    email = str(claims.get("email") or "").strip()
    if not email:
        email = f"{clerk_user_id}@clerk.local"

    existing_email_user = db.scalar(select(User).where(User.email == email))
    if existing_email_user:
        existing_email_user.clerk_user_id = clerk_user_id
        existing_email_user.name = _get_display_name(claims)
        db.add(existing_email_user)
        db.commit()
        db.refresh(existing_email_user)
        return existing_email_user

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        name=_get_display_name(claims),
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def resolve_current_user_from_token(db: Session, token: str) -> User:
    try:
        claims = get_clerk_verifier().verify_token(token)
    except ValueError as exc:
        raise _unauthorized(str(exc)) from exc

    return _sync_user_from_claims(db, claims)


def authenticate_request(request: Request, db: Session) -> User:
    user = getattr(request.state, "current_user", None)
    if user is not None:
        return user

    token = _extract_bearer_token(request)
    user = resolve_current_user_from_token(db, token)
    request.state.current_user = user
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(_auth_scheme),
) -> User:
    existing_user = getattr(request.state, "current_user", None)
    if existing_user is not None:
        return existing_user

    if credentials is None or not credentials.credentials:
        raise _unauthorized("Missing bearer token.")

    user = resolve_current_user_from_token(db, credentials.credentials)
    request.state.current_user = user
    return user


def rate_limit_me(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"me:{client_ip}"
    enforce_rate_limit(key=key, max_requests=60, window_seconds=60)
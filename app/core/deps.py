from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.infra.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication is not part of this setup phase.",
    )
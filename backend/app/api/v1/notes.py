from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, get_db
from app.domain.models import Note, PathStep, User

router = APIRouter(prefix="/notes", tags=["notes"])


def _note_to_dict(note: Note) -> dict:
    step_title: str | None = None
    if note.path_step:
        step_title = note.path_step.title

    # Derive display title: explicit title → first non-empty line of content → None
    display_title = note.title
    if not display_title and note.content:
        first_line = note.content.strip().splitlines()[0].lstrip("#").strip()
        display_title = first_line or None

    return {
        "id": str(note.id),
        "path_step_id": str(note.path_step_id) if note.path_step_id else None,
        "step_title": step_title,
        "title": display_title,
        "content": note.content,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


@router.get("")
def list_notes(
    q: str | None = Query(default=None, max_length=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = select(Note).options(selectinload(Note.path_step)).where(Note.user_id == current_user.id)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(
                Note.title.ilike(pattern),
                Note.content.ilike(pattern),
            )
        )
    query = query.order_by(Note.updated_at.desc())
    notes = list(db.scalars(query))
    # Eager-load path_step titles without a join by lazy-loading (acceptable for list sizes in MVP)
    return [_note_to_dict(n) for n in notes]


@router.get("/by-step/{path_step_id}")
def get_note_by_step(
    path_step_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict | None:
    note = db.scalar(
        select(Note).where(
            Note.user_id == current_user.id,
            Note.path_step_id == path_step_id,
        )
    )
    if note is None:
        return None
    return _note_to_dict(note)


@router.put("/by-step/{path_step_id}")
def upsert_note_by_step(
    path_step_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Verify the step belongs to this user's path
    step = db.scalar(
        select(PathStep)
        .join(PathStep.career_path)
        .where(
            PathStep.id == path_step_id,
            PathStep.career_path.has(user_id=current_user.id),
        )
    )
    if step is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found.")

    note = db.scalar(
        select(Note).where(
            Note.user_id == current_user.id,
            Note.path_step_id == path_step_id,
        )
    )

    content: str = str(body.get("content", ""))
    title: str | None = body.get("title") or None

    if note is None:
        note = Note(
            user_id=current_user.id,
            path_step_id=path_step_id,
            content=content,
            title=title,
        )
        db.add(note)
    else:
        note.content = content
        note.title = title
        note.updated_at = func.now()

    db.commit()
    db.refresh(note)
    return _note_to_dict(note)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_loose_note(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    content: str = str(body.get("content", ""))
    title: str | None = body.get("title") or None
    note = Note(user_id=current_user.id, content=content, title=title)
    db.add(note)
    db.commit()
    db.refresh(note)
    return _note_to_dict(note)


@router.patch("/{note_id}")
def update_note(
    note_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    note = db.scalar(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    if "content" in body:
        note.content = str(body["content"])
    if "title" in body:
        note.title = body["title"] or None
    note.updated_at = func.now()

    db.commit()
    db.refresh(note)
    return _note_to_dict(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    note = db.scalar(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    db.delete(note)
    db.commit()

"""add notes table

Revision ID: e2f3a4b5c6d7
Revises: c3d4e5f6g7h8
Create Date: 2026-08-17 22:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6g7h8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("path_step_id", UUID(as_uuid=True), sa.ForeignKey("path_steps.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notes_user_id", "notes", ["user_id"])
    op.create_index("ix_notes_path_step_id", "notes", ["path_step_id"])
    # One note per (user, step); NULL step_ids are excluded so loose notes have no limit.
    op.execute(
        "CREATE UNIQUE INDEX uq_note_user_step ON notes (user_id, path_step_id) WHERE path_step_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index("uq_note_user_step", table_name="notes")
    op.drop_index("ix_notes_path_step_id", table_name="notes")
    op.drop_index("ix_notes_user_id", table_name="notes")
    op.drop_table("notes")

"""add chained content and new minigames

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
Create Date: 2026-08-16 13:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'MATCHING_GAME'")
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'DIALOGUE_SIMULATOR'")

    op.add_column("content_items", sa.Column("matching_schema", sa.JSON(), nullable=True))
    op.add_column("content_items", sa.Column("dialogue_schema", sa.JSON(), nullable=True))
    op.add_column("content_items", sa.Column("follow_up_content_item_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_content_items_follow_up_content_item_id",
        "content_items",
        "content_items",
        ["follow_up_content_item_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("user_progress", sa.Column("current_content_item_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_user_progress_current_content_item_id",
        "user_progress",
        "content_items",
        ["current_content_item_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("user_progress", "completed_at", existing_type=sa.DateTime(timezone=True), nullable=True)


def downgrade() -> None:
    op.alter_column("user_progress", "completed_at", existing_type=sa.DateTime(timezone=True), nullable=False)
    op.drop_constraint("fk_user_progress_current_content_item_id", "user_progress", type_="foreignkey")
    op.drop_column("user_progress", "current_content_item_id")

    op.drop_constraint("fk_content_items_follow_up_content_item_id", "content_items", type_="foreignkey")
    op.drop_column("content_items", "follow_up_content_item_id")
    op.drop_column("content_items", "dialogue_schema")
    op.drop_column("content_items", "matching_schema")

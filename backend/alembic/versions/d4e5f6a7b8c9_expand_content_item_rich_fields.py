"""expand_content_item_rich_fields

Revision ID: d4e5f6a7b8c9
Revises: b9c2e1a9b0f4
Create Date: 2026-08-16 22:40:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "b9c2e1a9b0f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'VIDEO'")
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'QUIZ'")
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'DIAGRAM'")
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'INTERACTIVE_FORM'")

    op.add_column("content_items", sa.Column("video_url", sa.String(length=2048), nullable=True))
    op.add_column("content_items", sa.Column("quiz_schema", sa.JSON(), nullable=True))
    op.add_column("content_items", sa.Column("diagram_url", sa.String(length=2048), nullable=True))
    op.add_column("content_items", sa.Column("form_schema", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("content_items", "form_schema")
    op.drop_column("content_items", "diagram_url")
    op.drop_column("content_items", "quiz_schema")
    op.drop_column("content_items", "video_url")

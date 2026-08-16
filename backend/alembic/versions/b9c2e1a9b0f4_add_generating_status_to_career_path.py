"""add_generating_status_to_career_path

Revision ID: b9c2e1a9b0f4
Revises: 82208cb819c4
Create Date: 2026-08-16 21:30:00.000000

"""
from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b9c2e1a9b0f4"
down_revision: str | None = "82208cb819c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE career_path_status ADD VALUE IF NOT EXISTS 'GENERATING'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values in-place safely.
    pass

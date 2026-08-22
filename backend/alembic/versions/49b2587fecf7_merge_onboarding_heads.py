"""merge onboarding heads

Revision ID: 49b2587fecf7
Revises: 8587e973af76, a7b8c9d0e1f2
Create Date: 2026-08-20 00:00:00.000000
"""

from collections.abc import Sequence


# revision identifiers, used by Alembic.
revision: str = "49b2587fecf7"
down_revision: str | Sequence[str] | None = ("8587e973af76", "a7b8c9d0e1f2")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

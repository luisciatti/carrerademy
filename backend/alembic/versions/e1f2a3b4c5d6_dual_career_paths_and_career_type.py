"""dual_career_paths_and_career_type

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b8c9
Create Date: 2026-08-17 00:20:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE TYPE career_type AS ENUM ('TECH', 'DESIGN', 'MARKETING', 'SALES', 'FINANCE', 'OPERATIONS', 'OTHER')")
    op.execute("CREATE TYPE career_path_kind AS ENUM ('STANDARD_SOFT_SKILLS', 'AI_PERSONALIZED')")

    op.add_column("onboarding_responses", sa.Column("career_type", sa.Enum('TECH', 'DESIGN', 'MARKETING', 'SALES', 'FINANCE', 'OPERATIONS', 'OTHER', name='career_type'), nullable=True))
    op.execute("UPDATE onboarding_responses SET career_type = 'OTHER'")
    op.alter_column("onboarding_responses", "career_type", nullable=False)

    op.add_column("career_paths", sa.Column("kind", sa.Enum('STANDARD_SOFT_SKILLS', 'AI_PERSONALIZED', name='career_path_kind'), nullable=True))
    op.execute("UPDATE career_paths SET kind = 'AI_PERSONALIZED'")
    op.alter_column("career_paths", "kind", nullable=False)

    op.drop_index("ix_career_paths_onboarding_response_id", table_name="career_paths")
    op.create_index("ix_career_paths_onboarding_response_id", "career_paths", ["onboarding_response_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_career_paths_onboarding_response_id", table_name="career_paths")
    op.create_index("ix_career_paths_onboarding_response_id", "career_paths", ["onboarding_response_id"], unique=True)
    op.drop_column("career_paths", "kind")
    op.drop_column("onboarding_responses", "career_type")
    op.execute("DROP TYPE career_path_kind")
    op.execute("DROP TYPE career_type")

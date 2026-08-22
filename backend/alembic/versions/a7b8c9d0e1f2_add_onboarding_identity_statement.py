"""add onboarding identity statement

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-08-19 19:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a7b8c9d0e1f2"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("onboarding_responses", sa.Column("identity_statement", sa.Text(), nullable=True))
    op.add_column("onboarding_responses", sa.Column("identity_statement_generated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("onboarding_responses", "identity_statement_generated_at")
    op.drop_column("onboarding_responses", "identity_statement")
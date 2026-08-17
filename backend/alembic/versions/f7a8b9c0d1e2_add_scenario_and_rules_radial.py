"""add_scenario_and_rules_radial

Revision ID: f7a8b9c0d1e2
Revises: e1f2a3b4c5d6
Create Date: 2026-08-17 01:15:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'SCENARIO_BUILDER'")
    op.execute("ALTER TYPE content_item_type ADD VALUE IF NOT EXISTS 'RULES_RADIAL'")
    op.add_column("content_items", sa.Column("scenario_schema", sa.JSON(), nullable=True))
    op.add_column("content_items", sa.Column("rules_schema", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("content_items", "rules_schema")
    op.drop_column("content_items", "scenario_schema")

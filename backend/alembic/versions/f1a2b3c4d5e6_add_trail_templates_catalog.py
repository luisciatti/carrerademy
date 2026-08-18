"""add trail templates catalog

Revision ID: f1a2b3c4d5e6
Revises: e2f3a4b5c6d7
Create Date: 2026-08-18 18:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trail_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("career_type_tags", ARRAY(sa.String()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("icon", sa.String(80), nullable=False),
        sa.Column("is_starter", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "trail_template_steps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("trail_template_id", UUID(as_uuid=True), sa.ForeignKey("trail_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("content_item_id", UUID(as_uuid=True), sa.ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("trail_template_id", "order_index", name="uq_template_step_order"),
    )
    op.create_index("ix_trail_template_steps_trail_template_id", "trail_template_steps", ["trail_template_id"])
    op.create_index("ix_trail_template_steps_content_item_id", "trail_template_steps", ["content_item_id"])

    op.add_column("career_paths", sa.Column("source_trail_template_id", UUID(as_uuid=True), nullable=True))
    op.create_index("ix_career_paths_source_trail_template_id", "career_paths", ["source_trail_template_id"])
    op.create_foreign_key(
        "fk_career_paths_source_trail_template_id",
        "career_paths",
        "trail_templates",
        ["source_trail_template_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_career_paths_source_trail_template_id", "career_paths", type_="foreignkey")
    op.drop_index("ix_career_paths_source_trail_template_id", table_name="career_paths")
    op.drop_column("career_paths", "source_trail_template_id")

    op.drop_index("ix_trail_template_steps_content_item_id", table_name="trail_template_steps")
    op.drop_index("ix_trail_template_steps_trail_template_id", table_name="trail_template_steps")
    op.drop_table("trail_template_steps")
    op.drop_table("trail_templates")

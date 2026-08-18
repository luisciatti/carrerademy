"""daily session streak and profile

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-17 09:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b2c3d4e5f6g7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Add streak columns only if absent
    cols_result = bind.execute(sa.text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
        " AND column_name IN ('current_streak','longest_streak','last_activity_date')"
    )).fetchall()
    existing_cols = {r[0] for r in cols_result}
    if "current_streak" not in existing_cols:
        op.add_column("users", sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"))
    if "longest_streak" not in existing_cols:
        op.add_column("users", sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"))
    if "last_activity_date" not in existing_cols:
        op.add_column("users", sa.Column("last_activity_date", sa.Date(), nullable=True))

    # Create enum only if not present
    type_exists = bind.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'daily_objective_type'"
    )).fetchone()
    if not type_exists:
        bind.execute(sa.text("CREATE TYPE daily_objective_type AS ENUM ('PATH_STEP', 'REVIEW', 'BONUS')"))

    # Create table only if not present — use ENUM reference without values so SA doesn't try to (re)create the type.
    table_exists = bind.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name='daily_activity_logs'"
    )).fetchone()
    if not table_exists:
        enum_ref = postgresql.ENUM(name="daily_objective_type", create_type=False)
        op.create_table(
            "daily_activity_logs",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("activity_date", sa.Date(), nullable=False),
            sa.Column("objective_type", enum_ref, nullable=False),
            sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("daily_activity_logs")
    op.execute("DROP TYPE IF EXISTS daily_objective_type")
    op.drop_column("users", "last_activity_date")
    op.drop_column("users", "longest_streak")
    op.drop_column("users", "current_streak")

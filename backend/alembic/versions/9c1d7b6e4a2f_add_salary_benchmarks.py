"""add salary benchmarks

Revision ID: 9c1d7b6e4a2f
Revises: 49b2587fecf7
Create Date: 2026-08-20 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9c1d7b6e4a2f"
down_revision: str | Sequence[str] | None = "49b2587fecf7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.create_table(
		"salary_benchmarks",
		sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
		sa.Column("role_title", sa.String(length=255), nullable=False),
		sa.Column("career_type", postgresql.ENUM("TECH", "DESIGN", "MARKETING", "SALES", "FINANCE", "OPERATIONS", "OTHER", name="career_type", create_type=False), nullable=False),
		sa.Column("region", sa.String(length=100), nullable=False),
		sa.Column("salary_min", sa.Integer(), nullable=False),
		sa.Column("salary_max", sa.Integer(), nullable=False),
		sa.Column("source", sa.String(length=255), nullable=False),
		sa.Column("updated_at", sa.Date(), nullable=False),
		sa.PrimaryKeyConstraint("id"),
	)
	op.create_index(op.f("ix_salary_benchmarks_career_type"), "salary_benchmarks", ["career_type"], unique=False)

	op.execute(
		"""
		INSERT INTO salary_benchmarks (id, role_title, career_type, region, salary_min, salary_max, source, updated_at)
		VALUES
		    ('3db26f44-6d17-4a58-8fae-6bd35a88de91', 'Cloud Engineer', 'TECH', 'Brasil', 24000, 63000, 'Talent.com', DATE '2026-08-20'),
		    ('95cc8f82-64b4-4d5d-af98-54f197598fe6', 'Analista de Marketing', 'MARKETING', 'Brasil', 19800, 32400, 'Talent.com', DATE '2026-08-20')
		"""
	)


def downgrade() -> None:
	op.drop_index(op.f("ix_salary_benchmarks_career_type"), table_name="salary_benchmarks")
	op.drop_table("salary_benchmarks")

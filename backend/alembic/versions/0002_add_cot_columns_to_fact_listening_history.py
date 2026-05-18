"""add COT timezone columns to fact_listening_history

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-18

Adds hour_of_day_cot and day_of_week_cot columns to dwh.fact_listening_history.
Original UTC columns (hour_of_day, day_of_week) are preserved unchanged.
Colombia is COT = UTC-5 (no DST). New columns backfill existing rows
by subtracting 5 hours from the stored UTC played_at.
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new COT columns — nullable to allow backfill after addition
    op.add_column(
        "fact_listening_history",
        sa.Column("hour_of_day_cot", sa.Integer(), nullable=True),
        schema="dwh",
    )
    op.add_column(
        "fact_listening_history",
        sa.Column("day_of_week_cot", sa.String(length=10), nullable=True),
        schema="dwh",
    )

    # Backfill existing rows: subtract 5 hours (COT = UTC-5) from played_at
    # to_char with day name uses English locale via 'TMDay' template
    op.execute("""
        UPDATE dwh.fact_listening_history
        SET
            hour_of_day_cot = EXTRACT(HOUR FROM (played_at - INTERVAL '5 hours'))::INTEGER,
            day_of_week_cot = LOWER(TO_CHAR(played_at - INTERVAL '5 hours', 'TMDay'))
        WHERE hour_of_day_cot IS NULL
    """)


def downgrade() -> None:
    op.drop_column("fact_listening_history", "day_of_week_cot", schema="dwh")
    op.drop_column("fact_listening_history", "hour_of_day_cot", schema="dwh")

"""add lastfm columns to dim_artists

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-19

Adds two columns to dwh.dim_artists to store Last.fm enrichment data
for artists that enter the DWH with no genres/popularity (stubs created
from recently_played or tracks that weren't in top_artists).

  lastfm_listeners  — monthly listener count (popularity proxy)
  lastfm_tags       — genre tags from Last.fm (string array)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dim_artists",
        sa.Column("lastfm_listeners", sa.Integer(), nullable=True),
        schema="dwh",
    )
    op.add_column(
        "dim_artists",
        sa.Column("lastfm_tags", ARRAY(sa.String()), nullable=True),
        schema="dwh",
    )


def downgrade() -> None:
    op.drop_column("dim_artists", "lastfm_tags", schema="dwh")
    op.drop_column("dim_artists", "lastfm_listeners", schema="dwh")

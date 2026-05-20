"""add lastfm columns to dim_tracks

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-19

Adds two columns to dwh.dim_tracks to store Last.fm enrichment data
for tracks whose Spotify popularity is missing or deprecated (Spotify
stopped exposing track popularity for apps in Development Mode,
nov-2024).

  lastfm_listeners  — total listener count for the track
  lastfm_playcount  — total play count for the track
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dim_tracks",
        sa.Column("lastfm_listeners", sa.Integer(), nullable=True),
        schema="dwh",
    )
    op.add_column(
        "dim_tracks",
        sa.Column("lastfm_playcount", sa.Integer(), nullable=True),
        schema="dwh",
    )


def downgrade() -> None:
    op.drop_column("dim_tracks", "lastfm_playcount", schema="dwh")
    op.drop_column("dim_tracks", "lastfm_listeners", schema="dwh")

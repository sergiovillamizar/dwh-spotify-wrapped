"""add image_url columns to dim_artists and dim_tracks

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-21

Adds image_url to dwh.dim_artists (artist profile image from Spotify)
and album_image_url to dwh.dim_tracks (album cover art from Spotify).
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dim_artists",
        sa.Column("image_url", sa.String(512), nullable=True),
        schema="dwh",
    )
    op.add_column(
        "dim_tracks",
        sa.Column("album_image_url", sa.String(512), nullable=True),
        schema="dwh",
    )


def downgrade() -> None:
    op.drop_column("dim_tracks", "album_image_url", schema="dwh")
    op.drop_column("dim_artists", "image_url", schema="dwh")

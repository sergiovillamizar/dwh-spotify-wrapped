"""
inspect_artists.py — one-shot diagnostic: dump dim_artists state.
"""
import logging
from app.core.database import DimArtist, _get_session_local

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("inspect_artists")


def main() -> None:
    db = _get_session_local()()
    try:
        total = db.query(DimArtist).count()
        null_followers = db.query(DimArtist).filter(DimArtist.followers_count.is_(None)).count()
        with_followers = db.query(DimArtist).filter(DimArtist.followers_count.isnot(None)).count()

        logger.info("dim_artists total: %d", total)
        logger.info("  followers_count IS NULL: %d", null_followers)
        logger.info("  followers_count IS NOT NULL: %d", with_followers)

        logger.info("-- sample of 20 rows --")
        for a in db.query(DimArtist).order_by(DimArtist.artist_id).limit(20).all():
            logger.info(
                "  artist_id=%d spotify_id=%s name=%r followers=%s",
                a.artist_id, a.spotify_id, a.name, a.followers_count,
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()

"""
app/core/lastfm_client.py
Async client for the Last.fm public API (read-only, API key only — no OAuth).

Used exclusively to enrich dim_artists records that have no genres or
popularity data (stubs created from recently_played / tracks that were
not in top_artists).

Last.fm rate limit: 5 requests/second (enforced by the caller via sleep).

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/"
_MAX_TAGS = 5  # Top N tags to store as genres


class LastFmClient:
    """Thin async wrapper around the Last.fm artist.getinfo endpoint."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def get_artist_info(self, artist_name: str) -> dict | None:
        """
        Fetch artist info from Last.fm.

        Returns a dict with keys:
            listeners (int | None)  — monthly listener count
            tags      (list[str])   — up to _MAX_TAGS genre tags

        Returns None if the artist is not found or the request fails.
        """
        params = {
            "method": "artist.getinfo",
            "artist": artist_name,
            "api_key": self._api_key,
            "format": "json",
            "autocorrect": "1",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(LASTFM_BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()

            if "error" in data:
                logger.debug(
                    "Last.fm error for artist %r: %s", artist_name, data.get("message")
                )
                return None

            artist_data = data.get("artist", {})
            listeners_raw = (
                artist_data.get("stats", {}).get("listeners")
            )
            try:
                listeners = int(listeners_raw) if listeners_raw is not None else None
            except (ValueError, TypeError):
                listeners = None

            raw_tags: list[dict] = (
                artist_data.get("tags", {}).get("tag", []) or []
            )
            tags = [t["name"] for t in raw_tags[:_MAX_TAGS] if t.get("name")]

            return {"listeners": listeners, "tags": tags}

        except httpx.HTTPError as exc:
            logger.warning("Last.fm request failed for artist %r: %s", artist_name, exc)
            return None

    async def get_track_info(self, artist_name: str, track_name: str) -> dict | None:
        """
        Fetch track info from Last.fm.

        Returns a dict with keys:
            listeners (int | None)  — total listener count for the track
            playcount (int | None)  — total play count for the track

        Returns None if the track is not found or the request fails.
        """
        params = {
            "method": "track.getInfo",
            "artist": artist_name,
            "track": track_name,
            "api_key": self._api_key,
            "format": "json",
            "autocorrect": "1",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(LASTFM_BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()

            if "error" in data:
                logger.debug(
                    "Last.fm error for track %r by %r: %s",
                    track_name,
                    artist_name,
                    data.get("message"),
                )
                return None

            track_data = data.get("track", {})
            listeners_raw = track_data.get("listeners")
            playcount_raw = track_data.get("playcount")

            try:
                listeners = int(listeners_raw) if listeners_raw is not None else None
            except (ValueError, TypeError):
                listeners = None

            try:
                playcount = int(playcount_raw) if playcount_raw is not None else None
            except (ValueError, TypeError):
                playcount = None

            return {"listeners": listeners, "playcount": playcount}

        except httpx.HTTPError as exc:
            logger.warning(
                "Last.fm request failed for track %r by %r: %s",
                track_name,
                artist_name,
                exc,
            )
            return None

"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/dashboard/dashboard.module.css";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetState } from "@/components/dashboard/WidgetState";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDurationMs, formatFollowers, profileInitials } from "@/lib/spotify";
import type { TopTracksResponse } from "@/types/track";

const TOP_N = 5;
const ENDPOINT = "/v1/tracks/top";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; tracks: TopTracksResponse["items"] };

export function TopTracksWidget() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadTracks = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await apiFetch<TopTracksResponse>(ENDPOINT);
      const top = data.items.slice(0, TOP_N);
      if (top.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", tracks: top });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load top tracks.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  if (state.status === "loading") {
    return <WidgetPlaceholder variant="list" />;
  }

  if (state.status === "error") {
    return (
      <WidgetState
        message={state.message}
        onRetry={() => void loadTracks()}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <WidgetState
        variant="empty"
        message="No top tracks returned yet. Sync via ETL or try again later."
      />
    );
  }

  return (
    <ol className={styles.trackList}>
      {state.tracks.map((track, index) => {
        const { lastfm_playcount, lastfm_listeners } = track;
        let lastfmLabel: string | null = null;
        if (lastfm_playcount != null && lastfm_listeners != null) {
          lastfmLabel = `${formatFollowers(lastfm_playcount)} scrobbles · ${formatFollowers(lastfm_listeners)} oyentes`;
        } else if (lastfm_playcount != null) {
          lastfmLabel = `${formatFollowers(lastfm_playcount)} scrobbles`;
        } else if (lastfm_listeners != null) {
          lastfmLabel = `${formatFollowers(lastfm_listeners)} oyentes`;
        }
        return (
          <li key={track.spotify_id} className={styles.trackRow}>
            <span className={styles.trackRank}>{index + 1}</span>
            <div className={styles.trackAvatar} aria-hidden>
              {profileInitials(track.name)}
            </div>
            <div className={styles.trackMeta}>
              <span className={styles.trackName}>{track.name}</span>
              <span className={styles.trackArtist}>
                {track.artist_name?.trim() || "Unknown artist"}
              </span>
              {track.album_name ? (
                <span className={styles.trackAlbum}>{track.album_name}</span>
              ) : null}
              {lastfmLabel ? (
                <span className={styles.trackLastfm}>{lastfmLabel}</span>
              ) : null}
            </div>
            <span className={styles.trackDuration}>
              {formatDurationMs(track.duration_ms)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

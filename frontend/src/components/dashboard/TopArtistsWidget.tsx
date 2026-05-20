"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/dashboard/dashboard.module.css";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetState } from "@/components/dashboard/WidgetState";
import { apiFetch, ApiError } from "@/lib/api";
import { formatFollowers, profileInitials } from "@/lib/spotify";
import type { TopArtistsResponse } from "@/types/artist";

const TOP_N = 5;
const MAX_TAGS = 3;
const ENDPOINT = "/v1/artists/top";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; artists: TopArtistsResponse["items"] };

export function TopArtistsWidget() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadArtists = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await apiFetch<TopArtistsResponse>(ENDPOINT);
      const top = data.items.slice(0, TOP_N);
      if (top.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", artists: top });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load top artists.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadArtists();
  }, [loadArtists]);

  if (state.status === "loading") {
    return <WidgetPlaceholder variant="list" />;
  }

  if (state.status === "error") {
    return (
      <WidgetState
        message={state.message}
        onRetry={() => void loadArtists()}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <WidgetState
        variant="empty"
        message="Your DWH has no artists yet. Go to ETL and sync your data."
      />
    );
  }

  return (
    <ol className={styles.artistList}>
      {state.artists.map((artist, index) => {
        const tags = (artist.lastfm_tags ?? []).slice(0, MAX_TAGS);
        return (
          <li key={artist.spotify_id} className={styles.artistRow}>
            <span className={styles.artistRank}>{index + 1}</span>
            <div className={styles.artistAvatar} aria-hidden>
              {profileInitials(artist.name)}
            </div>
            <div className={styles.artistMeta}>
              <span className={styles.artistName}>{artist.name}</span>
              {artist.lastfm_listeners != null ? (
                <span className={styles.artistFollowers}>
                  {formatFollowers(artist.lastfm_listeners)} oyentes Last.fm
                </span>
              ) : null}
              {tags.length > 0 ? (
                <div className={styles.artistTags}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.artistTagChip}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

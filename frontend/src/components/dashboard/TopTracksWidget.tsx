"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      const data = await apiFetch<TopTracksResponse>(ENDPOINT, { apiCache: { ttl: 60000 } });
      const top = data.items.slice(0, TOP_N);
      if (top.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", tracks: top });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not load top tracks.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadTracks(); }, [loadTracks]);

  if (state.status === "loading") return <WidgetPlaceholder variant="list" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadTracks()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="No top tracks returned yet. Sync via ETL or try again later." />;

  return (
    <div className="flex flex-col gap-3">
      {state.tracks.map((track, index) => {
        const lastfmLabel = track.lastfm_playcount != null
          ? `${formatFollowers(track.lastfm_playcount)} scrobbles`
          : null;
        return (
          <motion.div
            key={track.spotify_id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className="group flex items-center gap-3"
          >
            <span className="text-xs font-bold text-spotify-gray w-4 text-right shrink-0">
              {index + 1}
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-700 text-[10px] font-bold text-white">
              {profileInitials(track.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {track.name}
                </span>
                {track.explicit && (
                  <span className="text-[10px] font-bold text-spotify-gray uppercase shrink-0">E</span>
                )}
              </div>
              <span className="text-xs text-spotify-green truncate block">
                {track.artist_name?.trim() || "Unknown artist"}
              </span>
              {lastfmLabel && (
                <span className="text-[10px] text-spotify-gray block">
                  {lastfmLabel}
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-medium text-spotify-gray shrink-0">
              {formatDurationMs(track.duration_ms)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

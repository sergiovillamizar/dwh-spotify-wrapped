"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      const message = err instanceof ApiError ? err.message : "Could not load top artists.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadArtists(); }, [loadArtists]);

  if (state.status === "loading") return <WidgetPlaceholder variant="list" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadArtists()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="Your DWH has no artists yet. Go to ETL and sync your data." />;

  const maxPopularity = Math.max(...state.artists.map((a) => a.popularity ?? 0), 1);

  return (
    <div className="flex flex-col gap-4">
      {state.artists.map((artist, index) => {
        const tags = (artist.lastfm_tags ?? []).slice(0, MAX_TAGS);
        const popPct = ((artist.popularity ?? 0) / maxPopularity) * 100;
        return (
          <motion.div
            key={artist.spotify_id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className="group flex items-start gap-3"
          >
            <span className="pt-1 text-xs font-bold text-spotify-gray w-4 text-right shrink-0">
              {index + 1}
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-spotify-green to-green-800 text-[10px] font-bold text-black">
              {profileInitials(artist.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {artist.name}
                </span>
                {artist.popularity != null && (
                  <span className="text-[10px] font-medium text-spotify-gray shrink-0">
                    {artist.popularity}%
                  </span>
                )}
              </div>
              {/* Popularity bar */}
              <div className="mt-1 h-1 rounded-full bg-spotify-dark-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-spotify-green to-spotify-green-hover transition-all duration-700"
                  style={{ width: `${popPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {artist.lastfm_listeners != null && (
                  <span className="text-[10px] text-spotify-gray">
                    {formatFollowers(artist.lastfm_listeners)} oyentes
                  </span>
                )}
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-spotify-green/10 px-2 py-0.5 text-[10px] font-medium text-spotify-green">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

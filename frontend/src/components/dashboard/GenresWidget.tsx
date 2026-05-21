"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetState } from "@/components/dashboard/WidgetState";
import { apiFetch, ApiError } from "@/lib/api";
import type { GenresResponse } from "@/types/history";

const TOP_N = 8;
const ENDPOINT = `/v1/history/genres?limit=${TOP_N}`;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; items: GenresResponse["items"] };

const GENRE_COLORS = [
  "#1DB954", "#1ED760", "#169C46", "#5353ff",
  "#e8488b", "#f59e0b", "#06b6d4", "#a78bfa",
];

export function GenresWidget() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadGenres = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await apiFetch<GenresResponse>(ENDPOINT);
      const top = data.items.slice(0, TOP_N);
      if (top.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", items: top });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudieron cargar los géneros.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadGenres(); }, [loadGenres]);

  if (state.status === "loading") return <WidgetPlaceholder variant="bars" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadGenres()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="No hay tags de Last.fm aún — corre el ETL para enriquecer" />;

  const maxCount = Math.max(...state.items.map((b) => b.count), 1);
  const chartData = state.items.map((b) => ({
    name: b.genre.length > 12 ? b.genre.slice(0, 11) + "…" : b.genre,
    fullName: b.genre,
    plays: b.count,
    pct: Math.round((b.count / maxCount) * 100),
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, left: 8, bottom: 0 }}
          barSize={14}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#b3b3b3", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload;
              return (
                <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
                  <p className="text-white font-medium">{item.fullName}</p>
                  <p className="text-spotify-green">{item.plays} plays · {item.pct}%</p>
                </div>
              );
            }}
          />
          <Bar dataKey="plays" radius={[0, 3, 3, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

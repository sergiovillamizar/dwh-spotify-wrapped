"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetState } from "@/components/dashboard/WidgetState";
import { apiFetch, ApiError } from "@/lib/api";
import type { PeakHourResponse } from "@/types/history";

const ENDPOINT = "/v1/history/peak-hour";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; data: PeakHourResponse };

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function ActivityWidget() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await apiFetch<PeakHourResponse>(ENDPOINT, { apiCache: { ttl: 60000 } });
      if (data.total_plays === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", data });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not load activity.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  if (state.status === "loading") return <WidgetPlaceholder variant="chart" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadData()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="Aún no hay datos de actividad" />;

  const { data } = state;
  const peakHour = data.peak_hour as number;

  const chartData = data.items.map((b) => ({
    hour: b.hour,
    label: formatHour(b.hour),
    plays: b.count,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums">
            {data.total_plays.toLocaleString()}
          </span>
          <span className="text-xs text-spotify-gray">plays</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-spotify-green">
            {formatHour(peakHour)}
          </span>
          <span className="text-[10px] text-spotify-gray ml-1">pico</span>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#535353", fontSize: 8 }}
              axisLine={false}
              tickLine={false}
              interval={5}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload;
                return (
                  <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-spotify-green">{item.plays} plays</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="plays"
              radius={[2, 2, 0, 0]}
              maxBarSize={8}
              fill="#1DB954"
              opacity={0.5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

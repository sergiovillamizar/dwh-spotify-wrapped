"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
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

export function PeakHourWidget() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadPeakHour = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await apiFetch<PeakHourResponse>(ENDPOINT, { apiCache: { ttl: 60000 } });
      if (data.total_plays === 0 || data.peak_hour == null) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", data });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo cargar la hora pico.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadPeakHour(); }, [loadPeakHour]);

  if (state.status === "loading") return <WidgetPlaceholder variant="chart" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadPeakHour()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="Aún no hay reproducciones — corre el ETL" />;

  const { data } = state;
  const peakHour = data.peak_hour as number;

  const chartData = data.items.map((b) => ({
    hour: formatHour(b.hour),
    plays: b.count,
    isPeak: b.hour === peakHour,
  }));

  return (
    <div>
      <div className="flex items-end gap-6 mb-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-spotify-green tabular-nums">
            {formatHour(peakHour)}
          </p>
          <p className="text-xs text-spotify-gray mt-1">Hora pico (COT)</p>
        </div>
        <div className="pb-1">
          <p className="text-lg font-semibold text-white tabular-nums">
            {data.total_plays.toLocaleString()}
          </p>
          <p className="text-xs text-spotify-gray">Reproducciones totales</p>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "#535353", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload;
                return (
                  <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
                    <p className="text-white font-medium">{item.hour}</p>
                    <p className="text-spotify-green">{item.plays} plays</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="plays"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              fill="#1DB954"
              opacity={0.7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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

interface StatCard {
  label: string;
  value: string;
  sub: string;
}

export function StatsOverviewWidget() {
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
      const message = err instanceof ApiError ? err.message : "Could not load stats.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  if (state.status === "loading") return <WidgetPlaceholder variant="card" />;
  if (state.status === "error") return <WidgetState message={state.message} onRetry={() => void loadData()} />;
  if (state.status === "empty") return <WidgetState variant="empty" message="Aún no hay datos — corre el ETL primero" />;

  const { data } = state;
  const peakHour = data.peak_hour as number;
  const maxCount = Math.max(...data.items.map((b) => b.count), 1);
  const avgPerHour = Math.round(data.total_plays / Math.max(data.items.filter((b) => b.count > 0).length, 1));

  const stats: StatCard[] = [
    { label: "Reproducciones", value: data.total_plays.toLocaleString(), sub: "totales en el DWH" },
    { label: "Hora pico", value: `${peakHour.toString().padStart(2, "0")}:00`, sub: "COT" },
    { label: "Pico máximo", value: maxCount.toLocaleString(), sub: "plays en una hora" },
    { label: "Promedio", value: avgPerHour.toLocaleString(), sub: "plays/hora activa" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="glass rounded-xl p-3.5"
        >
          <p className="text-xs text-spotify-gray mb-1">{stat.label}</p>
          <p className="text-lg font-bold text-white tabular-nums">{stat.value}</p>
          <p className="text-[10px] text-spotify-gray mt-0.5">{stat.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

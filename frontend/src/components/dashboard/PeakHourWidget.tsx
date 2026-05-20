"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/dashboard/dashboard.module.css";
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
      const data = await apiFetch<PeakHourResponse>(ENDPOINT);
      if (data.total_plays === 0 || data.peak_hour == null) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", data });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la hora pico.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadPeakHour();
  }, [loadPeakHour]);

  if (state.status === "loading") {
    return <WidgetPlaceholder variant="metric" />;
  }

  if (state.status === "error") {
    return (
      <WidgetState
        message={state.message}
        onRetry={() => void loadPeakHour()}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <WidgetState
        variant="empty"
        message="Aún no hay reproducciones — corre el ETL"
      />
    );
  }

  const { data } = state;
  const peakHour = data.peak_hour as number;
  const maxCount = Math.max(...data.items.map((b) => b.count), 1);

  return (
    <div className={styles.peakHourBody}>
      <div className={styles.peakHourMetric}>
        <span className={styles.peakHourNumber}>{formatHour(peakHour)}</span>
        <span className={styles.peakHourCaption}>Hora pico (COT)</span>
      </div>
      <span className={styles.peakHourTotal}>
        {data.total_plays.toLocaleString()} reproducciones totales
      </span>
      <ul
        className={styles.peakHourSparkline}
        aria-label="Distribución de reproducciones por hora"
      >
        {data.items.map((bucket) => {
          const heightPct = (bucket.count / maxCount) * 100;
          const isPeak = bucket.hour === peakHour;
          return (
            <li
              key={bucket.hour}
              className={styles.peakHourBar}
              title={`${formatHour(bucket.hour)} — ${bucket.count}`}
            >
              <span
                className={
                  isPeak
                    ? `${styles.peakHourBarFill} ${styles.peakHourBarFillActive}`
                    : styles.peakHourBarFill
                }
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

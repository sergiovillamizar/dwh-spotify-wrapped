"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/app/dashboard/dashboard.module.css";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetState } from "@/components/dashboard/WidgetState";
import { apiFetch, ApiError } from "@/lib/api";
import type { GenresResponse } from "@/types/history";

const TOP_N = 10;
const ENDPOINT = `/v1/history/genres?limit=${TOP_N}`;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; items: GenresResponse["items"] };

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
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los géneros.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadGenres();
  }, [loadGenres]);

  if (state.status === "loading") {
    return <WidgetPlaceholder variant="bars" />;
  }

  if (state.status === "error") {
    return (
      <WidgetState
        message={state.message}
        onRetry={() => void loadGenres()}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <WidgetState
        variant="empty"
        message="No hay tags de Last.fm aún — corre el ETL para enriquecer"
      />
    );
  }

  const maxCount = Math.max(...state.items.map((b) => b.count), 1);

  return (
    <ul className={styles.genresList}>
      {state.items.map((bucket) => {
        const widthPct = (bucket.count / maxCount) * 100;
        return (
          <li key={bucket.genre} className={styles.genresRow}>
            <span className={styles.genresName} title={bucket.genre}>
              {bucket.genre}
            </span>
            <div className={styles.genresBarTrack}>
              <div
                className={styles.genresBarFill}
                style={{ width: `${Math.max(widthPct, 2)}%` }}
              />
            </div>
            <span className={styles.genresCount}>
              {bucket.count.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

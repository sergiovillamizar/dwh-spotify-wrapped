"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "@/app/etl/etl.module.css";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken, isTokenExpired } from "@/lib/auth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ETLPageSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import type { ETLRun, ETLRunResponse, ETLStatusResponse } from "@/types/etl";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string; statusCode?: number }
  | { status: "ready"; runs: ETLRun[] };

type SyncState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "done"; message: string; isError: boolean };

const SYNC_POLL_DELAY = 1500;

export default function ETLPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });
  const isOnline = useOnlineStatus();

  const loadHistory = useCallback(async () => {
    setPageState({ status: "loading" });
    try {
      const data = await apiFetch<ETLStatusResponse>("/v1/etl/status");
      setPageState({ status: "ready", runs: data.runs });
    } catch (err) {
      const statusCode = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError ? err.message : "No se pudo cargar el historial ETL.";
      setPageState({ status: "error", message, statusCode });
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
      return;
    }
    void loadHistory();
  }, [loadHistory, router]);

  useEffect(() => {
    if (syncState.status === "done" && !syncState.isError) {
      const timer = setTimeout(() => void loadHistory(), SYNC_POLL_DELAY);
      return () => clearTimeout(timer);
    }
  }, [syncState, loadHistory]);

  async function handleSync() {
    setSyncState({ status: "syncing" });

    if (!isOnline) {
      setSyncState({
        status: "done",
        message: "Sin conexión a internet. No se puede sincronizar.",
        isError: true,
      });
      return;
    }

    try {
      const result = await apiFetch<ETLRunResponse>("/v1/etl/run", {
        method: "POST",
      });
      const msg =
        result.status === "success"
          ? `Sincronización completada — ${result.history_new} nuevas reproducciones, ${result.artists_new} nuevos artistas, ${result.tracks_new} nuevas canciones`
          : `Error en la sincronización: ${result.error_message ?? "desconocido"}`;
      setSyncState({
        status: "done",
        message: msg,
        isError: result.status !== "success",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "La solicitud de sincronización falló. Intenta de nuevo.";
      setSyncState({ status: "done", message, isError: true });
    }
  }

  if (pageState.status === "loading") {
    return (
      <>
        {!isOnline && <OfflineBanner />}
        <ETLPageSkeleton />
      </>
    );
  }

  if (pageState.status === "error") {
    return (
      <>
        {!isOnline && <OfflineBanner />}
        <div className={styles.page}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Data Warehouse</p>
            <h1 className={styles.title}>ETL Sync</h1>
          </header>
          <ErrorState
            message={pageState.message}
            status={pageState.statusCode}
            onRetry={() => void loadHistory()}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Data Warehouse</p>
          <h1 className={styles.title}>ETL Sync</h1>
          <p className={styles.subtitle}>
            Sincroniza tu historial de escucha de Spotify y revisa las ejecuciones anteriores.
          </p>
        </header>

        <div className={styles.actions}>
          <button
            className={styles.syncButton}
            onClick={() => void handleSync()}
            disabled={syncState.status === "syncing" || !isOnline}
          >
            {syncState.status === "syncing" ? (
              <>
                <span className={styles.spinner} />
                Sincronizando…
              </>
            ) : (
              "Sincronizar ahora"
            )}
          </button>
          {syncState.status === "done" && (
            <span
              className={`${styles.syncResult} ${syncState.isError ? styles.syncResultError : styles.syncResultSuccess}`}
            >
              {syncState.message}
            </span>
          )}
        </div>

        {pageState.runs.length === 0 ? (
          <EmptyState
            icon="sync"
            title="Aún no hay ejecuciones ETL"
            description="No se encontraron sincronizaciones anteriores. Haz clic en 'Sincronizar ahora' para importar tu historial de Spotify por primera vez."
            action={{ label: "Sincronizar ahora", onClick: () => void handleSync() }}
          />
        ) : (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Duración</th>
                  <th>Reproducciones</th>
                  <th>Nuevos artistas</th>
                  <th>Nuevas canciones</th>
                </tr>
              </thead>
              <tbody>
                {pageState.runs.map((run) => (
                  <tr key={run.audit_id}>
                    <td>{formatDate(run.started_at)}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${run.status === "success" ? styles.statusSuccess : styles.statusError}`}
                      >
                        {run.status === "success" ? "Completado" : "Error"}
                      </span>
                    </td>
                    <td className={styles.mono}>{formatDuration(run.duration_ms)}</td>
                    <td className={styles.mono}>
                      {run.history_new}
                      {run.history_skipped > 0
                        ? ` (+${run.history_skipped} dup)`
                        : ""}
                    </td>
                    <td className={styles.mono}>{run.artists_new}</td>
                    <td className={styles.mono}>{run.tracks_new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav className={styles.nav} aria-label="Secondary">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/profile">Profile</Link>
        </nav>
      </div>
    </>
  );
}

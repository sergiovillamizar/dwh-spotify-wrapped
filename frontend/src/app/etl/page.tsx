"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "@/app/etl/etl.module.css";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken, isTokenExpired } from "@/lib/auth";
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
  | { status: "error"; message: string }
  | { status: "ready"; runs: ETLRun[] };

type SyncState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "done"; message: string; isError: boolean };

export default function ETLPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });

  const loadHistory = useCallback(async () => {
    setPageState({ status: "loading" });
    try {
      const data = await apiFetch<ETLStatusResponse>("/v1/etl/status");
      setPageState({ status: "ready", runs: data.runs });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load ETL history.";
      setPageState({ status: "error", message });
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

  async function handleSync() {
    setSyncState({ status: "syncing" });
    try {
      const result = await apiFetch<ETLRunResponse>("/v1/etl/run", {
        method: "POST",
      });
      const msg =
        result.status === "success"
          ? `Sync completed — ${result.history_new} new plays, ${result.artists_new} new artists, ${result.tracks_new} new tracks`
          : `Sync failed: ${result.error_message ?? "unknown error"}`;
      setSyncState({
        status: "done",
        message: msg,
        isError: result.status !== "success",
      });
      void loadHistory();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Sync request failed. Try again.";
      setSyncState({ status: "done", message, isError: true });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Data Warehouse</p>
        <h1 className={styles.title}>ETL Sync</h1>
        <p className={styles.subtitle}>
          Sync your latest Spotify listening history and view past runs.
        </p>
      </header>

      <div className={styles.actions}>
        <button
          className={styles.syncButton}
          onClick={() => void handleSync()}
          disabled={syncState.status === "syncing"}
        >
          {syncState.status === "syncing" ? "Syncing…" : "Sync Now"}
        </button>
        {syncState.status === "done" ? (
          <span
            className={`${styles.syncResult} ${syncState.isError ? styles.syncResultError : styles.syncResultSuccess}`}
          >
            {syncState.message}
          </span>
        ) : null}
      </div>

      {pageState.status === "loading" ? (
        <div className={styles.loading}>Loading history…</div>
      ) : pageState.status === "error" ? (
        <div className={styles.error}>
          <p>{pageState.message}</p>
          <button
            className={styles.retryButton}
            onClick={() => void loadHistory()}
          >
            Try again
          </button>
        </div>
      ) : pageState.runs.length === 0 ? (
        <div className={styles.empty}>
          <p>No ETL runs yet. Click Sync Now to start.</p>
        </div>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Plays</th>
                <th>New artists</th>
                <th>New tracks</th>
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
                      {run.status}
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
  );
}

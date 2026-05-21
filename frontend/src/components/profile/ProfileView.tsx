"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/app/profile/profile.module.css";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getToken, isTokenExpired } from "@/lib/auth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  accountLabel,
  formatFollowers,
  isPremium,
  profileInitials,
  spotifyUserUrl,
} from "@/lib/spotify";
import type { UserProfile } from "@/types/user";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; statusCode?: number }
  | { status: "ready"; profile: UserProfile };

export function ProfileView() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { isHydrated } = useAuth();
  const isOnline = useOnlineStatus();

  const loadProfile = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const profile = await apiFetch<UserProfile>("/v1/profile/me");
      setState({ status: "ready", profile });
    } catch (err) {
      const statusCode = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar tu perfil. Verifica tu conexión.";
      setState({ status: "error", message, statusCode });
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
      return;
    }
    void loadProfile();
  }, [loadProfile, router]);

  if (!isHydrated || state.status === "loading") {
    return (
      <ProfileLayout>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  if (state.status === "error") {
    return (
      <ProfileLayout>
        {!isOnline && <OfflineBanner />}
        <ErrorState
          message={state.message}
          status={state.statusCode}
          onRetry={() => void loadProfile()}
        />
      </ProfileLayout>
    );
  }

  const { profile } = state;
  const displayName = profile.display_name?.trim() || "Spotify User";
  const premium = isPremium(profile.product);

  const hasSpotifyData = Boolean(profile.spotify_id);
  if (!hasSpotifyData) {
    return (
      <ProfileLayout>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-glass mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-spotify-gray">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a6 6 0 016-6h4a6 6 0 016 6v2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Perfil no disponible</h3>
          <p className="text-sm text-spotify-gray max-w-md mb-6 leading-relaxed">
            No se encontraron datos de tu perfil de Spotify. Intenta cerrar sesión y volver a conectarte.
          </p>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      {!isOnline && <OfflineBanner />}
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your account</p>
        <h1 className={styles.title}>Profile</h1>
      </header>

      <article className={styles.card}>
        <div className={styles.avatar} aria-hidden>
          <span className={styles.initials}>
            {profileInitials(profile.display_name)}
          </span>
        </div>

        <div className={styles.identity}>
          <h2 className={styles.name}>{displayName}</h2>
          <span
            className={`${styles.badge} ${premium ? styles.badgePremium : styles.badgeFree}`}
          >
            {accountLabel(profile.product)}
          </span>
        </div>

        <dl className={styles.details}>
          <DetailRow label="Email" value={profile.email ?? "No disponible"} />
          <DetailRow label="Country" value={profile.country?.toUpperCase() ?? "No especificado"} />
          <DetailRow label="Followers" value={formatFollowers(profile.followers)} />
          <DetailRow label="Spotify ID" value={profile.spotify_id} mono />
        </dl>

        <footer className={styles.footer}>
          <a
            href={spotifyUserUrl(profile.spotify_id)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.spotifyLink}
          >
            Ver perfil en Spotify
          </a>
          <p className={styles.synced}>
            Última sincronización{" "}
            {new Date(profile.loaded_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </footer>
      </article>
    </ProfileLayout>
  );
}

function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      {children}
      <nav style={{ display: "flex", gap: "1.25rem", marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", fontSize: "0.875rem", fontWeight: 500 }}>
        <a href="/dashboard" style={{ color: "var(--accent)", textDecoration: "none" }}>Dashboard</a>
        <a href="/etl" style={{ color: "var(--accent)", textDecoration: "none" }}>Sincronización ETL</a>
      </nav>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={`${styles.value} ${mono ? styles.mono : ""}`}>{value}</dd>
    </div>
  );
}

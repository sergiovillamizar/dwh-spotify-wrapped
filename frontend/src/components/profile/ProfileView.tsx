"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/app/profile/profile.module.css";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken, isTokenExpired } from "@/lib/auth";
import {
  accountLabel,
  formatFollowers,
  isPremium,
  profileInitials,
  spotifyUserUrl,
} from "@/lib/spotify";
import type { UserProfile } from "@/types/user";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: UserProfile };

export function ProfileView() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadProfile = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const profile = await apiFetch<UserProfile>("/v1/profile/me");
      setState({ status: "ready", profile });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load your profile. Please try again.";
      setState({ status: "error", message });
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

  if (state.status === "loading") {
    return (
      <ProfileLayout>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  if (state.status === "error") {
    return (
      <ProfileLayout>
        <ProfileError message={state.message} onRetry={loadProfile} />
      </ProfileLayout>
    );
  }

  const { profile } = state;
  const displayName = profile.display_name?.trim() || "Spotify User";
  const premium = isPremium(profile.product);

  return (
    <ProfileLayout>
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
          <DetailRow label="Email" value={profile.email ?? "—"} />
          <DetailRow label="Country" value={profile.country?.toUpperCase() ?? "—"} />
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
            View on Spotify
          </a>
          <p className={styles.synced}>
            Last synced{" "}
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
  return <div className={styles.page}>{children}</div>;
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

function ProfileSkeleton() {
  return (
    <div className={styles.card} aria-busy="true" aria-label="Loading profile">
      <div className={`${styles.avatar} ${styles.skeleton}`} />
      <SkeletonBar width="60%" />
      <SkeletonBar width="40%" />
      <SkeletonBar width="80%" />
    </div>
  );
}

function SkeletonBar({ width }: { width: string }) {
  return <div className={styles.skeletonBar} style={{ width }} />;
}

function ProfileError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className={styles.card}>
      <p className={styles.errorText} role="alert">
        {message}
      </p>
      <button
        type="button"
        className={styles.retryButton}
        onClick={() => void onRetry()}
      >
        Try again
      </button>
    </div>
  );
}

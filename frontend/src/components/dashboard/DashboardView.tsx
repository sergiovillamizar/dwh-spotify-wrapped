"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "@/app/dashboard/dashboard.module.css";
import { GenresWidget } from "@/components/dashboard/GenresWidget";
import { PeakHourWidget } from "@/components/dashboard/PeakHourWidget";
import { TopArtistsWidget } from "@/components/dashboard/TopArtistsWidget";
import { TopTracksWidget } from "@/components/dashboard/TopTracksWidget";
import { WidgetPlaceholder } from "@/components/dashboard/WidgetPlaceholder";
import { WidgetSlot } from "@/components/dashboard/WidgetSlot";
import { DASHBOARD_WIDGETS } from "@/components/dashboard/widgets";
import { getToken, isTokenExpired } from "@/lib/auth";

const PLACEHOLDER_VARIANTS: Record<
  (typeof DASHBOARD_WIDGETS)[number]["id"],
  "list" | "metric" | "bars"
> = {
  "top-artists": "list",
  "top-tracks": "list",
  "peak-hour": "metric",
  genres: "bars",
};

function renderWidgetBody(widgetId: (typeof DASHBOARD_WIDGETS)[number]["id"]) {
  if (widgetId === "top-artists") {
    return <TopArtistsWidget />;
  }
  if (widgetId === "top-tracks") {
    return <TopTracksWidget />;
  }
  if (widgetId === "peak-hour") {
    return <PeakHourWidget />;
  }
  if (widgetId === "genres") {
    return <GenresWidget />;
  }

  const widget = DASHBOARD_WIDGETS.find((w) => w.id === widgetId);
  return (
    <>
      <WidgetPlaceholder variant={PLACEHOLDER_VARIANTS[widgetId]} />
      {widget ? (
        <p className={styles.slotHint}>
          Endpoint: <code>{widget.endpoint}</code>
        </p>
      ) : null}
    </>
  );
}

export function DashboardView() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Analytics</p>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Your listening insights from the data warehouse.
        </p>
      </header>

      <div className={styles.grid}>
        {DASHBOARD_WIDGETS.map((widget) => (
          <WidgetSlot
            key={widget.id}
            title={widget.title}
            description={widget.description}
          >
            {renderWidgetBody(widget.id)}
          </WidgetSlot>
        ))}
      </div>

      <nav className={styles.nav} aria-label="Secondary">
        <Link href="/profile">Profile</Link>
        <Link href="/etl">ETL sync</Link>
      </nav>
    </div>
  );
}

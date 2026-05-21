"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { GenresWidget } from "@/components/dashboard/GenresWidget";
import { PeakHourWidget } from "@/components/dashboard/PeakHourWidget";
import { TopArtistsWidget } from "@/components/dashboard/TopArtistsWidget";
import { TopTracksWidget } from "@/components/dashboard/TopTracksWidget";
import { StatsOverviewWidget } from "@/components/dashboard/StatsOverviewWidget";
import { ActivityWidget } from "@/components/dashboard/ActivityWidget";
import { WidgetSlot } from "@/components/dashboard/WidgetSlot";
import { DASHBOARD_WIDGETS } from "@/components/dashboard/widgets";
import { getToken, isTokenExpired } from "@/lib/auth";

function renderWidgetBody(widgetId: string, key: number) {
  switch (widgetId) {
    case "stats-overview":
      return <StatsOverviewWidget key={key} />;
    case "top-artists":
      return <TopArtistsWidget key={key} />;
    case "top-tracks":
      return <TopTracksWidget key={key} />;
    case "peak-hour":
      return <PeakHourWidget key={key} />;
    case "genres":
      return <GenresWidget key={key} />;
    case "activity":
      return <ActivityWidget key={key} />;
    default:
      return null;
  }
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
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3.5 py-1 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-spotify-green" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-spotify-gray">
              Analytics
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-spotify-gray max-w-xl">
            Tus insights de escucha desde el Data Warehouse personal.
          </p>
        </motion.header>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DASHBOARD_WIDGETS.map((widget) => (
            <WidgetSlot
              key={widget.id}
              title={widget.title}
              description={widget.description}
              colSpan={widget.colSpan}
            >
              {renderWidgetBody(widget.id, widget.id.charCodeAt(0))}
            </WidgetSlot>
          ))}
        </div>

        {/* Footer Nav */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 flex items-center gap-6 border-t border-glass-border pt-6"
        >
          <Link
            href="/profile"
            className="text-sm text-spotify-gray transition-colors hover:text-white"
          >
            Perfil
          </Link>
          <Link
            href="/etl"
            className="text-sm text-spotify-gray transition-colors hover:text-white"
          >
            Sincronización ETL
          </Link>
          <Link
            href="/docs"
            className="text-sm text-spotify-gray transition-colors hover:text-white"
          >
            API Docs
          </Link>
        </motion.nav>
      </div>
    </div>
  );
}

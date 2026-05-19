import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard | Mi Spotify Wrapped",
  description: "Listening analytics from your personal Spotify data warehouse",
};

export default function DashboardPage() {
  return <DashboardView />;
}

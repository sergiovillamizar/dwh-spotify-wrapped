export interface DashboardWidgetConfig {
  id: string;
  title: string;
  description: string;
  endpoint: string;
}

/** Widget registry for DP-S-028 skeleton; data wiring lands in DP-S-029/030. */
export const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: "top-artists",
    title: "Top 5 Artists",
    description: "Most played artists from your warehouse",
    endpoint: "/v1/artists/top",
  },
  {
    id: "top-tracks",
    title: "Top 5 Tracks",
    description: "Your favorite songs ranked by listening history",
    endpoint: "/v1/tracks/top",
  },
  {
    id: "peak-hour",
    title: "Peak Hour",
    description: "When you listen the most during the day",
    endpoint: "/v1/history/peak-hour",
  },
  {
    id: "genres",
    title: "Dominant Genres",
    description: "Genre breakdown from your top artists",
    endpoint: "/v1/history/genres",
  },
];

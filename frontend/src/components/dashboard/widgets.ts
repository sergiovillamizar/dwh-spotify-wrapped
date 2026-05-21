export interface DashboardWidgetConfig {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  colSpan?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: "stats-overview",
    title: "Resumen",
    description: "Estadísticas clave de tu actividad",
    endpoint: "/v1/history/peak-hour",
    colSpan: "full",
  },
  {
    id: "top-artists",
    title: "Top 5 Artistas",
    description: "Más escuchados en tu DWH",
    endpoint: "/v1/artists/top",
  },
  {
    id: "top-tracks",
    title: "Top 5 Canciones",
    description: "Tus favoritas según tu historial",
    endpoint: "/v1/tracks/top",
  },
  {
    id: "peak-hour",
    title: "Hora Pico",
    description: "Cuándo escuchas más durante el día",
    endpoint: "/v1/history/peak-hour",
    colSpan: "lg",
  },
  {
    id: "genres",
    title: "Géneros Dominantes",
    description: "Desglose de géneros de tus artistas",
    endpoint: "/v1/history/genres",
    colSpan: "lg",
  },
  {
    id: "activity",
    title: "Actividad Diaria",
    description: "Distribución de reproducciones por hora",
    endpoint: "/v1/history/peak-hour",
    colSpan: "full",
  },
];

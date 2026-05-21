"use client";

interface ErrorStateProps {
  title?: string;
  message: string;
  status?: number;
  onRetry?: () => void;
  retryLabel?: string;
}

const STATUS_MESSAGES: Record<number, { title: string; description: string }> = {
  401: { title: "Sesión expirada", description: "Tu sesión ha expirado. Inicia sesión nuevamente para continuar." },
  403: { title: "Acceso denegado", description: "No tienes permisos para acceder a este recurso." },
  404: { title: "No encontrado", description: "El recurso solicitado no existe o no está disponible." },
  500: { title: "Error del servidor", description: "El servidor tuvo un problema interno. Intenta de nuevo más tarde." },
  502: { title: "Servicio no disponible", description: "El servicio de Spotify no respondió correctamente. Intenta de nuevo." },
  503: { title: "Servicio en mantenimiento", description: "El servicio está temporalmente fuera de línea." },
};

export function ErrorState({
  title,
  message,
  status,
  onRetry,
  retryLabel = "Intentar de nuevo",
}: ErrorStateProps) {
  const statusInfo = status ? STATUS_MESSAGES[status] : null;
  const displayTitle = title || statusInfo?.title || "Algo salió mal";
  const displayDescription = statusInfo?.description || message;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-5">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{displayTitle}</h3>
      <p className="text-sm text-red-300/80 max-w-md mb-2 leading-relaxed">{displayDescription}</p>
      {status && (
        <p className="text-xs font-mono text-spotify-dark-500 mb-4">Error {status}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-glass border border-glass-border text-white rounded-lg font-semibold text-sm hover:bg-glass-hover transition-all duration-200 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
          </svg>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

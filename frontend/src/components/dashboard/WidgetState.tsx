"use client";

interface WidgetStateProps {
  message: string;
  onRetry?: () => void;
  variant?: "error" | "empty";
}

export function WidgetState({ message, onRetry, variant = "error" }: WidgetStateProps) {
  const icon = variant === "error"
    ? (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
    : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-spotify-gray">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        variant === "error" ? "bg-red-500/10" : "bg-glass",
      )}>
        {icon}
      </div>
      <p className={cn(
        "text-sm max-w-xs",
        variant === "error" ? "text-red-300" : "text-spotify-gray",
      )}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-glass-border bg-glass px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-glass-hover"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

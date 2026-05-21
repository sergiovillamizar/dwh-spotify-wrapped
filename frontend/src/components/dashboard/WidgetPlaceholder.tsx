"use client";

interface WidgetPlaceholderProps {
  variant?: "list" | "metric" | "bars" | "card" | "chart";
}

export function WidgetPlaceholder({ variant = "card" }: WidgetPlaceholderProps) {
  if (variant === "metric") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8" aria-hidden>
        <div className="skeleton-pulse h-10 w-24 rounded-lg" />
        <div className="skeleton-pulse h-3 w-32 rounded-full" />
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <div className="flex flex-col gap-3 py-2" aria-hidden>
        {[90, 72, 58, 40, 28].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton-pulse h-3 w-16 rounded-full shrink-0" />
            <div className="skeleton-pulse h-3 rounded-full" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className="flex items-end gap-1.5 h-28 py-2" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="skeleton-pulse flex-1 rounded-sm"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton-pulse h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-pulse h-3.5 w-3/4 rounded-full" />
              <div className="skeleton-pulse h-2.5 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="flex items-center justify-center h-full py-6">
        <div className="skeleton-pulse h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

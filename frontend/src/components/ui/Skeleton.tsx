"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-pulse rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function EndpointCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton className="w-16 h-6 rounded-md" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 2 + (i % 3) }).map((_, j) => (
            <Skeleton key={j} className="h-3 w-40 ml-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

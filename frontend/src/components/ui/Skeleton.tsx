"use client";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-pulse rounded-lg ${className}`}
      style={style}
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

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Skeleton className="h-6 w-24 mb-3 rounded-full" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="glass rounded-2xl p-4 col-span-full">
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <Skeleton className="h-4 w-24 mb-4" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="glass rounded-2xl p-4 lg:col-span-2">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="flex items-end gap-1.5 h-28">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${30 + (i % 5) * 12}%` }} />
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-4 lg:col-span-2">
            <Skeleton className="h-4 w-24 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 mb-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-4 col-span-full">
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="flex items-end gap-1.5 h-28">
              {Array.from({ length: 24 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${15 + (i % 7) * 10}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="page" style={{ maxWidth: "32rem", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-7 w-32 mb-6" />
      <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
        <div className="w-full space-y-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-full mt-2" />
      </div>
    </div>
  );
}

export function ETLPageSkeleton() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-80 mb-6" />
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-glass-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

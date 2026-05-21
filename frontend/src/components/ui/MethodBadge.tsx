"use client";

import type { HttpMethod } from "@/types/openapi";
import { getMethodColor } from "@/services/openApiService";
import { cn } from "@/lib/utils";

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase tracking-wider",
        getMethodColor(method),
        className,
      )}
    >
      {method}
    </span>
  );
}

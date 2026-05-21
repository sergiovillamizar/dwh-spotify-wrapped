"use client";

import type { EndpointGroup } from "@/types/openapi";
import { EndpointCard } from "@/components/docs/EndpointCard";

interface EndpointListProps {
  group: EndpointGroup;
  activeEndpointKey?: string | null;
}

export function EndpointList({ group, activeEndpointKey }: EndpointListProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-white capitalize">{group.tag}</h2>
        <span className="text-[11px] text-spotify-dark-500 bg-spotify-dark-800 px-2 py-0.5 rounded-full border border-glass-border">
          {group.endpoints.length} {group.endpoints.length === 1 ? "endpoint" : "endpoints"}
        </span>
      </div>

      {group.endpoints.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        return (
          <EndpointCard
            key={key}
            endpoint={ep}
            isActive={activeEndpointKey === key}
          />
        );
      })}
    </div>
  );
}

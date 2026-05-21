"use client";

import { cn } from "@/lib/utils";
import type { EndpointGroup } from "@/types/openapi";

interface SidebarProps {
  groups: EndpointGroup[];
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
  onSelectEndpoint: (tag: string, path: string) => void;
  isOpen: boolean;
}

const TAG_ICONS: Record<string, string> = {
  auth: "🔐",
  profile: "👤",
  artists: "🎤",
  tracks: "🎵",
  history: "📊",
  etl: "⚙️",
  health: "❤️",
  general: "📁",
};

export function Sidebar({
  groups,
  activeTag,
  onSelectTag,
  onSelectEndpoint,
  isOpen,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => onSelectTag(activeTag ?? "")}
        />
      )}
      <aside
        className={`
          fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64
          bg-[#0d0d0d] border-r border-glass-border
          transform transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:h-full
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          overflow-y-auto
        `}
      >
        <nav className="py-4 px-3 space-y-1">
          {groups.map((group) => {
            const tagLower = group.tag.toLowerCase();
            const icon = TAG_ICONS[tagLower] ?? TAG_ICONS.general;
            const isActive = activeTag === group.tag;

            return (
              <div key={group.tag}>
                <button
                  onClick={() => onSelectTag(group.tag)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-spotify-green/10 text-spotify-green border border-spotify-green/20"
                      : "text-spotify-gray hover:text-white hover:bg-glass-hover",
                  )}
                >
                  <span className="text-base">{icon}</span>
                  <span className="capitalize">{group.tag}</span>
                  <span className="ml-auto text-[11px] text-spotify-dark-500">
                    {group.endpoints.length}
                  </span>
                </button>

                {isActive && (
                  <div className="mt-1 ml-6 space-y-0.5 animate-slide-right">
                    {group.endpoints.map((ep) => {
                      const endpointKey = `${ep.method}-${ep.path}`;
                      return (
                        <button
                          key={endpointKey}
                          onClick={() => onSelectEndpoint(group.tag, endpointKey)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-all duration-150 hover:bg-glass-hover group"
                        >
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase w-10",
                              ep.method === "get" && "text-emerald-500",
                              ep.method === "post" && "text-blue-500",
                              ep.method === "put" && "text-amber-500",
                              ep.method === "delete" && "text-red-500",
                              ep.method === "patch" && "text-purple-500",
                            )}
                          >
                            {ep.method}
                          </span>
                          <span className="text-spotify-gray group-hover:text-white truncate transition-colors">
                            {ep.path}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

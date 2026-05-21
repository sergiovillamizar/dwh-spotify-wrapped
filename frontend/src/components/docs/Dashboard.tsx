"use client";

import type { EndpointGroup } from "@/types/openapi";

interface DashboardProps {
  groups: EndpointGroup[];
  onSelectTag: (tag: string) => void;
}

const TAG_ICONS: Record<string, string> = {
  auth: "🔐",
  profile: "👤",
  artists: "🎤",
  tracks: "🎵",
  history: "📊",
  etl: "⚙️",
  health: "❤️",
};

const TAG_DESCRIPTIONS: Record<string, string> = {
  auth: "Authentication & OAuth PKCE flow",
  profile: "User profile information",
  artists: "Top artists analytics",
  tracks: "Top tracks analytics",
  history: "Listening history & insights",
  etl: "Data warehouse ETL pipeline",
  health: "Service health & readiness",
};

export function Dashboard({ groups, onSelectTag }: DashboardProps) {
  const stats = {
    total: groups.reduce((acc, g) => acc + g.endpoints.length, 0),
    categories: groups.length,
    methods: {
      get: groups.reduce((acc, g) => acc + g.endpoints.filter((e) => e.method === "get").length, 0),
      post: groups.reduce((acc, g) => acc + g.endpoints.filter((e) => e.method === "post").length, 0),
      put: groups.reduce((acc, g) => acc + g.endpoints.filter((e) => e.method === "put").length, 0),
      delete: groups.reduce((acc, g) => acc + g.endpoints.filter((e) => e.method === "delete").length, 0),
    },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">API Overview</h2>
        <p className="text-sm text-spotify-gray">
          {stats.total} endpoints across {stats.categories} categories
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="text-white" />
        <StatCard label="GET" value={stats.methods.get} color="text-emerald-400" />
        <StatCard label="POST" value={stats.methods.post} color="text-blue-400" />
        <StatCard label="PUT/DELETE" value={stats.methods.put + stats.methods.delete} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((group) => {
          const tagLower = group.tag.toLowerCase();
          const epCount = group.endpoints.length;
          return (
            <button
              key={group.tag}
              onClick={() => onSelectTag(group.tag)}
              className="glass glass-hover rounded-xl p-5 text-left transition-all duration-200 hover:translate-y-[-2px] group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{TAG_ICONS[tagLower] ?? "📁"}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white capitalize group-hover:text-spotify-green transition-colors">
                    {group.tag}
                  </h3>
                  <p className="text-[11px] text-spotify-dark-500">{epCount} endpoints</p>
                </div>
              </div>
              <p className="text-xs text-spotify-gray leading-relaxed">
                {TAG_DESCRIPTIONS[tagLower] ?? "API endpoints"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-spotify-dark-500 mt-0.5">{label}</p>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import type { EndpointGroup } from "@/types/openapi";
import { fetchOpenApiSchema, groupEndpoints } from "@/services/openApiService";
import { Navbar } from "@/components/docs/Navbar";
import { Sidebar } from "@/components/docs/Sidebar";
import { Dashboard } from "@/components/docs/Dashboard";
import { EndpointList } from "@/components/docs/EndpointList";
import { EndpointCardSkeleton, SidebarSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToastProvider, useToast } from "@/components/ui/Toast";

export default function DocsPage() {
  return (
    <ToastProvider>
      <DocsPageContent />
    </ToastProvider>
  );
}

function DocsPageContent() {
  const { addToast } = useToast();
  const [groups, setGroups] = useState<EndpointGroup[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeEndpointKey, setActiveEndpointKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMeta, setSchemaMeta] = useState({ title: "Loading...", version: "—" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true);
        const schema = await fetchOpenApiSchema();
        const endpointGroups = groupEndpoints(schema);
        setGroups(endpointGroups);
        setSchemaMeta({
          title: schema.info?.title ?? "API Docs",
          version: schema.info?.version ?? "—",
        });
        setLoading(false);

        if (endpointGroups.length > 0) {
          const tagOrder = ["auth", "profile", "artists", "tracks", "history", "etl", "health"];
          const firstTag = tagOrder.find((t) =>
            endpointGroups.some((g) => g.tag.toLowerCase() === t),
          ) ?? endpointGroups[0].tag;

          setTimeout(() => {
            setActiveTag(firstTag);
            setDashboardReady(true);
          }, 100);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load API schema");
        setLoading(false);
        setDashboardReady(true);
      }
    }
    void loadSchema();
  }, [addToast]);

  const handleSelectTag = useCallback((tag: string) => {
    setActiveTag(tag === activeTag ? null : tag);
    setActiveEndpointKey(null);
    setSidebarOpen(false);
  }, [activeTag]);

  const handleSelectEndpoint = useCallback((tag: string, key: string) => {
    setActiveTag(tag);
    setActiveEndpointKey(key);
    setSidebarOpen(false);
  }, []);

  const activeGroup = activeTag
    ? groups.find((g) => g.tag === activeTag)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar
        schemaTitle={schemaMeta.title}
        schemaVersion={schemaMeta.version}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="hidden lg:block w-64 border-r border-glass-border">
            <SidebarSkeleton />
          </div>
        ) : (
          <Sidebar
            groups={groups}
            activeTag={activeTag}
            onSelectTag={handleSelectTag}
            onSelectEndpoint={handleSelectEndpoint}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 min-w-0">
          {loading ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="skeleton-pulse h-7 sm:h-8 w-40 sm:w-48 rounded-lg mb-4 sm:mb-6" />
              {Array.from({ length: 4 }).map((_, i) => (
                <EndpointCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="max-w-lg mx-auto pt-8 sm:pt-16">
              <EmptyState
                icon="⚠️"
                title="Failed to load API schema"
                description={error}
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload(),
                }}
              />
            </div>
          ) : activeGroup ? (
            <div className="max-w-3xl mx-auto">
              <EndpointList
                group={activeGroup}
                activeEndpointKey={activeEndpointKey}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <Dashboard groups={groups} onSelectTag={handleSelectTag} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

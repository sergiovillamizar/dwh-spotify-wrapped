"use client";

import { useState } from "react";
import { Sidebar } from "@/components/docs/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export function DocsLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            groups={[]}
            activeTag={null}
            onSelectTag={() => {}}
            onSelectEndpoint={() => {}}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

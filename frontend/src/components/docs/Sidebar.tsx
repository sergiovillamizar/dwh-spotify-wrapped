"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EndpointGroup } from "@/types/openapi";

interface SidebarProps {
  groups: EndpointGroup[];
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
  onSelectEndpoint: (tag: string, path: string) => void;
  isOpen: boolean;
  onClose: () => void;
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sidebarVariants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, damping: 28, stiffness: 300 },
  },
  exit: {
    x: "-100%",
    transition: { type: "spring" as const, damping: 28, stiffness: 300 },
  },
};

export function Sidebar({
  groups,
  activeTag,
  onSelectTag,
  onSelectEndpoint,
  isOpen,
  onClose,
}: SidebarProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const sidebarContent = (
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
              <div className="mt-1 ml-6 space-y-0.5 overflow-hidden">
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
                          "text-[10px] font-bold uppercase w-10 shrink-0",
                          ep.method === "get" && "text-emerald-500",
                          ep.method === "post" && "text-blue-500",
                          ep.method === "put" && "text-amber-500",
                          ep.method === "delete" && "text-red-500",
                          ep.method === "patch" && "text-purple-500",
                        )}
                      >
                        {ep.method}
                      </span>
                      <span className="text-spotify-gray group-hover:text-white truncate transition-colors text-left">
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
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="sidebar-mobile"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 left-0 z-40 h-full w-72 bg-[#0d0d0d] border-r border-glass-border shadow-2xl overflow-y-auto lg:hidden"
            role="navigation"
            aria-label="API documentation navigation"
          >
            {/* Mobile header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 border-b border-glass-border bg-[#0d0d0d]">
              <span className="text-sm font-semibold text-white">API Endpoints</span>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-spotify-gray hover:text-white transition-colors rounded-lg hover:bg-glass-hover"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-glass-border bg-[#0d0d0d] overflow-y-auto">
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-glass-border bg-[#0d0d0d]">
          <span className="text-xs font-semibold text-spotify-gray uppercase tracking-wider">
            Endpoints
          </span>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}

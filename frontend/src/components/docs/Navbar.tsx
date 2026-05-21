"use client";

import { motion } from "framer-motion";
import { TokenInput } from "@/components/ui/TokenInput";

interface NavbarProps {
  schemaTitle: string;
  schemaVersion: string;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function Navbar({ schemaTitle, schemaVersion, onToggleSidebar, sidebarOpen }: NavbarProps) {
  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const }}
      className="sticky top-0 z-50 border-b border-glass-border bg-[#0a0a0a]/80 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between h-16 px-3 sm:px-4 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-spotify-gray hover:text-white transition-colors rounded-lg hover:bg-glass-hover shrink-0"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </motion.button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <motion.div
              whileHover={{ rotate: -5, scale: 1.05 }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-spotify-green/20 border border-spotify-green/30 flex items-center justify-center shrink-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-spotify-green" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white leading-tight truncate">{schemaTitle}</h1>
              <p className="text-[10px] sm:text-[11px] text-spotify-dark-500">v{schemaVersion} · OpenAPI</p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="hidden sm:block w-48 md:w-64 lg:w-80"
        >
          <TokenInput />
        </motion.div>

        <div className="flex items-center gap-1 sm:gap-2">
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href="https://34-54-8-28.nip.io/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs text-spotify-gray hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-glass-hover"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden md:inline">Swagger UI</span>
          </motion.a>
        </div>
      </div>

      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.25 }}
        className="sm:hidden px-3 pb-3"
      >
        <TokenInput />
      </motion.div>
    </motion.header>
  );
}

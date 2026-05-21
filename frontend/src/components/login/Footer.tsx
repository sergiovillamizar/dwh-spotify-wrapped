"use client";

import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative border-t border-glass-border"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-spotify-green">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-black"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span className="text-xs font-medium text-spotify-gray">
              Mi Spotify Wrapped
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="/docs"
              className="text-xs text-spotify-gray transition-colors hover:text-white"
            >
              API Docs
            </a>
            <a
              href="https://github.com/sergiovillamizar/dwh-spotify-wrapped"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-spotify-gray transition-colors hover:text-white"
            >
              GitHub
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-spotify-dark-500">
            Bases de Datos II — Universidad de Pamplona
          </p>
        </div>
      </div>
    </motion.footer>
  );
}

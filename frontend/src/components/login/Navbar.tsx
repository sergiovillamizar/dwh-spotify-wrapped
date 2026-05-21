"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-spotify-green">
              <svg
                width="18"
                height="18"
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
            <span className="text-sm font-semibold tracking-tight text-white">
              Spotify Wrapped
            </span>
          </Link>

          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/docs"
              className="text-sm text-spotify-gray transition-colors hover:text-white"
            >
              API
            </Link>
            <a
              href="https://github.com/sergiovillamizar/dwh-spotify-wrapped"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-spotify-gray transition-colors hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

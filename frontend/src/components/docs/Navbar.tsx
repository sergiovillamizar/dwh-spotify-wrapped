"use client";

import { TokenInput } from "@/components/ui/TokenInput";

interface NavbarProps {
  schemaTitle: string;
  schemaVersion: string;
  onToggleSidebar: () => void;
}

export function Navbar({ schemaTitle, schemaVersion, onToggleSidebar }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-glass-border bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-spotify-gray hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-spotify-green/20 border border-spotify-green/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-spotify-green" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">{schemaTitle}</h1>
              <p className="text-[11px] text-spotify-dark-500">v{schemaVersion} · OpenAPI</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-80">
          <TokenInput />
        </div>

        <a
          href="https://34-54-8-28.nip.io/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-spotify-gray hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Swagger UI
        </a>
      </div>
      <div className="md:hidden px-4 pb-3">
        <TokenInput />
      </div>
    </header>
  );
}

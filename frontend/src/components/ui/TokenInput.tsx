"use client";

import { useState, useEffect } from "react";

export function TokenInput() {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("docs_bearer_token");
    if (stored) setToken(stored);
  }, []);

  function handleChange(value: string) {
    setToken(value);
    if (value) {
      localStorage.setItem("docs_bearer_token", value);
    } else {
      localStorage.removeItem("docs_bearer_token");
    }
  }

  function handleClear() {
    setToken("");
    localStorage.removeItem("docs_bearer_token");
  }

  async function handleCopy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const masked = token
    ? token.slice(0, 24) + "…" + token.slice(-8)
    : "";

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-xs font-medium text-spotify-gray uppercase tracking-wider">
        <span>Bearer Token</span>
        {token && (
          <button
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Clear
          </button>
        )}
      </label>
      <div className="relative">
        {show ? (
          <input
            type="text"
            value={token}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Paste your JWT token..."
            className="w-full bg-spotify-dark-800 border border-glass-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-spotify-dark-500 focus:outline-none focus:border-spotify-green/50 focus:ring-1 focus:ring-spotify-green/30 transition-all"
          />
        ) : (
          <div
            onClick={() => setShow(true)}
            className="w-full bg-spotify-dark-800 border border-glass-border rounded-lg px-3 py-2 text-sm font-mono text-spotify-gray cursor-text hover:border-glass-border/60 transition-colors"
          >
            {token ? (
              <span className="text-white/80">{masked}</span>
            ) : (
              <span className="text-spotify-dark-500">Click to add token (JWT from /v1/auth/login)</span>
            )}
          </div>
        )}
        {token && !show && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-spotify-gray hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
      <p className="text-[11px] text-spotify-dark-500">
        Token is stored in localStorage and sent as <code className="text-spotify-gray">Authorization: Bearer</code> header.
      </p>
    </div>
  );
}

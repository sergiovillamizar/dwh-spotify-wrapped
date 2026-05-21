"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No se recibió un token de autenticación. Redirigiendo…");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Formato de token inválido");
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expirado");
      }
      setToken(token);
      router.replace("/profile");
    } catch (e) {
      setError("El token de autenticación no es válido. Serás redirigido al inicio de sesión.");
      setTimeout(() => router.replace("/login"), 2000);
    }
  }, [router, searchParams, setToken]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#121212] px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-red-300 max-w-sm">{error}</p>
        <div className="h-1 w-32 rounded-full bg-spotify-dark-700 overflow-hidden">
          <div className="h-full w-full animate-shimmer rounded-full bg-gradient-to-r from-transparent via-spotify-green/50 to-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#121212]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-spotify-green border-t-transparent" />
      <p className="text-sm text-spotify-gray">Autenticando…</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121212] gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-spotify-green border-t-transparent" />
          <p className="text-sm text-spotify-gray">Autenticando…</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

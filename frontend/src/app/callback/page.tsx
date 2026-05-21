"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";

/**
 * OAuth callback page.
 * The backend redirects here after Spotify authentication:
 *   {FRONTEND_URL}/callback?token={jwt}
 *
 * useSearchParams() must be inside a <Suspense> boundary in Next.js 14.
 */

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      router.replace("/profile");
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return null;
}

export default function CallbackPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121212",
        color: "#fff",
        fontSize: "16px",
      }}
    >
      <Suspense fallback={<p>Autenticando…</p>}>
        <CallbackHandler />
      </Suspense>
    </main>
  );
}

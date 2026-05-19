"use client";

// useSearchParams() requires opting out of static generation
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";

/**
 * OAuth callback page.
 * The backend redirects here after Spotify authentication:
 *   {FRONTEND_URL}/callback?token={jwt}
 *
 * Stores the JWT in localStorage and redirects to /profile.
 */
export default function CallbackPage() {
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
      Autenticando…
    </main>
  );
}

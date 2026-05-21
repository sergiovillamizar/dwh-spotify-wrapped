"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      router.replace("/profile");
    } else {
      router.replace("/login");
    }
  }, [router, searchParams, setToken]);

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

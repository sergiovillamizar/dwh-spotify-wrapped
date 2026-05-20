"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isTokenExpired } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Login page — entry point for unauthenticated users.
 * Calls GET /v1/auth/login to obtain the Spotify OAuth URL,
 * then redirects the browser to it.
 */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      router.replace("/profile");
    }
  }, [router]);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/auth/login`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}${text ? ` — ${text}` : ""}`);
      }
      const data = (await res.json()) as { auth_url: string };
      window.location.href = data.auth_url;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar sesión. Intenta de nuevo.",
      );
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Mi Spotify Wrapped</h1>
        <p style={styles.subtitle}>
          Analítica personal de tus hábitos de escucha
        </p>
        <button
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Redirigiendo…" : "Conectar con Spotify"}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#121212",
  },
  card: {
    background: "#181818",
    borderRadius: "12px",
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: "380px",
    width: "100%",
  },
  title: {
    color: "#fff",
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  subtitle: {
    color: "#b3b3b3",
    fontSize: "14px",
    marginBottom: "32px",
  },
  button: {
    background: "#1DB954",
    color: "#000",
    border: "none",
    borderRadius: "500px",
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  error: {
    color: "#f15e6c",
    fontSize: "13px",
    marginTop: "16px",
  },
};

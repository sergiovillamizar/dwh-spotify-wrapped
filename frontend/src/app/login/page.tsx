"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isTokenExpired } from "@/lib/auth";

import styles from "@/app/login/login.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Mi Spotify Wrapped</h1>
        <p className={styles.subtitle}>
          Analítica personal de tus hábitos de escucha
        </p>
        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Redirigiendo…" : "Conectar con Spotify"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  );
}

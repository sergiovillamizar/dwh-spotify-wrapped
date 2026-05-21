"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AnimatedBackground } from "@/components/login/AnimatedBackground";
import { Navbar } from "@/components/login/Navbar";
import { LoginCard } from "@/components/login/LoginCard";
import { FeaturesGrid } from "@/components/login/FeaturesGrid";
import { DashboardPreview } from "@/components/login/DashboardPreview";
import { Footer } from "@/components/login/Footer";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/profile");
    }
  }, [router, isAuthenticated, isHydrated]);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    if (!isOnline) {
      setError("No hay conexión a internet. Verifica tu red e intenta de nuevo.");
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${API_URL}/v1/auth/login`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}${text ? ` — ${text}` : ""}`);
      }
      const data = (await res.json()) as { auth_url: string };
      window.location.href = data.auth_url;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("El servidor no respondió a tiempo. Verifica tu conexión e intenta de nuevo.");
      } else {
        setError(
          e instanceof Error ? e.message : "No se pudo iniciar sesión. Intenta de nuevo.",
        );
      }
      setLoading(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-spotify-green border-t-transparent" />
          <p className="text-sm text-spotify-gray">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <AnimatedBackground />
      <Navbar />

      <main>
        <section className="relative flex min-h-screen items-center justify-center px-4 pt-16">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[600px] w-[600px] rounded-full bg-spotify-green/5 blur-[120px]" />
          </div>

          <div className="relative z-10 w-full max-w-6xl mx-auto">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as const }}
                className="text-center lg:text-left"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-spotify-green" />
                  <span className="text-xs font-medium text-spotify-gray">
                    Data Warehouse Personal
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
                >
                  Tu historia musical
                  <br />
                  <span className="gradient-text">en datos</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                  className="mt-6 text-base leading-relaxed text-spotify-gray sm:text-lg max-w-md mx-auto lg:mx-0"
                >
                  Conecta tu cuenta de Spotify y descubre analíticas profundas de tus
                  hábitos de escucha, potenciadas por un DWH en la nube.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="mt-8 flex flex-wrap items-center gap-4 justify-center lg:justify-start"
                >
                  <div className="flex -space-x-2">
                    {["#1DB954", "#1ED760", "#169C46"].map((color) => (
                      <div
                        key={color}
                        className="h-8 w-8 rounded-full border-2 border-[#0a0a0a]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-spotify-gray">
                    +100 canciones analizadas
                  </span>
                </motion.div>
              </motion.div>

              <div className="flex justify-center lg:justify-end">
                <LoginCard onLogin={handleLogin} loading={loading} error={error} />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-spotify-dark-500">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        <FeaturesGrid />
        <DashboardPreview />
      </main>

      <Footer />
    </>
  );
}

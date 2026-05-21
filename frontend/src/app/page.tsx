"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isHydrated) return;
    if (isAuthenticated) {
      router.replace("/profile");
    } else {
      router.replace("/login");
    }
  }, [router, isAuthenticated, isHydrated, mounted]);

  return null;
}

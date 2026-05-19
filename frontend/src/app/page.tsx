"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, isTokenExpired } from "@/lib/auth";

/**
 * Root page — redirects to /profile if already authenticated,
 * otherwise to /login to start the Spotify OAuth flow.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      router.replace("/profile");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}

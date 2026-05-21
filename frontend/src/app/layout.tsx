import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/styles/tailwind.css";

export const metadata: Metadata = {
  title: "Mi Spotify Wrapped",
  description: "Personal Data Warehouse — Spotify listening analytics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

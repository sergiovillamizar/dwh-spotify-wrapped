import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/styles/tailwind.css";
import { Providers } from "@/providers/Providers";

export const metadata: Metadata = {
  title: "Mi Spotify Wrapped",
  description: "Personal Data Warehouse — Spotify listening analytics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

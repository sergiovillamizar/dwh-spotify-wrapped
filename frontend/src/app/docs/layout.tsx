import type { Metadata } from "next";
import { DocsLayoutClient } from "./layout-client";

export const metadata: Metadata = {
  title: "API Docs | Mi Spotify Wrapped",
  description: "Interactive API documentation for Mi Spotify Wrapped backend",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsLayoutClient>{children}</DocsLayoutClient>;
}

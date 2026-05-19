export function spotifyUserUrl(spotifyId: string): string {
  return `https://open.spotify.com/user/${spotifyId}`;
}

export function formatFollowers(count: number | null | undefined): string {
  if (count == null) return "—";
  return new Intl.NumberFormat(undefined).format(count);
}

export function profileInitials(displayName: string | null | undefined): string {
  const name = displayName?.trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function accountLabel(product: string | null | undefined): string {
  if (!product) return "Unknown";
  return product.toLowerCase() === "premium" ? "Premium" : "Free";
}

export function isPremium(product: string | null | undefined): boolean {
  return product?.toLowerCase() === "premium";
}

/** Formats track duration as mm:ss (e.g. 3:45). */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

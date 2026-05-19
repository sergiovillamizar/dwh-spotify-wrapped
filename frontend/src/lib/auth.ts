export const APP_TOKEN_KEY = "app_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(APP_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(APP_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(APP_TOKEN_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}

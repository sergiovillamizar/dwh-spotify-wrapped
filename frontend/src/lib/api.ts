import { clearToken, getToken } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DEFAULT_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions extends RequestInit {
  timeout?: number;
  apiCache?: {
    ttl: number;
    tags?: string[];
  };
}

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers);

  const hasBody = options.body != null && options.body !== "";
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function parseErrorBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return undefined;
    }
  }
  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

function getCacheKey(path: string): string {
  return `api-cache:${path}`;
}

function getFromCache<T>(path: string): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getCacheKey(path));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(getCacheKey(path));
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

function setCache(path: string, data: unknown, ttl: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const entry: CacheEntry = { data, expiresAt: Date.now() + ttl };
    sessionStorage.setItem(getCacheKey(path), JSON.stringify(entry));
  } catch {
    // sessionStorage lleno o no disponible — ignorar
  }
}

const inflightRequests = new Map<string, Promise<unknown>>();

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const cacheTtl = options.apiCache?.ttl ?? 0;

  if (cacheTtl > 0) {
    const cached = getFromCache<T>(path);
    if (cached !== null) return cached;
  }

  const cacheKey = `fetch:${path}:${JSON.stringify(options.body ?? "")}`;

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = executeFetch<T>(path, options, timeout);
  inflightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (cacheTtl > 0) {
      setCache(path, result, cacheTtl);
    }
    return result;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

async function executeFetch<T>(
  path: string,
  options: ApiOptions,
  timeout: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { timeout: _timeout, apiCache: _apiCache, ...fetchOptions } = options;

    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: buildHeaders(fetchOptions),
    });

    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError("Sesión expirada", 401);
    }

    if (!res.ok) {
      const body = await parseErrorBody(res);
      const detail = body && typeof body === "object" && "detail" in body
        ? String((body as Record<string, unknown>).detail)
        : "";
      throw new ApiError(
        detail || `Error del servidor (${res.status})`,
        res.status,
        body,
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        `El servidor no respondió en ${(timeout / 1000).toFixed(0)}s. Verifica que el backend esté corriendo en ${API_URL}`,
        0,
      );
    }

    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new ApiError(
        `No se pudo conectar con ${API_URL}. Verifica que el backend esté corriendo.`,
        0,
      );
    }

    throw new ApiError(
      err instanceof Error ? err.message : "Error de conexión inesperado",
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

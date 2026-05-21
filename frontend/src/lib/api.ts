import { clearToken, getToken } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DEFAULT_TIMEOUT = 15000;

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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: buildHeaders(options),
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
        "El servidor no respondió a tiempo. Verifica tu conexión e intenta de nuevo.",
        0,
      );
    }

    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new ApiError(
        "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.",
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

import type { ApiResponse } from "@/types/openapi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://34-54-8-28.nip.io";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("docs_bearer_token");
}

export async function executeRequest(
  method: string,
  path: string,
  parameters: Record<string, string>,
  body?: string,
): Promise<ApiResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let url = `${API_BASE}${path}`;
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(parameters)) {
    if (value) queryParams.append(key, value);
  }

  const queryStr = queryParams.toString();
  if (queryStr) url += `?${queryStr}`;

  const start = performance.now();

  try {
    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: body ? body : undefined,
    });

    const duration = Math.round(performance.now() - start);
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await res.json();
    } else {
      responseBody = await res.text();
    }

    return {
      status: res.status,
      body: responseBody,
      headers: resHeaders,
      duration,
    };
  } catch (err) {
    return {
      status: 0,
      body: { error: err instanceof Error ? err.message : "Network error" },
      headers: {},
      duration: Math.round(performance.now() - start),
    };
  }
}

export function generateCurl(
  method: string,
  path: string,
  parameters: Record<string, string>,
  body?: string,
): string {
  const token = getToken();
  let curl = `curl -X ${method.toUpperCase()} `;
  curl += `"${API_BASE}${path}`;

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value) queryParams.append(key, value);
  }
  const queryStr = queryParams.toString();
  if (queryStr) curl += `?${queryStr}`;
  curl += `"`;

  if (token) curl += ` \\\n  -H "Authorization: Bearer ${token}"`;

  if (body) {
    curl += ` \\\n  -H "Content-Type: application/json"`;
    curl += ` \\\n  -d '${body}'`;
  }

  return curl;
}

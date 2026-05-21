import type { OpenApiSchema, EndpointGroup, EndpointInfo, HttpMethod } from "@/types/openapi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://34-54-8-28.nip.io";

export async function fetchOpenApiSchema(): Promise<OpenApiSchema> {
  const res = await fetch(`${API_BASE}/v1/openapi.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
  return res.json();
}

const METHOD_ORDER: Record<HttpMethod, number> = {
  get: 0,
  post: 1,
  put: 2,
  patch: 3,
  delete: 4,
};

function normalizePath(path: string): string {
  return path.replace(/\/v1/g, "");
}

export function groupEndpoints(schema: OpenApiSchema): EndpointGroup[] {
  const tagMap = new Map<string, EndpointInfo[]>();

  for (const [path, pathItem] of Object.entries(schema.paths)) {
    const methods: [string, HttpMethod][] = [
      ["get", "get"],
      ["post", "post"],
      ["put", "put"],
      ["delete", "delete"],
      ["patch", "patch"],
    ];

    for (const [key, method] of methods) {
      const operation = pathItem[key as keyof typeof pathItem] as EndpointInfo["operation"] | undefined;
      if (!operation) continue;

      const tag = operation.tags?.[0] ?? "general";
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push({
        method,
        path: normalizePath(path),
        operation,
        tag,
      });
    }
  }

  const tagOrder = ["auth", "profile", "artists", "tracks", "history", "etl", "health"];
  const groups: EndpointGroup[] = [];

  const sortedTags = [...tagMap.keys()].sort((a, b) => {
    const ai = tagOrder.indexOf(a.toLowerCase());
    const bi = tagOrder.indexOf(b.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const tag of sortedTags) {
    const endpoints = tagMap.get(tag)!;
    endpoints.sort((a, b) => {
      const methodDiff = METHOD_ORDER[a.method] - METHOD_ORDER[b.method];
      if (methodDiff !== 0) return methodDiff;
      return a.path.localeCompare(b.path);
    });
    groups.push({ tag, endpoints });
  }

  return groups;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  post: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  put: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  patch: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  delete: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function getMethodColor(method: HttpMethod): string {
  return METHOD_COLORS[method];
}

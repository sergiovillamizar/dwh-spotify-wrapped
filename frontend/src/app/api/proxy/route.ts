const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://34-54-8-28.nip.io";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/v1/openapi.json`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch schema: ${res.status}` }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

import { NextRequest } from "next/server";

const GW = process.env.GATEWAY_URL ?? "http://localhost:4000";

// Proxy the gateway SSE stream straight to the browser
export async function GET(_req: NextRequest) {
  try {
    const upstream = await fetch(`${GW}/admin/logs/stream`, { cache: "no-store" });
    return new Response(upstream.body, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    });
  } catch {
    return new Response("data: {\"error\":\"gateway_unreachable\"}\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}

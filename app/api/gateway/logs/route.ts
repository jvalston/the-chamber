import { NextRequest } from "next/server";

const GW = process.env.GATEWAY_URL ?? "http://localhost:4000";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// Proxy the gateway SSE stream, aborting the upstream fetch when the client disconnects
export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${GW}/admin/logs/stream`, {
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(upstream.body, { headers: SSE_HEADERS });
  } catch (err: unknown) {
    // Client disconnected or upstream unreachable — don't retry, just close
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) {
      return new Response(null, { status: 204 });
    }
    return new Response('data: {"error":"gateway_unreachable"}\n\n', {
      headers: SSE_HEADERS,
    });
  }
}

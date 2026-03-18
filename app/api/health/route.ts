import { NextResponse } from "next/server";

type Status = "online" | "warn" | "offline";

async function probe(url: string, timeoutMs = 2000): Promise<Status> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    // Any HTTP response (even 4xx) means the port is alive
    return res.status < 500 ? "online" : "warn";
  } catch {
    return "offline";
  }
}

export async function GET() {
  const checks = await Promise.all([
    probe("http://localhost:7880").then(s  => [7880,  s]),
    probe("http://localhost:3000").then(s  => [3000,  s]),
    probe("http://localhost:18790").then(s => [18790, s]),
    probe("http://localhost:8100").then(s  => [8100,  s]),
    probe("http://localhost:8000").then(s  => [8000,  s]),
    probe("http://localhost:6333/healthz").then(s => [6333, s]),
    probe("http://localhost:11434").then(s => [11434, s]),
    probe("http://localhost:8001").then(s  => [8001,  s]),
    probe("http://localhost:8002").then(s  => [8002,  s]),
    probe("http://localhost:4000/health").then(s => [4000, s]),
  ]);

  const result: Record<number, Status> = {};
  for (const [port, status] of checks) {
    result[port as number] = status as Status;
  }

  return NextResponse.json({ ...result, checkedAt: Date.now() });
}

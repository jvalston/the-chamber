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
    // Core
    probe("http://localhost:7880").then(s          => [7880,  s]),
    probe("http://localhost:8787").then(s          => [8787,  s]),
    probe("http://localhost:18789").then(s         => [18789, s]),
    probe("http://localhost:18790").then(s         => [18790, s]),
    probe("http://localhost:8500/health").then(s   => [8500,  s]),
    probe("http://localhost:4000/health").then(s   => [4000,  s]),
    // AI Stack
    probe("http://localhost:8000/health").then(s   => [8000,  s]),
    probe("http://localhost:16333/healthz").then(s => [16333, s]),
    probe("http://localhost:11435").then(s         => [11435, s]),
    probe("http://localhost:8004").then(s          => [8004,  s]),
    probe("http://localhost:11436").then(s         => [11436, s]),
    // Support
    probe("http://localhost:8001").then(s          => [8001,  s]),
    probe("http://localhost:8002").then(s          => [8002,  s]),
    probe("http://localhost:11450").then(s         => [11450, s]),
    probe("http://localhost:11434").then(s         => [11434, s]),
    probe("http://localhost:8880").then(s          => [8880,  s]),
  ]);

  const result: Record<number, Status> = {};
  for (const [port, status] of checks) {
    result[port as number] = status as Status;
  }

  return NextResponse.json({ ...result, checkedAt: Date.now() });
}

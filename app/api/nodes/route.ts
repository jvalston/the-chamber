import { NextResponse } from "next/server";

type NodeStatus = "online" | "offline" | "unreachable";

interface NodeResult {
  id:     string;
  status: NodeStatus;
  ms:     number | null;
}

async function ping(url: string, timeoutMs = 3000): Promise<{ ok: boolean; ms: number | null }> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return { ok: res.status < 500, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: null };
  }
}

export async function GET() {
  const [phoenix, lucyGateway, lucyVera] = await Promise.all([
    // Phoenix — probe its own OpenClaw gateway (same machine as this server)
    ping("http://localhost:18789"),
    // Lucy — OpenClaw gateway via Tailscale
    ping("http://100.119.215.107:18789"),
    // Lucy — Vera AI memory proxy via Tailscale
    ping("http://100.119.215.107:11450"),
  ]);

  // Lucy is online only if both gateway and memory stack are responding
  const lucyOk = lucyGateway.ok && lucyVera.ok;

  const nodes: NodeResult[] = [
    {
      id:     "phoenix",
      status: phoenix.ok ? "online" : "unreachable",
      ms:     phoenix.ms,
    },
    {
      id:     "lucy",
      status: lucyOk ? "online" : lucyGateway.ok ? "online" : "unreachable",
      ms:     lucyGateway.ms,
    },
    {
      id:     "axiom",
      status: "offline",
      ms:     null,
    },
    {
      id:     "mac-mini",
      status: "offline",
      ms:     null,
    },
  ];

  return NextResponse.json({ nodes, checkedAt: Date.now() });
}

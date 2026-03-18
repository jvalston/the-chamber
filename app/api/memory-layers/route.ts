import { NextResponse } from "next/server";
import { createConnection } from "net";

type LayerStatus = "online" | "warn" | "offline" | "static";

async function probeHttp(url: string, timeoutMs = 2000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return true;
  } catch {
    clearTimeout(t);
    return false;
  }
}

async function qdrantCollection(name: string): Promise<number | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  try {
    const r = await fetch(`http://localhost:6333/collections/${name}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    return data?.result?.points_count ?? null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function redisStatus(): Promise<{ connected: boolean; keys: number | null; memory: string | null }> {
  return new Promise((resolve) => {
    const client = createConnection({ host: "localhost", port: 6379 });
    const timer = setTimeout(() => {
      client.destroy();
      resolve({ connected: false, keys: null, memory: null });
    }, 2000);

    const send = (cmd: string) => client.write(cmd + "\r\n");
    let phase = 0;
    let keys: number | null = null;
    let buf = "";

    client.on("connect", () => send("PING"));

    client.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\r\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (phase === 0 && line.startsWith("+PONG")) {
          phase = 1;
          send("DBSIZE");
        } else if (phase === 1 && line.startsWith(":")) {
          keys = parseInt(line.slice(1)) || 0;
          phase = 2;
          send("INFO memory");
        } else if (phase === 2) {
          const m = line.match(/used_memory_human:([^\r\n]+)/);
          if (m) {
            clearTimeout(timer);
            client.destroy();
            resolve({ connected: true, keys, memory: m[1].trim() });
          }
        }
      }
    });

    client.on("error", () => {
      clearTimeout(timer);
      resolve({ connected: false, keys: null, memory: null });
    });
  });
}

export async function GET() {
  const [qdrantOk, lcmOk, redis] = await Promise.all([
    probeHttp("http://localhost:6333/healthz"),
    probeHttp("http://localhost:18790/health"),
    redisStatus(),
  ]);

  // TrueRecall: check memories_tr collection when Qdrant is up
  const trPoints = qdrantOk ? await qdrantCollection("memories_tr") : null;

  // Genesis Mind collections (bonus info)
  const episodicPoints = qdrantOk ? await qdrantCollection("legend_episodic") : null;

  return NextResponse.json({
    truerecall: {
      status: (qdrantOk && trPoints !== null ? "online" : qdrantOk ? "warn" : "offline") as LayerStatus,
      points: trPoints,
      collection: "memories_tr",
      description: "Episodic capture — mem-qdrant-watcher",
    },
    qdrant: {
      status: (qdrantOk ? "online" : "offline") as LayerStatus,
      episodic: episodicPoints,
      description: "Vector store — port 6333",
    },
    lcm: {
      status: (lcmOk ? "online" : "offline") as LayerStatus,
      description: "OpenClaw in-context memory",
    },
    redis: {
      status: (redis.connected ? "online" : "offline") as LayerStatus,
      keys: redis.keys,
      memory: redis.memory,
      description: "Working memory — port 6379",
    },
    archive: {
      status: "static" as LayerStatus,
      description: "File-based — mission-control/agents/",
    },
    checkedAt: Date.now(),
  });
}

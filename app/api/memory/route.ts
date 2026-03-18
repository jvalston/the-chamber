import { NextResponse } from "next/server";

// Redis connection via Docker service name — same agent_network
// REDIS_URL is set in Mission Control's environment; falls back to localhost for dev
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Minimal Redis HTTP bridge: proxy commands through the net/socket connection.
// We use a simple TCP command via node's net module since we don't want to add
// a redis client dep just for the dashboard. For read-only status, this is enough.

async function redisCommand(...args: string[]): Promise<string> {
  const { createConnection } = await import("net");
  return new Promise((resolve, reject) => {
    const url = new URL(REDIS_URL);
    const client = createConnection(
      { host: url.hostname, port: parseInt(url.port || "6379") },
    );
    const inline = "*" + args.length + "\r\n" +
      args.map((a) => "$" + Buffer.byteLength(a) + "\r\n" + a).join("\r\n") +
      "\r\n";

    let buf = "";
    const timer = setTimeout(() => { client.destroy(); reject(new Error("timeout")); }, 3000);

    client.on("data", (d) => {
      buf += d.toString();
      if (buf.includes("\r\n")) {
        clearTimeout(timer);
        client.destroy();
        resolve(buf.trim());
      }
    });
    client.on("error", (e) => { clearTimeout(timer); reject(e); });
    client.write(inline);
  });
}

export async function GET() {
  try {
    const pong = await redisCommand("PING");
    const info  = await redisCommand("INFO", "memory");

    // Parse used_memory_human from INFO output
    const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memHuman = memMatch ? memMatch[1].trim() : "unknown";

    const keysRaw = await redisCommand("DBSIZE");
    const keys = parseInt(keysRaw.replace(/[^0-9]/g, "")) || 0;

    return NextResponse.json({
      connected: pong.includes("PONG"),
      usedMemory: memHuman,
      totalKeys: keys,
      url: REDIS_URL.replace(/\/\/.*@/, "//***@"), // mask credentials if any
    });
  } catch (e) {
    return NextResponse.json(
      { connected: false, error: String(e) },
      { status: 502 }
    );
  }
}

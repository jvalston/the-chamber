import { NextRequest, NextResponse } from "next/server";
import { spawn }                     from "child_process";
import { readFile, writeFile }       from "fs/promises";
import { join }                      from "path";

const ROSTER: Record<string, { node: "lucy" | "phoenix"; gwId: string }> = {
  sentinel:           { node: "lucy",    gwId: "main"     },
  diamond:            { node: "lucy",    gwId: "diamond"  },
  elior:              { node: "lucy",    gwId: "elior"    },
  aurelion:           { node: "lucy",    gwId: "aurelion" },
  atlas:              { node: "lucy",    gwId: "atlas"    },
  seraphim:           { node: "phoenix", gwId: "main"     },
  "sentinel-phoenix": { node: "phoenix", gwId: "sentinel" },
  aurora:             { node: "phoenix", gwId: "aurora"   },
  lumen:              { node: "phoenix", gwId: "lumen"    },
  legend:             { node: "phoenix", gwId: "legend"   },
  kairo:              { node: "phoenix", gwId: "kairo"    },
  veris:              { node: "phoenix", gwId: "veris"    },
};

const PHOENIX_NODE     = "/usr/bin/node";
const PHOENIX_OPENCLAW = "/home/natza/.npm-global/lib/node_modules/openclaw/dist/index.js";
const LUCY_SSH_HOST    = process.env.LUCY_SSH_HOST ?? "100.119.215.107";
const LUCY_SSH_USER    = process.env.LUCY_SSH_USER ?? "nana";
const LUCY_OPENCLAW    = "/usr/bin/openclaw";
const LOG_PATH         = join(process.cwd(), "data", "comms-log.json");

interface BroadcastMessage {
  agentId:    string;
  message:    string;
  sessionId?: string;
}

function sendOne(item: BroadcastMessage): Promise<{
  agentId: string;
  ok:      boolean;
  node:    string;
  response: string;
  error:   string | null;
  entry:   Record<string, unknown>;
}> {
  const { agentId, message, sessionId } = item;
  const entry_def = ROSTER[agentId.toLowerCase()];
  const ts   = new Date().toISOString();
  const node = entry_def?.node ?? "unknown";

  if (!entry_def) {
    const entry = { id: `${Date.now()}`, ts, agentId, node, message, response: "", error: `Unknown agent: ${agentId}`, sessionId: sessionId ?? null };
    return Promise.resolve({ agentId, ok: false, node, response: "", error: entry.error, entry });
  }

  const { gwId } = entry_def;
  const msgB64      = Buffer.from(message).toString("base64");
  const sessionFlag = sessionId ? `--session-id '${sessionId}' ` : "";

  let wslCmd: string;
  if (node === "phoenix") {
    wslCmd = [
      `MSG=$(printf '%s' '${msgB64}' | base64 -d)`,
      `&& ${PHOENIX_NODE} ${PHOENIX_OPENCLAW}`,
      `agent --agent ${gwId}`,
      `--message "$MSG"`,
      sessionFlag,
      `--json 2>&1`,
    ].join(" ");
  } else {
    const remoteCmd = [
      `MSG=$(printf '%s' '${msgB64}' | base64 -d)`,
      `&& ${LUCY_OPENCLAW} agent --agent ${gwId}`,
      `--message "$MSG"`,
      sessionFlag,
      `--json 2>&1`,
    ].join(" ");
    wslCmd = `ssh -i ~/.ssh/lucy -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 ${LUCY_SSH_USER}@${LUCY_SSH_HOST} '${remoteCmd}'`;
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("wsl", ["-e", "bash", "-c", wslCmd], { timeout: 180_000 });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", async (code) => {
      let response = stdout.trim();
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        response = (parsed.content ?? parsed.response ?? parsed.text ?? parsed.message ?? response) as string;
      } catch {
        response = response
          .split("\n")
          .filter((l) => !l.startsWith("🦞") && l.trim() !== "")
          .join("\n")
          .trim();
      }

      const ok    = code === 0;
      const error = ok ? null : (stderr.trim() || response || "Command failed");
      const entry = { id: `${Date.now()}-${agentId}`, ts, agentId: agentId.toLowerCase(), node, message, response, error, sessionId: sessionId ?? null };

      resolve({ agentId, ok, node, response, error, entry });
    });

    proc.on("error", (err) => {
      const entry = { id: `${Date.now()}-${agentId}`, ts, agentId, node, message, response: "", error: err.message, sessionId: sessionId ?? null };
      resolve({ agentId, ok: false, node, response: "", error: err.message, entry });
    });
  });
}

// ---------------------------------------------------------------------------
// POST /api/comms/broadcast
// Body: { messages: Array<{ agentId: string, message: string, sessionId?: string }> }
// Fires all sends in parallel, returns per-agent results.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { messages?: BroadcastMessage[] };
  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // Validate all entries before firing
  const invalid = messages.filter((m) => !m.agentId?.trim() || !m.message?.trim());
  if (invalid.length > 0) {
    return NextResponse.json({ error: "Each message must have agentId and message", invalid }, { status: 400 });
  }

  // Fire all in parallel
  const results = await Promise.all(messages.map(sendOne));

  // Append all entries to the log
  try {
    const existing = JSON.parse(
      await readFile(LOG_PATH, "utf8").catch(() => "[]")
    ) as unknown[];
    results.forEach((r) => existing.push(r.entry));
    await writeFile(LOG_PATH, JSON.stringify(existing.slice(-500), null, 2));
  } catch { /* non-fatal */ }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}

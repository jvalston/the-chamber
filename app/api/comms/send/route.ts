import { NextRequest, NextResponse } from "next/server";
import { spawn }                     from "child_process";
import { readFile, writeFile }       from "fs/promises";
import { join }                      from "path";

// ---------------------------------------------------------------------------
// Agent roster — maps UI agent ID → { node, gatewayAgentId }
//
//  Lucy  WSL (SSH user@host): main=Sentinel, diamond, elior, aurelion, atlas
//  Phoenix WSL (local wsl -e bash): main=Seraphim, aurora, lumen, legend, kairo, veris
// ---------------------------------------------------------------------------
const ROSTER: Record<string, { node: "lucy" | "phoenix"; gwId: string }> = {
  sentinel:  { node: "lucy",    gwId: "main"     },
  diamond:   { node: "lucy",    gwId: "diamond"  },
  elior:     { node: "lucy",    gwId: "elior"    },
  aurelion:  { node: "lucy",    gwId: "aurelion" },
  atlas:     { node: "lucy",    gwId: "atlas"    },
  hermes:    { node: "lucy",    gwId: "hermes"   },
  persephone:{ node: "phoenix", gwId: "persephone" },
  seraphim:          { node: "phoenix", gwId: "main"     },
  "sentinel-phoenix": { node: "phoenix", gwId: "sentinel" },
  aurora:    { node: "phoenix", gwId: "aurora"   },
  lumen:     { node: "phoenix", gwId: "lumen"    },
  legend:    { node: "phoenix", gwId: "legend"   },
  kairo:     { node: "phoenix", gwId: "kairo"    },
  veris:     { node: "phoenix", gwId: "veris"    },
  olympus:   { node: "phoenix", gwId: "olympus"  },
  "sentinel-axiom": { node: "axiom" as "lucy",   gwId: "main"    },
};

// ---------------------------------------------------------------------------
// Gateway paths
// ---------------------------------------------------------------------------

// Phoenix WSL command (env-overridable for portability)
const PHOENIX_OPENCLAW_BIN = process.env.PHOENIX_OPENCLAW_BIN ?? "/usr/bin/openclaw";

// Lucy WSL — SSH then use system openclaw binary
const LUCY_SSH_HOST = process.env.LUCY_SSH_HOST ?? "100.119.215.107";
const LUCY_SSH_USER = process.env.LUCY_SSH_USER ?? "nana";
const LUCY_OPENCLAW = process.env.LUCY_OC_BIN ?? "/home/nana/.npm-global/bin/openclaw";

const LOG_PATH = join(process.cwd(), "data", "comms-log.json");

// ---------------------------------------------------------------------------
// POST /api/comms/send
// Body: { agentId: string, message: string, sessionId?: string }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const { agentId, message, sessionId } = body;

  if (!agentId?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "agentId and message are required" }, { status: 400 });
  }

  const entry_def = ROSTER[agentId.toLowerCase()];
  if (!entry_def) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
  }

  const { node, gwId } = entry_def;
  const ts = new Date().toISOString();

  // Base64-encode the message to safely pass through shell layers
  const msgB64 = Buffer.from(message).toString("base64");
  const sessionFlag = sessionId ? `--session-id '${sessionId}' ` : "";

  let wslCmd: string;

  if (node === "phoenix") {
    // Run openclaw directly in Phoenix WSL — gateway is on localhost:18789
    wslCmd = [
      `MSG=$(printf '%s' '${msgB64}' | base64 -d)`,
      `&& ${PHOENIX_OPENCLAW_BIN}`,
      `agent --agent ${gwId}`,
      `--message "$MSG"`,
      sessionFlag,
      `--json 2>&1`,
    ].join(" ");
  } else {
    // SSH to Lucy WSL — gateway is on localhost:18789 there
    const remoteCmd = [
      `MSG=$(printf '%s' '${msgB64}' | base64 -d)`,
      `&& ${LUCY_OPENCLAW} agent --agent ${gwId}`,
      `--message "$MSG"`,
      sessionFlag,
      `--json 2>&1`,
    ].join(" ");

    wslCmd = `ssh -i ~/.ssh/lucy -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 ${LUCY_SSH_USER}@${LUCY_SSH_HOST} '${remoteCmd}'`;
  }

  return new Promise<NextResponse>((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("wsl", ["-e", "bash", "-c", wslCmd], {
      timeout: 180_000,
    });

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", async (code) => {
      // Parse response — filter out openclaw banner lines
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

      const logEntry = {
        id:        `${Date.now()}`,
        ts,
        agentId:   agentId.toLowerCase(),
        node,
        message,
        response,
        error:     code !== 0 ? (stderr.trim() || response || "Command failed") : null,
        sessionId: sessionId ?? null,
      };

      // Persist to log
      try {
        const existing = JSON.parse(
          await readFile(LOG_PATH, "utf8").catch(() => "[]")
        ) as unknown[];
        existing.push(logEntry);
        await writeFile(LOG_PATH, JSON.stringify(existing.slice(-500), null, 2));
      } catch { /* non-fatal */ }

      if (code !== 0) {
        resolve(NextResponse.json({ error: logEntry.error, entry: logEntry, node }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, response, entry: logEntry, node }));
      }
    });

    proc.on("error", async (err) => {
      resolve(NextResponse.json({ error: err.message, node }, { status: 500 }));
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type NodeTarget = "phoenix" | "lucy";

interface AgentRow {
  node: NodeTarget;
  agentId: string;
  name: string;
  profile: string | null;
  elevated: boolean;
  effectiveProfile: string;
}

const PHOENIX_OPENCLAW_JSON = "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\openclaw.json";
const LUCY_OPENCLAW_JSON = "/home/nana/.openclaw/openclaw.json";

const LUCY_SSH_HOST = process.env.LUCY_SSH_HOST ?? "100.119.215.107";
const LUCY_SSH_USER = process.env.LUCY_SSH_USER ?? "nana";
const LUCY_SSH_KEY  = process.env.LUCY_SSH_KEY  ?? "~/.ssh/lucy";

function shSingleQuote(input: string) {
  return `'${input.replace(/'/g, `"'"'`)}'`;
}

async function execWsl(cmd: string, timeoutMs = 120_000) {
  try {
    const result = await execAsync(`wsl -e bash -lc ${JSON.stringify(cmd)}`, { timeout: timeoutMs });
    return { out: (result.stdout + result.stderr).trim(), ok: true };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { out: ((err.stdout ?? "") + (err.stderr ?? err.message ?? "")).trim(), ok: false };
  }
}

function parseRows(node: NodeTarget, rawCfg: unknown): AgentRow[] {
  const cfg = rawCfg as {
    agents?: {
      defaults?: { tools?: { profile?: string } };
      list?: Array<{ id?: string; name?: string; tools?: { profile?: string; elevated?: { enabled?: boolean } } }>;
    };
  };

  const defaultProfile = cfg.agents?.defaults?.tools?.profile ?? "full";
  const list = cfg.agents?.list ?? [];

  return list
    .filter((a) => !!a.id)
    .map((a) => ({
      node,
      agentId: String(a.id),
      name: a.name && a.name.trim().length > 0 ? a.name : String(a.id),
      profile: a.tools?.profile ?? null,
      elevated: Boolean(a.tools?.elevated?.enabled),
      effectiveProfile: a.tools?.profile ?? defaultProfile,
    }));
}

function readPhoenixConfig() {
  if (!existsSync(PHOENIX_OPENCLAW_JSON)) {
    throw new Error(`Missing Phoenix config: ${PHOENIX_OPENCLAW_JSON}`);
  }
  return JSON.parse(readFileSync(PHOENIX_OPENCLAW_JSON, "utf8"));
}

async function readLucyConfig() {
  const cmd = [
    "ssh",
    "-i", LUCY_SSH_KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    `${LUCY_SSH_USER}@${LUCY_SSH_HOST}`,
    shSingleQuote(`cat ${LUCY_OPENCLAW_JSON}`),
  ].join(" ");

  const res = await execWsl(cmd, 30_000);
  if (!res.ok) throw new Error(`Lucy SSH read failed: ${res.out}`);

  try {
    return JSON.parse(res.out);
  } catch {
    throw new Error("Lucy config parse failed");
  }
}

function updateAgentToolsInConfig(rawCfg: unknown, agentId: string, profile: string | null, elevated: boolean | null) {
  const cfg = rawCfg as {
    agents?: {
      list?: Array<{ id?: string; tools?: { profile?: string; elevated?: { enabled?: boolean } } }>;
    };
  };

  const list = cfg.agents?.list;
  if (!list) throw new Error("Invalid config: agents.list missing");

  const agent = list.find((a) => a.id === agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  if (!agent.tools) agent.tools = {};

  if (profile === null) {
    delete agent.tools.profile;
  } else {
    agent.tools.profile = profile;
  }

  if (elevated !== null) {
    if (!agent.tools.elevated) agent.tools.elevated = {};
    agent.tools.elevated.enabled = elevated;
  }

  if (!agent.tools.profile && !agent.tools.elevated) {
    delete agent.tools;
  }

  return cfg;
}

async function restartGateway(node: NodeTarget) {
  if (node === "phoenix") {
    await execWsl("systemctl --user restart openclaw-gateway.service || true", 20_000);
    return;
  }

  const cmd = [
    "ssh",
    "-i", LUCY_SSH_KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    `${LUCY_SSH_USER}@${LUCY_SSH_HOST}`,
    shSingleQuote("systemctl --user restart openclaw-gateway.service || true"),
  ].join(" ");

  await execWsl(cmd, 30_000);
}

async function writeLucyConfig(cfg: unknown) {
  const b64 = Buffer.from(JSON.stringify(cfg)).toString("base64");
  const py = [
    "python3 - <<'PY'",
    "import base64",
    "p='" + LUCY_OPENCLAW_JSON + "'",
    "data=base64.b64decode('" + b64 + "').decode('utf-8')",
    "open(p, 'w', encoding='utf-8').write(data)",
    "print('ok')",
    "PY",
  ].join("\n");

  const cmd = [
    "ssh",
    "-i", LUCY_SSH_KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    `${LUCY_SSH_USER}@${LUCY_SSH_HOST}`,
    shSingleQuote(py),
  ].join(" ");

  const res = await execWsl(cmd, 30_000);
  if (!res.ok || !res.out.includes("ok")) {
    throw new Error(`Lucy write failed: ${res.out}`);
  }
}

export async function GET() {
  try {
    const [phoenixCfg, lucyCfg] = await Promise.all([Promise.resolve(readPhoenixConfig()), readLucyConfig()]);
    const stars = [...parseRows("phoenix", phoenixCfg), ...parseRows("lucy", lucyCfg)]
      .sort((a, b) => (a.node + a.name).localeCompare(b.node + b.name));

    return NextResponse.json({ stars });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      node?: NodeTarget;
      agentId?: string;
      profile?: string | null;
      elevated?: boolean | null;
    };

    if (!body.node || !body.agentId) {
      return NextResponse.json({ error: "node and agentId are required" }, { status: 400 });
    }

    const node = body.node;
    const agentId = body.agentId;

    const profile = body.profile === undefined ? null : body.profile;
    const normalizedProfile = (profile === null || profile === "" || profile === "inherit") ? null : profile;
    const elevated = body.elevated === undefined ? null : body.elevated;

    if (node === "phoenix") {
      const cfg = readPhoenixConfig();
      const updated = updateAgentToolsInConfig(cfg, agentId, normalizedProfile, elevated);
      writeFileSync(PHOENIX_OPENCLAW_JSON, JSON.stringify(updated, null, 2));
    } else {
      const cfg = await readLucyConfig();
      const updated = updateAgentToolsInConfig(cfg, agentId, normalizedProfile, elevated);
      await writeLucyConfig(updated);
    }

    await restartGateway(node);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

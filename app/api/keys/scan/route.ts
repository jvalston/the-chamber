import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat }   from "fs/promises";
import { join, extname, basename }   from "path";
import type { KeyEntry }             from "../route";

// ---------------------------------------------------------------------------
// Smart guessing — infer provider + belongsTo from variable name
// ---------------------------------------------------------------------------
const PROVIDER_MAP: [RegExp, string][] = [
  [/DISCORD/i,    "Discord"],
  [/OPENROUTER/i, "OpenRouter"],
  [/OPENAI/i,     "OpenAI"],
  [/ANTHROPIC/i,  "Anthropic"],
  [/GITHUB/i,     "GitHub"],
  [/REDIS/i,      "Redis"],
  [/OBSIDIAN/i,   "Obsidian"],
  [/TELEGRAM/i,   "Telegram"],
  [/TAILSCALE/i,  "Tailscale"],
  [/GATEWAY/i,    "OpenClaw"],
  [/GROQ/i,       "Groq"],
  [/CEREBRAS/i,   "Cerebras"],
  [/NOTION/i,     "Notion"],
  [/STRIPE/i,     "Stripe"],
  [/SUPABASE/i,   "Supabase"],
  [/LUCY/i,       "Lucy"],
  [/PHOENIX/i,    "Phoenix"],
  [/AXIOM/i,      "Axiom"],
  [/SSH/i,        "SSH"],
];

const AGENT_NAMES = [
  "LEGEND", "SENTINEL", "SERAPHIM", "AURORA", "LUMEN",
  "DIAMOND", "ELIOR", "AURELION", "ATLAS", "KAIRO", "VERIS",
];

function guessProvider(name: string): string {
  for (const [re, label] of PROVIDER_MAP) {
    if (re.test(name)) return label;
  }
  return "";
}

function guessBelongsTo(name: string): string {
  const upper = name.toUpperCase();
  for (const agent of AGENT_NAMES) {
    if (upper.includes(agent)) return agent.charAt(0) + agent.slice(1).toLowerCase();
  }
  if (/MISSION.?CONTROL|MC_/i.test(name)) return "Mission Control";
  if (/OPENCLAW/i.test(name))             return "OpenClaw";
  return "";
}

// ---------------------------------------------------------------------------
// Parse a single .env file → array of { variable, value }
// ---------------------------------------------------------------------------
function parseEnv(content: string): { variable: string; value: string }[] {
  const results: { variable: string; value: string }[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const variable = line.slice(0, eq).trim();
    let   value    = line.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (variable && value) results.push({ variable, value });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Resolve a Linux/WSL path to Windows-accessible path
// ---------------------------------------------------------------------------
function resolvePath(p: string): string {
  if (/^[A-Za-z]:/.test(p)) return p;
  if (p.startsWith("/")) return "\\\\wsl.localhost\\Ubuntu" + p.replace(/\//g, "\\");
  return p;
}

// ---------------------------------------------------------------------------
// Find .env files in a directory (non-recursive, skip node_modules/.next)
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);
const ENV_NAMES = new Set([".env", ".env.local", ".env.development", ".env.production",
                           ".env.development.local", ".env.production.local", ".env.test"]);

async function findEnvFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      if (e.isFile()) {
        const name = e.name;
        const ext  = extname(name);
        if (ENV_NAMES.has(name) || ext === ".env" || name.endsWith(".env.local")) {
          found.push(join(dir, name));
        }
      }
    }
  } catch { /* skip unreadable dirs */ }
  return found;
}

// ---------------------------------------------------------------------------
// Default scan paths — mission-control dir + common WSL agent workspace paths
// ---------------------------------------------------------------------------
const DEFAULT_PATHS = [
  process.cwd(),                                           // mission-control root
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-sentinel",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-aurora",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-lumen",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-legend",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-kairo",
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace-veris",
];

// ---------------------------------------------------------------------------
// POST /api/keys/scan
// Body: { paths?: string[] }   — additional paths to scan
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body  = await req.json().catch(() => ({})) as { paths?: string[] };
  const extra = (body.paths ?? []).map(resolvePath);
  const paths = [...DEFAULT_PATHS, ...extra];

  // Load existing keys to check duplicates
  let existing: KeyEntry[] = [];
  try {
    const raw = await readFile(join(process.cwd(), "data", "keys.json"), "utf8");
    existing = JSON.parse(raw) as KeyEntry[];
  } catch { /* empty */ }

  const existingVars = new Set(existing.map((k) => k.targetVariable || k.name));

  // Scan each path
  const results: {
    file:       string;
    variable:   string;
    value:      string;
    provider:   string;
    belongsTo:  string;
    alreadyIn:  boolean;
  }[] = [];

  for (const dir of paths) {
    let envFiles: string[] = [];
    try {
      const s = await stat(dir);
      if (s.isDirectory()) {
        envFiles = await findEnvFiles(dir);
      } else if (s.isFile()) {
        envFiles = [dir];
      }
    } catch { continue; }

    for (const filePath of envFiles) {
      try {
        const content = await readFile(filePath, "utf8");
        const pairs   = parseEnv(content);
        for (const { variable, value } of pairs) {
          results.push({
            file:      filePath,
            variable,
            value,
            provider:  guessProvider(variable),
            belongsTo: guessBelongsTo(variable),
            alreadyIn: existingVars.has(variable),
          });
        }
      } catch { /* skip unreadable files */ }
    }
  }

  // Deduplicate by variable name (keep first occurrence)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.variable)) return false;
    seen.add(r.variable);
    return true;
  });

  return NextResponse.json(deduped);
}

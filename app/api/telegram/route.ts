import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const GROUP_ID = process.env.TELEGRAM_GROUP_ID ?? "-1003856070530";
const TG = "https://api.telegram.org/bot";

const AGENTS = [
  { name: "Seraphim",   key: "SERAPHIM",   machine: "phoenix", username: "@SeraphimSignal_bot" },
  { name: "Diamond",    key: "DIAMOND",    machine: "phoenix", username: "@Diamondbuild_bot"   },
  { name: "Sentinel",   key: "SENTINEL",   machine: "phoenix", username: "@Sentinelucy_bot"    },
  { name: "Lumen",      key: "LUMEN",      machine: "phoenix", username: "@Lumenlum_bot"       },
  { name: "Elior",      key: "ELIOR",      machine: "phoenix", username: "@Elioreli_bot"       },
  { name: "Kairo",      key: "KAIRO",      machine: "phoenix", username: "@Kairokai_bot"       },
  { name: "Veris",      key: "VERIS",      machine: "phoenix", username: "@Verisver_bot"       },
  { name: "Legend",     key: "LEGEND",     machine: "phoenix", username: "@Legendleg_bot"      },
  { name: "Atlas",      key: "ATLAS",      machine: "phoenix", username: "@Atlasatl_bot"       },
  { name: "Olympus",    key: "OLYMPUS",    machine: "phoenix", username: "@Olympusphx_bot"     },
  { name: "Hermes",     key: "HERMES",     machine: "lucy",    username: "@Hermeslucy_bot"     },
  { name: "Aurora",     key: "AURORA",     machine: "phoenix", username: "@Auroraro_bot"       },
  { name: "Aurelion",   key: "AURELION",   machine: "phoenix", username: "@Aurelionaur_bot"    },
  { name: "Persephone", key: "PERSEPHONE", machine: "phoenix", username: "@Persephonesep_bot"  },
];

async function checkBot(token: string) {
  try {
    const r = await fetch(`${TG}${token}/getMe`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.ok ? d.result : null;
  } catch {
    return null;
  }
}

// Read saved chat log if it exists
function readChatLog(): ChatEntry[] {
  try {
    const logPath = path.join(process.cwd(), "data", "telegram-log.json");
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export interface BotStatus {
  name:     string;
  machine:  string;
  username: string | null;
  token:    boolean;  // has token configured
  online:   boolean;  // getMe succeeded
  botInfo:  { id: number; username: string; first_name: string } | null;
}

export interface ChatEntry {
  id:        number;
  ts:        number;
  from:      string;
  agentName: string | null;
  text:      string;
  saved:     boolean;
}

export async function GET() {
  // Check all bots in parallel
  const statuses: BotStatus[] = await Promise.all(
    AGENTS.map(async (a) => {
      const token = process.env[`TELEGRAM_TOKEN_${a.key}`];
      const botInfo = token ? await checkBot(token) : null;
      return {
        name:     a.name,
        machine:  a.machine,
        username: botInfo?.username ? `@${botInfo.username}` : (a.username ?? null),
        token:    !!token,
        online:   !!botInfo,
        botInfo:  botInfo ? {
          id:         botInfo.id,
          username:   botInfo.username,
          first_name: botInfo.first_name,
        } : null,
      };
    })
  );

  const log = readChatLog();

  return NextResponse.json({ statuses, log, groupId: GROUP_ID });
}

// POST: save current chat log to Documents and mark for pipeline routing
export async function POST(req: Request) {
  try {
    const { entries, action } = await req.json();

    if (action === "save_log" && Array.isArray(entries)) {
      const logPath = path.join(process.cwd(), "data", "telegram-log.json");
      const existing = readChatLog();
      const ids = new Set(existing.map((e: ChatEntry) => e.id));
      const merged = [...existing, ...entries.filter((e: ChatEntry) => !ids.has(e.id))];
      merged.sort((a, b) => a.ts - b.ts);
      fs.writeFileSync(logPath, JSON.stringify(merged, null, 2));

      // Write human-readable transcript for Documents → Lumen → Elior pipeline
      const transcript = merged.map((e: ChatEntry) => {
        const d = new Date(e.ts * 1000).toLocaleString("en-US");
        const who = e.agentName ?? e.from;
        return `[${d}] ${who}: ${e.text}`;
      }).join("\n");

      const docsPath = path.join(process.cwd(), "data", "telegram-transcript.txt");
      fs.writeFileSync(docsPath, transcript);

      return NextResponse.json({ ok: true, saved: merged.length, transcriptPath: docsPath });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

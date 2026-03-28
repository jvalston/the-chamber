import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "blueprints.json");
const OBSIDIAN_URL = process.env.OBSIDIAN_API_URL ?? "http://127.0.0.1:27123";
const OBSIDIAN_KEY = process.env.OBSIDIAN_API_KEY ?? "";
const GATEWAY_URL  = process.env.GATEWAY_URL ?? "http://localhost:4000";

interface Blueprint {
  id: string;
  title: string;
  category: "Tech" | "Music" | "General";
  target: string;
  content: string;
  status: "inbox" | "promoted" | "archive";
  createdAt: string;
  projectId?: string;
}

function read(): { blueprints: Blueprint[] } {
  if (!existsSync(FILE)) return { blueprints: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function save(data: { blueprints: Blueprint[] }) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Best-effort write to Obsidian vault
async function writeToObsidian(bp: Blueprint) {
  const safeName = bp.title.replace(/[\\/:*?"<>|]/g, "_");
  const path = `Blueprints/${bp.category}/${safeName}.md`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const md = `---
title: "${bp.title}"
category: ${bp.category}
target: ${bp.target}
status: ${bp.status}
created: ${bp.createdAt}
---

${bp.content}
`;
  try {
    await fetch(`${OBSIDIAN_URL}/vault/${encodedPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${OBSIDIAN_KEY}`,
        "Content-Type": "text/markdown",
      },
      body: md,
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Obsidian offline — local JSON is the source of truth
  }
}

// Notify Scribe via OpenClaw gateway (best-effort — never blocks the response)
async function notifyScribe(bp: Blueprint, action: "new" | "promoted") {
  try {
    await fetch(`${GATEWAY_URL}/agent/scribe/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "mission-control",
        type:    action === "new" ? "blueprint.created" : "blueprint.promoted",
        payload: {
          id:       bp.id,
          title:    bp.title,
          category: bp.category,
          target:   bp.target,
          content:  bp.content,
          status:   bp.status,
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Gateway offline — pipeline continues locally
  }
}

// Log to Elior via OpenClaw gateway (best-effort)
async function notifyElior(bp: Blueprint, event: string) {
  try {
    await fetch(`${GATEWAY_URL}/agent/elior/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "mission-control",
        type:    "blueprint.record",
        payload: {
          event,
          blueprintId: bp.id,
          title:       bp.title,
          category:    bp.category,
          target:      bp.target,
          timestamp:   new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Gateway offline — record will be reconstructed from blueprints.json
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const data = read();

  if (id) {
    const bp = data.blueprints.find((b) => b.id === id);
    if (!bp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bp);
  }

  return NextResponse.json({ blueprints: data.blueprints });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  // PATCH — update status / link project
  if (body._action === "patch" && body.id) {
    const { _action, id, ...updates } = body;
    void _action;
    data.blueprints = data.blueprints.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    save(data);

    // If blueprint was promoted → notify Scribe and have Elior record it
    const updated = data.blueprints.find((b) => b.id === id);
    if (updated && updates.status === "promoted") {
      notifyScribe(updated, "promoted");
      notifyElior(updated, "blueprint.promoted");
    }

    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (body._action === "delete" && body.id) {
    data.blueprints = data.blueprints.filter((b) => b.id !== body.id);
    save(data);
    return NextResponse.json({ ok: true });
  }

  // CREATE
  const bp: Blueprint = {
    id: `bp${Date.now()}`,
    title: body.title ?? "Untitled",
    category: body.category ?? "General",
    target: body.target ?? "all",
    content: body.content ?? "",
    status: "inbox",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  data.blueprints.unshift(bp);
  save(data);

  // Fire-and-forget: Obsidian mirror + Scribe notification + Elior record
  writeToObsidian(bp);
  notifyScribe(bp, "new");
  notifyElior(bp, "blueprint.created");

  return NextResponse.json(bp);
}

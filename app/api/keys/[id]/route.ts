import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile }       from "fs/promises";
import { join }                      from "path";
import type { KeyEntry }             from "../route";

const KEYS_PATH = join(process.cwd(), "data", "keys.json");

async function loadKeys(): Promise<KeyEntry[]> {
  try { return JSON.parse(await readFile(KEYS_PATH, "utf8")) as KeyEntry[]; }
  catch { return []; }
}
async function saveKeys(keys: KeyEntry[]) {
  await writeFile(KEYS_PATH, JSON.stringify(keys, null, 2));
}

// GET /api/keys/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keys   = await loadKeys();
  const entry  = keys.find((k) => k.id === id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

// PUT /api/keys/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params;
  const body    = await req.json().catch(() => ({})) as Partial<KeyEntry>;
  const keys    = await loadKeys();
  const idx     = keys.findIndex((k) => k.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  keys[idx] = { ...keys[idx], ...body, id };
  await saveKeys(keys);
  return NextResponse.json(keys[idx]);
}

// DELETE /api/keys/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keys   = await loadKeys();
  const idx    = keys.findIndex((k) => k.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  keys.splice(idx, 1);
  await saveKeys(keys);
  return NextResponse.json({ ok: true });
}

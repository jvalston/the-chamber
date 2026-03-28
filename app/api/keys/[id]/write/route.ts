import { NextRequest, NextResponse } from "next/server";
import { readFile }                  from "fs/promises";
import { join }                      from "path";
import { writeEnvVariable }          from "../../../../../lib/env-writer";
import type { KeyEntry }             from "../../route";

const KEYS_PATH = join(process.cwd(), "data", "keys.json");

// POST /api/keys/[id]/write
// Writes the key value to its configured target file + variable
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let keys: KeyEntry[] = [];
  try { keys = JSON.parse(await readFile(KEYS_PATH, "utf8")) as KeyEntry[]; }
  catch { return NextResponse.json({ error: "Could not load keys" }, { status: 500 }); }

  const entry = keys.find((k) => k.id === id);
  if (!entry) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  if (!entry.targetFile?.trim()) {
    return NextResponse.json({ error: "No target file set for this key" }, { status: 400 });
  }
  if (!entry.targetVariable?.trim()) {
    return NextResponse.json({ error: "No target variable name set for this key" }, { status: 400 });
  }

  const result = await writeEnvVariable(entry.targetFile, entry.targetVariable, entry.value);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: result.action, targetFile: entry.targetFile });
}

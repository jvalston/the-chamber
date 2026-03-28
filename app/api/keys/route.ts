import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile }       from "fs/promises";
import { join }                      from "path";
import { randomUUID }                from "crypto";

export interface KeyEntry {
  id:             string;
  name:           string;
  provider:       string;
  belongsTo:      string;
  value:          string;
  createdAt:      string;
  rotatedAt:      string | null;
  notes:          string;
  targetFile:     string;
  targetVariable: string;
  status:         "active" | "rotated" | "inactive";
}

const KEYS_PATH = join(process.cwd(), "data", "keys.json");

async function loadKeys(): Promise<KeyEntry[]> {
  try {
    return JSON.parse(await readFile(KEYS_PATH, "utf8")) as KeyEntry[];
  } catch {
    return [];
  }
}

async function saveKeys(keys: KeyEntry[]): Promise<void> {
  await writeFile(KEYS_PATH, JSON.stringify(keys, null, 2));
}

// GET /api/keys
export async function GET() {
  const keys = await loadKeys();
  return NextResponse.json(keys);
}

// POST /api/keys
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Partial<KeyEntry>;

  if (!body.name?.trim() || !body.value?.trim()) {
    return NextResponse.json({ error: "name and value are required" }, { status: 400 });
  }

  const keys = await loadKeys();
  const entry: KeyEntry = {
    id:             randomUUID(),
    name:           body.name.trim(),
    provider:       body.provider?.trim()       ?? "",
    belongsTo:      body.belongsTo?.trim()      ?? "",
    value:          body.value.trim(),
    createdAt:      new Date().toISOString(),
    rotatedAt:      null,
    notes:          body.notes?.trim()          ?? "",
    targetFile:     body.targetFile?.trim()     ?? "",
    targetVariable: body.targetVariable?.trim() ?? body.name.trim(),
    status:         "active",
  };

  keys.push(entry);
  await saveKeys(keys);
  return NextResponse.json(entry, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile }       from "fs/promises";
import { join }                      from "path";

const LOG_PATH = join(process.cwd(), "data", "comms-log.json");

// GET /api/comms/log?agentId=sentinel&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId")?.toLowerCase();
  const limit   = parseInt(searchParams.get("limit") ?? "100", 10);

  try {
    const raw  = await readFile(LOG_PATH, "utf8").catch(() => "[]");
    let entries = JSON.parse(raw) as Record<string, unknown>[];

    if (agentId) {
      entries = entries.filter((e) => e.agentId === agentId);
    }

    return NextResponse.json(entries.slice(-limit));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// DELETE /api/comms/log — clear all logs
export async function DELETE() {
  try {
    await writeFile(LOG_PATH, "[]");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

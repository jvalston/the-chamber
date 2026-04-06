import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { AGENTS } from "../../../../config/agents.config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agentDir = join(process.cwd(), "agents", id);

  let persona: string | null = null;
  const personaPath = join(agentDir, "persona.md");
  if (existsSync(personaPath)) {
    persona = readFileSync(personaPath, "utf8");
  }

  let profile: object | null = null;
  const profilePath = join(agentDir, "profile.json");
  if (existsSync(profilePath)) {
    try { profile = JSON.parse(readFileSync(profilePath, "utf8")); } catch { /* malformed */ }
  }

  const bundle = {
    version:       "1",
    exportedAt:    new Date().toISOString(),
    exportedFrom:  "the-chamber",
    agent,
    persona,
    profile,
  };

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="${id}.agent.json"`,
    },
  });
}

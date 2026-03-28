import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Reads persona.md files from /agents/[name]/ — completely outside OpenClaw.
// These files are the canonical identity source for the constellation.
// They survive any OpenClaw reset, update, or reinstall.

const AGENTS = ["legend", "seraphim", "diamond", "elior", "scribe"];
const AGENTS_DIR = join(process.cwd(), "agents");

export async function GET() {
  const identities = AGENTS.map((name) => {
    const personaPath = join(AGENTS_DIR, name, "persona.md");
    const profilePath = join(AGENTS_DIR, name, "profile.json");

    const persona = existsSync(personaPath)
      ? readFileSync(personaPath, "utf8")
      : null;

    let profile: Record<string, unknown> = {};
    if (existsSync(profilePath)) {
      try {
        profile = JSON.parse(readFileSync(profilePath, "utf8"));
      } catch {
        // ignore parse errors
      }
    }

    return {
      id: name,
      name: (profile.name as string) ?? name,
      role: (profile.role as string) ?? "",
      host: (profile.host as string) ?? "",
      transport: (profile.transport as string[]) ?? [],
      status: (profile.status as string) ?? "unknown",
      memoryNamespace: (profile.memoryNamespace as string) ?? name,
      persona,
      hasPersona: persona !== null,
      lastUpdated: (profile.meta as Record<string, string>)?.lastUpdated ?? null,
    };
  });

  return NextResponse.json({ identities });
}

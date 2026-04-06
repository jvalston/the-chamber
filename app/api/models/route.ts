import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const OLLAMA_URL  = process.env.OLLAMA_URL  ?? "http://localhost:11450";
const OPENCLAW_JSON = "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\openclaw.json";

function getAssignedModels(): Set<string> {
  const assigned = new Set<string>();
  try {
    const raw = JSON.parse(readFileSync(OPENCLAW_JSON, "utf8"));
    const agents: { model?: { primary?: string; fallbacks?: string[] } }[] =
      raw?.agents?.list ?? [];
    const defaults = raw?.agents?.defaults?.model ?? {};

    // Default models
    if (defaults.primary) assigned.add(defaults.primary);
    (defaults.fallbacks ?? []).forEach((m: string) => assigned.add(m));

    // Per-agent models
    for (const agent of agents) {
      if (agent.model?.primary)   assigned.add(agent.model.primary);
      (agent.model?.fallbacks ?? []).forEach((m: string) => assigned.add(m));
    }
  } catch { /* openclaw.json unreadable */ }
  return assigned;
}

export async function GET() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { cache: "no-store" });
    if (!r.ok) throw new Error("ollama unreachable");

    const data = await r.json();
    const assigned = getAssignedModels();

    const models = (data.models ?? []).map((m: {
      name: string;
      size: number;
      modified_at: string;
      details?: { parameter_size?: string; quantization_level?: string; family?: string };
    }) => {
      const shortName = m.name.replace(/:latest$/, "");
      // Check if used by any agent (strip ollama/ prefix for comparison)
      const isActive = assigned.has(`ollama/${m.name}`) ||
                       assigned.has(`ollama/${shortName}`) ||
                       assigned.has(m.name) ||
                       assigned.has(shortName);
      return {
        name:       m.name,
        sizeGb:     parseFloat((m.size / 1e9).toFixed(1)),
        params:     m.details?.parameter_size ?? "",
        quant:      m.details?.quantization_level ?? "",
        family:     m.details?.family ?? "",
        modifiedAt: m.modified_at,
        active:     isActive,
      };
    });

    // Sort: active first, then by size desc
    models.sort((a: { active: boolean; sizeGb: number }, b: { active: boolean; sizeGb: number }) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return b.sizeGb - a.sizeGb;
    });

    const totalGb = models.reduce((s: number, m: { sizeGb: number }) => s + m.sizeGb, 0);

    return NextResponse.json({ models, totalGb: parseFloat(totalGb.toFixed(1)) });
  } catch {
    return NextResponse.json({ models: [], totalGb: 0, error: "ollama_unreachable" });
  }
}

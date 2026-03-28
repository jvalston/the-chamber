import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { AgentEntry } from "../../../../config/agents.config";

interface AgentBundle {
  version:      string;
  exportedAt:   string;
  exportedFrom: string;
  agent:        AgentEntry;
  persona?:     string | null;
  profile?:     object | null;
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function POST(req: NextRequest) {
  let bundle: AgentBundle;
  try {
    bundle = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!bundle.version || !bundle.agent?.id || !bundle.agent?.name) {
    return NextResponse.json({ error: "Invalid agent bundle — missing version or agent.id" }, { status: 400 });
  }

  const { agent, persona, profile } = bundle;
  const agentDir = join(process.cwd(), "agents", agent.id);
  const filesWritten: string[] = [];

  if (!existsSync(agentDir)) {
    mkdirSync(agentDir, { recursive: true });
  }

  if (persona) {
    writeFileSync(join(agentDir, "persona.md"), persona, "utf8");
    filesWritten.push(`agents/${agent.id}/persona.md`);
  }

  if (profile) {
    writeFileSync(join(agentDir, "profile.json"), JSON.stringify(profile, null, 2), "utf8");
    filesWritten.push(`agents/${agent.id}/profile.json`);
  }

  // Generate the config block for the user to paste into agents.config.ts
  const memLayers = agent.memoryLayers?.length
    ? `["${agent.memoryLayers.join('", "')}"]`
    : "[]";
  const fallbacks = agent.modelFallback?.length
    ? `["${agent.modelFallback.join('", "')}"]`
    : "[]";
  const transport = agent.transport?.length
    ? `["${agent.transport.join('", "')}"]`
    : "[]";
  const tools = agent.tools?.length
    ? `["${agent.tools.join('", "')}"]`
    : "[]";

  const configEntry = `  // Imported from ${esc(bundle.exportedFrom)} — ${esc(bundle.exportedAt)}
  {
    id:             "${esc(agent.id)}",
    name:           "${esc(agent.name)}",
    role:           "${esc(agent.role)}",
    host:           "${esc(agent.host ?? "")}",
    state:          "draft",
    modelPrimary:   "${esc(agent.modelPrimary)}",
    modelFallback:  ${fallbacks},
    memoryAttached: ${agent.memoryAttached ?? false},
    memoryLayers:   ${memLayers},
    transport:      ${transport},
    tools:          ${tools},
    notes:          "${esc(agent.notes ?? "")}",
  },`;

  return NextResponse.json({
    ok:          true,
    agentId:     agent.id,
    agentName:   agent.name,
    filesWritten,
    configEntry,
    message:     `"${agent.name}" files installed. Paste configEntry into config/agents.config.ts to register the agent (state will be "draft" until you activate it).`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "docs.json");

interface Doc {
  id: string;
  title: string;
  category: string;
  format: string;
  project: string;
  agent: string;
  summary: string;
  path: string;
  createdAt: string;
  source?: "obsidian" | "local";
}

function readLocal(): { docs: Doc[] } {
  if (!existsSync(FILE)) return { docs: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

const OBSIDIAN_URL = process.env.OBSIDIAN_API_URL ?? "http://127.0.0.1:27123";
const OBSIDIAN_KEY = process.env.OBSIDIAN_API_KEY ?? "";

// Folders to surface in DocsView — in priority order
const INCLUDE_PREFIXES = [
  "Agent_Workspaces/",
  "Historian/",
  "Doctrine/",
  "Constellation_System/",
  "Chamber_of_Stars/",
];

function categoryFromPath(path: string, agent: string): string {
  if (path.startsWith("Historian/")) return "Report";
  if (path.startsWith("Doctrine/")) return "Governance";
  if (path.startsWith("Constellation_System/")) return "Architecture";
  if (path.startsWith("Chamber_of_Stars/")) return "Creative";
  if (agent === "elior") return "Report";
  if (agent === "seraphim") return "Governance";
  if (agent === "diamond") return "Architecture";
  if (agent === "legend") return "Creative";
  return "General";
}

function agentFromPath(parts: string[]): string {
  if (parts[0] === "Agent_Workspaces" && parts[1]) {
    return parts[1].toLowerCase();
  }
  if (parts[0] === "Historian") return "elior";
  if (parts[0] === "Doctrine") return "seraphim";
  return "unknown";
}

// Recursively list all .md files under a vault path prefix
async function listVaultDir(prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return []; // safety cap
  const res = await fetch(`${OBSIDIAN_URL}/vault/${prefix}`, {
    headers: { Authorization: `Bearer ${OBSIDIAN_KEY}` },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const entries: string[] = data.files ?? [];
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = prefix + entry;
    if (entry.endsWith("/")) {
      // directory — recurse
      const nested = await listVaultDir(fullPath, depth + 1);
      results.push(...nested);
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function fetchObsidianDocs(): Promise<Doc[]> {
  // Fetch all watched folders in parallel
  const nested = await Promise.all(
    INCLUDE_PREFIXES.map((prefix) => listVaultDir(prefix).catch(() => [] as string[]))
  );
  const files = nested.flat();

  return files.map((f): Doc => {
    const parts = f.split("/");
    const filename = parts[parts.length - 1].replace(/\.md$/, "");
    const agent = agentFromPath(parts);
    const category = categoryFromPath(f, agent);

    return {
      id:        `obs:${f}`,
      title:     filename.replace(/_/g, " "),
      category,
      format:    "md",
      project:   "",
      agent,
      summary:   "",
      path:      f,
      createdAt: "",
      source:    "obsidian",
    };
  });
}

export async function GET() {
  const local = readLocal();
  let obsDocs: Doc[] = [];

  try {
    obsDocs = await fetchObsidianDocs();
  } catch {
    // Obsidian unreachable — serve local docs only
  }

  return NextResponse.json({ docs: [...obsDocs, ...(local.docs ?? [])] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = readLocal();
  const doc: Doc = {
    id: `d${Date.now()}`,
    title: body.title ?? "Untitled",
    category: body.category ?? "General",
    format: body.format ?? "md",
    project: body.project ?? "",
    agent: body.agent ?? "unknown",
    summary: body.summary ?? "",
    path: body.path ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
    source: "local",
  };
  data.docs.unshift(doc);
  writeFileSync(FILE, JSON.stringify(data, null, 2));
  return NextResponse.json(doc);
}

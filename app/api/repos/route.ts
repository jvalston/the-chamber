import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE       = join(process.cwd(), "data", "repos.json");
const SYNC_INDEX = join(process.cwd(), "repos", "_index.json");

interface Repo {
  id: string;
  name: string;
  url: string;
  localPath: string;
  description: string;
  status: "active" | "complete" | "extensible" | "archive";
  domain: string;
  tags: string[];
  assignee: string;
  notes: string;
  addedAt: string;
  projectId?: string;
  source?: "manual" | "synced-owned" | "synced-community" | "synced-imported";
}

function read(): { repos: Repo[] } {
  if (!existsSync(FILE)) return { repos: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function save(data: { repos: Repo[] }) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function readSyncedRepos(): Repo[] {
  if (!existsSync(SYNC_INDEX)) return [];
  try {
    const index = JSON.parse(readFileSync(SYNC_INDEX, "utf8"));
    const repos: Repo[] = [];

    const readAbout = (localPath: string): string => {
      try {
        const p = join(localPath, "ABOUT.md");
        return existsSync(p) ? readFileSync(p, "utf8") : "";
      } catch { return ""; }
    };

    for (const r of index.owned ?? []) {
      repos.push({
        id: `synced-owned-${r.name}`, name: r.name, url: r.url ?? "",
        localPath: r.localPath ?? "", description: r.description ?? "",
        status: "archive", domain: "General",
        tags: ["synced", r.isFork ? "fork" : "owned"].filter(Boolean) as string[],
        assignee: "diamond", notes: readAbout(r.localPath ?? ""),
        addedAt: (r.updatedAt ?? "").slice(0, 10), source: "synced-owned",
      });
    }

    // Deduplicate: skip community repos already present in owned
    const ownedNames = new Set(
      (index.owned ?? []).map((r: { name: string }) => r.name.toLowerCase())
    );

    for (const r of index.community ?? []) {
      const baseName = (r.name ?? "").toLowerCase();
      if (ownedNames.has(baseName)) continue; // already have it as owned
      repos.push({
        id: `synced-community-${(r.fullName ?? r.name).replace("/", "-")}`,
        name: r.fullName ?? r.name, url: r.url ?? "", localPath: r.localPath ?? "",
        description: r.description ?? "", status: "archive", domain: "General",
        tags: ["synced", "starred", r.language?.toLowerCase()].filter(Boolean) as string[],
        assignee: "diamond", notes: readAbout(r.localPath ?? "") || `Starred from ${r.owner ?? "unknown"}. Auto-synced.`,
        addedAt: (r.updatedAt ?? "").slice(0, 10), source: "synced-community",
      });
    }

    for (const r of index.imported ?? []) {
      repos.push({
        id: `synced-imported-${r.name}`, name: r.name, url: "",
        localPath: r.localPath ?? "", description: "", status: "archive", domain: "General",
        tags: ["synced", "imported"], assignee: "diamond",
        notes: readAbout(r.localPath ?? "") || `Imported from ZIP: ${r.source ?? "unknown"}`,
        addedAt: (r.imported ?? "").slice(0, 10), source: "synced-imported",
      });
    }

    return repos;
  } catch {
    return [];
  }
}

export async function GET() {
  const manual = read();
  const synced = readSyncedRepos();
  const manualUrls = new Set(manual.repos.map((r) => r.url).filter(Boolean));
  const filtered   = synced.filter((r) => !r.url || !manualUrls.has(r.url));
  return NextResponse.json({ repos: [...manual.repos, ...filtered] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  // PATCH
  if (body._action === "patch" && body.id) {
    const { _action, id, ...updates } = body;
    void _action;
    data.repos = data.repos.map((r) => (r.id === id ? { ...r, ...updates } : r));
    save(data);
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (body._action === "delete" && body.id) {
    data.repos = data.repos.filter((r) => r.id !== body.id);
    save(data);
    return NextResponse.json({ ok: true });
  }

  // CREATE
  const repo: Repo = {
    id: `repo${Date.now()}`,
    name: body.name ?? "Unnamed Repo",
    url: body.url ?? "",
    localPath: body.localPath ?? "",
    description: body.description ?? "",
    status: body.status ?? "archive",
    domain: body.domain ?? "General",
    tags: body.tags ?? [],
    assignee: body.assignee ?? "",
    notes: body.notes ?? "",
    addedAt: new Date().toISOString().slice(0, 10),
  };

  data.repos.unshift(repo);
  save(data);
  return NextResponse.json(repo);
}

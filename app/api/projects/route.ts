import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "projects.json");

function read() {
  if (!existsSync(FILE)) return { projects: [], mission: "" };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  // PATCH
  if (body._action === "patch" && body.id) {
    const { _action, id, ...updates } = body;
    void _action;
    data.projects = data.projects.map((p: { id: string }) =>
      p.id === id ? { ...p, ...updates } : p
    );
    writeFileSync(FILE, JSON.stringify(data, null, 2));
    return NextResponse.json({ ok: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const project = {
    id: `p${Date.now()}`,
    name: body.name ?? "New Project",
    description: body.description ?? "",
    status: "planning",
    progress: 0,
    domain: body.domain ?? "General",
    assignee: body.assignee ?? "",
    blueprintId: body.blueprintId ?? null,
    repoId: body.repoId ?? null,
    createdAt: today,
    lastActivity: today,
  };

  data.projects.unshift(project);
  writeFileSync(FILE, JSON.stringify(data, null, 2));
  return NextResponse.json(project);
}

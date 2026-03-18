import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "tasks.json");

function read() {
  if (!existsSync(FILE)) return { tasks: [], activity: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function write(data: object) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  // PATCH — update existing task
  if (body._action === "patch" && body.id) {
    const { _action, id, ...updates } = body;
    void _action;
    data.tasks = data.tasks.map((t: { id: string }) =>
      t.id === id ? { ...t, ...updates } : t
    );
    // Log activity
    if (updates.status) {
      const task = data.tasks.find((t: { id: string }) => t.id === id);
      data.activity = [
        {
          id: `a${Date.now()}`,
          text: `"${(task as { title: string }).title}" moved to ${updates.status.replace("-", " ")}`,
          agent: updates.assignee ?? "system",
          ts: new Date().toISOString(),
        },
        ...data.activity.slice(0, 49),
      ];
    }
    write(data);
    return NextResponse.json({ ok: true });
  }

  // DELETE
  if (body._action === "delete" && body.id) {
    const task = data.tasks.find((t: { id: string }) => t.id === body.id);
    data.tasks = data.tasks.filter((t: { id: string }) => t.id !== body.id);
    data.activity = [
      {
        id: `a${Date.now()}`,
        text: `Task deleted: "${(task as { title: string })?.title ?? body.id}"`,
        agent: "system",
        ts: new Date().toISOString(),
      },
      ...data.activity.slice(0, 49),
    ];
    write(data);
    return NextResponse.json({ ok: true });
  }

  // CREATE new task
  const task = {
    id: `t${Date.now()}`,
    title: body.title ?? "Untitled",
    description: body.description ?? "",
    assignee: body.assignee ?? "nana",
    status: "backlog",
    project: body.project ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  data.tasks.unshift(task);
  data.activity = [
    {
      id: `a${Date.now()}`,
      text: `New task: "${task.title}"`,
      agent: task.assignee,
      ts: new Date().toISOString(),
    },
    ...data.activity.slice(0, 49),
  ];
  write(data);
  return NextResponse.json(task);
}

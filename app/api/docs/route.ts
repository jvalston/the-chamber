import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "docs.json");

function read() {
  if (!existsSync(FILE)) return { docs: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();
  const doc = {
    id: `d${Date.now()}`,
    title: body.title ?? "Untitled",
    category: body.category ?? "General",
    format: body.format ?? "md",
    project: body.project ?? "",
    agent: body.agent ?? "unknown",
    summary: body.summary ?? "",
    path: body.path ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  data.docs.unshift(doc);
  writeFileSync(FILE, JSON.stringify(data, null, 2));
  return NextResponse.json(doc);
}

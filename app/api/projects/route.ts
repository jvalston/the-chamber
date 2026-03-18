import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "projects.json");

export async function GET() {
  if (!existsSync(FILE)) return NextResponse.json({ projects: [], mission: "" });
  return NextResponse.json(JSON.parse(readFileSync(FILE, "utf8")));
}

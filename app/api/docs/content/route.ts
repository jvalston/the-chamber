import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join, resolve, normalize, isAbsolute } from "path";

// Allowed root directories for local file reads.
// Any path must resolve to one of these prefixes to be served.
const ALLOWED_ROOTS = [
  normalize("C:/Users/natza/.openclaw"),
  normalize("C:/Users/natza/Desktop"),
  normalize(join(process.cwd())),   // mission-control project root
];

function isSafePath(resolved: string): boolean {
  const norm = normalize(resolved);
  return ALLOWED_ROOTS.some((root) => norm.startsWith(root));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get("path");

  if (!rawPath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  // Resolve to absolute path
  const resolved = isAbsolute(rawPath)
    ? normalize(rawPath)
    : normalize(join(process.cwd(), rawPath));

  // Block path traversal and restrict to allowed roots
  if (!isSafePath(resolved)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const content = readFileSync(resolved, "utf8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 500 });
  }
}

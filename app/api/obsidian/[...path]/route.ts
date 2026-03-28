import { NextRequest, NextResponse } from "next/server";

const OBSIDIAN_URL = process.env.OBSIDIAN_API_URL ?? "http://127.0.0.1:27123";
const OBSIDIAN_KEY = process.env.OBSIDIAN_API_KEY ?? "";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const vaultPath = path.map(encodeURIComponent).join("/");
  const upstream = `${OBSIDIAN_URL}/vault/${vaultPath}`;
  const body = await req.text();

  try {
    const res = await fetch(upstream, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${OBSIDIAN_KEY}`,
        "Content-Type": "text/markdown",
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return new NextResponse(null, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Obsidian unreachable" }, { status: 503 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const vaultPath = path.map(encodeURIComponent).join("/");
  const upstream = `${OBSIDIAN_URL}/vault/${vaultPath}`;

  try {
    const res = await fetch(upstream, {
      headers: { Authorization: `Bearer ${OBSIDIAN_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    const contentType = res.headers.get("content-type") ?? "text/plain";
    const body = await res.text();

    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Obsidian unreachable" }, { status: 503 });
  }
}

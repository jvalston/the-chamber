import { NextResponse } from "next/server";

const GW = process.env.GATEWAY_URL ?? "http://localhost:4000";

export async function GET() {
  try {
    const r = await fetch(`${GW}/admin/status`, { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}

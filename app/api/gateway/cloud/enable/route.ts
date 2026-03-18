import { NextResponse } from "next/server";

const GW = process.env.GATEWAY_URL ?? "http://localhost:4000";

export async function POST() {
  try {
    const r = await fetch(`${GW}/admin/cloud/enable`, { method: "POST", cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { AGENTS, SYSTEM_NODES } from "../../../config/agents.config";

export async function GET() {
  return NextResponse.json({ agents: AGENTS, nodes: SYSTEM_NODES });
}

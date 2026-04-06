import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const FILE = join(process.cwd(), "data", "flow-status.json");
const STALE_RUNNING_SEC = 45;

function isFlowProcessRunning() {
  try {
    const p = spawnSync("wsl", ["-e", "bash", "-lc", "pgrep -fa mc-constellation-flow-loop.sh | grep -v grep || true"], {
      encoding: "utf8",
      timeout: 4000,
    });
    const out = `${p.stdout ?? ""}${p.stderr ?? ""}`.trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!existsSync(FILE)) {
    return NextResponse.json({ status: "idle" });
  }

  try {
    const raw = readFileSync(FILE, "utf8").trim();
    if (!raw) {
      return NextResponse.json({ status: "idle", state: "idle", stage: "idle", message: "No active flow run." });
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const updatedAtRaw = String(data.updatedAt ?? "");
    const stateRaw = String(data.state ?? "");
    const startedAtRaw = Number.parseInt(String(data.startedAt ?? "0"), 10);
    const updatedMs = Date.parse(updatedAtRaw);
    const ageSec = Number.isFinite(updatedMs) ? Math.floor((Date.now() - updatedMs) / 1000) : null;
    const dynamicElapsed = Number.isFinite(startedAtRaw) && startedAtRaw > 0
      ? Math.max(0, Math.floor(Date.now() / 1000) - startedAtRaw)
      : Number(data.elapsedSec ?? 0);

    const payload = { ...data, elapsedSec: dynamicElapsed };

    if (stateRaw === "running" && ageSec !== null && ageSec > STALE_RUNNING_SEC) {
      const running = isFlowProcessRunning();
      if (running) {
        return NextResponse.json({
          ...payload,
          state: "running",
          stale: false,
          message: payload.message ?? `No stage change for ${ageSec}s (still running).`,
        });
      }
      return NextResponse.json({
        ...payload,
        state: "stalled",
        stage: payload.stage ?? "unknown",
        message: `No progress update for ${ageSec}s. Last run likely ended or stalled.`,
        stale: true,
      });
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ status: "idle", state: "idle", stage: "idle", error: "flow status unreadable" });
  }
}

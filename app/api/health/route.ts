import { NextResponse } from "next/server";
import { spawn } from "child_process";

type Status = "online" | "warn" | "offline" | "idle";

async function probe(url: string, timeoutMs = 2000): Promise<Status> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    // Any HTTP response (even 4xx) means the port is alive
    return res.status < 500 ? "online" : "warn";
  } catch {
    return "offline";
  }
}

function isSafeHostPart(v: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(v);
}

async function probeLucyOpenClaw(): Promise<Status> {
  const host = process.env.LUCY_SSH_HOST ?? "100.119.215.107";
  const user = process.env.LUCY_SSH_USER ?? "nana";
  if (!isSafeHostPart(host) || !isSafeHostPart(user)) return "offline";

  const cmd = [
    "ssh",
    "-i ~/.ssh/lucy",
    "-o StrictHostKeyChecking=no",
    "-o BatchMode=yes",
    "-o ConnectTimeout=4",
    `${user}@${host}`,
    "\"curl -fsS --max-time 2 http://localhost:18789 >/dev/null\"",
  ].join(" ");

  return new Promise<Status>((resolve) => {
    const p = spawn("wsl", ["-e", "bash", "-lc", cmd], { timeout: 8_000 });
    p.on("close", (code) => resolve(code === 0 ? "online" : "offline"));
    p.on("error", () => resolve("offline"));
  });
}

async function probeHermesViaCommand(cmd: string): Promise<Status> {
  return new Promise<Status>((resolve) => {
    const p = spawn("wsl", ["-e", "bash", "-lc", cmd], { timeout: 12_000 });
    p.on("close", (code) => resolve(code === 0 ? "online" : "offline"));
    p.on("error", () => resolve("offline"));
  });
}

async function probePhoenixHermes(): Promise<Status> {
  return probeHermesViaCommand("~/.local/bin/hermes version >/dev/null 2>&1");
}

async function probeLucyHermes(): Promise<Status> {
  const host = process.env.LUCY_SSH_HOST ?? "100.119.215.107";
  const user = process.env.LUCY_SSH_USER ?? "nana";
  if (!isSafeHostPart(host) || !isSafeHostPart(user)) return "offline";

  const cmd = [
    "ssh",
    "-i ~/.ssh/lucy",
    "-o StrictHostKeyChecking=no",
    "-o BatchMode=yes",
    "-o ConnectTimeout=4",
    `${user}@${host}`,
    "\"~/.local/bin/hermes version >/dev/null 2>&1 || hermes version >/dev/null 2>&1\"",
  ].join(" ");

  return probeHermesViaCommand(cmd);
}

export async function GET() {
  const speakServiceDisabled =
    process.env.SPEAK_SERVICE_DISABLED === "1" ||
    process.env.SPEAK_SERVICE_DISABLED === "true";

  const checks = await Promise.all([
    // Core
    probe("http://localhost:7880").then(s          => [7880,  s]),
    probe("http://localhost:8787").then(s          => [8787,  s]),
    probe("http://localhost:18789").then(s         => [18789, s]),
    Promise.resolve([8004, speakServiceDisabled ? "idle" : null] as const).then(([port, forced]) =>
      forced ? [port, forced] as const : probe("http://localhost:8004/health").then((s) => [port, s] as const)
    ),
    probe("http://localhost:4000/health").then(s   => [4000,  s]),
    // AI Stack
    probe("http://localhost:8000/health").then(s   => [8000,  s]),
    probe("http://localhost:16333/healthz").then(s => [16333, s]),
    probe("http://localhost:11435").then(s         => [11435, s]),
    probe("http://localhost:8004").then(s          => [8004,  s]),
    probe("http://localhost:11436").then(s         => [11436, s]),
    // Support
    probe("http://localhost:8001").then(s          => [8001,  s]),
    probe("http://localhost:8002").then(s          => [8002,  s]),
    probe("http://localhost:11450").then(s         => [11450, s]),
    probe("http://localhost:11434").then(s         => [11434, s]),
    probe("http://localhost:8880").then(s          => [8880,  s]),
  ]);

  const lucyOpenClaw = await probeLucyOpenClaw();
  const [phoenixHermes, lucyHermes] = await Promise.all([
    probePhoenixHermes(),
    probeLucyHermes(),
  ]);

  const result: Record<string, Status | number> = {};
  for (const [port, status] of checks) {
    result[String(port)] = status as Status;
  }

  result.openclaw_phoenix = (result["18789"] as Status) ?? "offline";
  result.openclaw_lucy = lucyOpenClaw;
  result.hermes_phoenix = phoenixHermes;
  result.hermes_lucy = lucyHermes;
  result.checkedAt = Date.now();

  return NextResponse.json(result);
}

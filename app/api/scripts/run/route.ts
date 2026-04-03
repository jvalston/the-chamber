import { NextRequest, NextResponse } from "next/server";
import { spawn }                     from "child_process";
import { join, basename }            from "path";

const SCRIPTS_DIR = join(process.cwd(), "scripts");

// POST /api/scripts/run
// Body: { file: "discord-allowlist.sh" }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { file?: string };
  const file = body.file?.trim();

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  // Safety: only allow files inside scripts/ — no path traversal
  const safe = basename(file);
  if (safe !== file || safe.includes("..")) {
    return NextResponse.json({ error: "Invalid script path" }, { status: 400 });
  }

  const ext        = safe.split(".").pop();
  const scriptPath = join(SCRIPTS_DIR, safe);

  // Convert Windows path to WSL mount path
  // e.g. C:\path\to\... → /mnt/c/path/to/...
  const wslPath = scriptPath
    .replace(/^([A-Za-z]):\\/, (_, d) => `/mnt/${d.toLowerCase()}/`)
    .replace(/\\/g, "/");

  return new Promise<NextResponse>((resolve) => {
    let stdout = "";
    let stderr = "";

    let proc: ReturnType<typeof spawn>;

    if (ext === "sh") {
      proc = spawn("wsl", ["-e", "bash", wslPath], { timeout: 300_000 });
    } else if (ext === "mjs" || ext === "js") {
      proc = spawn("node", [scriptPath], { timeout: 300_000 });
    } else {
      resolve(NextResponse.json({ error: "Unsupported script type" }, { status: 400 }));
      return;
    }

    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      resolve(NextResponse.json({
        ok:     code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        output: (stdout + (stderr ? "\n--- stderr ---\n" + stderr : "")).trim(),
      }));
    });

    proc.on("error", (err) => {
      resolve(NextResponse.json({ ok: false, code: -1, output: err.message }, { status: 500 }));
    });
  });
}

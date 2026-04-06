import { NextResponse }      from "next/server";
import { readdir, readFile } from "fs/promises";
import { join }              from "path";

export interface ScriptEntry {
  file:        string;    // filename e.g. "discord-allowlist.sh"
  name:        string;    // human label
  description: string;   // extracted from leading comments
  type:        "sh" | "mjs" | "js";
}

const SCRIPTS_DIR = join(process.cwd(), "scripts");

function extractDescription(source: string): string {
  const lines = source.split("\n");
  const desc: string[] = [];
  for (const line of lines) {
    // Skip shebang
    if (line.startsWith("#!")) continue;
    // Collect comment lines
    if (line.startsWith("#") || line.startsWith("//")) {
      const text = line.replace(/^[#/]+\s?/, "").trim();
      if (text) desc.push(text);
      if (desc.length >= 3) break;
    } else if (line.trim() === "") {
      if (desc.length > 0) break;
    } else {
      break;
    }
  }
  return desc.join(" ").trim();
}

function humanName(file: string): string {
  if (file === "mc-constellation-flow-loop.sh") return "Star Verification Loop";
  if (file === "mc-olympus-orientation.sh") return "Olympus Orientation";
  return file
    .replace(/\.(sh|mjs|js)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET() {
  try {
    const files = await readdir(SCRIPTS_DIR);
    const scripts: ScriptEntry[] = [];

    for (const file of files.sort()) {
      const ext = file.split(".").pop() as string;
      if (!["sh", "mjs", "js"].includes(ext)) continue;

      let description = "";
      try {
        const src = await readFile(join(SCRIPTS_DIR, file), "utf8");
        description = extractDescription(src);
      } catch { /* skip */ }

      scripts.push({
        file,
        name:        humanName(file),
        description,
        type:        ext as ScriptEntry["type"],
      });
    }

    return NextResponse.json(scripts);
  } catch {
    return NextResponse.json([]);
  }
}

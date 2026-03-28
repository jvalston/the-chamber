import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Path resolver — converts Linux/WSL paths to Windows UNC paths so Node.js
// can read/write them on Windows. Windows paths are passed through as-is.
// ---------------------------------------------------------------------------
export function resolvePath(filePath: string): string {
  if (!filePath) return filePath;

  // Already a Windows path
  if (/^[A-Za-z]:/.test(filePath) || filePath.startsWith("\\\\")) {
    return filePath.replace(/\//g, "\\");
  }

  // WSL Linux path — convert to UNC
  if (filePath.startsWith("/")) {
    return "\\\\wsl.localhost\\Ubuntu" + filePath.replace(/\//g, "\\");
  }

  return filePath;
}

// ---------------------------------------------------------------------------
// Write or update a variable in a .env style file
// If the variable exists, its value is replaced in-place.
// If it does not exist, it is appended at the end.
// ---------------------------------------------------------------------------
export async function writeEnvVariable(
  filePath: string,
  variableName: string,
  value: string
): Promise<{ ok: boolean; action: "updated" | "appended" | "created"; error?: string }> {
  const resolved = resolvePath(filePath);

  try {
    let content = "";
    let existed = false;

    if (existsSync(resolved)) {
      content = await readFile(resolved, "utf8");
      existed = true;
    }

    const lines    = content.split("\n");
    const pattern  = new RegExp(`^${variableName}\\s*=`);
    const existing = lines.findIndex((l) => pattern.test(l));

    // Escape value — wrap in quotes if it contains spaces or special chars
    const safe = /[\s"'#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    const newLine = `${variableName}=${safe}`;

    if (existing !== -1) {
      lines[existing] = newLine;
      await writeFile(resolved, lines.join("\n"), "utf8");
      return { ok: true, action: "updated" };
    } else {
      // Append — ensure there's a newline before we add
      const sep = content && !content.endsWith("\n") ? "\n" : "";
      await writeFile(resolved, content + sep + newLine + "\n", "utf8");
      return { ok: true, action: existed ? "appended" : "created" };
    }
  } catch (err) {
    return { ok: false, action: "appended", error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Read a variable from a .env file (for "check if already set" feature)
// ---------------------------------------------------------------------------
export async function readEnvVariable(
  filePath: string,
  variableName: string
): Promise<string | null> {
  const resolved = resolvePath(filePath);
  try {
    const content = await readFile(resolved, "utf8");
    const pattern = new RegExp(`^${variableName}\\s*=\\s*(.*)$`, "m");
    const match   = content.match(pattern);
    if (!match) return null;
    return match[1].replace(/^["']|["']$/g, "").trim();
  } catch {
    return null;
  }
}

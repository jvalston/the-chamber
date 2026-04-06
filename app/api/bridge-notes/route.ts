import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { basename, join } from "path";

const WINDOWS_DIR = "C:/Users/natza/Desktop/shared-notes";
const LINUX_DIR = "/mnt/c/Users/natza/Desktop/shared-notes";

function defaultNotesDir() {
  return process.platform === "win32" ? WINDOWS_DIR : LINUX_DIR;
}

const NOTES_DIR = process.env.NOTES_BRIDGE_DIR?.trim() || defaultNotesDir();

interface NoteSummary {
  name: string;
  title: string;
  preview: string;
  updatedAt: string;
  windowsPath: string;
  lucyPath: string;
}

function sanitizeTitle(input: string): string {
  const trimmed = input.trim() || "note";
  return trimmed
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "note";
}

function windowsPathToLucyPath(winPath: string): string {
  const p = winPath.replace(/\\/g, "/");
  const drive = p.slice(0, 2);
  const rest = p.slice(2);
  if (/^[A-Za-z]:$/.test(drive)) {
    return `/mnt/${drive[0].toLowerCase()}${rest}`;
  }
  return p;
}

async function ensureDir() {
  if (!existsSync(NOTES_DIR)) {
    await mkdir(NOTES_DIR, { recursive: true });
  }
}

async function listNotes(): Promise<NoteSummary[]> {
  await ensureDir();
  const names = await readdir(NOTES_DIR);
  const mdNames = names.filter((n) => n.toLowerCase().endsWith(".md"));

  const notes = await Promise.all(
    mdNames.map(async (name) => {
      const abs = join(NOTES_DIR, name);
      const [st, content] = await Promise.all([stat(abs), readFile(abs, "utf8")]);
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const first = lines[0] ?? "";
      const title = first.startsWith("# ") ? first.slice(2).trim() : basename(name, ".md");
      const preview = lines.find((l) => !l.startsWith("# ")) ?? "";
      return {
        name,
        title,
        preview: preview.slice(0, 180),
        updatedAt: st.mtime.toISOString(),
        windowsPath: abs,
        lucyPath: windowsPathToLucyPath(abs),
      };
    })
  );

  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function GET() {
  try {
    const notes = await listNotes();
    return NextResponse.json({
      notesDir: NOTES_DIR,
      lucyNotesDir: windowsPathToLucyPath(NOTES_DIR),
      notes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDir();
    const body = await req.json() as { title?: string; text?: string };
    const title = (body.title ?? "").trim() || "Note";
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = sanitizeTitle(title);
    const fileName = `${stamp}-${slug}.md`;
    const abs = join(NOTES_DIR, fileName);
    const content = `# ${title}\n\n${text}\n`;

    await writeFile(abs, content, "utf8");

    return NextResponse.json({
      ok: true,
      fileName,
      windowsPath: abs,
      lucyPath: windowsPathToLucyPath(abs),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save note" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readFile }    from "fs/promises";

// Reads Olympus signal log at ~/.hermes/olympus_signals.json (via WSL UNC path)
const SIGNALS_PATH =
  "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.hermes\\olympus_signals.json";

export interface OlympusSignal {
  id:         string;
  title:      string;
  source:     string;
  relevance:  number;
  impact:     number;
  recurrence: number;
  summary:    string;
  links:      string[];
  caught_at?: string;
  query?:     string;
}

export async function GET() {
  try {
    const raw     = await readFile(SIGNALS_PATH, "utf8");
    const signals = JSON.parse(raw) as OlympusSignal[];
    // Return newest first
    return NextResponse.json({ signals: signals.slice().reverse(), source: "olympus" });
  } catch {
    return NextResponse.json({ signals: [], source: "olympus", unavailable: true });
  }
}

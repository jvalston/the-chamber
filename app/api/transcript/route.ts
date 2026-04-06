import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL      = process.env.TRANSCRIPT_MODEL ?? "qwen2.5:7b-instruct";

// Max transcript characters to send — long videos get trimmed at a natural point
const MAX_CHARS = 8000;

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    // youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return v;
    // youtube.com/shorts/ID or /embed/ID or /live/ID
    const parts = u.pathname.split("/").filter(Boolean);
    const idx   = parts.findIndex((p) => ["shorts", "embed", "live", "v"].includes(p));
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch { /* fall through */ }
  return null;
}

const SYSTEM = `You are a structured knowledge extractor. You receive a raw YouTube transcript and return a clean JSON breakdown.

Return ONLY valid JSON — no prose, no markdown, no explanation outside the JSON object.

JSON schema:
{
  "title": "Your best guess at the video's title or topic based on the content",
  "summary": "2-4 sentence plain-English overview of what the video covers and why it matters",
  "concepts": [
    { "name": "concept or term", "explanation": "what it means in plain language, why it matters" }
  ],
  "outline": [
    { "section": "section name", "description": "what is covered here" }
  ],
  "takeaways": [
    "concrete insight, lesson, or actionable point from the video"
  ]
}

Rules:
- concepts: list every significant term, idea, or technique mentioned. Min 4, max 12.
- outline: reflect the actual structure of the video from start to finish. Min 3 sections.
- takeaways: the most memorable or actionable things a viewer should walk away with. Min 3.
- Use plain English throughout. No jargon without explanation.
- If the transcript is incomplete or partial, work with what you have and note it in the summary.`;

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Could not parse a video ID from that URL" }, { status: 400 });
  }

  // Fetch transcript
  let rawTranscript: string;
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    rawTranscript  = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  } catch (e) {
    return NextResponse.json({
      error: `Could not fetch transcript. The video may have captions disabled, be age-gated, or be private. (${String(e)})`,
    }, { status: 422 });
  }

  if (!rawTranscript) {
    return NextResponse.json({ error: "Transcript is empty" }, { status: 422 });
  }

  // Trim to model-friendly length
  const transcript = rawTranscript.length > MAX_CHARS
    ? rawTranscript.slice(0, MAX_CHARS) + " [transcript truncated]"
    : rawTranscript;

  // Analyze with Ollama
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   MODEL,
        stream:  false,
        format:  "json",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: `Analyze this transcript:\n\n${transcript}` },
        ],
        options: { temperature: 0.2, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`Ollama ${res.status}`);

    const data    = await res.json();
    const content = data.message?.content ?? data.response ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: if JSON mode failed, return raw content
      return NextResponse.json({ raw: content, transcriptLength: rawTranscript.length });
    }

    return NextResponse.json({ ...parsed, transcriptLength: rawTranscript.length, videoId });

  } catch (e) {
    return NextResponse.json({ error: `Ollama error: ${String(e)}` }, { status: 500 });
  }
}

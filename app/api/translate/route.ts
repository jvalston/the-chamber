import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL      = process.env.TRANSLATE_MODEL ?? "qwen2.5:7b-instruct";

const SYSTEM = `You are a plain-English translator for an AI agent system called the Constellation.

Your job is to take whatever an agent sends back — JSON reports, status payloads, technical logs, error dumps, scan results — and rewrite it as a clear, simple summary that a non-technical person can understand immediately.

Rules:
- Never use JSON, code blocks, or technical jargon unless you explain it in the same sentence
- Always start with what is working fine
- Then list what needs attention, in plain language
- Then list any suggested actions, numbered simply
- If something is "intentionally disabled" or "expected offline", say so clearly
- Ignore internal metadata (token counts, session IDs, timing, model names) — the user does not need those
- Keep it conversational, like you are explaining to a friend
- Use short paragraphs, not walls of text
- If there is nothing wrong, say so clearly and confidently`;

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    MODEL,
        stream:   false,
        messages: [
          { role: "system",  content: SYSTEM },
          { role: "user",    content: `Please translate this into plain English:\n\n${text}` },
        ],
        options: { temperature: 0.3, num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json();
    const translation = data.message?.content ?? data.response ?? "";
    return NextResponse.json({ translation });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

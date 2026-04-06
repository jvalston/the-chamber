import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_URLS = (
  process.env.OLLAMA_URLS ??
  [OLLAMA_URL, "http://127.0.0.1:11555"].join(",")
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)
  .filter((url, i, arr) => arr.indexOf(url) === i);
const MODEL      = process.env.TRANSLATE_MODEL ?? "qwen2.5-coder:7b";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_MODEL   = process.env.TRANSLATE_OPENROUTER_MODEL ?? "openrouter/auto";
const OPENAI_API_KEY     = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL       = process.env.TRANSLATE_OPENAI_MODEL ?? "gpt-4o-mini";
const PROVIDER_CHAIN     = process.env.TRANSLATE_PROVIDERS ?? "ollama,openrouter";
const MAX_INPUT_CHARS    = Number(process.env.TRANSLATE_MAX_INPUT_CHARS ?? 24000);
const MAX_PREVIEW_LINES  = Number(process.env.TRANSLATE_MAX_PREVIEW_LINES ?? 120);

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

function toOneLine(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max)}\n\n[...truncated for translation...]` : s;
}

function compactPreview(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_PREVIEW_LINES)
    .join("\n");
}

function summarizeObject(obj: Record<string, unknown>, depth = 0): string[] {
  if (depth > 2) return [];
  const keys = Object.keys(obj);
  const lines: string[] = [];

  const headlineKeys = ["status", "message", "summary", "error", "errors", "ok", "result", "stopReason"];
  for (const key of headlineKeys) {
    if (key in obj) lines.push(`${key}: ${toOneLine(obj[key])}`);
  }

  if (Array.isArray(obj.tools)) {
    const tools = (obj.tools as unknown[])
      .map((t) => (typeof t === "object" && t && "name" in (t as Record<string, unknown>) ? String((t as Record<string, unknown>).name) : "unknown"))
      .slice(0, 20);
    if (tools.length) lines.push(`tools detected: ${tools.join(", ")}`);
  }

  if (Array.isArray(obj.errors)) {
    const errs = (obj.errors as unknown[]).map((e) => toOneLine(e)).filter(Boolean).slice(0, 10);
    if (errs.length) lines.push(`errors: ${errs.join(" | ")}`);
  }

  if (Array.isArray(obj.warnings)) {
    const warnings = (obj.warnings as unknown[]).map((w) => toOneLine(w)).filter(Boolean).slice(0, 10);
    if (warnings.length) lines.push(`warnings: ${warnings.join(" | ")}`);
  }

  for (const key of keys.slice(0, 12)) {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = summarizeObject(value as Record<string, unknown>, depth + 1);
      for (const line of nested.slice(0, 5)) lines.push(`${key}.${line}`);
    }
  }

  return lines.filter(Boolean);
}

function prepareInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { preparedText: "", note: "No input text provided." };

  let prepared = trimmed;
  let note = "";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const summary = summarizeObject(parsed as Record<string, unknown>);
      const preview = truncate(compactPreview(trimmed), Math.max(2000, Math.floor(MAX_INPUT_CHARS * 0.6)));
      prepared =
        summary.length > 0
          ? `Structured summary hints:\n- ${summary.join("\n- ")}\n\nRaw preview:\n${preview}`
          : preview;
      note = "Input looked like JSON; reduced internal metadata noise.";
    }
  } catch {
    const preview = compactPreview(trimmed);
    prepared = preview || trimmed;
  }

  return {
    preparedText: truncate(prepared, MAX_INPUT_CHARS),
    note,
  };
}

function fallbackTranslation(rawText: string, attempted: string[], errors: string[], prepNote = "") {
  const { preparedText } = prepareInput(rawText);
  const lines = preparedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const likelyIssues = lines
    .filter((line) => /(error|failed|timeout|denied|missing|unavailable|exception|cannot|could not|invalid)/i.test(line))
    .slice(0, 6);

  const header = "Provider translation was unavailable, so this is a local fallback summary.";
  const working = "What looks okay: the app accepted your input and attempted translation providers.";
  const attention =
    likelyIssues.length > 0
      ? `Needs attention: ${likelyIssues.join(" | ")}`
      : "Needs attention: no clear error line was detected in the pasted output, but provider responses failed.";
  const actions = [
    "Try Translate again after 10-20 seconds (provider/network failures can be temporary).",
    "If this repeats, keep Ollama running or set a working cloud key/model in your `.env.local`.",
    "Use shorter input chunks when pasting very large logs.",
  ];

  const providerLine = attempted.length ? `Tried: ${attempted.join(" -> ")}` : "No provider attempts recorded.";
  const errLine = errors.length ? `Last errors: ${errors.slice(0, 3).join(" | ")}` : "No provider error details were captured.";

  return [
    header,
    "",
    working,
    attention,
    prepNote ? `Input note: ${prepNote}` : "",
    "",
    "Suggested actions:",
    ...actions.map((a, i) => `${i + 1}. ${a}`),
    "",
    providerLine,
    errLine,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in (item as Record<string, unknown>)) {
          return String((item as Record<string, unknown>).text ?? "");
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

async function listOllamaModels(ollamaUrl: string) {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { models: [] as string[], reachable: false };
    const data = await res.json() as { models?: Array<{ name?: string }> };
    const models = (data.models ?? []).map((m) => m.name).filter((name): name is string => Boolean(name));
    return { models, reachable: true };
  } catch {
    return { models: [] as string[], reachable: false };
  }
}

async function callOllama(ollamaUrl: string, model: string, text: string) {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Please translate this into plain English:\n\n${text}` },
      ],
      options: { temperature: 0.3, num_predict: 1024 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}${body ? `: ${body}` : ""}`);
  }

  const data = await res.json() as { message?: { content?: string }; response?: string };
  const translation = data.message?.content ?? data.response ?? "";
  if (!translation.trim()) throw new Error("Ollama returned an empty translation");
  return translation;
}

async function callOpenRouter(text: string) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Please translate this into plain English:\n\n${text}` },
      ],
      temperature: 0.2,
      max_tokens: 1100,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}${body ? `: ${body}` : ""}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const translation = extractTextContent(data.choices?.[0]?.message?.content);
  if (!translation.trim()) throw new Error("OpenRouter returned an empty translation");
  return translation;
}

async function callOpenAI(text: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Please translate this into plain English:\n\n${text}` },
      ],
      temperature: 0.2,
      max_tokens: 1100,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}${body ? `: ${body}` : ""}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const translation = extractTextContent(data.choices?.[0]?.message?.content);
  if (!translation.trim()) throw new Error("OpenAI returned an empty translation");
  return translation;
}

function resolveProviderChain() {
  const allowed = new Set(["ollama", "openrouter", "openai"]);
  const chain = PROVIDER_CHAIN
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is "ollama" | "openrouter" | "openai" => Boolean(p) && allowed.has(p))
    .filter((p, i, arr) => arr.indexOf(p) === i);

  // Safe default: local-first with API fallback, no OpenAI key requirement.
  return chain.length > 0 ? chain : (["ollama", "openrouter"] as const);
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const attempted: string[] = [];
  const providerErrors: string[] = [];
  try {
    const { preparedText, note } = prepareInput(String(text));
    if (!preparedText.trim()) {
      return NextResponse.json({ error: "No usable text provided after preprocessing" }, { status: 400 });
    }

    const chain = resolveProviderChain();
    for (const provider of chain) {
      if (provider === "ollama") {
        for (const ollamaUrl of OLLAMA_URLS) {
          const { models: installed, reachable: ollamaReachable } = await listOllamaModels(ollamaUrl);
          if (!ollamaReachable) {
            attempted.push(`ollama(${ollamaUrl})(unreachable)`);
            providerErrors.push(`ollama -> could not reach ${ollamaUrl}`);
            continue;
          }

          const preferred = [
            // Favor Gemma 4 on the dedicated local server when available.
            ...(ollamaUrl.includes("11555") ? ["gemma4:latest"] : []),
            MODEL,
            "qwen2.5-coder:7b",
            "qwen2.5:7b-instruct",
            "qwen2.5:7b",
            "llama3.1:8b-instruct",
            "llama3.1:8b",
            "llama3.2:3b-instruct",
            "llama3.2:3b",
            "llama3:8b",
            "mistral:latest",
            "gemma3:4b",
            "gemma4:latest",
          ];

          const preferredUnique = preferred.filter((m, i) => preferred.indexOf(m) === i);
          const installedPreferred = preferredUnique.filter((m) => installed.includes(m));
          const installedFallback = installed.filter((m, i) => installed.indexOf(m) === i).slice(0, 5);
          const ollamaCandidates = installed.length > 0
            ? (installedPreferred.length > 0 ? installedPreferred : installedFallback)
            : preferredUnique.slice(0, 3);

          for (const model of ollamaCandidates) {
            attempted.push(`ollama:${model}@${ollamaUrl}`);
            try {
              const translation = await callOllama(ollamaUrl, model, preparedText);
              return NextResponse.json({ translation, provider: "ollama", model, baseUrl: ollamaUrl });
            } catch (err) {
              providerErrors.push(`ollama:${model}@${ollamaUrl} -> ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }

      if (provider === "openrouter") {
        if (!OPENROUTER_API_KEY) {
          attempted.push(`openrouter:${OPENROUTER_MODEL}(skipped:missing_key)`);
          continue;
        }
        attempted.push(`openrouter:${OPENROUTER_MODEL}`);
        try {
          const translation = await callOpenRouter(preparedText);
          return NextResponse.json({ translation, provider: "openrouter", model: OPENROUTER_MODEL });
        } catch (err) {
          providerErrors.push(`openrouter:${OPENROUTER_MODEL} -> ${err instanceof Error ? err.message : String(err)}`);
          // try next provider
        }
      }

      if (provider === "openai") {
        if (!OPENAI_API_KEY) {
          attempted.push(`openai:${OPENAI_MODEL}(skipped:missing_key)`);
          continue;
        }
        attempted.push(`openai:${OPENAI_MODEL}`);
        try {
          const translation = await callOpenAI(preparedText);
          return NextResponse.json({ translation, provider: "openai", model: OPENAI_MODEL });
        } catch (err) {
          providerErrors.push(`openai:${OPENAI_MODEL} -> ${err instanceof Error ? err.message : String(err)}`);
          // try next provider
        }
      }
    }

    const translation = fallbackTranslation(String(text), attempted, providerErrors, note);
    return NextResponse.json({
      translation,
      provider: "fallback",
      model: "local-summary",
      attempted,
      providerErrors: providerErrors.slice(0, 5),
    });
  } catch (e) {
    const translation = fallbackTranslation(String(text), attempted, providerErrors, "");
    return NextResponse.json({
      translation,
      provider: "fallback",
      model: "local-summary",
      attempted,
      providerErrors: providerErrors.slice(0, 5),
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

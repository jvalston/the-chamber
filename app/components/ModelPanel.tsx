"use client";

type Tag = "local" | "fast" | "free" | "cloud" | "tier1";

interface ModelEntry {
  lane: string;
  model: string;
  provider: string;
  tag: Tag;
  note?: string;
}

interface SystemGroup {
  system: "PHOENIX" | "LUCY";
  label: string;
  sublabel: string;
  entries: ModelEntry[];
}

const PROVIDER_GROUPS: SystemGroup[] = [
  {
    system: "PHOENIX",
    label: "PHOENIX — Gateway",
    sublabel: "Legend · all agents via provider_gateway:4000",
    entries: [
      { lane: "PRIMARY",  model: "qwen2.5:7b-instruct",    provider: "Ollama",     tag: "local" },
      { lane: "CODER",    model: "qwen2.5-coder:7b",        provider: "Ollama",     tag: "local" },
      { lane: "CLOUD-1",  model: "llama-3.3-70b-versatile", provider: "Groq",       tag: "fast"  },
      { lane: "CLOUD-2",  model: "llama3.3-70b",            provider: "Cerebras",   tag: "free", note: "key pending" },
      { lane: "CLOUD-3",  model: "Llama-3.3-70B",           provider: "SambaNova",  tag: "free", note: "key pending" },
      { lane: "CLOUD-4",  model: "gemini-1.5-flash",        provider: "Gemini",     tag: "free", note: "key pending" },
      { lane: "CLOUD-5",  model: "auto",                    provider: "OpenRouter", tag: "cloud" },
    ],
  },
  {
    system: "PHOENIX",
    label: "PHOENIX — Seraphim",
    sublabel: "OpenClaw 18789 · Tier 1 exclusive",
    entries: [
      { lane: "SHARED",   model: "gateway/general",         provider: "Gateway",    tag: "local" },
      { lane: "SHARED",   model: "llama-3.3-70b",           provider: "Groq",       tag: "fast"  },
      { lane: "SHARED",   model: "auto",                    provider: "OpenRouter", tag: "cloud" },
      { lane: "TIER 1",   model: "gpt-4o",                  provider: "OpenRouter", tag: "tier1" },
      { lane: "TIER 1",   model: "gpt-4.5-preview",         provider: "OpenRouter", tag: "tier1" },
      { lane: "TIER 1",   model: "claude-haiku-4-5",        provider: "OpenRouter", tag: "tier1" },
      { lane: "TIER 1",   model: "claude-3.5-sonnet",       provider: "OpenRouter", tag: "tier1" },
      { lane: "TIER 1",   model: "claude-sonnet-4-5",       provider: "OpenRouter", tag: "tier1" },
    ],
  },
  {
    system: "LUCY",
    label: "LUCY — Diamond & Elior",
    sublabel: "OpenClaw on Lucy · 8GB VRAM · local only",
    entries: [
      { lane: "PRIMARY",  model: "qwen2.5:7b-instruct",    provider: "Ollama",     tag: "local" },
      { lane: "FALLBACK", model: "qwen2.5-coder:7b",        provider: "Ollama",     tag: "local" },
    ],
  },
];

const TAG_COLOR: Record<Tag, string> = {
  local:  "var(--green)",
  fast:   "var(--accent)",
  free:   "var(--yellow)",
  cloud:  "var(--yellow)",
  tier1:  "#c084fc",
};

const TAG_LABEL: Record<Tag, string> = {
  local:  "LOCAL",
  fast:   "FAST",
  free:   "FREE",
  cloud:  "CLOUD",
  tier1:  "TIER 1",
};

const SYSTEM_COLOR: Record<"PHOENIX" | "LUCY", string> = {
  PHOENIX: "var(--accent)",
  LUCY:    "var(--yellow)",
};

export default function ModelPanel() {
  return (
    <div className="panel" style={{ height: "100%", overflowY: "auto" }}>
      <div className="panel-header">
        <span>PROVIDER ROUTING</span>
      </div>

      {PROVIDER_GROUPS.map((group, gi) => (
        <div key={gi}>
          {/* System group header */}
          <div style={{
            padding: "7px 12px 4px",
            borderBottom: "1px solid rgba(30,45,69,0.6)",
            borderTop: gi > 0 ? "1px solid rgba(30,45,69,0.8)" : undefined,
            background: "rgba(0,0,0,0.15)",
          }}>
            <div style={{
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: SYSTEM_COLOR[group.system],
              fontWeight: 600,
            }}>
              {group.label}
            </div>
            <div style={{
              fontSize: "8px",
              color: "var(--text-muted)",
              marginTop: "1px",
              letterSpacing: "0.04em",
            }}>
              {group.sublabel}
            </div>
          </div>

          {/* Entries */}
          {group.entries.map((m, ei) => (
            <div
              key={ei}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderBottom: "1px solid rgba(30,45,69,0.3)",
              }}
            >
              <span style={{
                fontSize: "8px",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                flexShrink: 0,
                width: "46px",
              }}>
                {m.lane}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "11px",
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {m.model}
                </div>
                <div style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}>
                  {m.provider.toUpperCase()}
                  {m.note && (
                    <>
                      <span>·</span>
                      <span style={{ color: "var(--yellow)", opacity: 0.7 }}>{m.note}</span>
                    </>
                  )}
                </div>
              </div>

              <span style={{
                fontSize: "8px",
                letterSpacing: "0.08em",
                color: TAG_COLOR[m.tag],
                border: `1px solid ${TAG_COLOR[m.tag]}`,
                padding: "1px 4px",
                borderRadius: "2px",
                opacity: 0.8,
                flexShrink: 0,
              }}>
                {TAG_LABEL[m.tag]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

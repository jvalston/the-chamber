"use client";

// TODO: wire to OpenClaw Gateway /api/model-chain for live routing state and active lane

type Tag = "premium" | "fast" | "local" | "emergency";

interface ModelEntry {
  lane: string;
  label: string;
  model: string;
  provider: string;
  tag: Tag;
  active: boolean;
}

// Model stack ordered by priority. Primary is currently active.
// TODO: replace active flag with live signal from OpenClaw routing state
const MODEL_CHAIN: ModelEntry[] = [
  {
    lane: "PRIMARY",
    label: "01",
    model: "gpt-4o",
    provider: "OpenAI",
    tag: "premium",
    active: true,
  },
  {
    lane: "SECONDARY",
    label: "02",
    model: "llama-3.3-70b-versatile",
    provider: "Groq",
    tag: "fast",
    active: false,
  },
  {
    lane: "FALLBACK 1",
    label: "03",
    model: "qwen3.5",
    provider: "Ollama",
    tag: "local",
    active: false,
  },
  {
    lane: "FALLBACK 2",
    label: "04",
    model: "qwen2.5:7b-instruct",
    provider: "Ollama",
    tag: "emergency",
    active: false,
  },
];

const TAG_COLOR: Record<Tag, string> = {
  premium:   "var(--accent)",
  fast:      "var(--green)",
  local:     "var(--yellow)",
  emergency: "var(--red)",
};

const TAG_LABEL: Record<Tag, string> = {
  premium:   "PREMIUM",
  fast:      "FAST",
  local:     "LOCAL",
  emergency: "EMRG",
};

const activeLane = MODEL_CHAIN.find((m) => m.active);

export default function ModelPanel() {
  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <span>MODEL CHAIN</span>
        {activeLane && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "9px",
              color: "var(--green)",
              letterSpacing: "0.08em",
            }}
          >
            LANE {activeLane.label} ACTIVE
          </span>
        )}
      </div>

      <div style={{ padding: "6px 0" }}>
        {MODEL_CHAIN.map((m) => (
          <div
            key={m.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "9px 12px",
              borderBottom: "1px solid rgba(30,45,69,0.4)",
              borderLeft: m.active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              background: m.active ? "rgba(0,212,255,0.04)" : "transparent",
            }}
          >
            {/* Lane number */}
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "9px",
                fontVariantNumeric: "tabular-nums",
                paddingTop: "1px",
                flexShrink: 0,
              }}
            >
              {m.label}
            </span>

            {/* Model name + provider + lane label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: m.active ? "var(--accent)" : "var(--text-primary)",
                  fontSize: "11px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.model}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginTop: "3px",
                  fontSize: "9px",
                }}
              >
                <span
                  style={{
                    color: "var(--text-muted)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {m.provider.toUpperCase()}
                </span>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {m.lane}
                </span>
              </div>
            </div>

            {/* Badges: ACTIVE + tag */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "3px",
                flexShrink: 0,
              }}
            >
              {m.active && (
                <span
                  style={{
                    fontSize: "8px",
                    letterSpacing: "0.1em",
                    color: "var(--accent)",
                    border: "1px solid var(--accent-dim)",
                    padding: "1px 4px",
                    borderRadius: "2px",
                  }}
                >
                  ACTIVE
                </span>
              )}
              <span
                style={{
                  fontSize: "8px",
                  letterSpacing: "0.08em",
                  color: TAG_COLOR[m.tag],
                  border: `1px solid ${TAG_COLOR[m.tag]}`,
                  padding: "1px 4px",
                  borderRadius: "2px",
                  opacity: m.active ? 1 : 0.6,
                }}
              >
                {TAG_LABEL[m.tag]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

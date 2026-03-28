"use client";

// Radar — signal monitoring. Shows what the constellation is watching and what it caught.
// TODO: wire to live signal sources: Discord mentions, X API, Reddit, web alerts

interface Signal {
  id:       string;
  title:    string;
  source:   string;
  topic:    string;
  strength: "high" | "medium" | "low";
  agent:    string;
  caught:   string;
}

const STRENGTH_COLOR = { high: "var(--red)", medium: "var(--yellow)", low: "var(--text-muted)" };
const TOPIC_COLOR: Record<string, string> = {
  "AI Models":     "#00d4ff",
  "OpenClaw":      "#a855f7",
  "Music Tools":   "#00ff9d",
  "Constellation": "#ffd700",
  "Creative AI":   "#f97316",
};

const MOCK_SIGNALS: Signal[] = [
  { id: "s1", title: "New Claude Opus 4.6 release — improved tool use",   source: "X / Twitter",  topic: "AI Models",     strength: "high",   agent: "Seraphim", caught: "2 hours ago" },
  { id: "s2", title: "OpenClaw v2 gateway breaking change in /route",      source: "GitHub",       topic: "OpenClaw",      strength: "high",   agent: "Diamond",  caught: "3 hours ago" },
  { id: "s3", title: "Suno v4 drops — new vocal control parameters",       source: "Discord",      topic: "Music Tools",   strength: "medium", agent: "Legend",   caught: "5 hours ago" },
  { id: "s4", title: "Qdrant 1.12 — new sparse vector support",           source: "GitHub",       topic: "Constellation", strength: "medium", agent: "Elior",    caught: "6 hours ago" },
  { id: "s5", title: "Groq rate limit changes — llama-3.3 tier update",   source: "Groq blog",    topic: "AI Models",     strength: "medium", agent: "Seraphim", caught: "8 hours ago" },
  { id: "s6", title: "AI-generated music licensing thread on Reddit",      source: "Reddit",       topic: "Creative AI",   strength: "low",    agent: "Legend",   caught: "10 hours ago"},
];

const WATCH_TOPICS = [
  { label: "AI Models",     color: "#00d4ff", description: "New model releases, API changes, pricing shifts" },
  { label: "OpenClaw",      color: "#a855f7", description: "Gateway updates, plugin changes, breaking changes" },
  { label: "Music Tools",   color: "#00ff9d", description: "Suno, Udio, audio generation tooling" },
  { label: "Constellation", color: "#ffd700", description: "Qdrant, TrueRecall, Redis, memory infrastructure" },
  { label: "Creative AI",   color: "#f97316", description: "Creative AI trends, tools, licensing news" },
];

export default function RadarView() {
  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden" }}>
      {/* Signals feed */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot warn" />
              CAUGHT SIGNALS
            </div>
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
              {/* TODO: wire to live monitoring agents */}
              MOCK DATA
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {MOCK_SIGNALS.map((sig) => (
              <div key={sig.id} style={{
                padding:      "11px 14px",
                borderBottom: "1px solid rgba(30,45,69,0.4)",
                borderLeft:   `3px solid ${STRENGTH_COLOR[sig.strength]}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px" }}>
                      {sig.title}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-muted)" }}>
                      <span>{sig.source}</span>
                      <span>Caught by {sig.agent}</span>
                      <span>{sig.caught}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                    <span style={{
                      fontSize:     "9px",
                      color:        TOPIC_COLOR[sig.topic] ?? "var(--accent)",
                      border:       `1px solid ${TOPIC_COLOR[sig.topic] ?? "var(--accent)"}50`,
                      padding:      "1px 6px",
                      borderRadius: "2px",
                    }}>
                      {sig.topic}
                    </span>
                    <span style={{
                      fontSize:     "9px",
                      color:        STRENGTH_COLOR[sig.strength],
                      letterSpacing: "0.08em",
                    }}>
                      {sig.strength.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Watch topics */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">MONITORING</div>
          <div style={{ padding: "6px 0" }}>
            {WATCH_TOPICS.map((t) => (
              <div key={t.label} style={{
                padding:      "9px 14px",
                borderBottom: "1px solid rgba(30,45,69,0.4)",
                borderLeft:   `3px solid ${t.color}`,
              }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: t.color, marginBottom: "3px" }}>
                  {t.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {t.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

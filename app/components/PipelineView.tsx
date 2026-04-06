"use client";

// Pipeline — shows how data flows through the constellation end-to-end.
// From input sources through routing, agents, memory, and output.
// TODO: wire to live OpenClaw gateway event stream

interface PipelineStage {
  id:     string;
  label:  string;
  system: string;
  color:  string;
  status: "active" | "idle" | "error";
  load:   number;   // 0-100
  recent: string[];
}

const STAGES: PipelineStage[] = [
  {
    id:     "input",
    label:  "INPUT",
    system: "Discord + LiveKit + Local",
    color:  "#00d4ff",
    status: "active",
    load:   35,
    recent: ["Discord msg → Legend", "LiveKit audio → Whisper", "CLI input → Gateway"],
  },
  {
    id:     "routing",
    label:  "ROUTING",
    system: "OpenClaw Gateway :18790",
    color:  "#a855f7",
    status: "active",
    load:   52,
    recent: ["openrouter/auto → Legend", "openrouter/gpt-4o-mini → Seraphim", "ollama/qwen2.5 → Elior"],
  },
  {
    id:     "agents",
    label:  "AGENTS",
    system: "Phoenix + Lucy",
    color:  "#00ff9d",
    status: "active",
    load:   68,
    recent: ["Legend: response gen.", "Seraphim: task dispatch", "Elior: recall query"],
  },
  {
    id:     "memory",
    label:  "MEMORY",
    system: "TrueRecall / Qdrant / LCM / Archive",
    color:  "#ffd700",
    status: "active",
    load:   44,
    recent: ["Qdrant write: legend ns", "TrueRecall update", "LCM context push"],
  },
  {
    id:     "output",
    label:  "OUTPUT",
    system: "Discord + TTS + Files",
    color:  "#22c4d0",
    status: "active",
    load:   28,
    recent: ["Legend → #creative-log", "Diamond → repo commit", "Elior → archive write"],
  },
];

function LoadBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px" }}>
      <div style={{
        flex:         1,
        height:       "4px",
        background:   "var(--border)",
        borderRadius: "2px",
        overflow:     "hidden",
      }}>
        <div style={{
          width:        `${pct}%`,
          height:       "100%",
          background:   color,
          borderRadius: "2px",
        }} />
      </div>
      <span style={{ color: "var(--text-muted)", minWidth: "28px", textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export default function PipelineView() {
  return (
    <div style={{
      flex:          1,
      display:       "flex",
      flexDirection: "column",
      padding:       "8px",
      gap:           "8px",
      overflow:      "hidden",
    }}>
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="status-dot online" />
            DATA PIPELINE
          </div>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
            {/* TODO: wire to live OpenClaw event stream */}
            MOCK DATA
          </span>
        </div>
      </div>

      {/* Stage flow */}
      <div style={{
        flex:                1,
        display:             "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap:                 "8px",
        overflow:            "hidden",
      }}>
        {STAGES.map((stage, i) => (
          <div key={stage.id} style={{ display: "flex", alignItems: "stretch", gap: "0", position: "relative" }}>
            <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Stage header */}
              <div style={{
                padding:      "10px 12px 8px",
                borderBottom: "1px solid var(--border)",
                borderTop:    `2px solid ${stage.color}`,
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: stage.color, letterSpacing: "0.14em" }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>
                  {stage.system}
                </div>
              </div>

              {/* Load */}
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid rgba(30,45,69,0.4)" }}>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "5px", letterSpacing: "0.1em" }}>
                  LOAD
                </div>
                <LoadBar pct={stage.load} color={stage.color} />
              </div>

              {/* Recent events */}
              <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  RECENT
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {stage.recent.map((ev, j) => (
                    <div key={j} style={{
                      fontSize:   "10px",
                      color:      "var(--text-secondary)",
                      lineHeight: 1.4,
                      paddingLeft: "6px",
                      borderLeft: `1px solid ${stage.color}40`,
                    }}>
                      {ev}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Arrow connector */}
            {i < STAGES.length - 1 && (
              <div style={{
                position:   "absolute",
                right:      "-12px",
                top:        "50%",
                transform:  "translateY(-50%)",
                fontSize:   "14px",
                color:      "var(--border-bright)",
                zIndex:     10,
              }}>
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Agent, AgentState } from "../../lib/mock/agents";
import { MemoryLayer } from "../../config/agents.config";

// TODO: replace static layer list with live health checks:
//   truerecall → TrueRecall heartbeat
//   lcm        → OpenClaw LCM plugin status
//   qdrant     → Qdrant namespace check (:6333)
//   archive    → Archive store reachability
const LAYER_LABEL: Record<MemoryLayer, string> = {
  truerecall: "TrueRecall",
  lcm:        "Lossless Claw",
  qdrant:     "Qdrant",
  archive:    "Archive",
};

const STATE_COLOR: Record<AgentState, string> = {
  active:   "var(--green)",
  standby:  "var(--yellow)",
  degraded: "var(--red)",
  offline:  "var(--red)",
  draft:    "var(--text-muted)",
  archived: "var(--text-muted)",
};

const STATE_DOT_CLASS: Record<AgentState, string> = {
  active:   "online",
  standby:  "warn",
  degraded: "warn",
  offline:  "offline",
  draft:    "idle",
  archived: "idle",
};

const STATE_LABEL: Record<AgentState, string> = {
  active:   "ONLINE",
  standby:  "STANDBY",
  degraded: "DEGRADED",
  offline:  "OFFLINE",
  draft:    "DRAFT",
  archived: "ARCHIVED",
};

interface Props {
  agent: Agent;
}

function ActionBtn({
  label,
  danger,
}: {
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: danger ? "var(--red)" : "var(--text-secondary)",
        padding: "2px 6px",
        fontSize: "9px",
        letterSpacing: "0.06em",
        cursor: "pointer",
        borderRadius: "2px",
        fontFamily: "inherit",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = danger ? "var(--red)" : "var(--accent-dim)";
        el.style.color = danger ? "var(--red)" : "var(--accent)";
        el.style.background = danger
          ? "rgba(255,68,68,0.08)"
          : "var(--accent-glow)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
        el.style.color = danger ? "var(--red)" : "var(--text-secondary)";
        el.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

export default function AgentCard({ agent }: Props) {
  const stateColor = STATE_COLOR[agent.state];
  const dotClass = STATE_DOT_CLASS[agent.state];

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
        borderTop: `2px solid ${stateColor}`,
        borderRadius: "3px",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
        minWidth: 0,
      }}
    >
      {/* Header: name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <div className={`status-dot ${dotClass}`} />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.14em",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.name.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "8px",
            color: stateColor,
            letterSpacing: "0.1em",
            border: `1px solid ${stateColor}`,
            padding: "1px 5px",
            borderRadius: "2px",
            flexShrink: 0,
            opacity: 0.9,
          }}
        >
          {STATE_LABEL[agent.state]}
        </span>
      </div>

      {/* Role */}
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-secondary)",
          letterSpacing: "0.04em",
        }}
      >
        {agent.role}
      </div>

      {/* Host + Model */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          borderTop: "1px solid rgba(30,45,69,0.5)",
          paddingTop: "6px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", fontSize: "10px" }}>
          <span
            style={{ color: "var(--text-muted)", width: "38px", flexShrink: 0 }}
          >
            HOST
          </span>
          <span style={{ color: "var(--accent)", letterSpacing: "0.08em" }}>
            {agent.host || "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px", fontSize: "10px" }}>
          <span
            style={{ color: "var(--text-muted)", width: "38px", flexShrink: 0 }}
          >
            MODEL
          </span>
          <span
            style={{
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {agent.currentModel || "—"}
          </span>
        </div>
      </div>

      {/* Transport */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "9px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>VIA</span>
        {agent.transport.length > 0 ? (
          agent.transport.map((t) => (
            <span
              key={t}
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                padding: "1px 5px",
                borderRadius: "2px",
              }}
            >
              {t}
            </span>
          ))
        ) : (
          <span style={{ color: "var(--text-muted)" }}>local only</span>
        )}
      </div>

      {/* Memory Layers */}
      {agent.memoryLayers && agent.memoryLayers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "9px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}
          >
            MEMORY
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {agent.memoryLayers.map((layer) => (
              <span
                key={layer}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "9px",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  padding: "1px 6px",
                  borderRadius: "2px",
                }}
              >
                <span style={{ color: "var(--green)", fontSize: "7px" }}>●</span>
                {LAYER_LABEL[layer]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fallback count if any */}
      {agent.fallbackModels.length > 0 && (
        <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
          FALLBACKS:{" "}
          <span style={{ color: "var(--text-secondary)" }}>
            {agent.fallbackModels.length} available
          </span>
        </div>
      )}

      {/* Last Seen */}
      <div
        style={{
          fontSize: "9px",
          color:
            agent.lastSeen === "live" ? "var(--green)" : "var(--text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        LAST: {agent.lastSeen || "—"}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(30,45,69,0.5)",
          paddingTop: "7px",
        }}
      >
        <ActionBtn label="VIEW" />
        <ActionBtn label="PAUSE" />
        <ActionBtn label="RESTART" />
        <ActionBtn label="→ STANDBY" danger />
      </div>
    </div>
  );
}

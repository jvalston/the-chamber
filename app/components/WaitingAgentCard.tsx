"use client";

import { Agent, AgentState } from "../../lib/mock/agents";

const STATE_COLOR: Record<AgentState, string> = {
  active:   "var(--green)",
  standby:  "var(--yellow)",
  degraded: "var(--red)",
  offline:  "var(--red)",
  draft:    "var(--text-muted)",
  archived: "var(--text-muted)",
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

function SmallBtn({
  label,
  accent,
  warn,
}: {
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const baseColor = accent
    ? "var(--accent)"
    : warn
    ? "var(--yellow)"
    : "var(--text-secondary)";
  const baseBorder = accent
    ? "var(--accent-dim)"
    : warn
    ? "rgba(255,215,0,0.4)"
    : "var(--border)";

  return (
    <button
      style={{
        background: "transparent",
        border: `1px solid ${baseBorder}`,
        color: baseColor,
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
        el.style.borderColor = "var(--accent-dim)";
        el.style.color = "var(--accent)";
        el.style.background = "var(--accent-glow)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = baseBorder;
        el.style.color = baseColor;
        el.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

export default function WaitingAgentCard({ agent }: Props) {
  const stateColor = STATE_COLOR[agent.state];

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${stateColor}`,
        borderRadius: "3px",
        padding: "9px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {/* Header: name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.14em",
            flex: 1,
          }}
        >
          {agent.name.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "8px",
            color: stateColor,
            border: `1px solid ${stateColor}`,
            padding: "1px 5px",
            borderRadius: "2px",
            letterSpacing: "0.1em",
            flexShrink: 0,
            opacity: 0.85,
          }}
        >
          {STATE_LABEL[agent.state]}
        </span>
      </div>

      {/* Role */}
      <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
        {agent.role}
      </div>

      {/* Meta: host, memory, tools */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          fontSize: "9px",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(30,45,69,0.4)",
          paddingTop: "5px",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          HOST:{" "}
          <span
            style={{
              color: agent.host ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {agent.host || "UNASSIGNED"}
          </span>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          MEM:{" "}
          <span
            style={{
              color: agent.memoryAttached
                ? "var(--green)"
                : "var(--text-muted)",
            }}
          >
            {agent.memoryAttached ? "●" : "○"}
          </span>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          TOOLS:{" "}
          <span style={{ color: "var(--text-secondary)" }}>
            {agent.tools.length > 0 ? agent.tools.length : "none"}
          </span>
        </span>
        {agent.transport.length > 0 && (
          <span style={{ color: "var(--text-muted)" }}>
            VIA:{" "}
            <span style={{ color: "var(--text-secondary)" }}>
              {agent.transport.join(", ")}
            </span>
          </span>
        )}
      </div>

      {/* Notes */}
      {agent.notes && (
        <div
          style={{
            fontSize: "9px",
            color: "var(--text-muted)",
            lineHeight: "1.5",
            fontStyle: "italic",
          }}
        >
          {agent.notes}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(30,45,69,0.4)",
          paddingTop: "6px",
        }}
      >
        <SmallBtn label="BRING ONLINE" accent />
        <SmallBtn label="EDIT" />
        <SmallBtn label="ASSIGN HOST" />
        <SmallBtn label="ATTACH MEM" />
        <SmallBtn label="ARCHIVE" warn />
        <SmallBtn label="CLONE" />
      </div>
    </div>
  );
}

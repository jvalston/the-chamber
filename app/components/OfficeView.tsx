"use client";

import { useEffect, useState } from "react";
import { AgentEntry } from "../../config/agents.config";

const AGENT_COLOR: Record<string, string> = {
  legend:   "#00d4ff",
  seraphim: "#a855f7",
  lumen:    "#818cf8",
  diamond:  "#00ff9d",
  elior:    "#ffd700",
  sentinel: "#ff6b6b",
  atlas:    "#f97316",
  aurora:   "#ec4899",
  kairo:    "#38bdf8",
  aurelion: "#facc15",
  veris:    "#4ade80",
};

const AGENT_ACTIVITY: Record<string, string> = {
  legend:   "Creative review · Discord",
  seraphim: "Governance & oversight",
  lumen:    "Protocol drafting · routing",
  sentinel: "System watch · visibility",
  kairo:    "Structural analysis",
  aurelion: "Cost & flow monitoring",
  veris:    "Alignment verification",
  diamond:  "Build session · code ops",
  elior:    "Memory archive · recall",
  atlas:    "Research scouting",
  aurora:   "Content indexing · docs",
};

// Grid positions: col (1-4), row (1-3)
// Row 1 — Phoenix core
// Row 2 — Phoenix extended
// Row 3 — Lucy + Axiom
const AGENT_DESK: Record<string, { col: number; row: number }> = {
  legend:   { col: 1, row: 1 },
  seraphim: { col: 2, row: 1 },
  lumen:    { col: 3, row: 1 },
  sentinel: { col: 4, row: 1 },
  kairo:    { col: 1, row: 2 },
  aurelion: { col: 2, row: 2 },
  veris:    { col: 3, row: 2 },
  diamond:  { col: 1, row: 3 },
  elior:    { col: 2, row: 3 },
  atlas:    { col: 3, row: 3 },
  aurora:   { col: 4, row: 3 },
};

const HOST_LABEL: Record<string, string> = {
  Phoenix: "PHX",
  Lucy:    "LCY",
  Axiom:   "AXM",
};

export default function OfficeView() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);

  useEffect(() => {
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.agents) setAgents(d.agents); })
      .catch(() => {});
  }, []);

  // Build a lookup by grid position
  const byCell: Record<string, AgentEntry> = {};
  for (const agent of agents) {
    const desk = AGENT_DESK[agent.id];
    if (desk) byCell[`${desk.col}-${desk.row}`] = agent;
  }

  const COLS = 4;
  const ROWS = 3;

  return (
    <div style={{
      flex:          1,
      display:       "flex",
      flexDirection: "column",
      padding:       "8px",
      gap:           "8px",
      overflow:      "hidden",
    }}>
      {/* Header */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          <span className="status-dot online" />
          VIRTUAL PRESENCE
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px", fontSize: "10px" }}>
            — {agents.filter((a) => AGENT_DESK[a.id]).length} agents at desk
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
            {[["PHX", "#00d4ff"], ["LCY", "#00ff9d"], ["AXM", "#f97316"]].map(([label, color]) => (
              <span key={label} style={{ fontSize: "8px", color, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex:                1,
        display:             "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
        gap:                 "6px",
        overflow:            "hidden",
      }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const col = (i % COLS) + 1;
          const row = Math.floor(i / COLS) + 1;
          const agent = byCell[`${col}-${row}`];

          if (agent) {
            const color    = AGENT_COLOR[agent.id] ?? "var(--text-secondary)";
            const activity = AGENT_ACTIVITY[agent.id] ?? agent.role;
            const hostTag  = HOST_LABEL[agent.host ?? ""] ?? agent.host ?? "—";

            return (
              <div
                key={i}
                style={{
                  background:    `${color}0d`,
                  border:        `1px solid ${color}33`,
                  borderTop:     `2px solid ${color}`,
                  borderRadius:  "4px",
                  padding:       "10px 12px",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "5px",
                  minHeight:     0,
                }}
              >
                {/* Name row */}
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{
                    width:          "26px",
                    height:         "26px",
                    borderRadius:   "50%",
                    background:     `${color}1a`,
                    border:         `2px solid ${color}`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       "11px",
                    fontWeight:     700,
                    color,
                    flexShrink:     0,
                  }}>
                    {agent.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:      "11px",
                      fontWeight:    700,
                      color:         "var(--text-primary)",
                      letterSpacing: "0.1em",
                      overflow:      "hidden",
                      textOverflow:  "ellipsis",
                      whiteSpace:    "nowrap",
                    }}>
                      {agent.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                      {hostTag}
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div style={{
                  fontSize:  "9px",
                  color:     "var(--text-secondary)",
                  lineHeight: 1.5,
                  flex:       1,
                }}>
                  {activity}
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    style={{
                      width:        "5px",
                      height:       "5px",
                      borderRadius: "50%",
                      background:   color,
                      boxShadow:    `0 0 4px ${color}`,
                      flexShrink:   0,
                    }}
                  />
                  <span style={{ fontSize: "8px", color, letterSpacing: "0.08em" }}>AT DESK</span>
                </div>
              </div>
            );
          }

          // Empty floor tile (row 2, col 4 — reserved slot)
          return (
            <div
              key={i}
              style={{
                background:    "rgba(255,255,255,0.01)",
                border:        "1px dashed rgba(30,45,69,0.5)",
                borderRadius:  "4px",
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.04)", fontSize: "18px" }}>·</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

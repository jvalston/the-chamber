"use client";

import { FlowEvent, FlowEventType, FlowEventStatus } from "../../../lib/flow/flow-types";

// Per-type accent color (border top + arrow)
const TYPE_ACCENT: Record<FlowEventType, string> = {
  input:     "#00d4ff",
  routing:   "#a855f7",
  memory:    "#ffd700",
  task:      "#00ff9d",
  blueprint: "#38bdf8",
  project:   "#63b3ed",
  repo:      "#6ee7a0",
  output:    "#22c4d0",
  warning:   "#f97316",
  error:     "#ff4444",
};

// Status badge colors
const STATUS_STYLE: Record<FlowEventStatus, { color: string; bg: string }> = {
  active:   { color: "#dffcff", bg: "rgba(0,212,255,0.14)"  },
  complete: { color: "#d9ffe8", bg: "rgba(0,255,157,0.12)"  },
  waiting:  { color: "#fff1c7", bg: "rgba(255,215,0,0.12)"  },
  failed:   { color: "#ffd7d7", bg: "rgba(255,68,68,0.13)"  },
  queued:   { color: "#d8e6ff", bg: "rgba(110,150,255,0.12)"},
};

export default function FlowEventCard({ event }: { event: FlowEvent }) {
  const accent = TYPE_ACCENT[event.type];
  const ss     = STATUS_STYLE[event.status];

  return (
    <div
      style={{
        minWidth:        "256px",
        maxWidth:        "296px",
        padding:         "12px 14px",
        borderRadius:    "4px",
        background:      "rgba(8,15,28,0.97)",
        border:          `1px solid rgba(255,255,255,0.07)`,
        borderTop:       `2px solid ${accent}`,
        display:         "flex",
        flexDirection:   "column",
        gap:             "6px",
        flexShrink:      0,
        // Use Inter for readability — falls back to system UI stack
        fontFamily:      "Inter, 'Segoe UI', Roboto, system-ui, sans-serif",
        boxSizing:       "border-box",
      }}
    >
      {/* Agent label + status badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{
          fontSize:      "11px",
          fontWeight:    700,
          letterSpacing: "0.1em",
          color:         accent,
          textTransform: "uppercase",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
          whiteSpace:    "nowrap",
        }}>
          {event.agent}
        </span>
        <span style={{
          fontSize:      "10px",
          fontWeight:    600,
          padding:       "2px 7px",
          borderRadius:  "20px",
          background:    ss.bg,
          color:         ss.color,
          textTransform: "capitalize",
          flexShrink:    0,
          whiteSpace:    "nowrap",
        }}>
          {event.status}
        </span>
      </div>

      {/* Title — primary readable text */}
      <div style={{
        fontSize:   "14px",
        fontWeight: 600,
        color:      "#e8f4ff",
        lineHeight: 1.4,
      }}>
        {event.title}
      </div>

      {/* Detail — supporting line */}
      {event.detail && (
        <div style={{
          fontSize:   "13px",
          color:      "#7a9ab8",
          lineHeight: 1.5,
        }}>
          {event.detail}
        </div>
      )}

      {/* Source → Target path */}
      {(event.source || event.target) && (
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        "5px",
          fontSize:   "12px",
          color:      "#4d6a82",
          marginTop:  "1px",
        }}>
          <span>{event.source || "—"}</span>
          <span style={{ color: accent }}>→</span>
          <span>{event.target || "—"}</span>
        </div>
      )}

      {/* Timestamp */}
      <div style={{
        fontSize:   "11px",
        color:      "#3a5570",
        marginTop:  "2px",
        fontVariantNumeric: "tabular-nums",
      }}>
        {event.timestamp}
      </div>
    </div>
  );
}

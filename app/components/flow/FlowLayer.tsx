"use client";

// FlowLayer — horizontal live activity strip.
// Phase 1: seeded with mock events. Replace flowStore.seed() call with
// real emitters once OpenClaw / gateway SSE is wired.
//
// TODO: connect live event sources:
//   - OpenClaw gateway  → routing + response events
//   - Qdrant (:6333)    → memory write events
//   - TrueRecall        → archive + recall events
//   - Task system       → create / status change events
//   - Blueprint inbox   → submit + promote events

import { useEffect, useRef, useState } from "react";
import { flowStore } from "../../../lib/flow/flow-store";
import { MOCK_FLOW_EVENTS } from "../../../lib/flow/flow-mocks";
import { FlowEvent } from "../../../lib/flow/flow-types";
import FlowEventCard from "./FlowEventCard";

export default function FlowLayer() {
  const [events, setEvents]       = useState<FlowEvent[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);
  const stripRef                  = useRef<HTMLDivElement>(null);

  // Seed mock data on mount; subscribe to future events
  useEffect(() => {
    flowStore.seed(MOCK_FLOW_EVENTS);
    return flowStore.subscribe(setEvents);
  }, []);

  // Auto-scroll to newest (rightmost) event
  useEffect(() => {
    const el = stripRef.current;
    if (!el || !autoFollow) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [events, autoFollow]);

  // Pause auto-follow if user manually scrolls left
  function handleScroll() {
    const el = stripRef.current;
    if (!el) return;
    const atRight = el.scrollWidth - el.scrollLeft - el.clientWidth < 80;
    if (atRight) setAutoFollow(true);
    else setAutoFollow(false);
  }

  return (
    <div
      className="panel"
      style={{
        flexShrink: 0,
        overflow:   "hidden",
        fontFamily: "Inter, 'Segoe UI', Roboto, system-ui, sans-serif",
      }}
    >
      {/* Header bar */}
      <div
        className="panel-header"
        style={{ justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Pulsing live indicator */}
          <span
            className="status-dot online"
            style={{ flexShrink: 0 }}
          />
          <span>LIVE FLOW</span>
          <span style={{
            color:      "var(--text-muted)",
            fontWeight: 400,
            fontSize:   "10px",
          }}>
            {events.length} events
          </span>
        </div>

        <button
          type="button"
          onClick={() => setAutoFollow((v) => !v)}
          style={{
            background:    "transparent",
            border:        `1px solid ${autoFollow ? "var(--accent-dim)" : "var(--border)"}`,
            color:         autoFollow ? "var(--accent)" : "var(--text-muted)",
            padding:       "2px 8px",
            fontSize:      "10px",
            letterSpacing: "0.06em",
            cursor:        "pointer",
            borderRadius:  "2px",
            fontFamily:    "inherit",
          }}
        >
          {autoFollow ? "AUTO ●" : "MANUAL ○"}
        </button>
      </div>

      {/* Horizontal event strip */}
      <div
        ref={stripRef}
        onScroll={handleScroll}
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "0",
          padding:       "10px 12px",
          overflowX:     "auto",
          overflowY:     "hidden",
          height:        "166px",
          boxSizing:     "border-box",
          scrollBehavior: "smooth",
          // thin custom scrollbar to stay on-brand
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border-bright) transparent",
        } as React.CSSProperties}
      >
        {events.length === 0 ? (
          <span style={{
            color:      "var(--text-muted)",
            fontSize:   "13px",
            padding:    "0 6px",
            fontFamily: "inherit",
          }}>
            Waiting for events…
          </span>
        ) : (
          events.map((event, i) => (
            <div
              key={event.id}
              style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
            >
              <FlowEventCard event={event} />
              {/* Connector between cards */}
              {i < events.length - 1 && (
                <div style={{
                  width:      "24px",
                  height:     "2px",
                  background: "linear-gradient(to right, rgba(0,212,255,0.12), rgba(0,212,255,0.45))",
                  flexShrink: 0,
                  margin:     "0 1px",
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

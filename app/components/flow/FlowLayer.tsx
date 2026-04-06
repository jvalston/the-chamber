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
import { FlowEvent } from "../../../lib/flow/flow-types";
import FlowEventCard from "./FlowEventCard";

interface LiveFlowStatus {
  runId?: string;
  stage?: string;
  state?: string;
  message?: string;
  source?: string;
  archive?: string;
  updatedAt?: string;
  elapsedSec?: number;
  status?: string;
}

function titleCaseAgent(raw: string): string {
  const cleaned = raw.replace(/[^a-z0-9-]/gi, "").trim();
  if (!cleaned) return "Lumen";
  return cleaned
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function stageToEvent(s: LiveFlowStatus): FlowEvent {
  const stage = (s.stage ?? s.status ?? "idle").toLowerCase();
  const state = (s.state ?? "idle").toLowerCase();
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  const message = s.message ?? "";

  const meta = {
    id: `flow-${s.runId ?? "idle"}-${stage}-${state}-${Date.now()}`,
    timestamp: ts,
    detail: message || "Flow update",
    source: "The Chamber",
    target: s.source ?? "Constellation",
  } as const;

  if (stage === "preflight") {
    return { ...meta, agent: "Sentinel", type: "task", status: "active", title: "Preflight health checks" };
  }
  if (stage === "intake") {
    return { ...meta, agent: "Origin", type: "input", status: "active", title: "Dataset intake started" };
  }
  if (stage === "routing") {
    return { ...meta, agent: "Hermes", type: "routing", status: "active", title: "Routing Phoenix -> Lucy" };
  }
  if (stage === "execution") {
    return { ...meta, agent: "Diamond", type: "repo", status: "active", title: "Execution and transform running" };
  }
  if (stage === "archive") {
    return { ...meta, agent: "Elior", type: "memory", status: "active", title: "Archiving transformed output" };
  }
  if (stage === "star-loop") {
    const waiting = message.match(/waiting on ([a-z0-9-]+)/i);
    if (waiting) {
      const agent = titleCaseAgent(waiting[1]);
      return {
        ...meta,
        agent,
        type: "task",
        status: "waiting",
        title: `${agent} handoff pending`,
      };
    }

    const completed = message.match(/completed ([a-z0-9-]+)/i);
    if (completed) {
      const agent = titleCaseAgent(completed[1]);
      return {
        ...meta,
        agent,
        type: "task",
        status: "complete",
        title: `${agent} handoff confirmed`,
      };
    }

    const warning = message.match(/warning on ([a-z0-9-]+)/i);
    if (warning) {
      const agent = titleCaseAgent(warning[1]);
      return {
        ...meta,
        agent,
        type: "warning",
        status: "waiting",
        title: `${agent} handoff warning`,
      };
    }

    return { ...meta, agent: "Lumen", type: "task", status: "active", title: "Star handoff confirmations" };
  }
  if (stage === "postflight") {
    return { ...meta, agent: "Seraphim", type: "task", status: "waiting", title: "Governance postflight checks" };
  }
  if (state === "failed" || stage === "failed") {
    return { ...meta, agent: "System", type: "error", status: "failed", title: "Star verification failed", target: s.archive ?? "Archive" };
  }
  if (stage === "complete" || state === "completed") {
    return { ...meta, agent: "System", type: "output", status: "complete", title: "Star verification completed", target: s.archive ?? "Archive" };
  }

  return { ...meta, agent: "System", type: "task", status: "queued", title: "Verification idle" };
}

export default function FlowLayer() {
  const [events, setEvents]       = useState<FlowEvent[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);
  const [live, setLive]           = useState<LiveFlowStatus>({ status: "idle" });
  const stripRef                  = useRef<HTMLDivElement>(null);
  const lastSigRef                = useRef<string>("");

  // Subscribe to flow store updates
  useEffect(() => {
    return flowStore.subscribe(setEvents);
  }, []);

  // Poll live flow status and append stage-change events
  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const r = await fetch("/api/flow-status", { cache: "no-store" });
        const status = (await r.json()) as LiveFlowStatus;
        if (!mounted) return;

        setLive(status);
        const stage = (status.stage ?? status.status ?? "idle").toLowerCase();
        const progress = stage === "star-loop" ? (status.message ?? "") : "";
        const sig = `${status.runId ?? "none"}:${stage}:${status.state ?? "idle"}:${progress}`;
        if (sig !== lastSigRef.current) {
          lastSigRef.current = sig;
          flowStore.addEvent(stageToEvent(status));
        }
      } catch {
        // no-op; keep last known status
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
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
          <span style={{
            color: "var(--accent-dim)",
            fontWeight: 500,
            fontSize: "10px",
            marginLeft: "8px",
            letterSpacing: "0.04em",
          }}>
            {`${(live.stage ?? live.status ?? "idle").toUpperCase()} · ${live.elapsedSec ?? 0}s`}
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

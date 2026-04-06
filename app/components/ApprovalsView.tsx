"use client";

import { useEffect, useState, useCallback } from "react";

type ApprovalPriority = "urgent" | "normal" | "low";
type ApprovalStatus   = "pending" | "approved" | "deferred" | "rejected";

interface ApprovalItem {
  id:          string;
  title:       string;
  description: string;
  requestedBy: string;
  priority:    ApprovalPriority;
  status:      ApprovalStatus;
  created:     string;
  category:    string;
  resolvedAt?: string;
  meta?: Record<string, string>;
}

const PRIORITY_COLOR: Record<ApprovalPriority, string> = {
  urgent: "var(--red)",
  normal: "var(--accent)",
  low:    "var(--text-muted)",
};

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending:  "var(--yellow)",
  approved: "var(--green)",
  deferred: "var(--text-muted)",
  rejected: "var(--red)",
};

export default function ApprovalsView() {
  const [items,   setItems]   = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null); // id of item being actioned

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/approvals", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setItems(data.approvals);
      }
    } catch { /* keep last known */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, status: ApprovalStatus) {
    setActing(id);
    try {
      const r = await fetch("/api/approvals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ _action: "patch", id, status }),
      });
      if (r.ok) {
        // Optimistic update — replace status in local state immediately
        setItems((prev) =>
          prev.map((a) => a.id === id ? { ...a, status, resolvedAt: new Date().toISOString() } : a)
        );
      }
    } catch { /* no-op — UI stays as-is */ }
    finally { setActing(null); }
  }

  const pending     = items.filter((a) => a.status === "pending");
  const gapRequests = pending.filter((a) => a.category === "agent-gap");
  const resolved    = items.filter((a) => a.status !== "pending");

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>
        Loading approvals…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflowY: "auto" }}>

      {/* Agent Gap Requests — Seraphim escalations */}
      {gapRequests.length > 0 && (
        <div className="panel" style={{ flexShrink: 0, borderColor: "rgba(255,120,50,0.35)" }}>
          <div className="panel-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot" style={{ background: "var(--red)" }} />
              AGENT READINESS GAPS
            </div>
            <span style={{ color: "var(--red)", fontWeight: 600, fontSize: "11px" }}>
              {gapRequests.length} flagged by Seraphim
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {gapRequests.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                busy={acting === item.id}
                onAct={act}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="status-dot warn" />
            PENDING APPROVALS
          </div>
          <span style={{ color: "var(--yellow)", fontWeight: 600, fontSize: "11px" }}>
            {pending.filter((a) => a.category !== "agent-gap").length} awaiting
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {pending.filter((a) => a.category !== "agent-gap").length === 0 ? (
            <div style={{ padding: "14px", fontSize: "11px", color: "var(--text-muted)" }}>
              No pending approvals
            </div>
          ) : (
            pending.filter((a) => a.category !== "agent-gap").map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                busy={acting === item.id}
                onAct={act}
              />
            ))
          )}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span className="status-dot idle" />
            RESOLVED
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {resolved.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                busy={false}
                onAct={act}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const GAP_PRIORITY_COLOR: Record<string, string> = {
  blocking: "var(--red)",
  degraded: "var(--yellow)",
  advisory: "var(--text-muted)",
};

function GapReportBlock({ meta }: { meta: Record<string, string> }) {
  const rows: [string, string][] = [
    ["Agent",        meta.agent        ?? "—"],
    ["Node",         meta.node         ?? "—"],
    ["Assigned role",meta.assignedRole ?? "—"],
    ["Missing",      meta.missing      ?? "—"],
    ["Impact",       meta.impact       ?? "—"],
    ["Fix",          meta.recommendedFix ?? "—"],
  ];
  const gapColor = GAP_PRIORITY_COLOR[meta.gapPriority ?? "advisory"] ?? "var(--text-muted)";

  return (
    <div style={{
      marginTop:    "8px",
      padding:      "8px 10px",
      background:   "rgba(255,80,50,0.06)",
      border:       "1px solid rgba(255,80,50,0.18)",
      borderRadius: "3px",
      fontSize:     "10px",
      lineHeight:   1.6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ color: "var(--text-muted)", letterSpacing: "0.08em", fontSize: "9px" }}>GAP REPORT</span>
        {meta.gapPriority && (
          <span style={{ color: gapColor, letterSpacing: "0.08em", fontSize: "9px", fontWeight: 600 }}>
            {meta.gapPriority.toUpperCase()}
          </span>
        )}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "var(--text-muted)", width: "90px", flexShrink: 0 }}>{label}</span>
          <span style={{ color: "var(--text-secondary)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ApprovalCard({
  item,
  busy,
  onAct,
}: {
  item:  ApprovalItem;
  busy:  boolean;
  onAct: (id: string, status: ApprovalStatus) => void;
}) {
  const isGap     = item.category === "agent-gap";
  const pc        = isGap ? "var(--red)" : PRIORITY_COLOR[item.priority];
  const sc        = STATUS_COLOR[item.status];
  const isPending = item.status === "pending";

  const createdDate = new Date(item.created);
  const createdLabel = isNaN(createdDate.getTime())
    ? item.created
    : createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      padding:      "12px 14px",
      borderBottom: "1px solid rgba(30,45,69,0.4)",
      borderLeft:   `3px solid ${pc}`,
      opacity:      busy ? 0.6 : 1,
      transition:   "opacity 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>
            {item.title}
          </div>
          {/* Plain description — shown for non-gap items or when no meta */}
          {(!isGap || !item.meta) && (
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>
              {item.description}
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-muted)" }}>
            <span>Requested by <span style={{ color: "var(--text-secondary)" }}>{item.requestedBy}</span></span>
            <span>{createdLabel}</span>
            <span style={{ color: isGap ? "rgba(255,100,60,0.9)" : "var(--accent-dim)" }}>{item.category}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <span style={{
            fontSize:      "9px",
            color:         sc,
            border:        `1px solid ${sc}`,
            padding:       "1px 6px",
            borderRadius:  "2px",
            letterSpacing: "0.08em",
          }}>
            {item.status.toUpperCase()}
          </span>
          <span style={{ fontSize: "9px", color: pc, letterSpacing: "0.06em" }}>
            {isGap ? (item.meta?.gapPriority ?? item.priority).toUpperCase() : item.priority.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Structured gap report block */}
      {isGap && item.meta && <GapReportBlock meta={item.meta} />}

      {isPending && (
        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          {(["APPROVE", "DEFER", "REJECT"] as const).map((label) => {
            const status: ApprovalStatus =
              label === "APPROVE" ? "approved" :
              label === "DEFER"   ? "deferred" :
              "rejected";
            const color =
              label === "APPROVE" ? "var(--green)" :
              label === "REJECT"  ? "var(--red)"   :
              "var(--text-muted)";
            return (
              <button
                key={label}
                disabled={busy}
                onClick={() => onAct(item.id, status)}
                style={{
                  background:    label === "APPROVE" ? "rgba(0,255,157,0.1)" : "transparent",
                  border:        `1px solid ${label === "APPROVE" ? "var(--green)" : label === "REJECT" ? "var(--red)" : "var(--border)"}`,
                  color,
                  padding:       "3px 10px",
                  fontSize:      "9px",
                  letterSpacing: "0.1em",
                  cursor:        busy ? "not-allowed" : "pointer",
                  borderRadius:  "2px",
                  fontFamily:    "inherit",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

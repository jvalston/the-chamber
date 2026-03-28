"use client";

// Constellation governance — doctrine, charter, active policies, and escalation history.
// Seraphim is the keeper. All governance decisions are logged here.
// TODO: wire to Seraphim's governance log / canonical hub

interface DoctrineEntry {
  id:      string;
  title:   string;
  summary: string;
  author:  string;
  version: string;
  updated: string;
  status:  "active" | "draft" | "archived";
}

interface GovDecision {
  id:      string;
  title:   string;
  outcome: string;
  agent:   string;
  date:    string;
}

const DOCTRINE: DoctrineEntry[] = [
  {
    id:      "d1",
    title:   "Constellation Charter",
    summary: "Core governing document for agent roles, responsibilities, boundaries, and escalation paths within the constellation.",
    author:  "Seraphim",
    version: "1.3",
    updated: "3 days ago",
    status:  "active",
  },
  {
    id:      "d2",
    title:   "Memory Governance Policy",
    summary: "Rules for what may be written to TrueRecall, Qdrant, LCM, and Archive. Includes namespace ownership and retention rules.",
    author:  "Seraphim",
    version: "1.1",
    updated: "1 week ago",
    status:  "active",
  },
  {
    id:      "d3",
    title:   "Creative Domain Doctrine",
    summary: "Legend's autonomy over the creative domain. Defines scope, output ownership, and interaction with other agents.",
    author:  "Legend + Seraphim",
    version: "1.0",
    updated: "2 weeks ago",
    status:  "active",
  },
  {
    id:      "d4",
    title:   "Build & Tool Governance",
    summary: "Diamond's scope for file operations, shell access, and repo writes. What requires sign-off vs. autonomous action.",
    author:  "Seraphim",
    version: "0.9",
    updated: "2 weeks ago",
    status:  "draft",
  },
  {
    id:      "d5",
    title:   "Historian Recall Protocol",
    summary: "Elior's rules for what to surface in recall, how to summarize episodic memory, and when to escalate.",
    author:  "Elior + Seraphim",
    version: "1.0",
    updated: "3 weeks ago",
    status:  "active",
  },
];

const DECISIONS: GovDecision[] = [
  { id: "g1", title: "Expanded Qdrant write access for Elior",      outcome: "Approved",  agent: "Seraphim", date: "today" },
  { id: "g2", title: "Legend — new Discord channel: #creative-log", outcome: "Approved",  agent: "Seraphim", date: "yesterday" },
  { id: "g3", title: "Diamond shell scope expansion",               outcome: "Deferred",  agent: "Seraphim", date: "2 days ago" },
  { id: "g4", title: "Archivist agent activation",                  outcome: "Pending",   agent: "Seraphim", date: "3 days ago" },
];

const OUTCOME_COLOR: Record<string, string> = {
  Approved:  "var(--green)",
  Deferred:  "var(--text-muted)",
  Rejected:  "var(--red)",
  Pending:   "var(--yellow)",
};

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--green)",
  draft:    "var(--yellow)",
  archived: "var(--text-muted)",
};

export default function CouncilView() {
  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden" }}>
      {/* Left: doctrine */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <span style={{ color: "#a855f7" }}>⚖</span>
            ACTIVE DOCTRINE
            <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px" }}>— kept by Seraphim</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {DOCTRINE.map((doc) => (
              <div key={doc.id} style={{
                padding:      "12px 14px",
                borderBottom: "1px solid rgba(30,45,69,0.5)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>
                      {doc.title}
                      <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "8px" }}>v{doc.version}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>
                      {doc.summary}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      Author: {doc.author} · Updated {doc.updated}
                    </div>
                  </div>
                  <span style={{
                    fontSize:     "9px",
                    color:        STATUS_COLOR[doc.status],
                    border:       `1px solid ${STATUS_COLOR[doc.status]}`,
                    padding:      "1px 6px",
                    borderRadius: "2px",
                    flexShrink:   0,
                    letterSpacing: "0.08em",
                  }}>
                    {doc.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: decisions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            GOVERNANCE LOG
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {DECISIONS.map((d) => (
              <div key={d.id} style={{
                padding:      "10px 12px",
                borderBottom: "1px solid rgba(30,45,69,0.4)",
              }}>
                <div style={{ fontSize: "11px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px" }}>
                  {d.title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span style={{ color: "var(--text-muted)" }}>{d.agent} · {d.date}</span>
                  <span style={{ color: OUTCOME_COLOR[d.outcome] ?? "var(--text-muted)", letterSpacing: "0.06em" }}>
                    {d.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

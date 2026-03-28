"use client";

// Feedback — autonomous R&D memos, build assessments, historical analyses, improvement suggestions.
// These are outputs from the constellation's own review processes.
// Diamond: build assessments. Elior: historical analyses. Seraphim: governance reviews. Legend: creative reflections.
// TODO: wire to Elior's episodic archive / Diamond's build log / Seraphim's governance event stream

type MemoType   = "build" | "recall" | "governance" | "creative" | "system";
type MemoStatus = "new" | "reviewed" | "actioned" | "archived";

interface Memo {
  id:      string;
  title:   string;
  body:    string;
  author:  string;
  type:    MemoType;
  status:  MemoStatus;
  date:    string;
  tags:    string[];
  memoryRef?: string;  // linked memory layer / namespace
}

const TYPE_COLOR: Record<MemoType, string> = {
  build:      "var(--accent)",
  recall:     "#ffd700",
  governance: "#a855f7",
  creative:   "#00ff9d",
  system:     "var(--text-muted)",
};

const TYPE_LABEL: Record<MemoType, string> = {
  build:      "BUILD ASSESS",
  recall:     "RECALL",
  governance: "GOVERNANCE",
  creative:   "CREATIVE",
  system:     "SYSTEM",
};

const STATUS_COLOR: Record<MemoStatus, string> = {
  new:      "var(--yellow)",
  reviewed: "var(--accent)",
  actioned: "var(--green)",
  archived: "var(--text-muted)",
};

const MOCK_MEMOS: Memo[] = [
  {
    id:        "m1",
    title:     "FlowLayer wiring — gap analysis",
    body:      "OpenClaw gateway events are not yet plumbed into FlowLayer. Currently seeded with mocks. Recommend: add an SSE endpoint at /api/gateway/stream and subscribe on mount. Estimated effort: ~2h.",
    author:    "Diamond",
    type:      "build",
    status:    "new",
    date:      "today 09:40",
    tags:      ["FlowLayer", "OpenClaw", "wiring"],
    memoryRef: "LCM / build-log",
  },
  {
    id:        "m2",
    title:     "Episodic recall — session density increasing",
    body:      "Over the last 14 days, session log volume has grown 3×. Qdrant namespace `elior_episodic` is at 68% capacity. Recommend namespace expansion or tiered archival before next week.",
    author:    "Elior",
    type:      "recall",
    status:    "new",
    date:      "today 07:15",
    tags:      ["Qdrant", "episodic", "capacity"],
    memoryRef: "Qdrant / elior_episodic",
  },
  {
    id:        "m3",
    title:     "Diamond shell scope — deferred review",
    body:      "Shell expansion request was deferred 2 days ago. No resolution. Diamond is currently read-only on Lucy, blocking automated repo tagging. Recommend Nana reviews approval a3 and clears the queue.",
    author:    "Seraphim",
    type:      "governance",
    status:    "new",
    date:      "yesterday 22:00",
    tags:      ["governance", "Diamond", "permissions"],
    memoryRef: "TrueRecall / governance",
  },
  {
    id:        "m4",
    title:     "Suno v4 vocal parameter mapping",
    body:      "New vocal control params in Suno v4 (pitch_variance, breath_weight, vibrato_depth) are not yet in my generation templates. I've drafted updated prompt schemas — need to test with 3–5 tracks before promoting to standard.",
    author:    "Legend",
    type:      "creative",
    status:    "reviewed",
    date:      "yesterday 14:30",
    tags:      ["Suno", "vocal", "templates"],
    memoryRef: "Qdrant / legend_creative",
  },
  {
    id:        "m5",
    title:     "OpenClaw 429 handling — post-fix review",
    body:      "Exponential backoff deployed 2 days ago. Observed 0 hard failures in the last 48h vs. ~12/day before the fix. Fallback chain (openrouter → groq → ollama) is functioning correctly. Closing.",
    author:    "Diamond",
    type:      "build",
    status:    "actioned",
    date:      "2 days ago",
    tags:      ["OpenClaw", "rate-limit", "fix"],
    memoryRef: "LCM / build-log",
  },
  {
    id:        "m6",
    title:     "Qdrant 1.12 sparse vector — evaluation",
    body:      "New sparse vector support in Qdrant 1.12 could benefit TrueRecall recall precision. Sparse-dense hybrid queries match closer to how Legend retrieves creative references. Worth a prototype in a test namespace.",
    author:    "Elior",
    type:      "recall",
    status:    "reviewed",
    date:      "2 days ago",
    tags:      ["Qdrant", "sparse", "TrueRecall"],
    memoryRef: "Qdrant / research",
  },
];

export default function FeedbackView() {
  const newMemos      = MOCK_MEMOS.filter((m) => m.status === "new");
  const otherMemos    = MOCK_MEMOS.filter((m) => m.status !== "new");

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden" }}>
      {/* Main memo feed */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
        {newMemos.length > 0 && (
          <div className="panel" style={{ flexShrink: 0 }}>
            <div className="panel-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-dot warn" />
                NEW MEMOS
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ color: "var(--yellow)", fontWeight: 600, fontSize: "11px" }}>
                  {newMemos.length} unreviewed
                </span>
                <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>MOCK DATA</span>
              </div>
            </div>
            {newMemos.map((m) => <MemoCard key={m.id} memo={m} />)}
          </div>
        )}

        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">
            <span className="status-dot idle" />
            REVIEWED / ACTIONED
          </div>
          {otherMemos.map((m) => <MemoCard key={m.id} memo={m} />)}
        </div>
      </div>

      {/* Right: summary by author */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">BY AUTHOR</div>
          <div style={{ padding: "6px 0" }}>
            {["Diamond", "Elior", "Seraphim", "Legend"].map((agent) => {
              const count = MOCK_MEMOS.filter((m) => m.author === agent).length;
              const newCount = MOCK_MEMOS.filter((m) => m.author === agent && m.status === "new").length;
              const color = agent === "Diamond" ? "var(--accent)" : agent === "Legend" ? "#00ff9d" : agent === "Seraphim" ? "#a855f7" : "#ffd700";
              return (
                <div key={agent} style={{
                  padding:      "9px 14px",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft:   `3px solid ${color}`,
                  display:      "flex",
                  justifyContent: "space-between",
                  alignItems:   "center",
                }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color }}>{agent}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {count} memo{count !== 1 ? "s" : ""}
                    {newCount > 0 && (
                      <span style={{ color: "var(--yellow)", marginLeft: "6px" }}>({newCount} new)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">BY TYPE</div>
          <div style={{ padding: "6px 0" }}>
            {(Object.keys(TYPE_LABEL) as MemoType[]).map((type) => {
              const count = MOCK_MEMOS.filter((m) => m.type === type).length;
              if (count === 0) return null;
              return (
                <div key={type} style={{
                  padding:      "9px 14px",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft:   `3px solid ${TYPE_COLOR[type]}`,
                  display:      "flex",
                  justifyContent: "space-between",
                  alignItems:   "center",
                }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: TYPE_COLOR[type], letterSpacing: "0.08em" }}>
                    {TYPE_LABEL[type]}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoCard({ memo }: { memo: Memo }) {
  const tc = TYPE_COLOR[memo.type];
  const sc = STATUS_COLOR[memo.status];

  return (
    <div style={{
      padding:      "12px 14px",
      borderBottom: "1px solid rgba(30,45,69,0.4)",
      borderLeft:   `3px solid ${tc}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {memo.title}
            </span>
            <span style={{
              fontSize:     "9px",
              color:        tc,
              border:       `1px solid ${tc}40`,
              padding:      "1px 5px",
              borderRadius: "2px",
              letterSpacing: "0.06em",
              flexShrink:   0,
            }}>
              {TYPE_LABEL[memo.type]}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>
            {memo.body}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
            {memo.tags.map((tag) => (
              <span key={tag} style={{
                fontSize:     "9px",
                color:        "var(--accent-dim)",
                border:       "1px solid var(--border)",
                padding:      "1px 5px",
                borderRadius: "2px",
              }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text-secondary)" }}>{memo.author}</span>
            <span>{memo.date}</span>
            {memo.memoryRef && (
              <span style={{ color: "var(--accent-dim)", fontFamily: "monospace" }}>↗ {memo.memoryRef}</span>
            )}
          </div>
        </div>
        <span style={{
          fontSize:     "9px",
          color:        sc,
          border:       `1px solid ${sc}`,
          padding:      "1px 6px",
          borderRadius: "2px",
          flexShrink:   0,
          letterSpacing: "0.08em",
        }}>
          {memo.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

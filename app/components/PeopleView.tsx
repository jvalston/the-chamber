"use client";

// People — principals, collaborators, and external systems the constellation interacts with.
// Shows who has access to what and each person/system's relationship to the constellation.
// TODO: wire to live access log / Seraphim's principal registry

interface Principal {
  id:          string;
  name:        string;
  role:        string;
  type:        "human" | "system" | "external";
  status:      "active" | "idle" | "offline";
  accessLevel: "full" | "observe" | "limited" | "none";
  memoryAccess: string[];
  lastSeen:    string;
  note:        string;
}

const ACCESS_COLOR: Record<string, string> = {
  full:    "var(--green)",
  observe: "var(--accent)",
  limited: "var(--yellow)",
  none:    "var(--text-muted)",
};

const TYPE_COLOR: Record<string, string> = {
  human:    "#a855f7",
  system:   "#00d4ff",
  external: "var(--text-muted)",
};

const STATUS_DOT: Record<string, string> = {
  active:  "var(--green)",
  idle:    "var(--yellow)",
  offline: "var(--text-muted)",
};

const PRINCIPALS: Principal[] = [
  {
    id:          "p1",
    name:        "Nana",
    role:        "Primary Principal",
    type:        "human",
    status:      "active",
    accessLevel: "full",
    memoryAccess: ["TrueRecall", "LCM", "Qdrant", "Archive"],
    lastSeen:    "now",
    note:        "Constellation owner. All agent escalations route here.",
  },
  {
    id:          "p2",
    name:        "OpenClaw Gateway",
    role:        "Model Router · :18790",
    type:        "system",
    status:      "active",
    accessLevel: "full",
    memoryAccess: ["LCM"],
    lastSeen:    "now",
    note:        "Routes all agent model calls. OpenRouter / Groq / Ollama chains.",
  },
  {
    id:          "p3",
    name:        "Discord",
    role:        "Transport Layer",
    type:        "system",
    status:      "active",
    accessLevel: "limited",
    memoryAccess: [],
    lastSeen:    "2 min ago",
    note:        "Legend and Seraphim primary channel. Diamond build-log notifications.",
  },
  {
    id:          "p4",
    name:        "LiveKit",
    role:        "Audio Transport · :7880",
    type:        "system",
    status:      "idle",
    accessLevel: "limited",
    memoryAccess: [],
    lastSeen:    "1 hour ago",
    note:        "Voice sessions for Legend. Whisper STT pipeline.",
  },
  {
    id:          "p5",
    name:        "Qdrant",
    role:        "Vector Store · :6333",
    type:        "system",
    status:      "active",
    accessLevel: "observe",
    memoryAccess: ["Qdrant"],
    lastSeen:    "now",
    note:        "Elior and Legend primary vector store. 3 active namespaces.",
  },
  {
    id:          "p6",
    name:        "Genesis Mind",
    role:        "AI Inference · :8000",
    type:        "system",
    status:      "active",
    accessLevel: "observe",
    memoryAccess: [],
    lastSeen:    "5 min ago",
    note:        "Local LLM inference host on Phoenix.",
  },
  {
    id:          "p7",
    name:        "Lucy",
    role:        "Build Host",
    type:        "system",
    status:      "active",
    accessLevel: "full",
    memoryAccess: ["LCM", "Archive"],
    lastSeen:    "now",
    note:        "Diamond's primary build environment. Repo write access.",
  },
];

export default function PeopleView() {
  const humans  = PRINCIPALS.filter((p) => p.type === "human");
  const systems = PRINCIPALS.filter((p) => p.type === "system");

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden" }}>
      {/* Left: principal list */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
        {/* Humans */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot online" />
              PRINCIPALS
            </div>
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>MOCK DATA</span>
          </div>
          {humans.map((p) => <PrincipalRow key={p.id} p={p} />)}
        </div>

        {/* Systems */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">
            <span className="status-dot online" />
            CONNECTED SYSTEMS
          </div>
          {systems.map((p) => <PrincipalRow key={p.id} p={p} />)}
        </div>
      </div>

      {/* Right: access summary */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">ACCESS LEVELS</div>
          <div style={{ padding: "6px 0" }}>
            {(["full", "observe", "limited", "none"] as const).map((level) => {
              const count = PRINCIPALS.filter((p) => p.accessLevel === level).length;
              return (
                <div key={level} style={{
                  padding:      "9px 14px",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft:   `3px solid ${ACCESS_COLOR[level]}`,
                  display:      "flex",
                  justifyContent: "space-between",
                  alignItems:   "center",
                }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: ACCESS_COLOR[level], letterSpacing: "0.08em" }}>
                    {level.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {count} {count === 1 ? "principal" : "principals"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">MEMORY ACCESS MAP</div>
          <div style={{ padding: "6px 0" }}>
            {["TrueRecall", "LCM", "Qdrant", "Archive"].map((layer) => {
              const who = PRINCIPALS.filter((p) => p.memoryAccess.includes(layer)).map((p) => p.name);
              return (
                <div key={layer} style={{ padding: "9px 14px", borderBottom: "1px solid rgba(30,45,69,0.4)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", marginBottom: "3px" }}>
                    {layer}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {who.length > 0 ? who.join(", ") : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrincipalRow({ p }: { p: Principal }) {
  return (
    <div style={{
      padding:      "11px 14px",
      borderBottom: "1px solid rgba(30,45,69,0.4)",
      borderLeft:   `3px solid ${TYPE_COLOR[p.type]}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: STATUS_DOT[p.status], flexShrink: 0,
            }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {p.name}
            </span>
            <span style={{ fontSize: "10px", color: TYPE_COLOR[p.type], fontFamily: "monospace" }}>
              {p.role}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: "4px" }}>
            {p.note}
          </div>
          <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: "var(--text-muted)" }}>
            <span>Last seen: {p.lastSeen}</span>
            {p.memoryAccess.length > 0 && (
              <span style={{ color: "var(--accent-dim)" }}>
                Memory: {p.memoryAccess.join(", ")}
              </span>
            )}
          </div>
        </div>
        <span style={{
          fontSize:     "9px",
          color:        ACCESS_COLOR[p.accessLevel],
          border:       `1px solid ${ACCESS_COLOR[p.accessLevel]}`,
          padding:      "1px 6px",
          borderRadius: "2px",
          flexShrink:   0,
          letterSpacing: "0.08em",
        }}>
          {p.accessLevel.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

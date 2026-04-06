"use client";

// Factory — Diamond's build queue, active builds, and completed work.
// TODO: wire to Diamond's task log / repo event stream / Lucy build system

type BuildStatus = "active" | "complete" | "queued" | "failed" | "paused";

interface Build {
  id:       string;
  title:    string;
  repo:     string;
  status:   BuildStatus;
  agent:    string;
  host:     string;
  started:  string;
  detail:   string;
  progress?: number;  // 0-100 for active builds
}

const STATUS_COLOR: Record<BuildStatus, string> = {
  active:   "var(--green)",
  complete: "var(--accent)",
  queued:   "var(--yellow)",
  failed:   "var(--red)",
  paused:   "var(--text-muted)",
};

const MOCK_BUILDS: Build[] = [
  {
    id:       "b1",
    title:    "FlowLayer — live event wiring",
    repo:     "mission-control",
    status:   "active",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "today 09:14",
    detail:   "Wiring OpenClaw gateway events to FlowLayer strip",
    progress: 38,
  },
  {
    id:       "b2",
    title:    "TrueRecall namespace expansion",
    repo:     "truerecall-service",
    status:   "queued",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "today 10:00",
    detail:   "Awaiting Origin approval before proceeding",
    progress: 0,
  },
  {
    id:       "b3",
    title:    "Agent card UI — memory layers",
    repo:     "mission-control",
    status:   "complete",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "yesterday 15:22",
    detail:   "Added memoryLayers display to active agent cards",
  },
  {
    id:       "b4",
    title:    "OpenClaw rate limit retry handler",
    repo:     "openclaw-bridge",
    status:   "complete",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "2 days ago",
    detail:   "Exponential backoff + fallback chain on 429",
  },
  {
    id:       "b5",
    title:    "Qdrant write adapter for Elior",
    repo:     "memory-layer",
    status:   "paused",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "3 days ago",
    detail:   "Paused pending Qdrant namespace decision",
  },
  {
    id:       "b6",
    title:    "Discord transport — Seraphim channel",
    repo:     "agent-transport",
    status:   "failed",
    agent:    "Diamond",
    host:     "Lucy",
    started:  "3 days ago",
    detail:   "TOKEN env var missing — needs .env update",
  },
];

export default function FactoryView() {
  const active   = MOCK_BUILDS.filter((b) => b.status === "active"   || b.status === "queued");
  const finished = MOCK_BUILDS.filter((b) => b.status === "complete" || b.status === "failed" || b.status === "paused");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflowY: "auto" }}>
      {/* Active builds */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="status-dot online" />
            BUILD QUEUE — DIAMOND / LUCY
          </div>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
            {/* TODO: wire to Lucy build system / Diamond task log */}
            MOCK DATA
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {active.map((b) => <BuildCard key={b.id} build={b} />)}
        </div>
      </div>

      {/* Completed / other */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          <span className="status-dot idle" />
          RECENT BUILDS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {finished.map((b) => <BuildCard key={b.id} build={b} />)}
        </div>
      </div>
    </div>
  );
}

function BuildCard({ build }: { build: Build }) {
  const sc = STATUS_COLOR[build.status];

  return (
    <div style={{
      padding:      "11px 14px",
      borderBottom: "1px solid rgba(30,45,69,0.4)",
      borderLeft:   `3px solid ${sc}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {build.title}
            </span>
            <span style={{ fontSize: "9px", color: "var(--accent-dim)", fontFamily: "monospace" }}>
              {build.repo}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "5px" }}>
            {build.detail}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            {build.agent} · {build.host} · {build.started}
          </div>
          {build.progress !== undefined && build.status === "active" && (
            <div style={{ marginTop: "8px" }}>
              <div style={{
                width:        "100%",
                height:       "3px",
                background:   "var(--border)",
                borderRadius: "2px",
                overflow:     "hidden",
              }}>
                <div style={{
                  width:        `${build.progress}%`,
                  height:       "100%",
                  background:   sc,
                  borderRadius: "2px",
                  transition:   "width 0.5s",
                }} />
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
                {build.progress}% complete
              </div>
            </div>
          )}
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
          {build.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

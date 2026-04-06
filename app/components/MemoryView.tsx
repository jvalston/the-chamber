"use client";

import { useEffect, useState } from "react";

interface Identity {
  id: string;
  name: string;
  role: string;
  host: string;
  transport: string[];
  status: string;
  memoryNamespace: string;
  persona: string | null;
  hasPersona: boolean;
  lastUpdated: string | null;
}

interface MemoryLayers {
  truerecall: { status: string; points: number | null; collection: string; description: string };
  qdrant:     { status: string; episodic: number | null; description: string };
  vera:       { status: string; points: number | null; description: string };
  lcm:        { status: string; description: string };
  redis:      { status: string; keys: number | null; memory: string | null; description: string };
  archive:    { status: string; description: string };
  checkedAt:  number;
}

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--green)",
  standby:  "var(--yellow)",
  offline:  "var(--red)",
  unknown:  "var(--text-muted)",
};

const LAYER_COLOR: Record<string, string> = {
  online:  "var(--green)",
  warn:    "var(--yellow)",
  offline: "var(--red)",
  static:  "var(--text-muted)",
};

export default function MemoryView() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [layers, setLayers]         = useState<MemoryLayers | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch("/api/identities")
      .then((r) => r.json())
      .then((d) => {
        setIdentities(d.identities ?? []);
        if (d.identities?.length) setSelected(d.identities[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    function pollLayers() {
      fetch("/api/memory-layers")
        .then((r) => r.json())
        .then(setLayers)
        .catch(() => {});
    }
    pollLayers();
    const id = setInterval(pollLayers, 20_000);
    return () => clearInterval(id);
  }, []);

  const active = identities.find((a) => a.id === selected);

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "220px 1fr 260px",
        gridTemplateRows: "1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Left: agent selector ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">AGENT IDENTITIES</div>
        <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              marginBottom: "10px",
              lineHeight: 1.6,
            }}
          >
            Source of truth lives here — not in OpenClaw. These files survive
            every reset, update, and reinstall.
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            PATH
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--accent)",
              letterSpacing: "0.04em",
              marginBottom: "12px",
              fontFamily: "monospace",
              opacity: 0.8,
            }}
          >
            mission-control/agents/[name]/persona.md
          </div>

          {loading ? (
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : (
            identities.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelected(agent.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background:
                    selected === agent.id
                      ? "rgba(0,212,255,0.08)"
                      : "transparent",
                  border:
                    selected === agent.id
                      ? "1px solid rgba(0,212,255,0.3)"
                      : "1px solid transparent",
                  borderRadius: "3px",
                  padding: "8px 10px",
                  marginBottom: "4px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: STATUS_COLOR[agent.status] ?? "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color:
                        selected === agent.id
                          ? "var(--accent)"
                          : "var(--text-primary)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {agent.name.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    paddingLeft: "12px",
                  }}
                >
                  {agent.role}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    paddingLeft: "12px",
                    color: agent.hasPersona ? "var(--green)" : "var(--yellow)",
                  }}
                >
                  {agent.hasPersona ? "● identity stored" : "○ no persona yet"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Center: persona viewer ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          <span>
            {active ? `${active.name.toUpperCase()} — PERSONA` : "SELECT AN AGENT"}
          </span>
          {active?.lastUpdated && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              updated {active.lastUpdated}
            </span>
          )}
        </div>

        {active ? (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
            }}
          >
            {/* Quick facts row */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border)",
                flexWrap: "wrap",
              }}
            >
              {[
                ["HOST", active.host || "—"],
                ["NS", active.memoryNamespace],
                ["VIA", active.transport.join(" · ") || "local"],
                ["STATUS", active.status.toUpperCase()],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-primary)", letterSpacing: "0.06em" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {active.hasPersona ? (
              <pre
                style={{
                  fontFamily: "inherit",
                  fontSize: "12px",
                  lineHeight: 1.75,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                }}
              >
                {active.persona}
              </pre>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                  NO PERSONA FILE
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "center", maxWidth: "300px" }}>
                  Create{" "}
                  <span style={{ color: "var(--accent)", fontFamily: "monospace" }}>
                    agents/{active.id}/persona.md
                  </span>{" "}
                  to define this agent&apos;s identity. It will persist through every restart.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "10px",
            }}
          >
            Select an agent to view their identity
          </div>
        )}
      </div>

      {/* ── Right: memory layers ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>MEMORY LAYERS</span>
          {layers?.checkedAt && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 400 }}>
              {new Date(layers.checkedAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {layers === null && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>Probing layers…</div>
          )}

          {layers && [
            {
              key: "truerecall",
              name: "TrueRecall",
              status: layers.truerecall.status,
              desc: layers.truerecall.description,
              meta: layers.truerecall.points !== null
                ? `${layers.truerecall.points.toLocaleString()} points · ${layers.truerecall.collection}`
                : layers.truerecall.status === "offline" ? "Qdrant offline" : "collection not found",
              color: "rgba(180,100,255,0.9)",
            },
            {
              key: "qdrant",
              name: "Qdrant",
              status: layers.qdrant.status,
              desc: layers.qdrant.description,
              meta: layers.qdrant.episodic !== null
                ? `legend_episodic: ${layers.qdrant.episodic.toLocaleString()} pts`
                : "port 16333",
              color: "rgba(150,80,255,0.85)",
            },
            {
              key: "vera",
              name: "Vera AI",
              status: layers.vera.status,
              desc: layers.vera.description,
              meta: layers.vera.points !== null
                ? `${layers.vera.points.toLocaleString()} pts · vera_memories`
                : "port 11450",
              color: "rgba(0,212,255,0.9)",
            },
            {
              key: "lcm",
              name: "LCM",
              status: layers.lcm.status,
              desc: layers.lcm.description,
              meta: "local · memory store",
              color: "var(--accent)",
            },
            {
              key: "redis",
              name: "Redis",
              status: layers.redis.status,
              desc: layers.redis.description,
              meta: layers.redis.keys !== null
                ? `${layers.redis.keys} keys · ${layers.redis.memory}`
                : "port 6379",
              color: "var(--yellow)",
            },
            {
              key: "archive",
              name: "Archive",
              status: layers.archive.status,
              desc: layers.archive.description,
              meta: "static · file-based",
              color: "var(--text-secondary)",
            },
          ].map(({ key, name, status, desc, meta, color }) => (
            <div
              key={key}
              style={{
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: LAYER_COLOR[status] ?? "var(--text-muted)",
                    flexShrink: 0,
                    boxShadow: status === "online" ? `0 0 5px ${LAYER_COLOR[status]}` : "none",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color, letterSpacing: "0.1em" }}>
                  {name.toUpperCase()}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    color: LAYER_COLOR[status] ?? "var(--text-muted)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {status === "static" ? "FILE" : status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", paddingLeft: "16px" }}>
                {desc}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", paddingLeft: "16px", fontFamily: "monospace" }}>
                {meta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

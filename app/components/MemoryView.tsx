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

interface RedisStatus {
  connected: boolean;
  usedMemory?: string;
  totalKeys?: number;
  error?: string;
}

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--green)",
  standby:  "var(--yellow)",
  offline:  "var(--red)",
  unknown:  "var(--text-muted)",
};

export default function MemoryView() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [redis, setRedis]           = useState<RedisStatus | null>(null);
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

    fetch("/api/memory")
      .then((r) => r.json())
      .then(setRedis)
      .catch(() => setRedis({ connected: false, error: "unreachable" }));
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
              fontSize: "9px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              marginBottom: "10px",
              lineHeight: 1.6,
            }}
          >
            Source of truth lives here — not in OpenClaw. These files survive
            every reset, update, and reinstall.
          </div>
          <div
            style={{
              fontSize: "8px",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            PATH
          </div>
          <div
            style={{
              fontSize: "8px",
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
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
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
                fontSize: "9px",
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
                  <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-primary)", letterSpacing: "0.06em" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {active.hasPersona ? (
              <pre
                style={{
                  fontFamily: "inherit",
                  fontSize: "10px",
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

      {/* ── Right: Redis status + memory info ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Redis status */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">MEMORY LAYER — REDIS</div>
          <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: redis?.connected ? "var(--green)" : "var(--red)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  color: redis?.connected ? "var(--green)" : "var(--red)",
                  letterSpacing: "0.08em",
                }}
              >
                {redis === null ? "CHECKING..." : redis.connected ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>

            {redis?.connected && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    ["MEMORY", redis.usedMemory ?? "—"],
                    ["KEYS",   String(redis.totalKeys ?? 0)],
                    ["PORT",   "6379"],
                    ["MAX",    "512 MB"],
                    ["POLICY", "LRU"],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", gap: "8px", fontSize: "9px" }}>
                      <span style={{ color: "var(--text-muted)", width: "52px", flexShrink: 0 }}>
                        {label}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {redis && !redis.connected && (
              <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Redis container not running. Start it with:<br />
                <span style={{ color: "var(--accent)", fontFamily: "monospace" }}>
                  docker compose up redis -d
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Identity source explanation */}
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-header">HOW IDENTITY PERSISTS</div>
          <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              {
                layer: "persona.md",
                desc: "Who the agent is. Name, soul, role, voice. Survives everything.",
                color: "var(--green)",
              },
              {
                layer: "profile.json",
                desc: "Runtime config: model, host, transport, tools.",
                color: "var(--accent)",
              },
              {
                layer: "Redis",
                desc: "Short-term working memory. Recent turns, session state, cross-agent shared data.",
                color: "var(--yellow)",
              },
              {
                layer: "Qdrant",
                desc: "Long-term semantic memory. Searchable by meaning.",
                color: "rgba(180,100,255,0.9)",
              },
            ].map(({ layer, desc, color }) => (
              <div key={layer} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color, fontSize: "7px" }}>●</span>
                  <span style={{ fontSize: "9px", color, letterSpacing: "0.08em", fontWeight: 600 }}>
                    {layer}
                  </span>
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", paddingLeft: "13px", lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: "4px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border)",
                fontSize: "9px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Edit persona.md files in{" "}
              <span style={{ color: "var(--accent)", fontFamily: "monospace" }}>
                mission-control/agents/
              </span>{" "}
              — they are never touched by OpenClaw.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

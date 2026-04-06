"use client";

import { useEffect, useState, useCallback } from "react";
import { ACTIVE_AGENTS, WAITING_AGENTS, SYSTEM_NODES } from "../../lib/mock/agents";

// ─── colours ────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<string, string> = {
  active:   "var(--green)",
  standby:  "var(--yellow)",
  degraded: "var(--red)",
  offline:  "var(--red)",
  draft:    "var(--text-muted)",
  archived: "var(--text-muted)",
};

const DOT_CLASS: Record<string, string> = {
  active:   "online",
  standby:  "warn",
  degraded: "warn",
  offline:  "offline",
  draft:    "idle",
  archived: "idle",
};

const AGENT_ACCENT: Record<string, string> = {
  legend:   "var(--accent)",
  seraphim: "#facc15",
  lumen:    "#f472b6",
  diamond:  "var(--green)",
  elior:    "#a78bfa",
  atlas:    "#38bdf8",
  aurora:   "#fb923c",
  hermes:   "#60a5fa",
};

const NODE_COLOR: Record<string, string> = {
  phoenix: "#f472b6",
  lucy:    "var(--green)",
  axiom:   "#38bdf8",
};

// ─── Discord feed types ──────────────────────────────────────────────────────

interface DiscordMsg {
  id:        string;
  content:   string;
  timestamp: string;
  agentName: string;
  author:    { username: string };
}

interface DiscordFeed {
  merged: DiscordMsg[];
  feeds:  { agent: string; error?: string }[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── system node chip ───────────────────────────────────────────────────────

function SystemChip({ node }: { node: typeof SYSTEM_NODES[0] }) {
  const color = NODE_COLOR[node.id] ?? "var(--accent)";
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           "8px",
      padding:       "6px 14px",
      background:    "rgba(0,0,0,0.3)",
      border:        `1px solid ${color}33`,
      borderLeft:    `3px solid ${color}`,
      borderRadius:  "4px",
      flex:          1,
    }}>
      <img
        src={`/agents/${node.id}.png`}
        alt={node.name}
        style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${color}55` }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color, letterSpacing: "0.1em" }}>
          {node.name.toUpperCase()}
        </div>
        <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>{node.role}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
        <div className="status-dot online" />
        <span style={{ fontSize: "9px", color: "var(--green)" }}>ONLINE</span>
      </div>
    </div>
  );
}

// ─── agent card with photo ───────────────────────────────────────────────────

function AgentCard({ agent }: { agent: typeof ACTIVE_AGENTS[0] }) {
  const sc     = STATE_COLOR[agent.state] ?? "var(--text-muted)";
  const dot    = DOT_CLASS[agent.state]   ?? "idle";
  const accent = AGENT_ACCENT[agent.id]   ?? "var(--text-secondary)";

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      background:    "rgba(0,0,0,0.35)",
      border:        "1px solid var(--border)",
      borderTop:     `2px solid ${sc}`,
      borderRadius:  "4px",
      overflow:      "hidden",
      flex:          "0 0 220px",
      minWidth:      "220px",
    }}>
      {/* Photo */}
      <div style={{ position: "relative", width: "100%", height: "110px", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
        <img
          src={`/agents/${agent.id}.png`}
          alt={agent.name}
          style={{
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center top",
            display:        "block",
            opacity:        agent.state === "offline" ? 0.4 : 1,
            filter:         agent.state === "offline" ? "grayscale(1)" : "none",
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        {/* State badge overlay */}
        <div style={{
          position:      "absolute",
          bottom:        "5px",
          right:         "5px",
          background:    "rgba(0,0,0,0.75)",
          border:        `1px solid ${sc}`,
          borderRadius:  "2px",
          padding:       "1px 5px",
          fontSize:      "7px",
          color:         sc,
          letterSpacing: "0.1em",
        }}>
          {agent.state.toUpperCase()}
        </div>
        {/* Host badge */}
        {agent.host && (
          <div style={{
            position:      "absolute",
            top:           "5px",
            left:          "5px",
            background:    "rgba(0,0,0,0.75)",
            border:        `1px solid ${NODE_COLOR[agent.host.toLowerCase()] ?? "var(--border)"}44`,
            borderRadius:  "2px",
            padding:       "1px 5px",
            fontSize:      "7px",
            color:         NODE_COLOR[agent.host.toLowerCase()] ?? "var(--text-muted)",
            letterSpacing: "0.08em",
          }}>
            {agent.host.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        {/* Name + dot */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div className={`status-dot ${dot}`} />
          <span style={{
            fontSize:      "11px",
            fontWeight:    700,
            color:         accent,
            letterSpacing: "0.12em",
            flex:          1,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
          }}>
            {agent.name.toUpperCase()}
          </span>
        </div>

        {/* Role */}
        <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
          {agent.role}
        </div>

        {/* Model */}
        <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.currentModel || "—"}
        </div>

        {/* Transport */}
        {agent.transport.length > 0 && (
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "2px" }}>
            {agent.transport.map((t) => (
              <span key={t} style={{
                fontSize:     "8px",
                color:        "var(--text-secondary)",
                border:       "1px solid var(--border)",
                padding:      "1px 4px",
                borderRadius: "2px",
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── waiting chip ────────────────────────────────────────────────────────────

function WaitingChip({ agent }: { agent: typeof WAITING_AGENTS[0] }) {
  const sc     = STATE_COLOR[agent.state] ?? "var(--text-muted)";
  const dot    = DOT_CLASS[agent.state]   ?? "idle";
  const accent = AGENT_ACCENT[agent.id]   ?? "var(--text-secondary)";

  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           "10px",
      padding:       "8px 12px",
      background:    "rgba(0,0,0,0.25)",
      border:        "1px solid var(--border)",
      borderRadius:  "4px",
      flex:          1,
      minWidth:      0,
    }}>
      <img
        src={`/agents/${agent.id}.png`}
        alt={agent.name}
        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", objectPosition: "center top", border: `1px solid ${sc}44`, flexShrink: 0 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div className={`status-dot ${dot}`} />
          <span style={{ fontSize: "10px", fontWeight: 700, color: accent, letterSpacing: "0.1em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.name.toUpperCase()}
          </span>
          <span style={{ fontSize: "8px", color: sc, border: `1px solid ${sc}`, padding: "1px 4px", borderRadius: "2px", flexShrink: 0 }}>
            {agent.state.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>{agent.role}</div>
        {agent.host && (
          <div style={{ fontSize: "9px", color: NODE_COLOR[agent.host.toLowerCase()] ?? "var(--text-muted)" }}>{agent.host}</div>
        )}
      </div>
    </div>
  );
}

// ─── Discord feed ─────────────────────────────────────────────────────────────

function DiscordFeedPanel() {
  const [data,      setData]      = useState<DiscordFeed | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discord");
      if (res.ok) {
        setData(await res.json());
        setLastFetch(new Date());
      }
    } catch { /* Discord may not be configured */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const unconfigured = data?.feeds.every((f) => f.error === "not configured");
  const msgs         = data?.merged ?? [];

  return (
    <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="panel-header" style={{ display: "flex", alignItems: "center" }}>
        <span style={{ color: "#5865f2", marginRight: "6px" }}>◈</span>
        DISCORD ACTIVITY
        <span style={{ flex: 1 }} />
        {lastFetch && (
          <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 400 }}>
            updated {relTime(lastFetch.toISOString())}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", padding: "1px 7px", fontSize: "9px",
            cursor: "pointer", borderRadius: "2px", fontFamily: "inherit",
            letterSpacing: "0.06em", marginLeft: "8px",
          }}
        >
          {loading ? "..." : "REFRESH"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
        {unconfigured && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>
            Discord not connected — add tokens to <code style={{ color: "var(--accent-dim)" }}>.env</code>
          </div>
        )}
        {/* Per-agent quiet indicators — shown above the feed */}
        {!unconfigured && data && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            {data.feeds.map((f) => {
              if (f.error === "not configured") return null;
              const accent = AGENT_ACCENT[f.agent.toLowerCase()] ?? "var(--text-secondary)";
              const hasMessages = (f as { messages?: unknown[] }).messages?.length ?? 0;
              const quiet = !hasMessages && !f.error;
              if (!quiet) return null;
              return (
                <div key={f.agent} style={{
                  fontSize:     "9px",
                  color:        "var(--text-muted)",
                  border:       `1px dashed ${accent}55`,
                  padding:      "2px 8px",
                  borderRadius: "3px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "5px",
                }}>
                  <span style={{ color: accent, fontSize: "7px" }}>◌</span>
                  {f.agent.toUpperCase()} — no recent activity
                </div>
              );
            })}
          </div>
        )}

        {msgs.map((m) => {
          const accent = AGENT_ACCENT[m.agentName.toLowerCase()] ?? "var(--text-secondary)";
          return (
            <div key={m.id} style={{
              display: "flex", gap: "10px", padding: "7px 10px",
              background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)",
              borderLeft: `2px solid ${accent}`, borderRadius: "3px",
            }}>
              <div style={{ flexShrink: 0, width: "64px" }}>
                <div style={{ fontSize: "9px", color: accent, fontWeight: 700, letterSpacing: "0.1em" }}>
                  {m.agentName.toUpperCase()}
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {relTime(m.timestamp)}
                </div>
              </div>
              <div style={{ flex: 1, fontSize: "11px", color: "var(--text-primary)", lineHeight: 1.5, wordBreak: "break-word", overflow: "hidden" }}>
                {m.content || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>[no text content]</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main view ───────────────────────────────────────────────────────────────

export default function TeamView() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      padding: "8px", gap: "8px", overflow: "hidden",
    }}>

      {/* ── System nodes ── */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          <span style={{ color: "var(--accent-dim)", marginRight: "6px" }}>⬡</span>
          SYSTEMS
        </div>
        <div style={{ padding: "8px 10px", display: "flex", gap: "8px" }}>
          {SYSTEM_NODES.map((n) => <SystemChip key={n.id} node={n} />)}
        </div>
      </div>

      {/* ── Active agents — horizontal with photos ── */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          <span style={{ color: "var(--green)", marginRight: "6px" }}>●</span>
          ACTIVE AGENTS
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "6px" }}>
            — {ACTIVE_AGENTS.length} online
          </span>
        </div>
        <div style={{ padding: "10px", display: "flex", gap: "8px", overflowX: "auto", overflowY: "hidden" }}>
          {ACTIVE_AGENTS.map((a) => <AgentCard key={a.id} agent={a} />)}
        </div>
      </div>

      {/* ── Standby agents ── */}
      {WAITING_AGENTS.length > 0 && (
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">
            <span className="status-dot warn" style={{ marginRight: "6px" }} />
            STANDBY
            <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "6px" }}>
              — {WAITING_AGENTS.length} agents
            </span>
          </div>
          <div style={{ padding: "10px", display: "flex", gap: "8px" }}>
            {WAITING_AGENTS.map((a) => <WaitingChip key={a.id} agent={a} />)}
          </div>
        </div>
      )}

      {/* ── Discord activity feed ── */}
      <DiscordFeedPanel />
    </div>
  );
}

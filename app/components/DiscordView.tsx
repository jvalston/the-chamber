"use client";

import { useEffect, useState } from "react";

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { username: string; id: string };
  agentName: string;
}

interface AgentFeed {
  agent: string;
  channelId: string;
  messages: DiscordMessage[];
  error?: string;
}

const AGENT_COLOR: Record<string, string> = {
  Legend:   "#00d4ff",
  Seraphim: "#a855f7",
  Diamond:  "#00ff9d",
  Lumen:    "#818cf8",
  Elior:    "#ffd700",
  Sentinel: "#ff6b6b",
  Atlas:    "#f97316",
  Aurora:   "#ec4899",
  Aurelion: "#facc15",
  Veris:    "#4ade80",
  Kairo:    "#38bdf8",
};

function tabBtn(active: boolean, color: string): React.CSSProperties {
  return {
    display:     "flex",
    alignItems:  "center",
    gap:         "6px",
    width:       "100%",
    padding:     "4px 8px",
    background:  active ? `${color}12` : "transparent",
    border:      "none",
    borderLeft:  `2px solid ${active ? color : "transparent"}`,
    color:       active ? color : "var(--text-secondary)",
    fontSize:    "9px",
    letterSpacing: "0.08em",
    cursor:      "pointer",
    fontFamily:  "inherit",
    textAlign:   "left",
    borderRadius:"2px",
    boxSizing:   "border-box",
  };
}

export default function DiscordView() {
  const [feeds, setFeeds]     = useState<AgentFeed[]>([]);
  const [merged, setMerged]   = useState<DiscordMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("merged");

  async function load() {
    try {
      const r = await fetch("/api/discord", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setFeeds(d.feeds ?? []);
      setMerged(d.merged ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const currentFeed: DiscordMessage[] =
    selected === "merged"
      ? merged
      : (feeds.find((f) => f.agent === selected)?.messages ?? []);

  const configuredCount = feeds.filter((f) => !f.error).length;

  return (
    <div
      style={{
        flex:                1,
        display:             "grid",
        gridTemplateColumns: "190px 1fr",
        gap:                 "8px",
        padding:             "8px",
        overflow:            "hidden",
        height:              "100%",
      }}
    >
      {/* ── Left: channel list ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          DISCORD
          {configuredCount > 0 && (
            <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--green)" }}>
              {configuredCount} live
            </span>
          )}
        </div>

        <div style={{ padding: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {/* All channels merged */}
          <button onClick={() => setSelected("merged")} style={tabBtn(selected === "merged", "var(--accent)")}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
            ALL CHANNELS
            <span style={{ marginLeft: "auto", fontSize: "8px", color: "var(--text-muted)" }}>
              {merged.length}
            </span>
          </button>

          {feeds.map((f) => {
            const color   = AGENT_COLOR[f.agent] ?? "var(--text-muted)";
            const active  = selected === f.agent;
            const offline = !!f.error;
            return (
              <button key={f.agent} onClick={() => setSelected(f.agent)} style={tabBtn(active, color)}>
                <span
                  style={{
                    width:        "5px",
                    height:       "5px",
                    borderRadius: "50%",
                    background:   offline ? "rgba(255,255,255,0.15)" : color,
                    flexShrink:   0,
                  }}
                />
                {f.agent.toUpperCase()}
                <span style={{ marginLeft: "auto", fontSize: "8px", color: "var(--text-muted)" }}>
                  {offline ? "—" : f.messages.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Setup hint when no tokens configured */}
        {configuredCount === 0 && !loading && (
          <div
            style={{
              padding:    "10px 10px",
              fontSize:   "8px",
              color:      "var(--text-muted)",
              lineHeight: 1.7,
              borderTop:  "1px solid var(--border)",
              marginTop:  "auto",
            }}
          >
            Add to <span style={{ color: "var(--accent)" }}>.env.local</span>:<br />
            DISCORD_TOKEN_LEGEND<br />
            LEGEND_DISCORD_ROOM<br />
            <span style={{ opacity: 0.6 }}>(one pair per agent)</span>
          </div>
        )}
      </div>

      {/* ── Right: message feed ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header">
          {selected === "merged" ? "ALL CHANNELS" : selected.toUpperCase()}
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
            {currentFeed.length} messages
          </span>
          <button
            onClick={load}
            style={{
              background:  "transparent",
              border:      "1px solid var(--border)",
              color:       "var(--text-muted)",
              padding:     "1px 8px",
              fontSize:    "9px",
              cursor:      "pointer",
              borderRadius:"2px",
              fontFamily:  "inherit",
              marginLeft:  "8px",
            }}
          >
            ↻
          </button>
        </div>

        <div
          style={{
            flex:          1,
            overflowY:     "auto",
            padding:       "10px",
            display:       "flex",
            flexDirection: "column",
            gap:           "0",
          }}
        >
          {loading ? (
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Connecting to Discord…</div>
          ) : currentFeed.length === 0 ? (
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {configuredCount === 0
                ? "No tokens configured. Add DISCORD_TOKEN_* and *_DISCORD_ROOM to .env.local."
                : "No messages in this channel."}
            </div>
          ) : (
            currentFeed.map((msg) => {
              const color = AGENT_COLOR[msg.agentName] ?? "var(--accent)";
              const date  = new Date(msg.timestamp);
              return (
                <div
                  key={msg.id}
                  style={{
                    display:        "flex",
                    flexDirection:  "column",
                    gap:            "3px",
                    padding:        "7px 0",
                    borderBottom:   "1px solid rgba(30,45,69,0.35)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span
                      style={{
                        fontSize:      "9px",
                        fontWeight:    700,
                        color,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {msg.agentName.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                      {msg.author.username}
                    </span>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>
                      {date.toLocaleString("en-US", {
                        month:  "short",
                        day:    "numeric",
                        hour:   "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize:   "10px",
                      color:      "var(--text-primary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak:  "break-word",
                      paddingLeft:"0",
                    }}
                  >
                    {msg.content || (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        [media / embed]
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

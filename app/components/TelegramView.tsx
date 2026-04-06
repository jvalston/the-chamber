"use client";

import { useEffect, useState, useCallback } from "react";

interface BotStatus {
  name:     string;
  machine:  string;
  username: string | null;
  token:    boolean;
  online:   boolean;
  botInfo:  { id: number; username: string; first_name: string } | null;
}

interface ChatEntry {
  id:        number;
  ts:        number;
  from:      string;
  agentName: string | null;
  text:      string;
  saved:     boolean;
}

interface TelegramData {
  statuses: BotStatus[];
  log:      ChatEntry[];
  groupId:  string;
}

const AGENT_COLORS: Record<string, string> = {
  Seraphim:   "#a78bfa",
  Legend:     "#00d4ff",
  Diamond:    "#60a5fa",
  Lumen:      "#fde68a",
  Elior:      "#86efac",
  Sentinel:   "#f87171",
  Atlas:      "#67e8f9",
  Hermes:     "#38bdf8",
  Aurora:     "#f9a8d4",
  Aurelion:   "#fcd34d",
  Veris:      "#6ee7b7",
  Kairo:      "#c4b5fd",
  Persephone: "#e879f9",
  Olympus:    "#fb923c",
};

const PIPELINE_STAGES = [
  { id: "docs",   label: "DOCUMENTS",  icon: "📄", desc: "Transcript saved to /data" },
  { id: "lumen",  label: "LUMEN",      icon: "✦",  desc: "Sorts & categorises entries" },
  { id: "elior",  label: "ELIOR",      icon: "◈",  desc: "Archives to historical record" },
];

export default function TelegramView() {
  const [data,         setData]         = useState<TelegramData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [pipeStage,    setPipeStage]    = useState<Record<string, "idle"|"active"|"done">>(
    { docs: "idle", lumen: "idle", elior: "idle" }
  );
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/telegram", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch { /* keep last */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function saveAndRoute() {
    if (!data?.log.length) return;
    setSaving(true);
    setSaveMsg("");
    setPipeStage({ docs: "active", lumen: "idle", elior: "idle" });

    try {
      const r = await fetch("/api/telegram", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "save_log", entries: data.log }),
      });
      const d = await r.json();
      if (d.ok) {
        setPipeStage({ docs: "done", lumen: "active", elior: "idle" });
        setSaveMsg(`Saved ${d.saved} entries — routing to Lumen…`);
        // Simulate Lumen processing then Elior archiving
        setTimeout(() => {
          setPipeStage({ docs: "done", lumen: "done", elior: "active" });
          setSaveMsg("Lumen sorted — routing to Elior for archiving…");
        }, 2000);
        setTimeout(() => {
          setPipeStage({ docs: "done", lumen: "done", elior: "done" });
          setSaveMsg(`Archived — ${d.saved} entries preserved by Elior.`);
        }, 4000);
      } else {
        setSaveMsg(`Error: ${d.error}`);
        setPipeStage({ docs: "idle", lumen: "idle", elior: "idle" });
      }
    } catch (e) {
      setSaveMsg(String(e));
      setPipeStage({ docs: "idle", lumen: "idle", elior: "idle" });
    }
    setSaving(false);
  }

  const online  = data?.statuses.filter(s => s.online).length ?? 0;
  const total   = data?.statuses.length ?? 0;
  const filtered = selectedAgent
    ? (data?.log ?? []).filter(e => e.agentName === selectedAgent)
    : (data?.log ?? []);

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden", height: "100%" }}>

      {/* ── Left: agent status list ── */}
      <div className="panel" style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          TELEGRAM
          <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 400, color: online === total ? "var(--green)" : "var(--text-muted)" }}>
            {online}/{total} ONLINE
          </span>
        </div>

        {/* Group info */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
          CONSTELLATION CORE GROUP
          <div style={{ marginTop: "2px", color: "var(--text-secondary)", fontSize: "8px" }}>{data?.groupId}</div>
        </div>

        {/* Agent list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: "38px", margin: "4px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "3px" }} />
            ))
          ) : (
            (data?.statuses ?? []).map(s => {
              const color = AGENT_COLORS[s.name] ?? "var(--text-muted)";
              const isSelected = selectedAgent === s.name;
              return (
                <div
                  key={s.name}
                  onClick={() => setSelectedAgent(isSelected ? null : s.name)}
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           "8px",
                    padding:       "6px 10px",
                    cursor:        "pointer",
                    background:    isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                    borderLeft:    isSelected ? `2px solid ${color}` : "2px solid transparent",
                    transition:    "background 0.15s",
                  }}
                >
                  {/* Online dot */}
                  <div style={{
                    width:        "7px",
                    height:       "7px",
                    borderRadius: "50%",
                    flexShrink:   0,
                    background:   s.online ? "#22c55e" : s.token ? "#f59e0b" : "var(--border)",
                    boxShadow:    s.online ? "0 0 5px #22c55e" : "none",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color, letterSpacing: "0.08em" }}>
                      {s.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px", letterSpacing: "0.04em" }}>
                      {s.username ?? (s.token ? "TOKEN SET" : "NO TOKEN")}
                      {" · "}
                      <span style={{ color: s.machine === "phoenix" ? "#60a5fa" : "#f9a8d4" }}>
                        {s.machine.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "9px", color: s.online ? "#22c55e" : s.token ? "#f59e0b" : "var(--border)", letterSpacing: "0.06em" }}>
                    {s.online ? "LIVE" : s.token ? "WAIT" : "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "3px" }}>
          {[
            { color: "#22c55e", label: "LIVE — polling group" },
            { color: "#f59e0b", label: "WAIT — token set, connecting" },
            { color: "var(--border)", label: "— no token configured" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px", color: "var(--text-muted)" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: chat log ── */}
      <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="panel-header">
          GROUP CHAT LOG
          {selectedAgent && (
            <span style={{ marginLeft: "8px", fontSize: "9px", color: AGENT_COLORS[selectedAgent] ?? "var(--accent)", fontWeight: 400 }}>
              — {selectedAgent.toUpperCase()} only
              <button
                onClick={() => setSelectedAgent(null)}
                style={{ marginLeft: "6px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", padding: 0 }}
              >
                ✕ clear
              </button>
            </span>
          )}
          <button
            onClick={load}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "1px 8px", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}
          >
            REFRESH
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "var(--text-muted)", fontSize: "11px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", opacity: 0.3 }}>✈</div>
              <div>No messages in log yet.</div>
              <div style={{ fontSize: "10px", maxWidth: "280px", lineHeight: 1.6, opacity: 0.7 }}>
                Messages sent to the group will appear here as agents route them through the Telegram channel.
              </div>
            </div>
          ) : (
            filtered.map(entry => {
              const color = entry.agentName ? (AGENT_COLORS[entry.agentName] ?? "var(--text-secondary)") : "var(--text-secondary)";
              const d = new Date(entry.ts * 1000);
              return (
                <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color, letterSpacing: "0.08em" }}>
                      {(entry.agentName ?? entry.from).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                      {d.toLocaleTimeString("en-US", { hour12: false })}
                      {" · "}
                      {d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                    </span>
                    {entry.saved && (
                      <span style={{ fontSize: "8px", color: "#22c55e", marginLeft: "auto", letterSpacing: "0.08em" }}>ARCHIVED</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.6, borderLeft: `2px solid ${color}`, paddingLeft: "8px" }}>
                    {entry.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Save bar */}
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={saveAndRoute}
            disabled={saving || !data?.log.length}
            style={{
              padding:       "6px 14px",
              background:    saving ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.1)",
              border:        "1px solid var(--accent)",
              color:         saving ? "var(--text-muted)" : "var(--accent)",
              fontSize:      "10px",
              letterSpacing: "0.1em",
              cursor:        (saving || !data?.log.length) ? "default" : "pointer",
              fontFamily:    "inherit",
              borderRadius:  "2px",
            }}
          >
            {saving ? "ROUTING…" : "SAVE + ROUTE →"}
          </button>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", flex: 1 }}>
            {saveMsg || "Saves log → Lumen sorts → Elior archives"}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
            {data?.log.length ?? 0} entries
          </span>
        </div>
      </div>

      {/* ── Right: pipeline ── */}
      <div className="panel" style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div className="panel-header">PIPELINE</div>

        <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "8px" }}>
            CHAT LOG ROUTING
          </div>

          {PIPELINE_STAGES.map((stage, i) => {
            const state = pipeStage[stage.id];
            const stateColor = state === "done" ? "#22c55e" : state === "active" ? "var(--accent)" : "var(--border)";
            return (
              <div key={stage.id}>
                <div style={{
                  padding:      "10px",
                  border:       `1px solid ${stateColor}`,
                  borderRadius: "3px",
                  background:   state === "active" ? "rgba(0,212,255,0.06)" : state === "done" ? "rgba(34,197,94,0.05)" : "rgba(0,0,0,0.2)",
                  transition:   "all 0.3s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px" }}>{stage.icon}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: stateColor, letterSpacing: "0.1em" }}>
                      {stage.label}
                    </span>
                    {state === "done" && <span style={{ marginLeft: "auto", fontSize: "9px", color: "#22c55e" }}>✓</span>}
                    {state === "active" && (
                      <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--accent)", animation: "pulse 1.4s ease-in-out infinite" }}>…</span>
                    )}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: 1.5 }}>{stage.desc}</div>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "3px 0" }}>
                    <div style={{ width: "1px", height: "14px", background: stateColor === "var(--border)" ? "var(--border)" : stateColor, transition: "background 0.3s" }} />
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "6px" }}>
              TRANSCRIPT DESTINATION
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <div>📁 data/telegram-log.json</div>
              <div>📄 data/telegram-transcript.txt</div>
            </div>
          </div>
        </div>

        {/* Refresh info */}
        <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", fontSize: "9px", color: "var(--text-muted)" }}>
          STATUS CHECKS EVERY 30s
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
    </div>
  );
}

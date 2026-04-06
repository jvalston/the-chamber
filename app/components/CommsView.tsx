"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LogEntry {
  id:        string;
  ts:        string;
  agentId:   string;
  node:      string;
  message:   string;
  response:  string;
  error:     string | null;
  sessionId: string | null;
}

interface AgentDef {
  id:    string;
  name:  string;
  emoji: string;
  node:  "lucy" | "phoenix" | "axiom";
  color: string;
}

// ---------------------------------------------------------------------------
// Roster — ordered by node
// ---------------------------------------------------------------------------
const AGENTS: AgentDef[] = [
  // Lucy
  { id: "sentinel",  name: "Sentinel Lucy", emoji: "🛡️", node: "lucy",    color: "#4ab0f5" },
  { id: "diamond",   name: "Diamond",       emoji: "💎", node: "lucy",    color: "#a78bfa" },
  { id: "elior",     name: "Elior",         emoji: "📜", node: "lucy",    color: "#34d399" },
  { id: "aurelion",  name: "Aurelion",      emoji: "🌅", node: "lucy",    color: "#fbbf24" },
  { id: "atlas",     name: "Atlas",         emoji: "🧭", node: "lucy",    color: "#60a5fa" },
  // Phoenix
  { id: "seraphim",         name: "Seraphim",         emoji: "💜", node: "phoenix", color: "#a855f7" },
  { id: "sentinel-phoenix", name: "Sentinel Phoenix", emoji: "🛡️", node: "phoenix", color: "#f97316" },
  { id: "aurora",    name: "Aurora",     emoji: "🌌", node: "phoenix", color: "#6ee7f7" },
  { id: "lumen",     name: "Lumen",      emoji: "🔦", node: "phoenix", color: "#fde68a" },
  { id: "legend",    name: "Legend",     emoji: "📖", node: "phoenix", color: "#fb923c" },
  { id: "kairo",     name: "Kairo",      emoji: "⚙️",  node: "phoenix", color: "#94a3b8" },
  { id: "veris",     name: "Veris",      emoji: "🔍", node: "phoenix", color: "#86efac" },
  { id: "olympus",   name: "Olympus",    emoji: "🔭", node: "phoenix", color: "#fb923c" },
  { id: "persephone",name: "Persephone", emoji: "🌸", node: "phoenix", color: "#e879f9" },
  // Axiom — not yet online
  { id: "sentinel-axiom", name: "Sentinel Axiom", emoji: "🛡️", node: "axiom", color: "#a855f7" },
];

const ROSTER = AGENTS;

const NODE_LABEL: Record<string, string> = {
  lucy:    "LUCY",
  phoenix: "PHOENIX",
  axiom:   "AXIOM",
};

const NODE_COLOR: Record<string, string> = {
  lucy:    "#4ab0f5",
  phoenix: "#f97316",
  axiom:   "#a855f7",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Parse Sentinel's structured reports from response text
function parseSentinelReport(text: string) {
  if (!text.includes("## Action") && !text.includes("## Result")) return null;
  const sections: Record<string, string> = {};
  const HEADERS = ["Action", "Result", "Output / Trace", "Warnings", "Next Step"];
  for (const h of HEADERS) {
    const re = new RegExp(`## ${h}\\s*([\\s\\S]*?)(?=## |$)`, "i");
    const m  = text.match(re);
    if (m) sections[h] = m[1].trim();
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

const RESULT_COLOR: Record<string, string> = {
  SUCCESS: "var(--green)",
  FAILURE: "var(--red, #f87171)",
  PARTIAL: "var(--yellow)",
};

function resultColor(result: string | undefined): string {
  if (!result) return "var(--text-muted)";
  const upper = result.toUpperCase();
  for (const k of Object.keys(RESULT_COLOR)) {
    if (upper.startsWith(k)) return RESULT_COLOR[k];
  }
  return "var(--text-muted)";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SentinelOpsPanel({ entries }: { entries: LogEntry[] }) {
  const sentinel = entries
    .filter((e) => e.agentId === "sentinel" && e.response && !e.error)
    .slice().reverse();

  return (
    <div
      style={{
        width:         "340px",
        flexShrink:    0,
        display:       "flex",
        flexDirection: "column",
        gap:           "0",
        overflow:      "hidden",
      }}
    >
      <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          🛡️ SENTINEL OPS LOG
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px" }}>
            — all nodes
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {sentinel.length === 0 ? (
            <div style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: "11px", textAlign: "center" }}>
              No Sentinel reports yet.<br />Contact Sentinel to begin.
            </div>
          ) : (
            sentinel.map((e) => {
              const report = parseSentinelReport(e.response);
              const nodeBadge = e.node;

              return (
                <div key={e.id} style={{
                  padding:      "10px 12px",
                  borderBottom: "1px solid rgba(30,45,69,0.5)",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{
                      fontSize:      "9px",
                      color:         NODE_COLOR[nodeBadge] ?? "var(--text-muted)",
                      border:        `1px solid ${NODE_COLOR[nodeBadge] ?? "var(--border)"}`,
                      padding:       "1px 5px",
                      borderRadius:  "2px",
                      letterSpacing: "0.08em",
                    }}>
                      {(NODE_LABEL[nodeBadge] ?? nodeBadge).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {formatTime(e.ts)} · {formatDate(e.ts)}
                    </span>
                  </div>

                  {/* Task */}
                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "6px", fontStyle: "italic" }}>
                    "{e.message.length > 60 ? e.message.slice(0, 60) + "…" : e.message}"
                  </div>

                  {report ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {report["Result"] && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.07em", flexShrink: 0 }}>RESULT</span>
                          <span style={{ fontSize: "11px", color: resultColor(report["Result"]), fontWeight: 600 }}>
                            {report["Result"].split("\n")[0].slice(0, 50)}
                          </span>
                        </div>
                      )}
                      {report["Warnings"] && report["Warnings"].toLowerCase() !== "none." && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                          <span style={{ fontSize: "9px", color: "var(--yellow)", letterSpacing: "0.07em", flexShrink: 0 }}>WARN</span>
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                            {report["Warnings"].slice(0, 60)}
                          </span>
                        </div>
                      )}
                      {report["Next Step"] && report["Next Step"].toLowerCase() !== "no further action required." && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.07em", flexShrink: 0 }}>NEXT</span>
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                            {report["Next Step"].slice(0, 60)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {e.response.slice(0, 120)}{e.response.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-screen reader overlay
// ---------------------------------------------------------------------------
const PREVIEW_LIMIT = 420;

function FullReader({ entry, agent, onClose }: {
  entry:   LogEntry;
  agent:   AgentDef;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const report = parseSentinelReport(entry.response);

  function copyText() {
    navigator.clipboard.writeText(entry.response).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1000,
        background:     "rgba(3,6,14,0.88)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:         "min(860px, 90vw)",
          maxHeight:     "80vh",
          background:    "var(--bg-panel)",
          border:        `1px solid ${agent.color}44`,
          borderRadius:  "8px",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     `0 0 40px ${agent.color}22`,
        }}
      >
        {/* Header */}
        <div style={{
          padding:       "14px 20px",
          borderBottom:  "1px solid var(--border)",
          display:       "flex",
          alignItems:    "center",
          gap:           "10px",
          flexShrink:    0,
          background:    "rgba(0,0,0,0.3)",
        }}>
          <span style={{ fontSize: "18px" }}>{agent.emoji}</span>
          <span style={{ fontSize: "15px", color: agent.color, fontWeight: 600, letterSpacing: "0.1em" }}>
            {agent.name.toUpperCase()}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
            {formatTime(entry.ts)} · {formatDate(entry.ts)}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={copyText}
            style={{
              background:    copied ? "rgba(0,255,157,0.1)" : "transparent",
              border:        `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              color:         copied ? "var(--green)" : "var(--text-muted)",
              borderRadius:  "4px",
              padding:       "4px 12px",
              cursor:        "pointer",
              fontSize:      "12px",
              letterSpacing: "0.08em",
              fontFamily:    "inherit",
              marginRight:   "6px",
              transition:    "color 0.2s, border-color 0.2s, background 0.2s",
            }}
          >
            {copied ? "COPIED ✓" : "COPY"}
          </button>
          <button
            onClick={onClose}
            style={{
              background:    "transparent",
              border:        "1px solid var(--border)",
              color:         "var(--text-muted)",
              borderRadius:  "4px",
              padding:       "4px 12px",
              cursor:        "pointer",
              fontSize:      "12px",
              letterSpacing: "0.08em",
              fontFamily:    "inherit",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Prompt */}
        <div style={{
          padding:    "12px 20px",
          borderBottom: "1px solid rgba(30,45,69,0.5)",
          fontSize:   "13px",
          color:      "var(--text-secondary)",
          fontStyle:  "italic",
          flexShrink: 0,
          background: "rgba(74,176,245,0.04)",
        }}>
          "{entry.message}"
        </div>

        {/* Response body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {report ? (
            (["Action", "Result", "Output / Trace", "Warnings", "Next Step"] as const).map((section) => {
              const content = report[section];
              if (!content) return null;
              const isTrace = section === "Output / Trace";
              return (
                <div key={section} style={{ marginBottom: "18px" }}>
                  <div style={{
                    fontSize:      "11px",
                    letterSpacing: "0.12em",
                    color:         section === "Result" ? resultColor(content) : "var(--text-muted)",
                    marginBottom:  "6px",
                    fontWeight:    700,
                  }}>
                    {section.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize:   isTrace ? "13px" : "15px",
                    color:      section === "Result" ? resultColor(content) : "var(--text-primary)",
                    lineHeight: 1.7,
                    fontFamily: isTrace ? "monospace" : "inherit",
                    whiteSpace: isTrace ? "pre-wrap" : "normal",
                  }}>
                    {content}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              fontSize:   "16px",
              color:      "var(--text-primary)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}>
              {entry.response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ entry, agent }: { entry: LogEntry; agent: AgentDef }) {
  const [open, setOpen] = useState(false);
  const report   = parseSentinelReport(entry.response);
  const isLong   = (entry.response?.length ?? 0) > PREVIEW_LIMIT;
  const preview  = isLong && !open
    ? entry.response.slice(0, PREVIEW_LIMIT) + "…"
    : entry.response;

  return (
    <>
      {open && <FullReader entry={entry} agent={agent} onClose={() => setOpen(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {/* User message */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            maxWidth:     "75%",
            background:   "rgba(74,176,245,0.12)",
            border:       "1px solid rgba(74,176,245,0.25)",
            borderRadius: "8px 8px 2px 8px",
            padding:      "8px 12px",
            fontSize:     "14px",
            color:        "var(--text-primary)",
            lineHeight:   1.5,
          }}>
            {entry.message}
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right", marginRight: "2px" }}>
          {formatTime(entry.ts)} · {formatDate(entry.ts)}
        </div>

        {/* Agent response */}
        {entry.error ? (
          <div style={{
            background:   "rgba(248,113,113,0.08)",
            border:       "1px solid rgba(248,113,113,0.2)",
            borderRadius: "8px 8px 8px 2px",
            padding:      "10px 14px",
            fontSize:     "13px",
            color:        "var(--red, #f87171)",
            maxWidth:     "85%",
          }}>
            {entry.error}
          </div>
        ) : report ? (
          // Sentinel structured report — always show read button
          <div style={{
            background:   "rgba(18,30,50,0.6)",
            border:       "1px solid rgba(74,176,245,0.15)",
            borderRadius: "8px 8px 8px 2px",
            padding:      "12px 14px",
            maxWidth:     "90%",
          }}>
            {(["Action", "Result", "Warnings", "Next Step"] as const).map((section) => {
              const content = report[section];
              if (!content) return null;
              return (
                <div key={section} style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: section === "Result" ? resultColor(content) : "var(--text-muted)", marginBottom: "3px", fontWeight: 700 }}>
                    {section.toUpperCase()}
                  </div>
                  <div style={{ color: section === "Result" ? resultColor(content) : "var(--text-secondary)", lineHeight: 1.5, fontSize: "13px" }}>
                    {content.split("\n")[0].slice(0, 120)}
                  </div>
                </div>
              );
            })}
            <button onClick={() => setOpen(true)} style={{
              marginTop:     "8px",
              background:    "rgba(74,176,245,0.1)",
              border:        "1px solid rgba(74,176,245,0.25)",
              borderRadius:  "4px",
              padding:       "5px 14px",
              color:         "var(--accent)",
              fontSize:      "11px",
              letterSpacing: "0.1em",
              cursor:        "pointer",
              fontFamily:    "inherit",
            }}>
              READ FULL REPORT ↗
            </button>
          </div>
        ) : (
          <div style={{
            background:   "rgba(18,30,50,0.6)",
            border:       "1px solid rgba(74,176,245,0.12)",
            borderRadius: "8px 8px 8px 2px",
            padding:      "12px 14px",
            maxWidth:     "85%",
            fontSize:     "14px",
            color:        "var(--text-primary)",
            lineHeight:   1.7,
            whiteSpace:   "pre-wrap",
          }}>
            {preview || <span style={{ color: "var(--text-muted)" }}>No response</span>}
            {isLong && (
              <div style={{ marginTop: "10px" }}>
                <button onClick={() => setOpen(true)} style={{
                  background:    "rgba(74,176,245,0.1)",
                  border:        "1px solid rgba(74,176,245,0.25)",
                  borderRadius:  "4px",
                  padding:       "5px 14px",
                  color:         "var(--accent)",
                  fontSize:      "11px",
                  letterSpacing: "0.1em",
                  cursor:        "pointer",
                  fontFamily:    "inherit",
                }}>
                  READ FULL ↗
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export default function CommsView() {
  const [selected,    setSelected]    = useState<AgentDef>(ROSTER[0]);
  const [allEntries,  setAllEntries]  = useState<LogEntry[]>([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [sendError,   setSendError]   = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  // Load log on mount + after send
  const loadLog = useCallback(async () => {
    try {
      const r = await fetch("/api/comms/log?limit=200", { cache: "no-store" });
      if (r.ok) setAllEntries(await r.json());
    } catch { /* keep last */ }
  }, []);

  useEffect(() => { loadLog(); }, [loadLog]);

  // Scroll to bottom when conversation updates
  const conversation = allEntries.filter((e) => e.agentId === selected.id);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length, selected.id]);

  // Send message
  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    setInput("");

    try {
      const r = await fetch("/api/comms/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ agentId: selected.id, message: text }),
      });

      const data = await r.json() as {
        ok?: boolean;
        error?: string;
        requiresSetup?: boolean;
        hint?: string;
        response?: string;
        entry?: LogEntry;
      };

      if (!r.ok || data.error) {
        setSendError(data.hint ?? data.error ?? "Send failed");
        // Still reload log — the error entry was saved
        await loadLog();
      } else {
        await loadLog();
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Group agents by node
  const byNode = ROSTER.reduce<Record<string, AgentDef[]>>((acc, a) => {
    (acc[a.node] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden", height: "100%" }}>

      {/* ── Left: Agent list ── */}
      <div style={{ width: "210px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">AGENTS</div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {(["lucy", "phoenix", "axiom"] as const).map((node) => {
              const group = byNode[node];
              if (!group?.length) return null;
              return (
                <div key={node}>
                  <div style={{
                    padding:       "6px 10px 4px",
                    fontSize:      "9px",
                    letterSpacing: "0.1em",
                    color:         NODE_COLOR[node],
                    borderBottom:  "1px solid rgba(30,45,69,0.4)",
                  }}>
                    {NODE_LABEL[node]}
                  </div>
                  {group.map((agent) => {
                    const isActive  = selected.id === agent.id;
                    const unread    = allEntries.filter((e) => e.agentId === agent.id).length;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => { setSelected(agent); setSendError(null); }}
                        style={{
                          padding:    "8px 10px",
                          cursor:     "pointer",
                          background: isActive ? "rgba(74,176,245,0.08)" : "transparent",
                          borderLeft: isActive ? `2px solid ${agent.color}` : "2px solid transparent",
                          display:    "flex",
                          alignItems: "center",
                          gap:        "7px",
                        }}
                      >
                        <span style={{ fontSize: "14px", lineHeight: 1 }}>{agent.emoji}</span>
                        <span style={{ fontSize: "13px", color: isActive ? agent.color : "var(--text-secondary)", flex: 1 }}>
                          {agent.name}
                        </span>
                        {unread > 0 && (
                          <span style={{
                            fontSize:     "8px",
                            color:        "var(--text-muted)",
                            background:   "rgba(255,255,255,0.06)",
                            padding:      "1px 4px",
                            borderRadius: "8px",
                          }}>
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Center: Conversation ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", minWidth: 0 }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div className="panel-header" style={{ flexShrink: 0 }}>
            <span style={{ fontSize: "14px", marginRight: "6px" }}>{selected.emoji}</span>
            <span style={{ color: selected.color }}>{selected.name.toUpperCase()}</span>
            <span style={{
              marginLeft:    "8px",
              fontSize:      "9px",
              color:         NODE_COLOR[selected.node],
              border:        `1px solid ${NODE_COLOR[selected.node]}`,
              padding:       "1px 5px",
              borderRadius:  "2px",
              letterSpacing: "0.08em",
            }}>
              {NODE_LABEL[selected.node]}
            </span>
            {conversation.length > 0 && (
              <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "8px", fontSize: "10px" }}>
                {conversation.length} message{conversation.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {conversation.length === 0 ? (
              <div style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                height:         "100%",
                gap:            "10px",
                color:          "var(--text-muted)",
              }}>
                <div style={{ fontSize: "32px", opacity: 0.4 }}>{selected.emoji}</div>
                <div style={{ fontSize: "15px" }}>No messages with {selected.name} yet.</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", opacity: 0.7 }}>
                  {"Type a message below to begin."}
                </div>
              </div>
            ) : (
              conversation.map((e) => {
                const agentDef = ROSTER.find((a) => a.id === e.agentId) ?? selected;
                return <MessageBubble key={e.id} entry={e} agent={agentDef} />;
              })
            )}

            {sending && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "12px" }}>
                <div style={{
                  background:   "rgba(18,30,50,0.6)",
                  border:       "1px solid rgba(74,176,245,0.12)",
                  borderRadius: "8px",
                  padding:      "10px 14px",
                  fontSize:     "11px",
                  color:        "var(--text-muted)",
                }}>
                  <span style={{ animation: "pulse 1.5s infinite" }}>
                    {selected.emoji} {selected.name} is thinking…
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error banner */}
          {sendError && (
            <div style={{
              padding:    "8px 14px",
              background: "rgba(248,113,113,0.08)",
              borderTop:  "1px solid rgba(248,113,113,0.2)",
              fontSize:   "11px",
              color:      "var(--red, #f87171)",
              flexShrink: 0,
            }}>
              {sendError}
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding:    "10px",
            borderTop:  "1px solid rgba(30,45,69,0.6)",
            flexShrink: 0,
            display:    "flex",
            gap:        "8px",
            alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ${selected.name}…  (Enter to send, Shift+Enter for newline)`}
              disabled={sending}
              rows={2}
              style={{
                flex:        1,
                background:  "rgba(10,18,32,0.8)",
                border:      "1px solid rgba(74,176,245,0.2)",
                borderRadius: "4px",
                padding:     "10px 12px",
                fontSize:    "14px",
                color:       "var(--text-primary)",
                resize:      "none",
                outline:     "none",
                fontFamily:  "inherit",
                lineHeight:  1.5,
                opacity:     sending ? 0.5 : 1,
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              style={{
                background:    sending || !input.trim() ? "rgba(74,176,245,0.1)" : "rgba(74,176,245,0.2)",
                border:        "1px solid rgba(74,176,245,0.3)",
                borderRadius:  "4px",
                padding:       "8px 16px",
                color:         sending || !input.trim() ? "var(--text-muted)" : "var(--accent)",
                fontSize:      "11px",
                cursor:        sending || !input.trim() ? "default" : "pointer",
                letterSpacing: "0.08em",
                height:        "52px",
                flexShrink:    0,
              }}
            >
              {sending ? "…" : "SEND"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Sentinel Ops Log ── */}
      <SentinelOpsPanel entries={allEntries} />

    </div>
  );
}

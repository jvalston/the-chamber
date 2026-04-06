"use client";

import { useEffect, useState } from "react";
import type { OlympusSignal } from "../api/radar/route";

interface DisplaySignal {
  id:       string;
  title:    string;
  source:   string;
  topic:    string;
  strength: "high" | "medium" | "low";
  agent:    string;
  caught:   string;
  summary?: string;
  link?:    string;
}

const STRENGTH_COLOR = { high: "var(--red)", medium: "var(--yellow)", low: "var(--text-muted)" };

const TOPIC_COLOR: Record<string, string> = {
  "AI Models":     "#00d4ff",
  "OpenClaw":      "#a855f7",
  "Music Tools":   "#00ff9d",
  "Constellation": "#ffd700",
  "Creative AI":   "#f97316",
  "General":       "var(--accent)",
};

const WATCH_TOPICS = [
  { label: "AI Models",     color: "#00d4ff", description: "New model releases, API changes, pricing shifts" },
  { label: "OpenClaw",      color: "#a855f7", description: "Gateway updates, plugin changes, breaking changes" },
  { label: "Music Tools",   color: "#00ff9d", description: "Suno, Udio, audio generation tooling" },
  { label: "Constellation", color: "#ffd700", description: "Qdrant, TrueRecall, Redis, memory infrastructure" },
  { label: "Creative AI",   color: "#f97316", description: "Creative AI trends, tools, licensing news" },
];

function scoreToStrength(rel: number, imp: number): "high" | "medium" | "low" {
  const avg = (rel + imp) / 2;
  if (avg >= 0.7) return "high";
  if (avg >= 0.4) return "medium";
  return "low";
}

function guessTopic(title: string, query?: string): string {
  const text = (title + " " + (query ?? "")).toLowerCase();
  if (/suno|udio|music|audio|song/.test(text)) return "Music Tools";
  if (/openclaw|gateway|agent framework/.test(text)) return "OpenClaw";
  if (/claude|gpt|gemini|openai|anthropic|llm|model|cerebras/.test(text)) return "AI Models";
  if (/qdrant|redis|truerecall|constellation|hermes|diamond|seraphim/.test(text)) return "Constellation";
  if (/creative|art|design|visual|story|lore/.test(text)) return "Creative AI";
  return "General";
}

function timeAgo(iso?: string): string {
  if (!iso) return "recently";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  return `${m}m ago`;
}

function fromOlympus(sig: OlympusSignal): DisplaySignal {
  return {
    id:       sig.id,
    title:    sig.title,
    source:   sig.source,
    topic:    guessTopic(sig.title, sig.query),
    strength: scoreToStrength(sig.relevance, sig.impact),
    agent:    "Olympus",
    caught:   timeAgo(sig.caught_at),
    summary:  sig.summary,
    link:     sig.links?.[0],
  };
}

const MOCK_SIGNALS: DisplaySignal[] = [
  { id: "s1", title: "New Claude Opus 4.6 release — improved tool use",  source: "X / Twitter", topic: "AI Models",     strength: "high",   agent: "Seraphim", caught: "2 hours ago" },
  { id: "s2", title: "OpenClaw v2 gateway breaking change in /route",     source: "GitHub",      topic: "OpenClaw",      strength: "high",   agent: "Diamond",  caught: "3 hours ago" },
  { id: "s3", title: "Suno v4 drops — new vocal control parameters",      source: "Discord",     topic: "Music Tools",   strength: "medium", agent: "Legend",   caught: "5 hours ago" },
  { id: "s4", title: "Qdrant 1.12 — new sparse vector support",          source: "GitHub",      topic: "Constellation", strength: "medium", agent: "Elior",    caught: "6 hours ago" },
  { id: "s5", title: "OpenRouter routing change — provider tier update",  source: "OpenRouter",  topic: "AI Models",     strength: "medium", agent: "Seraphim", caught: "8 hours ago" },
  { id: "s6", title: "AI-generated music licensing thread on Reddit",     source: "Reddit",      topic: "Creative AI",   strength: "low",    agent: "Legend",   caught: "10 hours ago"},
];

export default function RadarView() {
  const [signals,  setSignals]  = useState<DisplaySignal[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [isMock,   setIsMock]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/radar", { cache: "no-store" });
      const d = await r.json() as { signals: OlympusSignal[]; unavailable?: boolean };
      if (d.unavailable || d.signals.length === 0) {
        setSignals(MOCK_SIGNALS);
        setIsMock(true);
      } else {
        setSignals(d.signals.map(fromOlympus));
        setIsMock(false);
      }
    } catch {
      setSignals(MOCK_SIGNALS);
      setIsMock(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden" }}>

      {/* Signals feed */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot warn" />
              CAUGHT SIGNALS
              {!isMock && (
                <span style={{ fontSize: "9px", color: "#fb923c", letterSpacing: "0.06em" }}>
                  · OLYMPUS LIVE
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {isMock && (
                <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
                  MOCK DATA
                </span>
              )}
              <button
                onClick={load}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "1px 8px", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}
              >
                ↻
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: "52px", margin: "4px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "3px" }} />
              ))
            ) : signals.map((sig) => (
              <div
                key={sig.id}
                onClick={() => setExpanded(expanded === sig.id ? null : sig.id)}
                style={{
                  padding:      "11px 14px",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft:   `3px solid ${STRENGTH_COLOR[sig.strength]}`,
                  cursor:       sig.summary ? "pointer" : "default",
                  background:   expanded === sig.id ? "rgba(255,255,255,0.02)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "4px" }}>
                      {sig.link
                        ? <a href={sig.link} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }} onClick={e => e.stopPropagation()}>{sig.title}</a>
                        : sig.title}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-muted)" }}>
                      <span>{sig.source}</span>
                      <span style={{ color: sig.agent === "Olympus" ? "#fb923c" : "var(--text-muted)" }}>
                        Caught by {sig.agent}
                      </span>
                      <span>{sig.caught}</span>
                    </div>
                    {expanded === sig.id && sig.summary && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                        {sig.summary}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                    <span style={{
                      fontSize:     "9px",
                      color:        TOPIC_COLOR[sig.topic] ?? "var(--accent)",
                      border:       `1px solid ${(TOPIC_COLOR[sig.topic] ?? "var(--accent)") + "50"}`,
                      padding:      "1px 6px",
                      borderRadius: "2px",
                    }}>
                      {sig.topic}
                    </span>
                    <span style={{ fontSize: "9px", color: STRENGTH_COLOR[sig.strength], letterSpacing: "0.08em" }}>
                      {sig.strength.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Watch topics */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">MONITORING</div>
          <div style={{ padding: "6px 0" }}>
            {WATCH_TOPICS.map((t) => (
              <div key={t.label} style={{
                padding:      "9px 14px",
                borderBottom: "1px solid rgba(30,45,69,0.4)",
                borderLeft:   `3px solid ${t.color}`,
              }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: t.color, marginBottom: "3px" }}>
                  {t.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {t.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Olympus status */}
        <div className="panel" style={{ flexShrink: 0 }}>
          <div className="panel-header">OLYMPUS</div>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: isMock ? "var(--border)" : "#fb923c", boxShadow: isMock ? "none" : "0 0 5px #fb923c", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: isMock ? "var(--text-muted)" : "#fb923c", fontWeight: 600, letterSpacing: "0.08em" }}>
                {isMock ? "AWAITING CYCLE" : "LIVE DATA"}
              </span>
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Cron: every 45 min<br />
              Gate: 2-of-3 filter<br />
              Max: 3 signals/cycle<br />
              Dedup: 120 min window
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

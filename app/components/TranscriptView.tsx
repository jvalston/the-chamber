"use client";

import { useState, useRef } from "react";

interface Concept  { name: string; explanation: string; }
interface Section  { section: string; description: string; }

interface Breakdown {
  title?:            string;
  summary?:          string;
  concepts?:         Concept[];
  outline?:          Section[];
  takeaways?:        string[];
  raw?:              string;
  transcriptLength?: number;
  videoId?:          string;
  error?:            string;
}

export default function TranscriptView() {
  const [url,     setUrl]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Breakdown | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushed,  setPushed]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/transcript", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
      });
      const d = await r.json();
      setResult(d);
    } catch (e) {
      setResult({ error: String(e) });
    }
    setLoading(false);
  }

  function clear() {
    setUrl("");
    setResult(null);
    setPushed(false);
    inputRef.current?.focus();
  }

  async function pushToTasks() {
    if (!result?.takeaways?.length) return;
    setPushing(true);
    const context = `Source: ${result.title ?? "YouTube video"}\nURL: ${url}\n\n${result.summary ?? ""}`.trim();
    try {
      await Promise.all(
        result.takeaways.map((t, i) =>
          fetch("/api/tasks", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title:             t.length > 80 ? t.slice(0, 77) + "…" : t,
              description:       context,
              assignee:          "nana",
              source:            "transcript",
              source_title:      result.title ?? "",
              source_url:        url,
              source_type:       "youtube",
              source_confidence: result.transcriptLength && result.transcriptLength > 8000 ? "medium" : "high",
            }),
          }).then((r) => new Promise((res) => setTimeout(() => res(r), i * 50)))
        )
      );
      setPushed(true);
    } catch { /* fail silently — user can retry */ }
    setPushing(false);
  }

  function copyAll() {
    if (!result) return;
    const lines: string[] = [];
    if (result.title)    lines.push(`# ${result.title}`, "");
    if (result.summary)  lines.push("## Summary", result.summary, "");
    if (result.concepts?.length) {
      lines.push("## Key Concepts");
      result.concepts.forEach((c) => lines.push(`- **${c.name}**: ${c.explanation}`));
      lines.push("");
    }
    if (result.outline?.length) {
      lines.push("## Structure");
      result.outline.forEach((s) => lines.push(`- **${s.section}**: ${s.description}`));
      lines.push("");
    }
    if (result.takeaways?.length) {
      lines.push("## Takeaways");
      result.takeaways.forEach((t) => lines.push(`- ${t}`));
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflow: "hidden", height: "100%" }}>

      {/* URL input bar */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          YOUTUBE TRANSCRIPT ANALYZER
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)", fontWeight: 400 }}>
            powered by qwen2.5 · local · no API calls
          </span>
        </div>
        <div style={{ padding: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{
              flex:        1,
              background:  "rgba(0,0,0,0.4)",
              border:      "1px solid var(--border)",
              color:       "var(--text-primary)",
              padding:     "6px 10px",
              fontSize:    "11px",
              fontFamily:  "inherit",
              borderRadius:"2px",
              outline:     "none",
            }}
          />
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            style={{
              padding:       "6px 18px",
              background:    loading ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.1)",
              border:        "1px solid var(--accent)",
              color:         loading ? "var(--text-muted)" : "var(--accent)",
              fontSize:      "11px",
              letterSpacing: "0.1em",
              cursor:        loading || !url.trim() ? "default" : "pointer",
              fontFamily:    "inherit",
              borderRadius:  "2px",
              whiteSpace:    "nowrap",
            }}
          >
            {loading ? "ANALYZING…" : "ANALYZE"}
          </button>
          <button
            onClick={clear}
            style={{
              padding:      "6px 12px",
              background:   "transparent",
              border:       "1px solid var(--border)",
              color:        "var(--text-muted)",
              fontSize:     "11px",
              cursor:       "pointer",
              fontFamily:   "inherit",
              borderRadius: "2px",
            }}
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Result area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>

        {/* Loading skeleton */}
        {loading && (
          <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
              Fetching transcript and analyzing…
            </div>
            {[90, 70, 80, 55, 75, 60, 85, 50].map((w, i) => (
              <div key={i} style={{
                height: "10px", width: `${w}%`,
                background: "rgba(0,212,255,0.08)", borderRadius: "2px",
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.12}s`,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:.25} 50%{opacity:.65} }`}</style>
          </div>
        )}

        {/* Error */}
        {result?.error && !loading && (
          <div className="panel" style={{ padding: "16px", borderColor: "rgba(255,80,80,0.3)" }}>
            <div style={{ fontSize: "11px", color: "var(--red)", lineHeight: 1.6 }}>
              {result.error}
            </div>
          </div>
        )}

        {/* Raw fallback */}
        {result?.raw && !result.error && !loading && (
          <div className="panel" style={{ padding: "16px" }}>
            <div className="panel-header" style={{ marginBottom: "10px" }}>RAW OUTPUT</div>
            <pre style={{ fontSize: "10px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {result.raw}
            </pre>
          </div>
        )}

        {/* Structured breakdown */}
        {result && !result.error && !result.raw && !loading && (
          <>
            {/* Header — title + meta + copy */}
            <div className="panel" style={{ flexShrink: 0 }}>
              <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)", marginBottom: "4px" }}>
                    {result.title ?? "Video Breakdown"}
                  </div>
                  {result.transcriptLength && (
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                      {(result.transcriptLength / 1000).toFixed(1)}k characters transcribed
                      {result.transcriptLength > 8000 ? " · trimmed to 8k for analysis" : ""}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={pushToTasks}
                    disabled={pushing || pushed || !result?.takeaways?.length}
                    style={{
                      padding:       "4px 10px",
                      background:    pushed ? "rgba(0,255,157,0.1)" : pushing ? "transparent" : "rgba(0,255,157,0.07)",
                      border:        `1px solid ${pushed ? "var(--green)" : "rgba(0,255,157,0.3)"}`,
                      color:         pushed ? "var(--green)" : pushing ? "var(--text-muted)" : "rgba(0,255,157,0.8)",
                      fontSize:      "9px",
                      cursor:        pushing || pushed ? "default" : "pointer",
                      borderRadius:  "2px",
                      fontFamily:    "inherit",
                      letterSpacing: "0.08em",
                      whiteSpace:    "nowrap",
                    }}
                  >
                    {pushed ? "✓ PUSHED TO TASKS" : pushing ? "PUSHING…" : "PUSH TO TASKS"}
                  </button>
                  <button
                    onClick={copyAll}
                    style={{
                      padding: "4px 10px", background: "transparent",
                      border: "1px solid var(--border)", color: "var(--text-muted)",
                      fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit",
                      letterSpacing: "0.08em",
                    }}
                  >
                    COPY ALL
                  </button>
                </div>
              </div>
            </div>

            {/* Two-column layout: left = summary + takeaways, right = concepts + outline */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", flex: 1, minHeight: 0 }}>

              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                {/* Summary */}
                {result.summary && (
                  <div className="panel">
                    <div className="panel-header">
                      <span className="status-dot" style={{ background: "var(--accent)" }} />
                      SUMMARY
                    </div>
                    <div style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.7 }}>
                      {result.summary}
                    </div>
                  </div>
                )}

                {/* Takeaways */}
                {result.takeaways?.length ? (
                  <div className="panel" style={{ flex: 1 }}>
                    <div className="panel-header">
                      <span className="status-dot" style={{ background: "var(--green)" }} />
                      KEY TAKEAWAYS
                    </div>
                    <div style={{ padding: "4px 0" }}>
                      {result.takeaways.map((t, i) => (
                        <div key={i} style={{
                          padding: "8px 14px",
                          borderBottom: "1px solid rgba(30,45,69,0.4)",
                          display: "flex", gap: "10px", alignItems: "flex-start",
                        }}>
                          <span style={{ color: "var(--green)", fontSize: "9px", flexShrink: 0, marginTop: "2px", letterSpacing: "0.06em" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-primary)", lineHeight: 1.6 }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                {/* Key Concepts */}
                {result.concepts?.length ? (
                  <div className="panel" style={{ flex: 1 }}>
                    <div className="panel-header">
                      <span className="status-dot" style={{ background: "var(--yellow)" }} />
                      KEY CONCEPTS
                      <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "9px", fontWeight: 400 }}>
                        {result.concepts.length} identified
                      </span>
                    </div>
                    <div style={{ padding: "4px 0", overflowY: "auto" }}>
                      {result.concepts.map((c, i) => (
                        <div key={i} style={{
                          padding: "8px 14px",
                          borderBottom: "1px solid rgba(30,45,69,0.4)",
                        }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--yellow)", marginBottom: "2px" }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {c.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Outline */}
                {result.outline?.length ? (
                  <div className="panel">
                    <div className="panel-header">
                      <span className="status-dot" style={{ background: "var(--text-muted)" }} />
                      STRUCTURE
                    </div>
                    <div style={{ padding: "4px 0" }}>
                      {result.outline.map((s, i) => (
                        <div key={i} style={{
                          padding: "7px 14px",
                          borderBottom: "1px solid rgba(30,45,69,0.4)",
                          display: "flex", gap: "10px",
                        }}>
                          <span style={{ color: "var(--accent-dim)", fontSize: "9px", flexShrink: 0, marginTop: "2px", letterSpacing: "0.06em" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1px" }}>
                              {s.section}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                              {s.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "11px", lineHeight: 2 }}>
              Paste a YouTube URL above and hit ANALYZE<br />
              <span style={{ fontSize: "10px" }}>
                Summary · Key Concepts · Structure · Takeaways<br />
                Runs locally — no API tokens consumed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

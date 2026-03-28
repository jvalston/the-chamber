"use client";

import { useState, useRef } from "react";

export default function TranslatorView() {
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function translate() {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    setError("");
    try {
      const r = await fetch("/api/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: input }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else         setOutput(d.translation ?? "");
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  function clear() {
    setInput("");
    setOutput("");
    setError("");
    textareaRef.current?.focus();
  }

  return (
    <div
      style={{
        flex:          1,
        display:       "grid",
        gridTemplateColumns: "1fr 1fr",
        gap:           "8px",
        padding:       "8px",
        overflow:      "hidden",
        height:        "100%",
      }}
    >
      {/* ── Left: input ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          PASTE AGENT OUTPUT
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)", fontWeight: 400 }}>
            JSON · logs · reports · anything
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px", gap: "8px" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Paste anything here — a JSON payload, a log dump, an agent report, an error message...\n\nHit TRANSLATE and it will come back in plain English."}
            style={{
              flex:        1,
              background:  "rgba(0,0,0,0.4)",
              border:      "1px solid var(--border)",
              color:       "var(--text-primary)",
              padding:     "10px",
              fontSize:    "10px",
              fontFamily:  "inherit",
              borderRadius:"2px",
              outline:     "none",
              resize:      "none",
              lineHeight:  1.6,
            }}
          />

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={translate}
              disabled={loading || !input.trim()}
              style={{
                flex:          1,
                padding:       "7px",
                background:    loading ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.1)",
                border:        "1px solid var(--accent)",
                color:         loading ? "var(--text-muted)" : "var(--accent)",
                fontSize:      "11px",
                letterSpacing: "0.12em",
                cursor:        loading || !input.trim() ? "default" : "pointer",
                fontFamily:    "inherit",
                borderRadius:  "2px",
                transition:    "all 0.15s",
              }}
            >
              {loading ? "TRANSLATING…" : "TRANSLATE →"}
            </button>
            <button
              onClick={clear}
              style={{
                padding:      "7px 14px",
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
      </div>

      {/* ── Right: output ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          PLAIN ENGLISH
          {output && (
            <button
              onClick={() => navigator.clipboard.writeText(output)}
              style={{
                marginLeft:   "auto",
                background:   "transparent",
                border:       "1px solid var(--border)",
                color:        "var(--text-muted)",
                padding:      "1px 8px",
                fontSize:     "9px",
                cursor:       "pointer",
                borderRadius: "2px",
                fontFamily:   "inherit",
              }}
            >
              COPY
            </button>
          )}
        </div>

        <div
          style={{
            flex:       1,
            overflowY:  "auto",
            padding:    "14px 16px",
          }}
        >
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[80, 60, 90, 50, 70].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height:       "10px",
                    width:        `${w}%`,
                    background:   "rgba(0,212,255,0.08)",
                    borderRadius: "2px",
                    animation:    "pulse 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
              <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.7} }`}</style>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                fontSize:   "11px",
                color:      "var(--red)",
                lineHeight: 1.6,
                padding:    "10px",
                border:     "1px solid rgba(255,100,100,0.2)",
                borderRadius:"2px",
                background: "rgba(255,0,0,0.05)",
              }}
            >
              Could not translate — Ollama may be busy or offline.<br />
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{error}</span>
            </div>
          )}

          {output && !loading && (
            <div
              style={{
                fontSize:   "13px",
                color:      "var(--text-primary)",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak:  "break-word",
              }}
            >
              {output}
            </div>
          )}

          {!output && !loading && !error && (
            <div
              style={{
                fontSize:   "11px",
                color:      "var(--text-muted)",
                lineHeight: 1.8,
                paddingTop: "20px",
                textAlign:  "center",
              }}
            >
              Paste any agent output on the left<br />
              and your plain-English summary<br />
              will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

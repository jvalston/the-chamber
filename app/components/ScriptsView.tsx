"use client";
import { useCallback, useEffect, useState } from "react";
import type { ScriptEntry } from "../api/scripts/route";

export default function ScriptsView() {
  const [scripts,  setScripts]  = useState<ScriptEntry[]>([]);
  const [selected, setSelected] = useState<ScriptEntry | null>(null);
  const [running,  setRunning]  = useState(false);
  const [output,   setOutput]   = useState<string | null>(null);
  const [ok,       setOk]       = useState<boolean | null>(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/scripts", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json() as ScriptEntry[];
        setScripts(data);
        if (data.length > 0 && !selected) setSelected(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  async function run() {
    if (!selected || running) return;
    setRunning(true);
    setOutput(null);
    setOk(null);

    try {
      const r = await fetch("/api/scripts/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ file: selected.file }),
      });
      const d = await r.json() as { ok: boolean; output: string; code: number };
      setOutput(d.output || "(no output)");
      setOk(d.ok);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Network error");
      setOk(false);
    } finally {
      setRunning(false);
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    sh:  "var(--green)",
    mjs: "var(--accent)",
    js:  "var(--accent)",
  };

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden", height: "100%" }}>

      {/* ── Left: Script list ── */}
      <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">SCRIPTS</div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>Loading…</div>
            ) : scripts.length === 0 ? (
              <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "12px", textAlign: "center", lineHeight: 1.6 }}>
                No scripts found.<br />
                Add <code style={{ color: "var(--accent)" }}>.sh</code> or <code style={{ color: "var(--accent)" }}>.mjs</code> files to the <code style={{ color: "var(--accent)" }}>scripts/</code> folder.
              </div>
            ) : (
              scripts.map((s) => {
                const isActive = selected?.file === s.file;
                return (
                  <div
                    key={s.file}
                    onClick={() => { setSelected(s); setOutput(null); setOk(null); }}
                    style={{
                      padding:    "10px 12px",
                      cursor:     "pointer",
                      background: isActive ? "rgba(0,212,255,0.07)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      borderBottom: "1px solid rgba(30,45,69,0.4)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{
                        fontSize:     "9px",
                        color:        TYPE_COLOR[s.type] ?? "var(--text-muted)",
                        border:       `1px solid ${TYPE_COLOR[s.type] ?? "var(--border)"}`,
                        borderRadius: "2px",
                        padding:      "1px 4px",
                        letterSpacing:"0.05em",
                        flexShrink:   0,
                      }}>
                        .{s.type}
                      </span>
                      <span style={{ fontSize: "13px", color: isActive ? "var(--accent)" : "var(--text-primary)", fontWeight: 500 }}>
                        {s.name}
                      </span>
                    </div>
                    {s.description && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4, paddingLeft: "28px" }}>
                        {s.description.length > 80 ? s.description.slice(0, 80) + "…" : s.description}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Detail + output ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", minWidth: 0 }}>

        {selected ? (
          <>
            {/* Script header */}
            <div className="panel" style={{ flexShrink: 0, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.05em" }}>
                      {selected.name}
                    </span>
                    <span style={{ fontSize: "10px", color: TYPE_COLOR[selected.type], border: `1px solid ${TYPE_COLOR[selected.type]}`, borderRadius: "2px", padding: "1px 6px" }}>
                      .{selected.type}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    scripts/{selected.file}
                  </div>
                  {selected.description && (
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
                      {selected.description}
                    </div>
                  )}
                </div>

                <button
                  onClick={run}
                  disabled={running}
                  style={{
                    background:    running ? "rgba(0,212,255,0.06)" : "rgba(0,212,255,0.15)",
                    border:        "1px solid rgba(0,212,255,0.35)",
                    color:         running ? "var(--text-muted)" : "var(--accent)",
                    borderRadius:  "4px",
                    padding:       "10px 24px",
                    fontSize:      "13px",
                    fontWeight:    700,
                    cursor:        running ? "default" : "pointer",
                    fontFamily:    "inherit",
                    letterSpacing: "0.1em",
                    flexShrink:    0,
                    minWidth:      "100px",
                  }}
                >
                  {running ? "RUNNING…" : "▶  RUN"}
                </button>
              </div>
            </div>

            {/* Output panel */}
            <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding:      "8px 14px",
                borderBottom: "1px solid var(--border)",
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
                flexShrink:   0,
                background:   "rgba(0,0,0,0.3)",
              }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.12em", color: "var(--text-muted)", fontWeight: 600 }}>OUTPUT</span>
                {ok !== null && (
                  <span style={{
                    fontSize:     "10px",
                    color:        ok ? "var(--green)" : "var(--red)",
                    border:       `1px solid ${ok ? "var(--green)" : "var(--red)"}`,
                    borderRadius: "2px",
                    padding:      "1px 6px",
                    letterSpacing:"0.06em",
                  }}>
                    {ok ? "SUCCESS" : "FAILED"}
                  </span>
                )}
                {output && (
                  <button
                    onClick={() => { setOutput(null); setOk(null); }}
                    style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}
                  >
                    CLEAR
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
                {running ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    <span style={{ color: "var(--accent)" }}>▶</span> Running {selected.file}…
                  </div>
                ) : output ? (
                  <pre style={{
                    margin:     0,
                    fontSize:   "12px",
                    fontFamily: "monospace",
                    color:      ok ? "var(--text-primary)" : "var(--red)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak:  "break-all",
                  }}>
                    {output}
                  </pre>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px", opacity: 0.5 }}>
                    Press RUN to execute this script. Output will appear here.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="panel" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Select a script to run.</div>
          </div>
        )}
      </div>
    </div>
  );
}

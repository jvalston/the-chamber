"use client";

import { useEffect, useState } from "react";

interface Step { step: string; output: string; ok: boolean; }
type TargetNode = "both" | "phoenix" | "lucy" | "axiom" | "mac-mini";
type TargetLabel = { id: TargetNode; label: string };
interface FlowStatus {
  runId?: string;
  stage?: string;
  state?: string;
  message?: string;
  source?: string;
  archive?: string;
  reportPath?: string;
  startedAt?: number;
  updatedAt?: string;
  elapsedSec?: number;
  status?: string;
}

const ACTIONS: { label: string; action: string; accent?: boolean; warn?: boolean }[] = [
  { label: "Update OpenClaw",    action: "update",          accent: true  },
  { label: "Update Hermes",      action: "update-hermes",   accent: true  },
  { label: "Restart Gateway",    action: "restart",                       },
  { label: "Provider Health",    action: "provider-health",               },
  { label: "Star Verification Loop", action: "flow-loop",   accent: true  },
  { label: "Olympus Orientation", action: "olympus-orientation"           },
  { label: "Re-auth Codex",      action: "reauth-codex",    warn: true    },
  { label: "Health Check",       action: "health",                        },
  { label: "Run Doctor",         action: "doctor",                        },
  { label: "Hermes Doctor",      action: "doctor-hermes",                 },
];

interface HermesVersionStatus {
  phoenix: { version: string; upToDate: boolean };
  lucy:    { version: string; upToDate: boolean };
}

export default function QuickActions() {
  const [running, setRunning] = useState<string | null>(null);
  const [steps,   setSteps]   = useState<Step[]>([]);
  const [label,   setLabel]   = useState<string>("");
  const [target,  setTarget]  = useState<TargetNode>("phoenix");
  const [flowPath, setFlowPath] = useState<string>("/home/natza/.openclaw/mission-control/test_flow");
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const [hermesVersion, setHermesVersion] = useState<HermesVersionStatus | null>(null);
  const targetButtons: TargetLabel[] = [
    { id: "both", label: "BOTH" },
    { id: "phoenix", label: "PHOENIX" },
    { id: "lucy", label: "LUCY" },
    { id: "axiom", label: "AXIOM" },
    { id: "mac-mini", label: "MAC MINI" },
  ];

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/flow-status", { cache: "no-store" });
        const d = await r.json();
        if (mounted) setFlowStatus(d);
      } catch {
        // keep last known state
      }
    }
    poll();
    const id = setInterval(poll, 2500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function checkVersions() {
      try {
        const r = await fetch("/api/system", { cache: "no-store" });
        const d = await r.json();
        if (mounted) setHermesVersion(d);
      } catch {
        // keep last known state
      }
    }
    checkVersions();
    const id = setInterval(checkVersions, 5 * 60 * 1000); // every 5 min
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  async function run(action: string, actionLabel: string) {
    if (action === "flow-loop") {
      await runFlowLoop(actionLabel);
      return;
    }
    if (action === "olympus-orientation") {
      await runScriptAction(action, actionLabel, "mc-olympus-orientation.sh");
      return;
    }

    const targetLabel = targetButtons.find((b) => b.id === target)?.label ?? target.toUpperCase();
    setRunning(action);
    setLabel(`${actionLabel} · ${targetLabel}`);
    setSteps([]);
    try {
      const r = await fetch("/api/system", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, target }),
      });
      const d = await r.json();
      setSteps(d.steps ?? [{ step: "Error", output: d.error ?? "unknown error", ok: false }]);
    } catch (e) {
      setSteps([{ step: "Error", output: String(e), ok: false }]);
    }
    setRunning(null);
  }

  async function runScriptAction(action: string, actionLabel: string, file: string, args: string[] = []) {
    setRunning(action);
    setLabel(actionLabel);
    setSteps([]);
    try {
      const r = await fetch("/api/scripts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, args }),
      });
      const d = await r.json();
      const ok = Boolean(d.ok);
      setSteps([
        {
          step: actionLabel,
          output: d.output ?? d.stderr ?? d.error ?? "no output",
          ok,
        },
      ]);
    } catch (e) {
      setSteps([{ step: actionLabel, output: String(e), ok: false }]);
    }
    setRunning(null);
  }

  async function runFlowLoop(actionLabel: string) {
    setRunning("flow-loop");
    setLabel(`${actionLabel}`);
    setSteps([]);
    try {
      const r = await fetch("/api/scripts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: "mc-constellation-flow-loop.sh",
          args: [flowPath],
        }),
      });
      const d = await r.json();
      const ok = Boolean(d.ok);
      setSteps([
        {
          step: "Star Verification Loop",
          output: d.output ?? d.stderr ?? d.error ?? "no output",
          ok,
        },
      ]);
    } catch (e) {
      setSteps([{ step: "Star Verification Loop", output: String(e), ok: false }]);
    }
    setRunning(null);
  }

  return (
    <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">QUICK ACTIONS</div>
      <div
        style={{
          padding: "8px 10px 0",
          fontSize: "9px",
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
          lineHeight: 1.5,
        }}
      >
        Gateway restart is required. Node host restart is optional and may be skipped on local-only setups.
      </div>

      <div style={{ padding: "8px 10px 0", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {targetButtons.map((node) => {
          const active = target === node.id;
          return (
            <button
              key={node.id}
              disabled={!!running}
              onClick={() => setTarget(node.id)}
              style={{
                flex:          "1 1 110px",
                background:    active ? "rgba(0,212,255,0.12)" : "transparent",
                border:        `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                color:         active ? "var(--accent)" : "var(--text-muted)",
                padding:       "5px 8px",
                fontSize:      "9px",
                letterSpacing: "0.1em",
                cursor:        running ? "default" : "pointer",
                borderRadius:  "3px",
                fontFamily:    "inherit",
              }}
            >
              {node.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "8px" }}>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "6px", letterSpacing: "0.08em" }}>
            LIVE FLOW STATUS
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <div>Run: <span style={{ color: "var(--text-primary)" }}>{flowStatus?.runId ?? "—"}</span></div>
            <div>Stage: <span style={{ color: "var(--accent)" }}>{flowStatus?.stage ?? flowStatus?.status ?? "idle"}</span></div>
            <div>State: <span style={{ color: flowStatus?.state === "completed" ? "var(--green)" : flowStatus?.state === "failed" ? "var(--red)" : "var(--yellow)" }}>{flowStatus?.state ?? "idle"}</span></div>
            <div>Elapsed: <span style={{ color: "var(--text-primary)" }}>{flowStatus?.elapsedSec ?? 0}s</span></div>
            <div style={{ color: "var(--text-muted)", marginTop: "4px" }}>{flowStatus?.message ?? "No active flow run."}</div>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "8px" }}>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "6px", letterSpacing: "0.08em" }}>
            FLOW DATASET PATH
          </div>
          <input
            value={flowPath}
            disabled={!!running}
            onChange={(e) => setFlowPath(e.target.value)}
            placeholder="/home/natza/.openclaw/mission-control/test_flow"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              padding: "6px 8px",
              fontSize: "10px",
              borderRadius: "3px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {ACTIONS.map(({ label: lbl, action, accent, warn }) => {
          const isRunning = running === action;
          const isHermesUpdate = action === "update-hermes";
          const hermesUpdateAvailable = isHermesUpdate && hermesVersion && (
            !hermesVersion.phoenix.upToDate || !hermesVersion.lucy.upToDate
          );
          const effectiveAccent = accent || hermesUpdateAvailable;
          const borderCol = hermesUpdateAvailable ? "rgba(255,200,0,0.5)" : effectiveAccent ? "rgba(0,212,255,0.35)" : warn ? "rgba(255,160,50,0.35)" : "var(--border)";
          const textCol   = hermesUpdateAvailable ? "var(--yellow)"        : effectiveAccent ? "var(--accent)"        : warn ? "var(--yellow)"          : "var(--text-secondary)";
          return (
            <button
              key={action}
              disabled={!!running}
              onClick={() => run(action, lbl)}
              style={{
                background:    isRunning ? "rgba(0,212,255,0.08)" : hermesUpdateAvailable ? "rgba(255,200,0,0.06)" : "transparent",
                border:        `1px solid ${borderCol}`,
                color:         isRunning ? "var(--accent)" : textCol,
                padding:       "6px 10px",
                fontSize:      "10px",
                letterSpacing: "0.08em",
                cursor:        running ? "default" : "pointer",
                textAlign:     "left",
                borderRadius:  "3px",
                fontFamily:    "inherit",
                width:         "100%",
                opacity:       running && !isRunning ? 0.4 : 1,
                display:       "flex",
                justifyContent: "space-between",
                alignItems:    "center",
              }}
              onMouseEnter={(e) => {
                if (running) return;
                e.currentTarget.style.borderColor = "var(--accent-dim)";
                e.currentTarget.style.color       = "var(--accent)";
                e.currentTarget.style.background  = "var(--accent-glow)";
              }}
              onMouseLeave={(e) => {
                if (running) return;
                e.currentTarget.style.borderColor = borderCol;
                e.currentTarget.style.color       = textCol;
                e.currentTarget.style.background  = hermesUpdateAvailable ? "rgba(255,200,0,0.06)" : "transparent";
              }}
            >
              <span>{isRunning ? `${lbl}…` : lbl}</span>
              {isHermesUpdate && hermesVersion && (
                <span style={{ fontSize: "8px", letterSpacing: "0.06em", opacity: 0.85 }}>
                  {hermesUpdateAvailable
                    ? `UPDATE AVAILABLE`
                    : `v${hermesVersion.phoenix.version} ✓`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Output panel */}
      {(running || steps.length > 0) && (
        <div style={{
          flex:         1,
          margin:       "0 10px 10px",
          background:   "rgba(0,0,0,0.35)",
          border:       "1px solid var(--border)",
          borderRadius: "3px",
          overflowY:    "auto",
          padding:      "8px",
          minHeight:    0,
        }}>
          <div style={{ fontSize: "9px", color: "var(--accent)", letterSpacing: "0.12em", marginBottom: "6px" }}>
            {running ? `▸ ${label.toUpperCase()}…` : label.toUpperCase()}
          </div>

          {running && steps.length === 0 && (
            <div style={{ fontSize: "10px", color: "var(--text-muted)", animation: "pulse 1.4s ease-in-out infinite" }}>
              Running…
              <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
            </div>
          )}

          {steps.map((s, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "2px" }}>
                <span style={{ color: s.ok ? "var(--green)" : "var(--red)", fontSize: "9px" }}>
                  {s.ok ? "✓" : "✗"}
                </span>
                <span style={{ fontSize: "9px", color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                  {s.step.toUpperCase()}
                </span>
              </div>
              {s.output && (
                <pre style={{
                  fontSize:    "9px",
                  color:       "var(--text-muted)",
                  whiteSpace:  "pre-wrap",
                  lineHeight:  1.5,
                  margin:      "0 0 0 14px",
                  maxHeight:   "80px",
                  overflowY:   "auto",
                }}>
                  {s.output}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

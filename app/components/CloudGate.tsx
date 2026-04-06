"use client";
import { useCallback, useEffect, useState } from "react";

type GwStatus = {
  machine: string;
  cloud_enabled: boolean;
  tiers: Record<string, { model: string; timeout: number }[]>;
};

type OllamaModel = {
  name: string;
  sizeGb: number;
  params: string;
  family: string;
  active: boolean;
};

export default function CloudGate() {
  const [status, setStatus]   = useState<GwStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [models, setModels]   = useState<OllamaModel[]>([]);
  const [totalGb, setTotalGb] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/gateway/status");
      if (!r.ok) throw new Error("gateway unreachable");
      setStatus(await r.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const r = await fetch("/api/models", { cache: "no-store" });
      const d = await r.json();
      setModels(d.models ?? []);
      setTotalGb(d.totalGb ?? 0);
    } catch { /* keep last */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchModels();
    const t1 = setInterval(fetchStatus, 8_000);
    const t2 = setInterval(fetchModels, 30_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchStatus, fetchModels]);

  async function toggle() {
    if (!status || loading) return;
    setLoading(true);
    const endpoint = status.cloud_enabled
      ? "/api/gateway/cloud/disable"
      : "/api/gateway/cloud/enable";
    try {
      await fetch(endpoint, { method: "POST" });
      await fetchStatus();
      const logFn = (window as unknown as Record<string, unknown>).__missionLog as
        ((level: string, msg: string) => void) | undefined;
      logFn?.("warn", status.cloud_enabled ? "Cloud access DISABLED" : "Cloud access ENABLED");
    } finally {
      setLoading(false);
    }
  }

  const on = status?.cloud_enabled ?? false;

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <span>CLOUD GATE</span>
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          color: error ? "var(--red)" : on ? "var(--yellow)" : "var(--green)",
          letterSpacing: "0.08em",
        }}>
          {error ? "OFFLINE" : on ? "CLOUD ON" : "LOCAL ONLY"}
        </span>
      </div>

      <div style={{ padding: "12px" }}>
        {/* Toggle button */}
        <button
          onClick={toggle}
          disabled={loading || !!error}
          style={{
            width: "100%",
            padding: "10px",
            background: on ? "rgba(255,85,85,0.12)" : "rgba(0,212,255,0.08)",
            border: `1px solid ${on ? "var(--red)" : "var(--accent-dim)"}`,
            borderRadius: "4px",
            color: on ? "var(--red)" : "var(--accent)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            cursor: loading || error ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginBottom: "12px",
          }}
        >
          {loading ? "…" : on ? "DISABLE CLOUD" : "ENABLE CLOUD"}
        </button>

        {/* Warning when cloud is on */}
        {on && (
          <div style={{
            padding: "6px 8px",
            background: "rgba(255,200,0,0.06)",
            border: "1px solid rgba(255,200,0,0.2)",
            borderRadius: "3px",
            fontSize: "9px",
            color: "var(--yellow)",
            lineHeight: "1.6",
            marginBottom: "10px",
          }}>
            CLOUD ACTIVE — external API calls are permitted.
            Disable when done.
          </div>
        )}

        {/* Tier summary */}
        {status?.tiers && (
          <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: "1.8" }}>
            {Object.entries(status.tiers).map(([lane, models]) => (
              <div key={lane} style={{ marginBottom: "4px" }}>
                <span style={{ color: "var(--text-primary)", letterSpacing: "0.06em" }}>
                  {lane.toUpperCase()}
                </span>
                {models.map((m, i) => (
                  <div key={i} style={{ paddingLeft: "8px" }}>
                    → {m.model}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ fontSize: "9px", color: "var(--red)", marginTop: "8px" }}>
            {error}
          </div>
        )}

        {/* Ollama model inventory */}
        <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              OLLAMA MODELS
            </span>
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {totalGb} GB total
            </span>
          </div>

          {models.length === 0 ? (
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {error ? "ollama unreachable" : "no models installed"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {models.map((m) => (
                <div key={m.name} style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "6px",
                  padding:       "4px 6px",
                  borderRadius:  "2px",
                  background:    m.active ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                  border:        `1px solid ${m.active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  <span style={{
                    width:           "5px", height: "5px",
                    borderRadius:    "50%",
                    background:      m.active ? "var(--accent)" : "var(--border)",
                    flexShrink:      0,
                  }} />
                  <span style={{
                    flex:       1,
                    fontSize:   "9px",
                    color:      m.active ? "var(--text-primary)" : "var(--text-muted)",
                    overflow:   "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {m.name.replace(/:latest$/, "")}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)", flexShrink: 0 }}>
                    {m.sizeGb}G
                  </span>
                  {!m.active && (
                    <span style={{
                      fontSize:      "8px",
                      color:         "var(--yellow)",
                      letterSpacing: "0.06em",
                      flexShrink:    0,
                    }}>
                      unused
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

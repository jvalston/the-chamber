"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type NodeTarget = "phoenix" | "lucy";

interface StarRow {
  node: NodeTarget;
  agentId: string;
  name: string;
  profile: string | null;
  elevated: boolean;
  effectiveProfile: string;
}

const PROFILE_OPTIONS = ["inherit", "full", "coding", "safe", "minimal"];

export default function StarToolsView() {
  const [rows, setRows] = useState<StarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/star-tools", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to load star tools");
      setRows(data.stars ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setLocalProfile(key: string, profile: string) {
    setRows((prev) => prev.map((r) => (rowKey(r) === key ? { ...r, profile: profile === "inherit" ? null : profile } : r)));
  }

  function setLocalElevated(key: string, elevated: boolean) {
    setRows((prev) => prev.map((r) => (rowKey(r) === key ? { ...r, elevated } : r)));
  }

  async function saveRow(row: StarRow) {
    const key = rowKey(row);
    setSavingKey(key);
    setError(null);
    try {
      const r = await fetch("/api/star-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: row.node,
          agentId: row.agentId,
          profile: row.profile ?? "inherit",
          elevated: row.elevated,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Save failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  }

  const grouped = {
    phoenix: rows.filter((r) => r.node === "phoenix"),
    lucy: rows.filter((r) => r.node === "lucy"),
  } as const;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflowY: "auto" }}>
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">STAR TOOLS CONTROL</div>
        <div style={{ padding: "10px 12px", fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Control each star&apos;s tools access from The Chamber. Changes update OpenClaw config and restart gateway on that node.
        </div>
      </div>

      {error && (
        <div className="panel" style={{ borderColor: "rgba(255,80,80,0.35)" }}>
          <div style={{ padding: "10px 12px", color: "var(--red)", fontSize: "11px" }}>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="panel"><div style={{ padding: "12px", color: "var(--text-muted)", fontSize: "11px" }}>Loading star tools…</div></div>
      ) : (
        <>
          <NodeSection
            title="PHOENIX"
            rows={grouped.phoenix}
            savingKey={savingKey}
            onProfileChange={setLocalProfile}
            onElevatedChange={setLocalElevated}
            onSave={saveRow}
          />
          <NodeSection
            title="LUCY"
            rows={grouped.lucy}
            savingKey={savingKey}
            onProfileChange={setLocalProfile}
            onElevatedChange={setLocalElevated}
            onSave={saveRow}
          />
        </>
      )}
    </div>
  );
}

function NodeSection({
  title,
  rows,
  savingKey,
  onProfileChange,
  onElevatedChange,
  onSave,
}: {
  title: string;
  rows: StarRow[];
  savingKey: string | null;
  onProfileChange: (key: string, profile: string) => void;
  onElevatedChange: (key: string, elevated: boolean) => void;
  onSave: (row: StarRow) => Promise<void>;
}) {
  return (
    <div className="panel">
      <div className="panel-header">{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "12px", color: "var(--text-muted)", fontSize: "11px" }}>No stars found.</div>
        ) : rows.map((row) => {
          const key = rowKey(row);
          const busy = savingKey === key;
          const currentProfile = row.profile ?? "inherit";
          return (
            <div key={key} style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,45,69,0.4)", display: "grid", gridTemplateColumns: "180px 160px 100px 90px", gap: "10px", alignItems: "center" }}>
              <div>
                <div style={{ color: "var(--text-primary)", fontSize: "11px", fontWeight: 600 }}>{row.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "9px" }}>{row.agentId} · effective: {row.effectiveProfile}</div>
              </div>

              <select
                value={currentProfile}
                onChange={(e) => onProfileChange(key, e.target.value)}
                disabled={busy}
                style={selectStyle}
              >
                {PROFILE_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={row.elevated}
                  disabled={busy}
                  onChange={(e) => onElevatedChange(key, e.target.checked)}
                />
                Elevated
              </label>

              <button
                onClick={() => onSave(row)}
                disabled={busy}
                style={buttonStyle}
              >
                {busy ? "Saving…" : "Apply"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function rowKey(row: StarRow) {
  return `${row.node}:${row.agentId}`;
}

const selectStyle: CSSProperties = {
  background: "rgba(0,0,0,0.35)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: "10px",
  padding: "5px 8px",
  fontFamily: "inherit",
  borderRadius: "2px",
};

const buttonStyle: CSSProperties = {
  background: "rgba(0,255,157,0.1)",
  border: "1px solid var(--green)",
  color: "var(--green)",
  fontSize: "9px",
  letterSpacing: "0.08em",
  padding: "5px 10px",
  cursor: "pointer",
  borderRadius: "2px",
  fontFamily: "inherit",
};

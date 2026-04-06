"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyEntry } from "../api/keys/route";

// ---------------------------------------------------------------------------
// Scan result type
// ---------------------------------------------------------------------------
interface ScanResult {
  file:      string;
  variable:  string;
  value:     string;
  provider:  string;
  belongsTo: string;
  alreadyIn: boolean;
}

// ---------------------------------------------------------------------------
// Scan & Import Modal
// ---------------------------------------------------------------------------
function ScanModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [scanning,    setScanning]    = useState(false);
  const [results,     setResults]     = useState<ScanResult[] | null>(null);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [importing,   setImporting]   = useState(false);
  const [extraPaths,  setExtraPaths]  = useState("");
  const [importDone,  setImportDone]  = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const [masked,      setMasked]      = useState(true);

  async function scan() {
    setScanning(true);
    setResults(null);
    setError(null);
    setSelected(new Set());
    try {
      const paths = extraPaths.split("\n").map((p) => p.trim()).filter(Boolean);
      const r = await fetch("/api/keys/scan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paths }),
      });
      const data = await r.json() as ScanResult[];
      setResults(data);
      // Pre-select all new keys
      setSelected(new Set(data.filter((d) => !d.alreadyIn).map((d) => d.variable)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function importSelected() {
    if (!results) return;
    setImporting(true);
    const toImport = results.filter((r) => selected.has(r.variable));
    let count = 0;
    for (const item of toImport) {
      await fetch("/api/keys", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:           item.variable,
          provider:       item.provider,
          belongsTo:      item.belongsTo,
          value:          item.value,
          targetFile:     item.file,
          targetVariable: item.variable,
          notes:          `Imported from ${item.file.split(/[\\/]/).pop()}`,
        }),
      });
      count++;
    }
    setImportDone(count);
    setImporting(false);
    onImported();
  }

  function toggleAll(checked: boolean) {
    if (!results) return;
    if (checked) {
      setSelected(new Set(results.filter((r) => !r.alreadyIn).map((r) => r.variable)));
    } else {
      setSelected(new Set());
    }
  }

  const newCount = results?.filter((r) => !r.alreadyIn).length ?? 0;
  const alreadyCount = results?.filter((r) => r.alreadyIn).length ?? 0;

  // Group results by file
  const byFile = results
    ? results.reduce<Record<string, ScanResult[]>>((acc, r) => {
        const label = r.file.split(/[\\/]/).pop() ?? r.file;
        (acc[label] ??= []).push(r);
        return acc;
      }, {})
    : {};

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(10,14,26,0.8)", border: "1px solid var(--border)",
    borderRadius: "3px", padding: "8px 10px", fontSize: "12px", color: "var(--text-primary)",
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(3,6,14,0.88)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 94vw)", maxHeight: "88vh", background: "var(--bg-panel)", border: "1px solid var(--border-bright)", borderRadius: "6px", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>SCAN FOR KEYS</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "10px" }}>Finds .env files and imports missing keys</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Extra paths */}
          <div>
            <label style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              ADDITIONAL PATHS TO SCAN (one per line — Windows or Linux/WSL paths)
            </label>
            <textarea
              value={extraPaths}
              onChange={(e) => setExtraPaths(e.target.value)}
              placeholder={"C:\\path\\to\\project\\.env\n/home/user/project/.env"}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Already scans: mission-control root + all Phoenix agent workspaces
            </div>
          </div>

          <button
            onClick={scan}
            disabled={scanning}
            style={{ background: scanning ? "transparent" : "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: scanning ? "var(--text-muted)" : "var(--accent)", borderRadius: "3px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: scanning ? "default" : "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}
          >
            {scanning ? "SCANNING…" : "SCAN NOW"}
          </button>

          {error && (
            <div style={{ fontSize: "12px", color: "var(--red)", padding: "8px 10px", background: "rgba(255,68,68,0.08)", borderRadius: "3px" }}>{error}</div>
          )}

          {/* Results */}
          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Summary */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", fontSize: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "var(--green)" }}>{newCount} new</span>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span style={{ color: "var(--text-muted)" }}>{alreadyCount} already stored</span>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span style={{ color: "var(--text-secondary)" }}>{results.length} total</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Mask toggle */}
                  <button
                    onClick={() => setMasked((m) => !m)}
                    style={{ background: masked ? "rgba(255,215,0,0.08)" : "transparent", border: `1px solid ${masked ? "var(--yellow)" : "var(--border)"}`, color: masked ? "var(--yellow)" : "var(--text-muted)", borderRadius: "3px", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.07em" }}
                  >
                    {masked ? "🔒 MASKED" : "👁 VISIBLE"}
                  </button>
                  {newCount > 0 && (
                    <label style={{ fontSize: "11px", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                      <input type="checkbox" checked={selected.size === newCount} onChange={(e) => toggleAll(e.target.checked)} />
                      Select all new
                    </label>
                  )}
                </div>
              </div>

              {/* Keys by file */}
              {Object.entries(byFile).map(([fileName, items]) => (
                <div key={fileName}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px", paddingBottom: "4px", borderBottom: "1px solid rgba(30,45,69,0.5)", fontFamily: "monospace" }}>
                    {fileName}
                  </div>
                  {items.map((item) => {
                    const displayValue = masked
                      ? "•".repeat(Math.min(item.value.length, 24))
                      : item.value.length > 40 ? item.value.slice(0, 40) + "…" : item.value;
                    return (
                      <div key={item.variable} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 4px", borderBottom: "1px solid rgba(30,45,69,0.3)", opacity: item.alreadyIn ? 0.4 : 1 }}>
                        <input
                          type="checkbox"
                          checked={selected.has(item.variable)}
                          disabled={item.alreadyIn}
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.variable);
                              else next.delete(item.variable);
                              return next;
                            });
                          }}
                        />
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-primary)", width: "220px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.variable}</span>
                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: masked ? "var(--text-muted)" : "var(--green)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: masked ? "0.05em" : "normal" }}>
                          {displayValue}
                        </span>
                        {item.provider && (
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "2px", padding: "1px 5px", flexShrink: 0 }}>{item.provider}</span>
                        )}
                        {item.belongsTo && (
                          <span style={{ fontSize: "9px", color: "var(--accent)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "2px", padding: "1px 5px", flexShrink: 0 }}>{item.belongsTo}</span>
                        )}
                        {item.alreadyIn && (
                          <span style={{ fontSize: "9px", color: "var(--green)", flexShrink: 0 }}>✓ stored</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {importDone > 0 && (
            <div style={{ fontSize: "13px", color: "var(--green)", padding: "10px 12px", background: "rgba(0,255,157,0.06)", borderRadius: "4px", textAlign: "center" }}>
              ✓ Imported {importDone} key{importDone !== 1 ? "s" : ""} into Key Keeper
            </div>
          )}
        </div>

        {/* Footer */}
        {results && newCount > 0 && importDone === 0 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: "8px", justifyContent: "flex-end", background: "rgba(0,0,0,0.2)" }}>
            <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "3px", padding: "7px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}>
              CANCEL
            </button>
            <button
              onClick={importSelected}
              disabled={importing || selected.size === 0}
              style={{ background: selected.size === 0 ? "transparent" : "rgba(0,255,157,0.12)", border: `1px solid ${selected.size === 0 ? "var(--border)" : "var(--green)"}`, color: selected.size === 0 ? "var(--text-muted)" : "var(--green)", borderRadius: "3px", padding: "7px 20px", fontSize: "12px", cursor: selected.size === 0 ? "default" : "pointer", fontFamily: "inherit", letterSpacing: "0.08em", fontWeight: 600 }}
            >
              {importing ? "IMPORTING…" : `IMPORT ${selected.size} KEY${selected.size !== 1 ? "S" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item) || "Uncategorized";
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--green)",
  rotated:  "var(--yellow)",
  inactive: "var(--text-muted)",
};

const EMPTY_FORM: Omit<KeyEntry, "id" | "createdAt" | "rotatedAt" | "status"> = {
  name:           "",
  provider:       "",
  belongsTo:      "",
  value:          "",
  notes:          "",
  targetFile:     "",
  targetVariable: "",
};

const KEY_TEMPLATE_OPTIONS = [
  { value: "discord-token",  label: "Discord Token" },
  { value: "discord-room",   label: "Discord Personal Room" },
  { value: "discord-workspace", label: "Discord Workspace Room" },
  { value: "discord-commons",label: "Discord Commons Room" },
  { value: "discord-orientation", label: "Discord Orientation Room" },
  { value: "telegram-token", label: "Telegram Token" },
  { value: "custom",         label: "Custom (manual)" },
] as const;

const AGENT_OPTIONS = [
  "Legend", "Seraphim", "Diamond", "Lumen", "Elior", "Sentinel",
  "Atlas", "Aurora", "Aurelion", "Veris", "Kairo", "Hermes", "Persephone", "Olympus",
] as const;

// Agents whose keys live in ~/.hermes/.env (Hermes-framework-based)
const HERMES_BASED_AGENTS = new Set(["Olympus", "Persephone", "Hermes", "Lumen"]);

const TARGET_FILE_OPTIONS = [
  { label: "Hermes (.env)",          value: "/home/natza/.hermes/.env" },
  { label: "The Chamber (.env.local)", value: "C:\\Users\\natza\\Desktop\\the-chamber\\.env.local" },
  { label: "OpenClaw workspace",     value: "\\\\wsl.localhost\\Ubuntu\\home\\natza\\.openclaw\\workspace\\.env" },
] as const;

function varSafe(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function applyTemplateToForm(
  base: Omit<KeyEntry, "id" | "createdAt" | "rotatedAt" | "status">,
  template: string,
  agent: string
) {
  const id = varSafe(agent);
  const targetFile = base.targetFile ||
    (HERMES_BASED_AGENTS.has(agent)
      ? "/home/natza/.hermes/.env"
      : "C:\\Users\\natza\\Desktop\\mission-control\\.env.local");

  if (template === "discord-token") {
    return {
      ...base,
      name:           `DISCORD_TOKEN_${id}`,
      provider:       "Discord",
      belongsTo:      agent,
      targetVariable: `DISCORD_TOKEN_${id}`,
      targetFile,
    };
  }
  if (template === "discord-room") {
    return {
      ...base,
      name:           `${id}_DISCORD_ROOM`,
      provider:       "Discord",
      belongsTo:      agent,
      targetVariable: `${id}_DISCORD_ROOM`,
      targetFile,
    };
  }
  if (template === "discord-commons") {
    return {
      ...base,
      name:           "COMMONS_DISCORD_ROOM",
      provider:       "Discord",
      belongsTo:      "Commons",
      targetVariable: "COMMONS_DISCORD_ROOM",
      targetFile,
    };
  }
  if (template === "discord-workspace") {
    return {
      ...base,
      name:           `${id}_DISCORD_WORKSPACE_ROOM`,
      provider:       "Discord",
      belongsTo:      agent,
      targetVariable: `${id}_DISCORD_WORKSPACE_ROOM`,
      targetFile,
    };
  }
  if (template === "discord-orientation") {
    return {
      ...base,
      name:           "ORIENTATION_DISCORD_ROOM",
      provider:       "Discord",
      belongsTo:      "Orientation",
      targetVariable: "ORIENTATION_DISCORD_ROOM",
      targetFile,
    };
  }
  if (template === "telegram-token") {
    return {
      ...base,
      name:           `TELEGRAM_TOKEN_${id}`,
      provider:       "Telegram",
      belongsTo:      agent,
      targetVariable: `TELEGRAM_TOKEN_${id}`,
      targetFile,
    };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Key Form Modal
// ---------------------------------------------------------------------------
function KeyFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?:  Partial<KeyEntry>;
  onSave:    (data: Partial<KeyEntry>) => Promise<void>;
  onClose:   () => void;
}) {
  const [form,    setForm]    = useState({ ...EMPTY_FORM, ...initial });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [template, setTemplate] = useState<(typeof KEY_TEMPLATE_OPTIONS)[number]["value"]>("discord-token");
  const [agentName, setAgentName] = useState("Hermes");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function field(key: keyof typeof form) {
    return {
      value:    form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.value.trim()) {
      setError("Name and value are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    background:   "rgba(10,14,26,0.8)",
    border:       "1px solid var(--border)",
    borderRadius: "3px",
    padding:      "8px 10px",
    fontSize:     "13px",
    color:        "var(--text-primary)",
    fontFamily:   "inherit",
    outline:      "none",
    boxSizing:    "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize:      "10px",
    letterSpacing: "0.1em",
    color:         "var(--text-muted)",
    marginBottom:  "4px",
    display:       "block",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1000,
        background:     "rgba(3,6,14,0.85)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:         "min(540px, 92vw)",
          background:    "var(--bg-panel)",
          border:        "1px solid var(--border-bright)",
          borderRadius:  "6px",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding:      "14px 18px",
          borderBottom: "1px solid var(--border)",
          background:   "rgba(0,0,0,0.3)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
            {initial?.id ? "EDIT KEY" : "ADD KEY"}
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", padding: "0 4px", lineHeight: 1 }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {!initial?.id && (
            <div style={{ border: "1px solid var(--border)", borderRadius: "4px", padding: "10px", background: "rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "8px" }}>
                QUICK PRESET
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px" }}>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as (typeof KEY_TEMPLATE_OPTIONS)[number]["value"])}
                  style={inputStyle}
                >
                  {KEY_TEMPLATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div>
                  <input
                    list="agent-name-options"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Star name (e.g. Olympus)"
                    style={inputStyle}
                  />
                  <datalist id="agent-name-options">
                    {AGENT_OPTIONS.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => applyTemplateToForm(f, template, agentName))}
                  style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--accent)", borderRadius: "3px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}
                >
                  APPLY
                </button>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
                Discord uses two keys by design: token and room. Use the preset to fill both quickly.
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>KEY NAME *</label>
              <input ref={nameRef} {...field("name")} placeholder="DISCORD_TOKEN_LEGEND" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PROVIDER / SERVICE</label>
              <input {...field("provider")} placeholder="Discord, OpenRouter, GitHub…" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>BELONGS TO (agent or app)</label>
            <input {...field("belongsTo")} placeholder="Legend, The Chamber, OpenClaw…" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>VALUE *</label>
            <input
              {...field("value")}
              type="password"
              placeholder="Paste key value here"
              style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.05em" }}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "10px" }}>
              PLACEMENT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>TARGET FILE</label>
                <input
                  {...field("targetFile")}
                  list="target-file-options"
                  placeholder="C:\..\.env.local or /home/natza/..."
                  style={{ ...inputStyle, fontSize: "11px" }}
                />
                <datalist id="target-file-options">
                  {TARGET_FILE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} label={o.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>VARIABLE NAME</label>
                <input {...field("targetVariable")} placeholder="DISCORD_TOKEN_LEGEND" style={inputStyle} />
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea
              {...field("notes")}
              placeholder="What this key is for, where it was obtained, any rotation notes…"
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: "var(--red)", padding: "6px 10px", background: "rgba(255,68,68,0.08)", borderRadius: "3px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", paddingTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "3px", padding: "7px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ background: saving ? "rgba(0,212,255,0.08)" : "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.3)", color: saving ? "var(--text-muted)" : "var(--accent)", borderRadius: "3px", padding: "7px 20px", fontSize: "12px", cursor: saving ? "default" : "pointer", fontFamily: "inherit", letterSpacing: "0.08em", fontWeight: 600 }}
            >
              {saving ? "SAVING…" : "SAVE KEY"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key Card
// ---------------------------------------------------------------------------
function KeyCard({
  entry,
  onEdit,
  onDelete,
  onRefresh,
}: {
  entry:     KeyEntry;
  onEdit:    (e: KeyEntry) => void;
  onDelete:  (id: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [writing,  setWriting]  = useState(false);
  const [writeMsg, setWriteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function masked(v: string) {
    if (v.length <= 8) return "•".repeat(v.length);
    return v.slice(0, 4) + "•".repeat(Math.min(v.length - 8, 20)) + v.slice(-4);
  }

  function copy() {
    navigator.clipboard.writeText(entry.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  async function writeToFile() {
    setWriting(true);
    setWriteMsg(null);
    try {
      const r = await fetch(`/api/keys/${entry.id}/write`, { method: "POST" });
      const d = await r.json() as { ok?: boolean; action?: string; error?: string; targetFile?: string };
      if (d.ok) {
        setWriteMsg({ ok: true, text: `${d.action?.toUpperCase()} in ${entry.targetFile.split(/[\\/]/).pop()}` });
      } else {
        setWriteMsg({ ok: false, text: d.error ?? "Write failed" });
      }
    } catch (err) {
      setWriteMsg({ ok: false, text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setWriting(false);
      setTimeout(() => setWriteMsg(null), 4000);
    }
  }

  async function rotate() {
    await fetch(`/api/keys/${entry.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "rotated", rotatedAt: new Date().toISOString() }),
    });
    onRefresh();
  }

  async function deleteKey() {
    if (!confirm(`Delete key "${entry.name}"?`)) return;
    await fetch(`/api/keys/${entry.id}`, { method: "DELETE" });
    onRefresh();
  }

  const isRotated  = entry.status === "rotated";
  const statusColor = STATUS_COLOR[entry.status] ?? "var(--text-muted)";

  return (
    <div
      style={{
        background:   expanded ? "rgba(0,212,255,0.04)" : "transparent",
        border:       `1px solid ${expanded ? "var(--border-bright)" : "var(--border)"}`,
        borderRadius: "4px",
        marginBottom: "6px",
        transition:   "border-color 0.15s, background 0.15s",
        opacity:      isRotated ? 0.6 : 1,
      }}
    >
      {/* Row — always visible */}
      <div
        onClick={() => setExpanded((x) => !x)}
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
          padding:    "10px 14px",
          cursor:     "pointer",
        }}
      >
        {/* Status dot */}
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, flexShrink: 0 }} />

        {/* Name */}
        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600, flex: 1, fontFamily: "monospace" }}>
          {entry.name}
        </span>

        {/* Provider badge */}
        {entry.provider && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "2px", padding: "1px 6px" }}>
            {entry.provider}
          </span>
        )}

        {/* Target file hint */}
        {entry.targetFile && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            → {entry.targetFile.split(/[\\/]/).pop()}
          </span>
        )}

        <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(30,45,69,0.5)", paddingTop: "12px" }}>

          {/* Value row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em", flexShrink: 0 }}>VALUE</span>
            <code style={{
              flex:         1,
              fontSize:     "12px",
              fontFamily:   "monospace",
              color:        revealed ? "var(--green)" : "var(--text-muted)",
              background:   "rgba(0,0,0,0.3)",
              border:       "1px solid var(--border)",
              borderRadius: "3px",
              padding:      "5px 10px",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}>
              {revealed ? entry.value : masked(entry.value)}
            </code>
            <button
              onClick={() => setRevealed((r) => !r)}
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "3px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", flexShrink: 0 }}
            >
              {revealed ? "HIDE" : "REVEAL"}
            </button>
            <button
              onClick={copy}
              style={{ background: copied ? "rgba(0,255,157,0.1)" : "transparent", border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`, color: copied ? "var(--green)" : "var(--text-muted)", borderRadius: "3px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", flexShrink: 0, transition: "all 0.2s" }}
            >
              {copied ? "COPIED ✓" : "COPY"}
            </button>
          </div>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px", fontSize: "11px" }}>
            {entry.targetFile && (
              <div>
                <span style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}>FILE </span>
                <span style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "10px" }}>{entry.targetFile}</span>
              </div>
            )}
            {entry.targetVariable && (
              <div>
                <span style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}>VAR </span>
                <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{entry.targetVariable}</span>
              </div>
            )}
            {entry.notes && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}>NOTE </span>
                <span style={{ color: "var(--text-secondary)" }}>{entry.notes}</span>
              </div>
            )}
            <div>
              <span style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}>ADDED </span>
              <span style={{ color: "var(--text-secondary)" }}>{new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            {entry.rotatedAt && (
              <div>
                <span style={{ color: "var(--yellow)", letterSpacing: "0.07em" }}>ROTATED </span>
                <span style={{ color: "var(--text-secondary)" }}>{new Date(entry.rotatedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Write feedback */}
          {writeMsg && (
            <div style={{ fontSize: "11px", color: writeMsg.ok ? "var(--green)" : "var(--red)", marginBottom: "8px", padding: "5px 8px", background: writeMsg.ok ? "rgba(0,255,157,0.06)" : "rgba(255,68,68,0.06)", borderRadius: "3px" }}>
              {writeMsg.ok ? "✓ " : "✗ "}{writeMsg.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {entry.targetFile && (
              <button
                onClick={writeToFile}
                disabled={writing}
                style={{ background: writing ? "transparent" : "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: writing ? "var(--text-muted)" : "var(--accent)", borderRadius: "3px", padding: "5px 14px", fontSize: "11px", cursor: writing ? "default" : "pointer", fontFamily: "inherit", letterSpacing: "0.08em", fontWeight: 600 }}
              >
                {writing ? "WRITING…" : "WRITE TO FILE"}
              </button>
            )}
            <button
              onClick={() => onEdit(entry)}
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "3px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}
            >
              EDIT
            </button>
            {entry.status === "active" && (
              <button
                onClick={rotate}
                style={{ background: "transparent", border: "1px solid rgba(255,215,0,0.3)", color: "var(--yellow)", borderRadius: "3px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}
              >
                MARK ROTATED
              </button>
            )}
            <button
              onClick={deleteKey}
              style={{ background: "transparent", border: "1px solid rgba(255,68,68,0.2)", color: "var(--red)", borderRadius: "3px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em", marginLeft: "auto" }}
            >
              DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export default function KeysView() {
  const [keys,       setKeys]       = useState<KeyEntry[]>([]);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<string>("ALL");
  const [modal,      setModal]      = useState<"add" | "edit" | "scan" | null>(null);
  const [editTarget, setEditTarget] = useState<KeyEntry | null>(null);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/keys", { cache: "no-store" });
      if (r.ok) setKeys(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveKey(data: Partial<KeyEntry>) {
    let savedEntry: KeyEntry | null = null;

    if (editTarget) {
      const res = await fetch(`/api/keys/${editTarget.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to update key");
      }
      savedEntry = await res.json() as KeyEntry;
    } else {
      const res = await fetch("/api/keys", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to create key");
      }
      savedEntry = await res.json() as KeyEntry;
    }

    // Auto-sync vault entries into target env file so new keys become active immediately.
    if (savedEntry?.id && savedEntry.targetFile?.trim() && savedEntry.targetVariable?.trim()) {
      const writeRes = await fetch(`/api/keys/${savedEntry.id}/write`, { method: "POST" });
      if (!writeRes.ok) {
        const d = await writeRes.json().catch(() => ({})) as { error?: string };
        const msg = d.error ?? "Write to target env file failed";
        // Keep the key saved in vault, but surface that runtime sync failed.
        throw new Error(`Saved in Key Keeper, but could not write to target file: ${msg}`);
      }
    }

    await load();
  }

  function openEdit(entry: KeyEntry) {
    setEditTarget(entry);
    setModal("edit");
  }

  function openAdd() {
    setEditTarget(null);
    setModal("add");
  }

  // Filter + search
  const filtered = keys.filter((k) => {
    const matchesGroup = filter === "ALL" || k.belongsTo === filter || k.provider === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      k.name.toLowerCase().includes(q) ||
      k.provider.toLowerCase().includes(q) ||
      k.belongsTo.toLowerCase().includes(q) ||
      k.notes.toLowerCase().includes(q);
    return matchesGroup && matchesSearch;
  });

  // Sidebar groups
  const groups = ["ALL", ...Array.from(new Set(keys.map((k) => k.belongsTo).filter(Boolean))).sort()];
  const grouped = groupBy(filtered, (k) => k.belongsTo || "Uncategorized");

  const activeCount  = keys.filter((k) => k.status === "active").length;
  const rotatedCount = keys.filter((k) => k.status === "rotated").length;

  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden", height: "100%" }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: "190px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">KEYS</div>

          {/* Stats */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", color: "var(--accent)", fontWeight: 700, lineHeight: 1 }}>{activeCount}</div>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: "2px" }}>ACTIVE</div>
            </div>
            {rotatedCount > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", color: "var(--yellow)", fontWeight: 700, lineHeight: 1 }}>{rotatedCount}</div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: "2px" }}>ROTATED</div>
              </div>
            )}
          </div>

          {/* Group list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {groups.map((g) => {
              const count   = g === "ALL" ? keys.length : keys.filter((k) => k.belongsTo === g).length;
              const isActive = filter === g;
              return (
                <div
                  key={g}
                  onClick={() => setFilter(g)}
                  style={{
                    padding:    "8px 12px",
                    cursor:     "pointer",
                    display:    "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background:  isActive ? "rgba(0,212,255,0.07)" : "transparent",
                    borderLeft:  isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    fontSize:    "13px",
                    color:       isActive ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <span>{g}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div style={{ padding: "10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={openAdd}
              style={{ width: "100%", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "3px", color: "var(--accent)", padding: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em", fontWeight: 600 }}
            >
              + ADD KEY
            </button>
            <button
              onClick={() => setModal("scan")}
              style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-secondary)", padding: "7px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}
            >
              ⟳ SCAN FOR KEYS
            </button>
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", minWidth: 0 }}>

        {/* Search bar */}
        <div className="panel" style={{ flexShrink: 0, padding: "8px 12px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keys by name, provider, agent, notes…"
            style={{
              width:        "100%",
              background:   "transparent",
              border:       "none",
              outline:      "none",
              fontSize:     "13px",
              color:        "var(--text-primary)",
              fontFamily:   "inherit",
              boxSizing:    "border-box",
            }}
          />
        </div>

        {/* Key list */}
        <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>

            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px", textAlign: "center" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "40px 20px", textAlign: "center" }}>
                {keys.length === 0
                  ? <>No keys yet. Click <strong style={{ color: "var(--accent)" }}>+ ADD KEY</strong> to start.</>
                  : "No keys match your search."}
              </div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupKeys]) => (
                <div key={group} style={{ marginBottom: "20px" }}>
                  {/* Group header — only show when not filtered to one group */}
                  {(filter === "ALL" || filter !== group) && (
                    <div style={{
                      fontSize:      "10px",
                      letterSpacing: "0.12em",
                      color:         "var(--text-muted)",
                      marginBottom:  "8px",
                      paddingBottom: "4px",
                      borderBottom:  "1px solid rgba(30,45,69,0.5)",
                    }}>
                      {group.toUpperCase()} — {groupKeys.length} key{groupKeys.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {groupKeys.map((k) => (
                    <KeyCard
                      key={k.id}
                      entry={k}
                      onEdit={openEdit}
                      onDelete={() => load()}
                      onRefresh={load}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <KeyFormModal
          initial={editTarget ?? undefined}
          onSave={saveKey}
          onClose={() => { setModal(null); setEditTarget(null); }}
        />
      )}
      {modal === "scan" && (
        <ScanModal
          onClose={() => setModal(null)}
          onImported={() => { load(); }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Blueprint {
  id: string;
  title: string;
  category: "Tech" | "Music" | "General";
  target: string;
  content: string;
  status: "inbox" | "promoted" | "archive";
  createdAt: string;
  projectId?: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  Tech:    "var(--accent)",
  Music:   "rgba(180,100,255,0.9)",
  General: "var(--text-muted)",
};

const TARGET_COLOR: Record<string, string> = {
  seraphim: "var(--green)",
  diamond:  "#4ab0f5",
  legend:   "rgba(180,100,255,0.9)",
  all:      "var(--yellow)",
};

const STATUS_COLOR: Record<string, string> = {
  inbox:    "var(--yellow)",
  promoted: "var(--green)",
  archive:  "var(--text-muted)",
};

const BLANK: Partial<Blueprint> = {
  title: "", category: "General", target: "all", content: "", status: "inbox",
};

export default function InboxView() {
  const [items, setItems]         = useState<Blueprint[]>([]);
  const [selected, setSelected]   = useState<Blueprint | null>(null);
  const [creating, setCreating]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [search, setSearch]       = useState("");
  const [form, setForm]           = useState<Partial<Blueprint>>(BLANK);

  useEffect(() => {
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.blueprints ?? []);
        if (d.blueprints?.length) setSelected(d.blueprints[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.target.toLowerCase().includes(q) ||
      b.content.toLowerCase().includes(q)
    );
  });

  async function saveBlueprint() {
    if (!form.title?.trim() || !form.content?.trim()) return;
    setSaving(true);
    const res = await fetch("/api/blueprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const bp = await res.json();
    setItems((prev) => [bp, ...prev]);
    setSelected(bp);
    setCreating(false);
    setForm(BLANK);
    setSaving(false);
  }

  async function promoteToProject() {
    if (!selected) return;
    setPromoting(true);

    // Create project
    const domain =
      selected.category === "Tech"  ? "Infrastructure" :
      selected.category === "Music" ? "Creative" : "General";

    const projRes = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selected.title,
        description: `Blueprint: ${selected.title}`,
        domain,
        assignee: selected.target,
        blueprintId: selected.id,
      }),
    });
    const proj = await projRes.json();

    // Also create a task for the assignee
    if (selected.target !== "all") {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Review and implement: ${selected.title}`,
          description: selected.content.slice(0, 300),
          assignee: selected.target,
          project: proj.id,
        }),
      });
    }

    // Mark blueprint as promoted
    await fetch("/api/blueprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", id: selected.id, status: "promoted", projectId: proj.id }),
    });

    setItems((prev) =>
      prev.map((b) => b.id === selected.id ? { ...b, status: "promoted", projectId: proj.id } : b)
    );
    setSelected((s) => s ? { ...s, status: "promoted", projectId: proj.id } : s);
    setPromoting(false);
  }

  async function archiveBlueprint() {
    if (!selected) return;
    await fetch("/api/blueprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", id: selected.id, status: "archive" }),
    });
    setItems((prev) => prev.map((b) => b.id === selected.id ? { ...b, status: "archive" } : b));
    setSelected((s) => s ? { ...s, status: "archive" } : s);
  }

  async function deleteBlueprint() {
    if (!selected) return;
    await fetch("/api/blueprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "delete", id: selected.id }),
    });
    const next = items.filter((b) => b.id !== selected.id);
    setItems(next);
    setSelected(next[0] ?? null);
  }

  const inboxCount    = items.filter((b) => b.status === "inbox").length;
  const promotedCount = items.filter((b) => b.status === "promoted").length;

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Left: List ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header" style={{ gap: "8px" }}>
          <span>BLUEPRINT INBOX</span>
          <span style={{ fontSize: "9px", color: "var(--yellow)" }}>{inboxCount} new</span>
          <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>
            {promotedCount} promoted
          </span>
        </div>

        {/* New blueprint button */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", gap: "6px" }}>
          <button
            onClick={() => { setCreating(true); setSelected(null); }}
            style={{
              flex: 1,
              background: creating ? "rgba(0,212,255,0.12)" : "rgba(0,0,0,0.4)",
              border: `1px solid ${creating ? "var(--accent)" : "var(--border)"}`,
              color: creating ? "var(--accent)" : "var(--text-secondary)",
              padding: "5px 10px",
              fontSize: "9px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: "2px",
            }}
          >
            + NEW BLUEPRINT
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blueprints…"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              padding: "4px 8px",
              fontSize: "10px",
              fontFamily: "inherit",
              borderRadius: "2px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "16px", fontSize: "9px", color: "var(--text-muted)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "9px", color: "var(--text-muted)" }}>
              {items.length === 0 ? "NO BLUEPRINTS YET — ADD ONE" : "NO MATCHES"}
            </div>
          ) : (
            filtered.map((bp) => (
              <button
                key={bp.id}
                onClick={() => { setSelected(bp); setCreating(false); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: selected?.id === bp.id && !creating ? "rgba(0,212,255,0.06)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft: selected?.id === bp.id && !creating ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: "9px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    fontSize: "8px",
                    color: CATEGORY_COLOR[bp.category],
                    border: `1px solid ${CATEGORY_COLOR[bp.category]}40`,
                    padding: "0 4px",
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}>
                    {bp.category.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: selected?.id === bp.id && !creating ? "var(--accent)" : "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {bp.title}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "8px", color: TARGET_COLOR[bp.target] ?? "var(--text-muted)" }}>
                    → {bp.target.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>
                    <span style={{ color: STATUS_COLOR[bp.status] }}>● </span>
                    {bp.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Form or Detail ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {creating ? (
          <>
            <div className="panel-header">
              <span>NEW BLUEPRINT</span>
              <button
                onClick={() => { setCreating(false); setForm(BLANK); }}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Title */}
              <div>
                <div style={labelStyle}>TITLE</div>
                <input
                  value={form.title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. YouTube transcription — AI Music Theory..."
                  style={inputStyle}
                />
              </div>

              {/* Category + Target row */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>CATEGORY</div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Blueprint["category"] }))}
                    style={selectStyle}
                  >
                    <option value="Tech">Tech</option>
                    <option value="Music">Music</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>TARGET AGENT</div>
                  <select
                    value={form.target}
                    onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="all">All</option>
                    <option value="seraphim">Seraphim</option>
                    <option value="diamond">Diamond</option>
                    <option value="legend">Legend</option>
                  </select>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "300px" }}>
                <div style={labelStyle}>CONTENT — paste text, transcription, or ideas</div>
                <textarea
                  value={form.content ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Paste your text here…"
                  style={{
                    flex: 1,
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    padding: "10px",
                    fontSize: "10px",
                    fontFamily: "inherit",
                    borderRadius: "2px",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.7,
                    minHeight: "300px",
                  }}
                />
                <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {(form.content ?? "").length.toLocaleString()} characters
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
                <button
                  onClick={saveBlueprint}
                  disabled={saving || !form.title?.trim() || !form.content?.trim()}
                  style={{
                    ...actionBtn,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent)",
                    opacity: saving || !form.title?.trim() || !form.content?.trim() ? 0.4 : 1,
                  }}
                >
                  {saving ? "SAVING…" : "SAVE BLUEPRINT"}
                </button>
                <button
                  onClick={() => { setCreating(false); setForm(BLANK); }}
                  style={{ ...actionBtn, border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </>
        ) : selected ? (
          <>
            <div className="panel-header">
              <span style={{ color: CATEGORY_COLOR[selected.category], marginRight: "8px", fontSize: "8px" }}>
                {selected.category.toUpperCase()}
              </span>
              <span>{selected.title.toUpperCase()}</span>
              <span style={{ marginLeft: "8px", fontSize: "8px", color: STATUS_COLOR[selected.status] }}>
                ● {selected.status.toUpperCase()}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
                {selected.createdAt}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Meta */}
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                {[
                  ["CATEGORY", selected.category],
                  ["TARGET", selected.target.toUpperCase()],
                  ["STATUS", selected.status.toUpperCase()],
                  ["ADDED", selected.createdAt],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>{label}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-primary)" }}>{val}</span>
                  </div>
                ))}
                {selected.projectId && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>PROJECT</span>
                    <span style={{ fontSize: "10px", color: "var(--green)" }}>{selected.projectId}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>CONTENT</div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border)",
                    padding: "12px",
                    borderRadius: "3px",
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {selected.content}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {selected.content.length.toLocaleString()} characters
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px solid var(--border)" }}>
                {selected.status === "inbox" && (
                  <button
                    onClick={promoteToProject}
                    disabled={promoting}
                    style={{
                      ...actionBtn,
                      background: "rgba(0,212,255,0.1)",
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                    }}
                  >
                    {promoting ? "CREATING…" : "→ SEND TO PROJECTS"}
                  </button>
                )}
                {selected.status !== "archive" && (
                  <button
                    onClick={archiveBlueprint}
                    style={{ ...actionBtn, border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    ARCHIVE
                  </button>
                )}
                <button
                  onClick={deleteBlueprint}
                  style={{ ...actionBtn, border: "1px solid rgba(255,80,80,0.4)", color: "rgba(255,80,80,0.8)", marginLeft: "auto" }}
                >
                  DELETE
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "10px", flexDirection: "column", gap: "8px" }}>
            <div>Select a blueprint or add a new one</div>
            <div style={{ fontSize: "8px" }}>Blueprints are accessible by Seraphim and Diamond via /api/blueprints</div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "8px",
  color: "var(--text-muted)",
  letterSpacing: "0.1em",
  marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  padding: "6px 10px",
  fontSize: "10px",
  fontFamily: "inherit",
  borderRadius: "2px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  padding: "6px 10px",
  fontSize: "10px",
  fontFamily: "inherit",
  borderRadius: "2px",
  outline: "none",
  cursor: "pointer",
};

const actionBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "6px 14px",
  fontSize: "9px",
  letterSpacing: "0.1em",
  cursor: "pointer",
  fontFamily: "inherit",
  borderRadius: "2px",
};

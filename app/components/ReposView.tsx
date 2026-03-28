"use client";

import { useEffect, useState } from "react";

interface Repo {
  id: string;
  name: string;
  url: string;
  localPath: string;
  description: string;
  status: "active" | "complete" | "extensible" | "archive";
  domain: string;
  tags: string[];
  assignee: string;
  notes: string;
  addedAt: string;
  projectId?: string;
  source?: "manual" | "synced-owned" | "synced-community" | "synced-imported";
}

const SOURCE_LABEL: Record<string, string> = {
  manual:            "MANUAL",
  "synced-owned":    "OWNED",
  "synced-community":"STARRED",
  "synced-imported": "IMPORTED",
};

const SOURCE_COLOR: Record<string, string> = {
  manual:            "var(--text-muted)",
  "synced-owned":    "var(--accent)",
  "synced-community":"rgba(180,100,255,0.9)",
  "synced-imported": "var(--yellow)",
};

const STATUS_COLOR: Record<string, string> = {
  active:      "var(--green)",
  complete:    "var(--accent)",
  extensible:  "var(--yellow)",
  archive:     "var(--text-muted)",
};

const STATUS_LABEL: Record<string, string> = {
  active:     "ACTIVE",
  complete:   "COMPLETE",
  extensible: "EXTENSIBLE",
  archive:    "ARCHIVE",
};

const DOMAIN_COLOR: Record<string, string> = {
  Infrastructure: "var(--accent)",
  Creative:       "rgba(180,100,255,0.9)",
  "AI/ML":        "#4ab0f5",
  Frontend:       "var(--yellow)",
  Backend:        "var(--green)",
  Tools:          "#c084fc",
  General:        "var(--text-muted)",
};

const BLANK: Partial<Repo> = {
  name: "", url: "", localPath: "", description: "", status: "archive",
  domain: "General", tags: [], assignee: "", notes: "",
};

export default function ReposView() {
  const [repos, setRepos]         = useState<Repo[]>([]);
  const [selected, setSelected]   = useState<Repo | null>(null);
  const [creating, setCreating]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [form, setForm]           = useState<Partial<Repo>>(BLANK);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    fetch("/api/repos")
      .then((r) => r.json())
      .then((d) => {
        setRepos(d.repos ?? []);
        if (d.repos?.length) setSelected(d.repos[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSource = sourceFilter === "all" || r.source === sourceFilter || (sourceFilter === "manual" && !r.source);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.domain.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.notes.toLowerCase().includes(q);
    return matchStatus && matchSource && matchSearch;
  });

  async function saveRepo() {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = { ...form, tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) };
    const res = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const repo = await res.json();
    setRepos((prev) => [repo, ...prev]);
    setSelected(repo);
    setCreating(false);
    setForm(BLANK);
    setTagsInput("");
    setSaving(false);
  }

  async function updateStatus(status: Repo["status"]) {
    if (!selected) return;
    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", id: selected.id, status }),
    });
    setRepos((prev) => prev.map((r) => r.id === selected.id ? { ...r, status } : r));
    setSelected((s) => s ? { ...s, status } : s);
  }

  async function promoteToProject() {
    if (!selected) return;
    setPromoting(true);

    const projRes = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Implement: ${selected.name}`,
        description: selected.description || `Integrate/build from ${selected.name} repository`,
        domain: selected.domain,
        assignee: selected.assignee,
        repoId: selected.id,
      }),
    });
    const proj = await projRes.json();

    if (selected.assignee) {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Review and implement: ${selected.name}`,
          description: selected.description,
          assignee: selected.assignee,
          project: proj.id,
        }),
      });
    }

    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", id: selected.id, status: "active", projectId: proj.id }),
    });

    setRepos((prev) => prev.map((r) => r.id === selected.id ? { ...r, status: "active", projectId: proj.id } : r));
    setSelected((s) => s ? { ...s, status: "active", projectId: proj.id } : s);
    setPromoting(false);
  }

  async function deleteRepo() {
    if (!selected) return;
    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "delete", id: selected.id }),
    });
    const next = repos.filter((r) => r.id !== selected.id);
    setRepos(next);
    setSelected(next[0] ?? null);
  }

  const counts = {
    all:        repos.length,
    active:     repos.filter((r) => r.status === "active").length,
    extensible: repos.filter((r) => r.status === "extensible").length,
    complete:   repos.filter((r) => r.status === "complete").length,
    archive:    repos.filter((r) => r.status === "archive").length,
  };

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Left: List ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header">
          <span>REPO REGISTRY</span>
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
            {repos.length} total
          </span>
        </div>

        {/* New + search */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", gap: "6px" }}>
          <button
            onClick={() => { setCreating(true); setSelected(null); setForm(BLANK); setTagsInput(""); }}
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
            + ADD REPO
          </button>
        </div>

        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repos…"
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

        {/* Source filter */}
        <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {([
            { key: "all",               label: "ALL" },
            { key: "manual",            label: "MANUAL" },
            { key: "synced-owned",      label: "OWNED" },
            { key: "synced-community",  label: "STARRED" },
            { key: "synced-imported",   label: "IMPORTED" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              style={{
                background: sourceFilter === key ? "rgba(0,212,255,0.08)" : "transparent",
                border: "none",
                borderBottom: sourceFilter === key ? "2px solid var(--accent)" : "2px solid transparent",
                color: sourceFilter === key ? "var(--accent)" : "var(--text-muted)",
                padding: "5px 10px",
                fontSize: "7px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {(["all", "active", "extensible", "complete", "archive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                background: statusFilter === s ? "rgba(0,212,255,0.08)" : "transparent",
                border: "none",
                borderBottom: statusFilter === s ? "2px solid var(--accent)" : "2px solid transparent",
                color: statusFilter === s ? "var(--accent)" : "var(--text-muted)",
                padding: "5px 10px",
                fontSize: "7px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {s.toUpperCase()} {counts[s] > 0 ? `(${counts[s]})` : ""}
            </button>
          ))}
        </div>

        {/* Repo list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "16px", fontSize: "9px", color: "var(--text-muted)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "9px", color: "var(--text-muted)" }}>
              {repos.length === 0 ? "NO REPOS YET — ADD ONE" : "NO MATCHES"}
            </div>
          ) : (
            filtered.map((repo) => (
              <button
                key={repo.id}
                onClick={() => { setSelected(repo); setCreating(false); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: selected?.id === repo.id && !creating ? "rgba(0,212,255,0.06)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft: selected?.id === repo.id && !creating ? "2px solid var(--accent)" : "2px solid transparent",
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
                    fontSize: "7px",
                    color: STATUS_COLOR[repo.status],
                    border: `1px solid ${STATUS_COLOR[repo.status]}50`,
                    padding: "0 4px",
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}>
                    {STATUS_LABEL[repo.status]}
                  </span>
                  {repo.source && repo.source !== "manual" && (
                    <span style={{
                      fontSize: "6px",
                      color: SOURCE_COLOR[repo.source],
                      border: `1px solid ${SOURCE_COLOR[repo.source]}50`,
                      padding: "0 4px",
                      borderRadius: "2px",
                      flexShrink: 0,
                    }}>
                      {SOURCE_LABEL[repo.source]}
                    </span>
                  )}
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: selected?.id === repo.id && !creating ? "var(--accent)" : "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {repo.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "8px", color: DOMAIN_COLOR[repo.domain] ?? "var(--text-muted)" }}>
                    {repo.domain}
                  </span>
                  {repo.tags.slice(0, 2).map((t) => (
                    <span key={t} style={{ fontSize: "7px", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "0 3px", borderRadius: "2px" }}>
                      {t}
                    </span>
                  ))}
                  <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>{repo.addedAt}</span>
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
              <span>ADD REPO</span>
              <button
                onClick={() => { setCreating(false); setForm(BLANK); setTagsInput(""); }}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={labelStyle}>REPO NAME</div>
                <input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. local-voice-ai" style={inputStyle} />
              </div>

              <div>
                <div style={labelStyle}>GITHUB URL</div>
                <input value={form.url ?? ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://github.com/user/repo" style={inputStyle} />
              </div>

              <div>
                <div style={labelStyle}>LOCAL PATH</div>
                <input value={form.localPath ?? ""} onChange={(e) => setForm((f) => ({ ...f, localPath: e.target.value }))} placeholder="C:\Users\natza\Downloads\..." style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>STATUS</div>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Repo["status"] }))} style={selectStyle}>
                    <option value="archive">Archive — stored for reference</option>
                    <option value="extensible">Extensible — can be integrated</option>
                    <option value="complete">Complete — deployable app</option>
                    <option value="active">Active — in progress</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>DOMAIN</div>
                  <select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} style={selectStyle}>
                    <option value="General">General</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="AI/ML">AI/ML</option>
                    <option value="Creative">Creative</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Tools">Tools</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>ASSIGN TO AGENT</div>
                  <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} style={selectStyle}>
                    <option value="">— none —</option>
                    <option value="seraphim">Seraphim</option>
                    <option value="diamond">Diamond</option>
                    <option value="legend">Legend</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>TAGS (comma-separated)</div>
                  <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. audio, python, docker" style={inputStyle} />
                </div>
              </div>

              <div>
                <div style={labelStyle}>DESCRIPTION</div>
                <textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this repo do?" rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 } as React.CSSProperties} />
              </div>

              <div>
                <div style={labelStyle}>NOTES — plans, integration ideas, context</div>
                <textarea value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Could replace current TTS stack. Needs audio driver fix first..." rows={4} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 } as React.CSSProperties} />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={saveRepo}
                  disabled={saving || !form.name?.trim()}
                  style={{
                    ...actionBtn,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent)",
                    opacity: saving || !form.name?.trim() ? 0.4 : 1,
                  }}
                >
                  {saving ? "SAVING…" : "SAVE REPO"}
                </button>
                <button onClick={() => { setCreating(false); setForm(BLANK); setTagsInput(""); }} style={{ ...actionBtn, border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  CANCEL
                </button>
              </div>
            </div>
          </>
        ) : selected ? (
          <>
            <div className="panel-header">
              <span style={{ color: STATUS_COLOR[selected.status], marginRight: "8px", fontSize: "8px" }}>
                {STATUS_LABEL[selected.status]}
              </span>
              <span>{selected.name.toUpperCase()}</span>
              <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>{selected.addedAt}</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Meta */}
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={labelStyle}>DOMAIN</span>
                  <span style={{ fontSize: "10px", color: DOMAIN_COLOR[selected.domain] ?? "var(--text-secondary)" }}>{selected.domain}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={labelStyle}>ASSIGNED</span>
                  <span style={{ fontSize: "10px", color: "var(--text-primary)" }}>{selected.assignee || "—"}</span>
                </div>
                {selected.projectId && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={labelStyle}>LINKED PROJECT</span>
                    <span style={{ fontSize: "10px", color: "var(--green)" }}>{selected.projectId}</span>
                  </div>
                )}
              </div>

              {/* URL + local path */}
              {selected.url && (
                <div>
                  <div style={labelStyle}>GITHUB</div>
                  <div style={pathStyle}>{selected.url}</div>
                </div>
              )}
              {selected.localPath && (
                <div>
                  <div style={labelStyle}>LOCAL PATH</div>
                  <div style={pathStyle}>{selected.localPath}</div>
                </div>
              )}

              {/* Tags */}
              {selected.tags.length > 0 && (
                <div>
                  <div style={labelStyle}>TAGS</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {selected.tags.map((t) => (
                      <span key={t} style={{ fontSize: "8px", color: "var(--text-secondary)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "2px" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div>
                  <div style={labelStyle}>DESCRIPTION</div>
                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.description}</div>
                </div>
              )}

              {/* Notes / ABOUT.md */}
              {selected.notes && (
                <div>
                  <div style={labelStyle}>
                    {selected.source && selected.source !== "manual" ? "ABOUT.MD" : "NOTES"}
                  </div>
                  <div style={{
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border)",
                    padding: "10px 12px",
                    borderRadius: "3px",
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}>
                    {selected.notes}
                  </div>
                </div>
              )}

              {/* Source indicator */}
              {selected.source && selected.source !== "manual" && (
                <div style={{ fontSize: "8px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                  <span style={{ color: SOURCE_COLOR[selected.source] }}>
                    {SOURCE_LABEL[selected.source]}
                  </span>
                  {" — auto-synced from GitHub. Edit ABOUT.md in the repo folder to add context."}
                </div>
              )}

              {/* Status changer */}
              <div>
                <div style={labelStyle}>CHANGE STATUS</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(["archive", "extensible", "complete", "active"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      style={{
                        ...actionBtn,
                        padding: "4px 10px",
                        fontSize: "8px",
                        background: selected.status === s ? `${STATUS_COLOR[s]}18` : "transparent",
                        border: `1px solid ${selected.status === s ? STATUS_COLOR[s] : "var(--border)"}`,
                        color: selected.status === s ? STATUS_COLOR[s] : "var(--text-muted)",
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px solid var(--border)" }}>
                {!selected.projectId && (
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
                    {promoting ? "CREATING…" : "→ CONVERT TO PROJECT"}
                  </button>
                )}
                <button
                  onClick={deleteRepo}
                  style={{ ...actionBtn, border: "1px solid rgba(255,80,80,0.4)", color: "rgba(255,80,80,0.8)", marginLeft: "auto" }}
                >
                  DELETE
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "10px", flexDirection: "column", gap: "8px" }}>
            <div>Select a repo or add a new one</div>
            <div style={{ fontSize: "8px" }}>Track GitHub repos: status, local path, agent assignments, notes</div>
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

const pathStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "var(--accent)",
  fontFamily: "monospace",
  background: "rgba(0,212,255,0.04)",
  border: "1px solid rgba(0,212,255,0.15)",
  padding: "6px 10px",
  borderRadius: "3px",
  wordBreak: "break-all",
};

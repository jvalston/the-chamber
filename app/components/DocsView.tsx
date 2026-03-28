"use client";

import { useEffect, useState } from "react";

interface Doc {
  id: string;
  title: string;
  category: string;
  format: string;
  project: string;
  agent: string;
  summary: string;
  path: string;
  createdAt: string;
  source?: "obsidian" | "local";
}

const CATEGORIES = ["All", "Persona", "Architecture", "Plan", "Creative", "Report", "Governance", "General"];

const CATEGORY_COLOR: Record<string, string> = {
  Persona:      "rgba(180,100,255,0.9)",
  Architecture: "var(--accent)",
  Plan:         "#4ab0f5",
  Creative:     "#f5c842",
  Report:       "var(--green)",
  Governance:   "#c084fc",
  General:      "var(--text-muted)",
};

const FORMAT_COLOR: Record<string, string> = {
  md:   "var(--accent)",
  txt:  "var(--text-secondary)",
  json: "var(--green)",
  py:   "#f5c842",
  ts:   "#4ab0f5",
  pdf:  "var(--red)",
};

const AGENT_INITIAL: Record<string, string> = {
  legend: "L", seraphim: "S", diamond: "D", elior: "E", nana: "N", unknown: "·",
};

// Very simple markdown renderer — headings, bold, lists, code blocks
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(
        <pre
          key={i}
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid var(--border)",
            padding: "10px 12px",
            borderRadius: "3px",
            fontSize: "9px",
            fontFamily: "monospace",
            color: "var(--accent)",
            overflowX: "auto",
            margin: "8px 0",
            whiteSpace: "pre",
          }}
        >
          {lang && (
            <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              {lang}
            </span>
          )}
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      out.push(
        <div key={i} style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", margin: "14px 0 6px" }}>
          {line.slice(2)}
        </div>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      out.push(
        <div key={i} style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px", borderBottom: "1px solid var(--border)", paddingBottom: "3px" }}>
          {line.slice(3)}
        </div>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      out.push(
        <div key={i} style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)", margin: "10px 0 3px" }}>
          {line.slice(4)}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      out.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />);
      i++;
      continue;
    }

    // List item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push(
        <div key={i} style={{ display: "flex", gap: "6px", margin: "2px 0" }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {inlineFormat(line.slice(2))}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      out.push(<div key={i} style={{ height: "6px" }} />);
      i++;
      continue;
    }

    // Normal paragraph line
    out.push(
      <div key={i} style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.7, margin: "1px 0" }}>
        {inlineFormat(line)}
      </div>
    );
    i++;
  }

  return out;
}

function inlineFormat(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} style={{ color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} style={{ fontFamily: "monospace", fontSize: "9px", color: "var(--accent)", background: "rgba(0,212,255,0.08)", padding: "0 3px", borderRadius: "2px" }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function DocsView() {
  const [docs, setDocs]                 = useState<Doc[]>([]);
  const [search, setSearch]             = useState("");
  const [category, setCategory]         = useState("All");
  const [selected, setSelected]         = useState<Doc | null>(null);
  const [loading, setLoading]           = useState(true);
  const [content, setContent]           = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    function loadDocs() {
      fetch("/api/docs", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setDocs((prev) => {
            const next = d.docs ?? [];
            // Preserve selection if still in the new list
            if (prev.length === 0 && next.length) setSelected(next[0]);
            return next;
          });
        })
        .finally(() => setLoading(false));
    }
    loadDocs();
    // Poll every 30s so Obsidian vault changes surface automatically
    const id = setInterval(loadDocs, 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch content when selection changes — works for both Obsidian and local files
  useEffect(() => {
    if (!selected?.path) {
      setContent(null);
      return;
    }

    setContentLoading(true);

    let url: string;
    if (selected.source === "obsidian") {
      // Obsidian Local REST API proxy
      const encodedPath = selected.path.split("/").map(encodeURIComponent).join("/");
      url = `/api/obsidian/${encodedPath}`;
    } else {
      // Local filesystem reader
      url = `/api/docs/content?path=${encodeURIComponent(selected.path)}`;
    }

    fetch(url)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => setContent(t))
      .catch(() => setContent(null))
      .finally(() => setContentLoading(false));
  }, [selected?.id]);

  const filtered = docs.filter((d) => {
    const matchCat = category === "All" || d.category === category;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.agent.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

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
        <div className="panel-header">
          <span>DOCUMENT LIBRARY</span>
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
            {filtered.length} / {docs.length}
          </span>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              padding: "5px 8px",
              fontSize: "10px",
              fontFamily: "inherit",
              borderRadius: "2px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: "0",
            overflowX: "auto",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                background: category === c ? "rgba(0,212,255,0.08)" : "transparent",
                border: "none",
                borderBottom: category === c ? "2px solid var(--accent)" : "2px solid transparent",
                color: category === c ? "var(--accent)" : "var(--text-muted)",
                padding: "5px 10px",
                fontSize: "8px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Doc list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "16px", fontSize: "9px", color: "var(--text-muted)" }}>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                {docs.length === 0 ? "NO DOCUMENTS YET" : "NO MATCHES"}
              </div>
              {docs.length === 0 && (
                <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                  Documents created by agents will appear here automatically.
                </div>
              )}
            </div>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: selected?.id === doc.id ? "rgba(0,212,255,0.06)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(30,45,69,0.4)",
                  borderLeft: selected?.id === doc.id ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: "9px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "8px",
                      color: FORMAT_COLOR[doc.format] ?? "var(--text-muted)",
                      border: `1px solid ${FORMAT_COLOR[doc.format] ?? "var(--border)"}40`,
                      padding: "0 4px",
                      borderRadius: "2px",
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
                    .{doc.format}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: selected?.id === doc.id ? "var(--accent)" : "var(--text-primary)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {doc.title}
                  </span>
                  {doc.source === "obsidian" && (
                    <span style={{ fontSize: "7px", color: "rgba(180,100,255,0.7)", flexShrink: 0 }}>OBS</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "2px" }}>
                  <span
                    style={{
                      fontSize: "8px",
                      color: CATEGORY_COLOR[doc.category] ?? "var(--text-muted)",
                    }}
                  >
                    {doc.category}
                  </span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>·</span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>{doc.createdAt || "vault"}</span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "auto" }}>
                    {AGENT_INITIAL[doc.agent] ?? doc.agent[0]?.toUpperCase()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selected ? (
          <>
            <div className="panel-header">
              <span
                style={{
                  color: CATEGORY_COLOR[selected.category] ?? "var(--text-secondary)",
                  marginRight: "8px",
                  fontSize: "8px",
                }}
              >
                {selected.category.toUpperCase()}
              </span>
              <span>{selected.title.toUpperCase()}</span>
              {selected.source === "obsidian" && (
                <span style={{ marginLeft: "8px", fontSize: "7px", color: "rgba(180,100,255,0.7)", letterSpacing: "0.12em" }}>
                  OBSIDIAN
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
                {selected.createdAt || selected.path?.split("/")[0]}
              </span>
            </div>

            <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
              {/* Meta row */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {[
                  ["FORMAT", `.${selected.format}`],
                  ["CREATED BY", selected.agent.toUpperCase()],
                  ...(selected.createdAt ? [["DATE", selected.createdAt]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                      {label}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-primary)" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Summary (local docs only) */}
              {selected.summary && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                    SUMMARY
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    {selected.summary}
                  </div>
                </div>
              )}

              {/* File content body — Obsidian vault or local filesystem */}
              {selected.path && (
                <div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "10px" }}>
                    CONTENT
                  </div>
                  {contentLoading ? (
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Loading…</div>
                  ) : content === null ? (
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      {selected.source === "obsidian"
                        ? "Could not load note — Obsidian may be offline."
                        : "Could not read file — path may be missing or moved."}
                    </div>
                  ) : (
                    <div>{renderMarkdown(content)}</div>
                  )}
                </div>
              )}

              {/* Path */}
              {selected.path && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "4px" }}>
                    PATH
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "var(--accent)",
                      fontFamily: "monospace",
                      background: "rgba(0,212,255,0.04)",
                      border: "1px solid rgba(0,212,255,0.15)",
                      padding: "6px 10px",
                      borderRadius: "3px",
                      wordBreak: "break-all",
                    }}
                  >
                    {selected.path}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "10px",
            }}
          >
            Select a document to view
          </div>
        )}
      </div>
    </div>
  );
}

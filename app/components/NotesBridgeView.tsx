"use client";

import { useEffect, useMemo, useState } from "react";

interface NoteSummary {
  name: string;
  title: string;
  preview: string;
  updatedAt: string;
  windowsPath: string;
  lucyPath: string;
}

interface NotesResponse {
  notesDir: string;
  lucyNotesDir: string;
  notes: NoteSummary[];
}

export default function NotesBridgeView() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesDir, setNotesDir] = useState("");
  const [lucyNotesDir, setLucyNotesDir] = useState("");
  const [notes, setNotes] = useState<NoteSummary[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/bridge-notes", { cache: "no-store" });
      const data = await r.json() as NotesResponse & { error?: string };
      if (!r.ok || data.error) {
        throw new Error(data.error ?? "Failed to load notes");
      }
      setNotesDir(data.notesDir);
      setLucyNotesDir(data.lucyNotesDir);
      setNotes(data.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () => notes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes]
  );

  async function saveNote() {
    const cleanText = text.trim();
    if (!cleanText || saving) return;

    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/bridge-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Quick Note",
          text: cleanText,
        }),
      });
      const data = await r.json() as { error?: string };
      if (!r.ok || data.error) {
        throw new Error(data.error ?? "Failed to save note");
      }
      setTitle("");
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header">NOTES BRIDGE · WRITE</div>
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Save here, read from Lucy at:
            <br />
            <code style={{ color: "var(--accent)" }}>{lucyNotesDir || "/mnt/c/Users/natza/Desktop/shared-notes"}</code>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              padding: "8px 10px",
              fontSize: "12px",
              fontFamily: "inherit",
              borderRadius: "3px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your note here..."
            rows={14}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              padding: "10px",
              fontSize: "13px",
              lineHeight: 1.6,
              fontFamily: "inherit",
              borderRadius: "3px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={saveNote}
            disabled={saving || !text.trim()}
            style={{
              alignSelf: "flex-start",
              background: saving || !text.trim() ? "rgba(74,176,245,0.1)" : "rgba(74,176,245,0.22)",
              border: "1px solid rgba(74,176,245,0.35)",
              color: saving || !text.trim() ? "var(--text-muted)" : "var(--accent)",
              borderRadius: "4px",
              padding: "8px 14px",
              fontSize: "11px",
              letterSpacing: "0.1em",
              fontFamily: "inherit",
              cursor: saving || !text.trim() ? "default" : "pointer",
            }}
          >
            {saving ? "SAVING..." : "SAVE NOTE"}
          </button>

          {error && <div style={{ fontSize: "11px", color: "var(--red, #f87171)" }}>{error}</div>}
        </div>
      </div>

      <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header">
          NOTES BRIDGE · RECENT
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontWeight: 400 }}>
            {sorted.length}
          </span>
        </div>

        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontSize: "10px", color: "var(--text-muted)" }}>
          Host folder: <code style={{ color: "var(--accent)" }}>{notesDir || "C:/Users/natza/Desktop/shared-notes"}</code>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "14px", fontSize: "11px", color: "var(--text-muted)" }}>Loading…</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: "14px", fontSize: "11px", color: "var(--text-muted)" }}>
              No bridge notes yet.
            </div>
          ) : (
            sorted.map((n) => (
              <div
                key={n.name}
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(30,45,69,0.5)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{n.preview || "…"}</div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                  {new Date(n.updatedAt).toLocaleString()}
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                  Lucy path: <code style={{ color: "var(--accent)" }}>{n.lucyPath}</code>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

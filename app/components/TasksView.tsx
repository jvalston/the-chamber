"use client";

import { useEffect, useState, useRef } from "react";

type Status = "backlog" | "in-progress" | "review" | "done";
type Assignee = "nana" | "legend" | "seraphim" | "diamond" | "elior" | "system";

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: Assignee;
  status: Status;
  project: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  text: string;
  agent: string;
  ts: string;
}

const COLUMNS: { key: Status; label: string }[] = [
  { key: "backlog",     label: "BACKLOG"     },
  { key: "in-progress", label: "IN PROGRESS" },
  { key: "review",      label: "REVIEW"      },
  { key: "done",        label: "DONE"        },
];

const ASSIGNEE_COLOR: Record<Assignee | string, string> = {
  nana:     "var(--accent)",
  legend:   "rgba(180,100,255,0.9)",
  seraphim: "#f5c842",
  diamond:  "#4ab0f5",
  elior:    "var(--green)",
  system:   "var(--text-muted)",
};

const ASSIGNEE_INITIAL: Record<Assignee | string, string> = {
  nana:     "N",
  legend:   "L",
  seraphim: "S",
  diamond:  "D",
  elior:    "E",
  system:   "·",
};

const STATUS_ORDER: Status[] = ["backlog", "in-progress", "review", "done"];

function Avatar({ assignee }: { assignee: string }) {
  const color = ASSIGNEE_COLOR[assignee] ?? "var(--text-muted)";
  const initial = ASSIGNEE_INITIAL[assignee] ?? assignee[0]?.toUpperCase() ?? "?";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        background: `${color}22`,
        border: `1px solid ${color}`,
        fontSize: "9px",
        fontWeight: 700,
        color,
        flexShrink: 0,
        letterSpacing: 0,
      }}
    >
      {initial}
    </span>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (id: string, dir: 1 | -1) => void;
  onDelete: (id: string) => void;
}) {
  const idx = STATUS_ORDER.indexOf(task.status);
  const canAdvance = idx < STATUS_ORDER.length - 1;
  const canRetreat = idx > 0;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.35)",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${ASSIGNEE_COLOR[task.assignee] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      {/* Title + avatar */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        <Avatar assignee={task.assignee} />
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-primary)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {task.title}
        </span>
      </div>

      {task.description && (
        <div
          style={{
            fontSize: "9px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            paddingLeft: "24px",
          }}
        >
          {task.description}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          justifyContent: "flex-end",
          paddingTop: "3px",
          borderTop: "1px solid rgba(30,45,69,0.4)",
        }}
      >
        {canRetreat && (
          <button
            onClick={() => onMove(task.id, -1)}
            style={btnStyle}
            title="Move back"
          >
            ←
          </button>
        )}
        {canAdvance && (
          <button
            onClick={() => onMove(task.id, 1)}
            style={{ ...btnStyle, color: "var(--accent)" }}
            title="Advance"
          >
            → NEXT
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          style={{ ...btnStyle, color: "var(--red)", marginLeft: "auto" }}
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  padding: "2px 6px",
  fontSize: "9px",
  cursor: "pointer",
  borderRadius: "2px",
  fontFamily: "inherit",
  letterSpacing: "0.06em",
};

// ── New Task Form ─────────────────────────────────────────────────────────────

function NewTaskForm({ onSave, onCancel }: { onSave: (t: Partial<Task>) => void; onCancel: () => void }) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [assignee, setAssignee] = useState<Assignee>("diamond");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.6)",
        border: "1px solid var(--accent)",
        borderRadius: "4px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ fontSize: "9px", color: "var(--accent)", letterSpacing: "0.12em" }}>
        NEW TASK
      </div>
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        style={inputStyle}
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>ASSIGN TO</span>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value as Assignee)}
          style={{ ...inputStyle, flex: 1 }}
        >
          <option value="nana">Nana (you)</option>
          <option value="legend">Legend</option>
          <option value="seraphim">Seraphim</option>
          <option value="diamond">Diamond</option>
          <option value="elior">Elior</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={() => title.trim() && onSave({ title, description: desc, assignee })}
          style={{
            ...btnStyle,
            color: "var(--accent)",
            borderColor: "var(--accent)",
            flex: 1,
            padding: "4px",
          }}
        >
          ADD TO BACKLOG
        </button>
        <button onClick={onCancel} style={{ ...btnStyle, padding: "4px 10px" }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  padding: "5px 8px",
  fontSize: "10px",
  fontFamily: "inherit",
  borderRadius: "2px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TasksView() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [activity, setActivity]   = useState<ActivityItem[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);

  async function load() {
    const r = await fetch("/api/tasks");
    const d = await r.json();
    setTasks(d.tasks ?? []);
    setActivity(d.activity ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveTask(id: string, dir: 1 | -1) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const idx = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[idx + dir];
    if (!next) return;
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next } : t));
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", id, status: next }),
    });
    load();
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "delete", id }),
    });
    load();
  }

  async function createTask(partial: Partial<Task>) {
    setShowForm(false);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    load();
  }

  const tasksByStatus = (status: Status) => tasks.filter((t) => t.status === status);
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasksByStatus(s).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Left: Activity Feed ── */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <div className="panel-header">LIVE ACTIVITY</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {loading ? (
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Loading…</div>
          ) : activity.length === 0 ? (
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>No activity yet.</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Avatar assignee={a.agent} />
                  <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    {a.agent.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", paddingLeft: "23px", lineHeight: 1.4 }}>
                  {a.text}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)", paddingLeft: "23px" }}>
                  {new Date(a.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Kanban ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
        {/* Header + New Task */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)" }}>
            TASK BOARD
          </div>
          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
            {tasks.length} total ·{" "}
            <span style={{ color: counts["done"] > 0 ? "var(--green)" : "var(--text-muted)" }}>
              {counts["done"]} done
            </span>
            {counts["review"] > 0 && (
              <>
                {" "}·{" "}
                <span style={{ color: "var(--yellow)" }}>
                  {counts["review"]} awaiting review
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              ...btnStyle,
              marginLeft: "auto",
              color: "var(--accent)",
              borderColor: "rgba(0,212,255,0.4)",
              padding: "3px 10px",
            }}
          >
            + NEW TASK
          </button>
        </div>

        {showForm && (
          <div style={{ flexShrink: 0 }}>
            <NewTaskForm onSave={createTask} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Columns */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {COLUMNS.map(({ key, label }) => (
            <div
              key={key}
              className="panel"
              style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <div className="panel-header">
                <span>{label}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "9px",
                    color: key === "done" ? "var(--green)" : key === "review" ? "var(--yellow)" : "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {counts[key]}
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                }}
              >
                {tasksByStatus(key).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onMove={moveTask}
                    onDelete={deleteTask}
                  />
                ))}
                {tasksByStatus(key).length === 0 && (
                  <div
                    style={{
                      fontSize: "8px",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      paddingTop: "20px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    EMPTY
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

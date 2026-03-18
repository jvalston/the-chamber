"use client";

import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "planning" | "paused" | "complete";
  progress: number;
  domain: string;
  createdAt: string;
  lastActivity: string;
}

const STATUS_COLOR: Record<string, string> = {
  active:   "var(--green)",
  planning: "var(--yellow)",
  paused:   "var(--text-muted)",
  complete: "var(--accent)",
};

const DOMAIN_COLOR: Record<string, string> = {
  Infrastructure: "var(--accent)",
  Creative:       "rgba(180,100,255,0.9)",
  Memory:         "#4ab0f5",
  Research:       "var(--green)",
  General:        "var(--text-muted)",
};

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "var(--green)"
    : value >= 40 ? "var(--accent)"
    : "var(--yellow)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px" }}>
        <span style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>PROGRESS</span>
        <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}%</span>
      </div>
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColor = STATUS_COLOR[project.status] ?? "var(--text-muted)";
  const domainColor = DOMAIN_COLOR[project.domain] ?? "var(--text-muted)";

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
        borderTop: `2px solid ${statusColor}`,
        borderRadius: "3px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "9px",
      }}
    >
      {/* Name + status */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.1em",
              marginBottom: "3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project.name.toUpperCase()}
          </div>
          <span
            style={{
              display: "inline-block",
              fontSize: "8px",
              color: domainColor,
              border: `1px solid ${domainColor}40`,
              padding: "1px 6px",
              borderRadius: "2px",
              letterSpacing: "0.08em",
            }}
          >
            {project.domain.toUpperCase()}
          </span>
        </div>
        <span
          style={{
            fontSize: "8px",
            color: statusColor,
            border: `1px solid ${statusColor}`,
            padding: "2px 6px",
            borderRadius: "2px",
            letterSpacing: "0.1em",
            flexShrink: 0,
          }}
        >
          {project.status.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {project.description}
      </div>

      {/* Progress */}
      <ProgressBar value={project.progress} />

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          fontSize: "8px",
          color: "var(--text-muted)",
          paddingTop: "4px",
          borderTop: "1px solid rgba(30,45,69,0.4)",
        }}
      >
        <div>
          <span style={{ marginRight: "4px" }}>STARTED</span>
          <span style={{ color: "var(--text-secondary)" }}>{project.createdAt}</span>
        </div>
        <div>
          <span style={{ marginRight: "4px" }}>LAST</span>
          <span
            style={{
              color:
                project.lastActivity === new Date().toISOString().slice(0, 10)
                  ? "var(--green)"
                  : "var(--text-secondary)",
            }}
          >
            {project.lastActivity}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mission, setMission]   = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setMission(d.mission ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const active   = projects.filter((p) => p.status === "active");
  const planning = projects.filter((p) => p.status === "planning");
  const other    = projects.filter((p) => p.status !== "active" && p.status !== "planning");

  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        gap: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* ── Mission Statement ── */}
      {mission && (
        <div
          style={{
            background: "rgba(0,212,255,0.04)",
            border: "1px solid rgba(0,212,255,0.15)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "3px",
            padding: "10px 14px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "8px",
              color: "var(--accent)",
              letterSpacing: "0.14em",
              fontWeight: 700,
              paddingTop: "1px",
              flexShrink: 0,
            }}
          >
            MISSION
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {mission}
          </span>
        </div>
      )}

      {/* ── Stats row ── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {[
          ["TOTAL",    String(projects.length),    "var(--text-secondary)"],
          ["ACTIVE",   String(active.length),      "var(--green)"],
          ["PLANNING", String(planning.length),    "var(--yellow)"],
          ["AVG PROG", `${avgProgress}%`,          "var(--accent)"],
        ].map(([label, val, color]) => (
          <div
            key={label}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "6px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              {label}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color, letterSpacing: "0.06em" }}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* ── Project Grid ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div style={{ fontSize: "9px", color: "var(--text-muted)", padding: "20px" }}>
            Loading projects…
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <Section label="ACTIVE PROJECTS" projects={active} />
            )}
            {planning.length > 0 && (
              <Section label="IN PLANNING" projects={planning} />
            )}
            {other.length > 0 && (
              <Section label="OTHER" projects={other} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, projects }: { label: string; projects: Project[] }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "8px",
          color: "var(--text-muted)",
          letterSpacing: "0.14em",
          marginBottom: "8px",
          paddingBottom: "4px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "8px",
        }}
      >
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

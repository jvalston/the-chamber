"use client";
import { useEffect, useState } from "react";

type View = "system" | "agents" | "memory" | "tasks" | "projects" | "docs";

interface Props {
  view: View;
  onViewChange: (v: View) => void;
}

const VIEWS: View[] = ["system", "agents", "memory", "tasks", "projects", "docs"];

export default function TopBar({ view, onViewChange }: Props) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "52px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(0,0,0,0.5)",
        flexShrink: 0,
      }}
    >
      {/* Left: identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--accent)",
            textShadow: "0 0 10px var(--accent)",
          }}
        >
          LEGEND
        </div>
        <div
          style={{ width: "1px", height: "20px", background: "var(--border)" }}
        />
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.15em",
            color: "var(--text-secondary)",
          }}
        >
          MISSION CONTROL
        </div>
      </div>

      {/* Center: view toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid var(--border)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              background:
                view === v ? "rgba(0,212,255,0.1)" : "transparent",
              border: "none",
              borderRight: v !== "docs" ? "1px solid var(--border)" : "none",
              color:
                view === v ? "var(--accent)" : "var(--text-muted)",
              padding: "6px 18px",
              fontSize: "12px",
              letterSpacing: "0.15em",
              cursor: "pointer",
              fontFamily: "inherit",
              textTransform: "uppercase",
              transition: "color 0.15s, background 0.15s",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Right: clock */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: "13px",
        }}
      >
        <div
          style={{ color: "var(--text-secondary)", letterSpacing: "0.1em" }}
        >
          {date}
        </div>
        <div
          style={{
            color: "var(--accent)",
            letterSpacing: "0.1em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {time}
        </div>
      </div>
    </header>
  );
}

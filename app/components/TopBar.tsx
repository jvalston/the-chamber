"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { View } from "../nav";

// All views in nav order — add new ones here
const VIEWS: View[] = [
  "system", "agents", "routing",
  "tasks", "projects", "calendar",
  "team", "office", "pipeline",
  "memory", "docs", "repos", "inbox", "comms", "discord",
  "content", "approvals", "council", "people",
  "radar", "factory", "feedback",
  "keys", "scripts", "translate",
];

interface Props {
  view: View;
  onViewChange: (v: View) => void;
}

export default function TopBar({ view, onViewChange }: Props) {
  const [time, setTime]         = useState("");
  const [date, setDate]         = useState("");
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month:   "short",
          day:     "2-digit",
          year:    "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  // Scroll active tab into view when view changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [view]);

  function scroll(dir: 1 | -1) {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  }

  const arrowStyle = (enabled: boolean): React.CSSProperties => ({
    flexShrink:  0,
    width:       "24px",
    height:      "100%",
    background:  enabled ? "rgba(0,0,0,0.6)" : "transparent",
    border:      "none",
    borderLeft:  "1px solid var(--border)",
    borderRight: "1px solid var(--border)",
    color:       enabled ? "var(--text-secondary)" : "transparent",
    fontSize:    "12px",
    cursor:      enabled ? "pointer" : "default",
    fontFamily:  "inherit",
    padding:     0,
    display:     "flex",
    alignItems:  "center",
    justifyContent: "center",
    transition:  "color 0.15s, background 0.15s",
  });

  return (
    <header
      style={{
        display:      "flex",
        alignItems:   "center",
        padding:      "0 20px",
        height:       "52px",
        borderBottom: "1px solid var(--border)",
        background:   "rgba(0,0,0,0.5)",
        flexShrink:   0,
        gap:          "16px",
      }}
    >
      {/* Left: identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        <div
          style={{
            fontSize:      "14px",
            fontWeight:    700,
            letterSpacing: "0.2em",
            color:         "var(--accent)",
            textShadow:    "0 0 10px var(--accent)",
          }}
        >
          LEGEND
        </div>
        <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
        <div
          style={{
            fontSize:      "13px",
            letterSpacing: "0.15em",
            color:         "var(--text-secondary)",
          }}
        >
          MISSION CONTROL
        </div>
      </div>

      {/* Center: scrollable tab strip */}
      <div
        style={{
          flex:       1,
          display:    "flex",
          alignItems: "stretch",
          minWidth:   0,
          height:     "34px",
          background: "rgba(0,0,0,0.4)",
          border:     "1px solid var(--border)",
          borderRadius: "3px",
          overflow:   "hidden",
        }}
      >
        {/* Left arrow */}
        <button style={arrowStyle(canLeft)} onClick={() => scroll(-1)} tabIndex={-1}>
          ‹
        </button>

        {/* Scrollable tab list */}
        <div
          ref={scrollRef}
          style={{
            flex:           1,
            display:        "flex",
            alignItems:     "stretch",
            overflowX:      "auto",
            overflowY:      "hidden",
            scrollbarWidth: "none",
            minWidth:       0,
          } as React.CSSProperties}
        >
          {VIEWS.map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                data-active={active}
                onClick={() => onViewChange(v)}
                style={{
                  background:    active ? "rgba(0,212,255,0.1)" : "transparent",
                  border:        "none",
                  borderRight:   "1px solid var(--border)",
                  borderBottom:  active ? "2px solid var(--accent)" : "2px solid transparent",
                  padding:       "0 12px",
                  fontWeight:    active ? 600 : undefined,
                  color:         active ? "var(--accent)" : "var(--text-muted)",
                  fontSize:      "12px",
                  letterSpacing: "0.1em",
                  cursor:        "pointer",
                  fontFamily:    "inherit",
                  textTransform: "uppercase",
                  transition:    "color 0.15s, background 0.15s",
                  whiteSpace:    "nowrap",
                  flexShrink:    0,
                }}
              >
                {v}
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button style={arrowStyle(canRight)} onClick={() => scroll(1)} tabIndex={-1}>
          ›
        </button>
      </div>

      {/* Right: clock */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "24px",
          fontSize:   "13px",
          flexShrink: 0,
        }}
      >
        <div style={{ color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
          {date}
        </div>
        <div
          style={{
            color:              "var(--accent)",
            letterSpacing:      "0.1em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {time}
        </div>
      </div>
    </header>
  );
}

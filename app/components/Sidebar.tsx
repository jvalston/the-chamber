"use client";

import { View, NAV_SECTIONS } from "../nav";

interface Props {
  view: View;
  onViewChange: (v: View) => void;
}

export default function Sidebar({ view, onViewChange }: Props) {
  return (
    <nav
      style={{
        width:          "172px",
        flexShrink:     0,
        display:        "flex",
        flexDirection:  "column",
        borderRight:    "1px solid var(--border)",
        background:     "rgba(0,0,0,0.25)",
        overflowY:      "auto",
        overflowX:      "hidden",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      } as React.CSSProperties}
    >
      {/* Identity mark */}
      <div style={{
        padding:       "14px 12px 10px",
        borderBottom:  "1px solid var(--border)",
        flexShrink:    0,
      }}>
        <div style={{
          fontSize:      "13px",
          fontWeight:    700,
          letterSpacing: "0.2em",
          color:         "var(--accent)",
          textShadow:    "0 0 8px var(--accent)",
        }}>
          LEGEND
        </div>
        <div style={{
          fontSize:      "9px",
          letterSpacing: "0.14em",
          color:         "var(--text-muted)",
          marginTop:     "2px",
        }}>
          MISSION CONTROL
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, paddingBottom: "12px" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section header */}
            <div style={{
              padding:       "10px 12px 3px",
              fontSize:      "8px",
              fontWeight:    700,
              letterSpacing: "0.18em",
              color:         "var(--text-muted)",
              textTransform: "uppercase",
              userSelect:    "none",
            }}>
              {section.label}
            </div>

            {/* Items */}
            {section.items.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "8px",
                    width:        "100%",
                    padding:      "5px 12px",
                    background:   active ? "rgba(0,212,255,0.08)" : "transparent",
                    border:       "none",
                    borderLeft:   `2px solid ${active ? "var(--accent)" : "transparent"}`,
                    color:        active ? "var(--accent)" : "var(--text-secondary)",
                    fontSize:     "12px",
                    letterSpacing: "0.04em",
                    cursor:       "pointer",
                    fontFamily:   "inherit",
                    textAlign:    "left",
                    boxSizing:    "border-box",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color      = "var(--text-primary)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color      = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span style={{
                    width:        "4px",
                    height:       "4px",
                    borderRadius: "50%",
                    flexShrink:   0,
                    background:   active ? "var(--accent)" : "var(--text-muted)",
                  }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

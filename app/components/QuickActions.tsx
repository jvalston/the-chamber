"use client";

const QUICK_ACTIONS = [
  "Restart Gateway",
  "Restart Agent",
  "Clear LCM Cache",
  "Scan Music Library",
  "Restart TTS",
  "View Live Logs",
];

export default function QuickActions() {
  return (
    <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <span>QUICK ACTIONS</span>
      </div>
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "6px 10px",
              fontSize: "10px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              textAlign: "left",
              borderRadius: "3px",
              fontFamily: "inherit",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "var(--accent-dim)";
              el.style.color = "var(--accent)";
              el.style.background = "var(--accent-glow)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "var(--border)";
              el.style.color = "var(--text-secondary)";
              el.style.background = "transparent";
            }}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

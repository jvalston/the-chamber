"use client";

// TODO: wire to Legend's creative output store — music, writing, visual assets

type ContentStatus = "draft" | "published" | "archived";
type ContentCategory = "Music" | "Writing" | "Visual" | "Script" | "Doc";

interface ContentItem {
  id:        string;
  title:     string;
  category:  ContentCategory;
  status:    ContentStatus;
  agent:     string;
  created:   string;
  excerpt?:  string;
}

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft:     "var(--yellow)",
  published: "var(--green)",
  archived:  "var(--text-muted)",
};

const CAT_COLOR: Record<ContentCategory, string> = {
  Music:   "#00d4ff",
  Writing: "#a855f7",
  Visual:  "#f97316",
  Script:  "#00ff9d",
  Doc:     "#7a9ab8",
};

const MOCK_CONTENT: ContentItem[] = [
  { id: "c1", title: "Morning Creative Brief",        category: "Writing", status: "published", agent: "Legend",   created: "today 06:12"    },
  { id: "c2", title: "Ambient Session — Drift I",     category: "Music",   status: "draft",     agent: "Legend",   created: "today 04:30"    },
  { id: "c3", title: "System Architecture Notes",     category: "Doc",     status: "published", agent: "Diamond",  created: "yesterday"       },
  { id: "c4", title: "Memory Governance Reference",   category: "Doc",     status: "published", agent: "Seraphim", created: "2 days ago"      },
  { id: "c5", title: "Constellation Visual Direction",category: "Visual",  status: "draft",     agent: "Legend",   created: "3 days ago"      },
  { id: "c6", title: "Weekly Summary — Creative",     category: "Writing", status: "published", agent: "Legend",   created: "last week"       },
  { id: "c7", title: "Ambient Session — Quiet Hours", category: "Music",   status: "archived",  agent: "Legend",   created: "last month"      },
];

export default function ContentView() {
  const categories: ContentCategory[] = ["Music", "Writing", "Visual", "Script", "Doc"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflowY: "auto" }}>
      {/* Header */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="status-dot idle" />
            CREATIVE OUTPUT
          </div>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
            {/* TODO: wire to Legend's live output store */}
            MOCK DATA
          </span>
        </div>
        {/* Category filter chips */}
        <div style={{ padding: "8px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {categories.map((cat) => (
            <span key={cat} style={{
              fontSize:     "10px",
              padding:      "2px 8px",
              borderRadius: "2px",
              border:       `1px solid ${CAT_COLOR[cat]}50`,
              color:        CAT_COLOR[cat],
              letterSpacing: "0.06em",
            }}>
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Content list */}
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-header">
          <span>ALL OUTPUTS</span>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px" }}>
            {MOCK_CONTENT.length} items
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {MOCK_CONTENT.map((item) => (
            <div key={item.id} style={{
              display:     "flex",
              alignItems:  "center",
              gap:         "12px",
              padding:     "10px 14px",
              borderBottom: "1px solid rgba(30,45,69,0.4)",
            }}>
              <div style={{
                width:        "6px",
                height:       "6px",
                borderRadius: "50%",
                background:   CAT_COLOR[item.category],
                flexShrink:   0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {item.agent} · {item.created}
                </div>
              </div>
              <span style={{
                fontSize:     "9px",
                color:        CAT_COLOR[item.category],
                border:       `1px solid ${CAT_COLOR[item.category]}40`,
                padding:      "1px 6px",
                borderRadius: "2px",
                flexShrink:   0,
              }}>
                {item.category}
              </span>
              <span style={{
                fontSize:     "9px",
                color:        STATUS_COLOR[item.status],
                letterSpacing: "0.08em",
                flexShrink:   0,
              }}>
                {item.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

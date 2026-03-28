"use client";

import { HostMachine } from "../../data/system";

const STATUS_COLOR: Record<HostMachine["status"], string> = {
  online:      "var(--green)",
  offline:     "var(--red)",
  unreachable: "var(--yellow)",
};

const STATUS_LABEL: Record<HostMachine["status"], string> = {
  online:      "ONLINE",
  offline:     "OFFLINE",
  unreachable: "UNREACHABLE",
};

const STATUS_DOT: Record<HostMachine["status"], string> = {
  online:      "online",
  offline:     "offline",
  unreachable: "warn",
};

interface Props {
  node: HostMachine;
}

export default function NodeCard({ node }: Props) {
  const color     = STATUS_COLOR[node.status];
  const dotClass  = STATUS_DOT[node.status];
  const avatarSrc = `/agents/${node.id}.png`;

  return (
    <div
      style={{
        background:   "rgba(0,0,0,0.3)",
        border:       "1px solid var(--border)",
        borderTop:    `2px solid ${color}`,
        borderRadius: "3px",
        padding:      "10px",
        display:      "flex",
        flexDirection:"column",
        gap:          "7px",
      }}
    >
      {/* Portrait */}
      <div
        style={{
          width:        "100%",
          height:       "180px",
          borderRadius: "2px",
          overflow:     "hidden",
          position:     "relative",
          background:   "rgba(0,0,0,0.4)",
          border:       "1px solid var(--border)",
        }}
      >
        <img
          src={avatarSrc}
          alt={node.name}
          style={{
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center top",
            display:        "block",
            opacity:        node.status === "offline" ? 0.4 : 1,
            filter:         node.status === "offline" ? "grayscale(1)" : "none",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Status badge overlay */}
        <div
          style={{
            position:     "absolute",
            bottom:       "6px",
            right:        "6px",
            background:   "rgba(0,0,0,0.65)",
            border:       `1px solid ${color}`,
            borderRadius: "2px",
            padding:      "1px 5px",
            fontSize:     "7px",
            color:        color,
            letterSpacing:"0.1em",
          }}
        >
          {STATUS_LABEL[node.status]}
        </div>
      </div>

      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <div className={`status-dot ${dotClass}`} />
        <span
          style={{
            fontSize:     "11px",
            fontWeight:   700,
            color:        "var(--text-primary)",
            letterSpacing:"0.14em",
            flex:         1,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {node.name.toUpperCase()}
        </span>
      </div>

      {/* Role */}
      <div
        style={{
          fontSize:     "10px",
          color:        "var(--text-secondary)",
          letterSpacing:"0.04em",
        }}
      >
        {node.role}
      </div>

      {/* Details */}
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "3px",
          borderTop:     "1px solid rgba(30,45,69,0.5)",
          paddingTop:    "6px",
        }}
      >
        {node.ip && (
          <div style={{ display: "flex", gap: "6px", fontSize: "10px" }}>
            <span style={{ color: "var(--text-muted)", width: "28px", flexShrink: 0 }}>IP</span>
            <span style={{ color: "var(--accent)", letterSpacing: "0.08em" }}>{node.ip}</span>
          </div>
        )}
        {node.os && (
          <div style={{ display: "flex", gap: "6px", fontSize: "10px" }}>
            <span style={{ color: "var(--text-muted)", width: "28px", flexShrink: 0 }}>OS</span>
            <span style={{ color: "var(--text-primary)" }}>{node.os}</span>
          </div>
        )}
      </div>
    </div>
  );
}

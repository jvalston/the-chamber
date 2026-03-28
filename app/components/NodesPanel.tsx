"use client";

import { HOST_MACHINES } from "../../data/system";
import NodeCard from "./NodeCard";

export default function NodesPanel() {
  return (
    <div
      style={{
        background:   "rgba(0,0,0,0.2)",
        border:       "1px solid var(--border)",
        borderRadius: "3px",
        padding:      "10px",
        display:      "flex",
        flexDirection:"column",
        gap:          "8px",
        minWidth:     0,
        overflow:     "hidden",
      }}
    >
      <div
        style={{
          fontSize:     "9px",
          color:        "var(--text-muted)",
          letterSpacing:"0.14em",
          paddingBottom:"4px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        NODES — {HOST_MACHINES.filter((n) => n.status === "online").length}/{HOST_MACHINES.length} ONLINE
      </div>

      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "8px",
        }}
      >
        {HOST_MACHINES.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

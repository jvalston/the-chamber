"use client";

import { useEffect, useState } from "react";
import { HOST_MACHINES, HostMachine } from "../../data/system";
import NodeCard from "./NodeCard";

export default function NodesPanel() {
  const [liveStatus, setLiveStatus] = useState<Record<string, HostMachine["status"]>>({});

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch("/api/nodes", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const map: Record<string, HostMachine["status"]> = {};
        for (const node of d.nodes) {
          map[node.id] = node.status as HostMachine["status"];
        }
        setLiveStatus(map);
      } catch { /* keep last */ }
    }
    poll();
    const id = setInterval(poll, 20_000);
    return () => clearInterval(id);
  }, []);

  const nodes = HOST_MACHINES.map((n) =>
    liveStatus[n.id] !== undefined ? { ...n, status: liveStatus[n.id] } : n
  );

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
        NODES — {nodes.filter((n) => n.status === "online").length}/{nodes.length} ONLINE
      </div>

      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "8px",
        }}
      >
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AgentEntry } from "../../config/agents.config";
import { Agent } from "../../lib/mock/agents";
import AgentCard from "./AgentCard";

function toAgent(e: AgentEntry): Agent {
  const isWaiting = e.state === "draft" || e.state === "archived";
  return {
    ...e,
    currentModel:   e.modelPrimary,
    fallbackModels: e.modelFallback,
    lastSeen:       e.state === "active"  ? "live"
                  : e.state === "standby" ? "standby"
                  : undefined,
    category: isWaiting ? "waiting" : "active",
  };
}

export default function ActiveAgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/agents", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          const all: Agent[] = (data.agents as AgentEntry[]).map(toAgent);
          setAgents(all.filter((a) => a.category === "active"));
        }
      } catch { /* keep last known */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const onlineCount  = agents.filter((a) => a.state === "active").length;
  const standbyCount = agents.filter((a) => a.state === "standby").length;

  return (
    <div
      className="panel"
      style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}
    >
      <div className="panel-header">
        <span>ACTIVE AGENTS</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ color: "var(--green)" }}>{onlineCount} online</span>
          {standbyCount > 0 && (
            <>
              {" "}·{" "}
              <span style={{ color: "var(--yellow)" }}>
                {standbyCount} standby
              </span>
            </>
          )}
        </span>
      </div>

      <div
        style={{
          padding:    "10px",
          display:    "flex",
          flexDirection: "row",
          gap:        "8px",
          overflowX:  "auto",
        }}
      >
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AgentEntry } from "../../config/agents.config";
import { Agent } from "../../lib/mock/agents";
import WaitingAgentCard from "./WaitingAgentCard";

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

export default function WaitingAgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/agents", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          const all: Agent[] = (data.agents as AgentEntry[]).map(toAgent);
          setAgents(all.filter((a) => a.category === "waiting"));
        }
      } catch { /* keep last known */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const draftCount   = agents.filter((a) => a.state === "draft").length;
  const standbyCount = agents.filter((a) => a.state === "standby").length;

  return (
    <div
      className="panel"
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div className="panel-header">
        <span>AGENTS IN WAITING</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
          }}
        >
          {draftCount > 0 && (
            <span style={{ color: "var(--text-muted)" }}>{draftCount} draft</span>
          )}
          {draftCount > 0 && standbyCount > 0 && " · "}
          {standbyCount > 0 && (
            <span style={{ color: "var(--yellow)" }}>{standbyCount} standby</span>
          )}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {agents.length === 0 ? (
          <div style={{ fontSize: "10px", color: "var(--text-muted)", padding: "4px 0" }}>
            No agents in waiting
          </div>
        ) : (
          agents.map((agent) => (
            <WaitingAgentCard key={agent.id} agent={agent} />
          ))
        )}
      </div>
    </div>
  );
}

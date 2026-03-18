"use client";

// TODO: replace WAITING_AGENTS import with live agent registry fetch
import { WAITING_AGENTS } from "../../lib/mock/agents";
import WaitingAgentCard from "./WaitingAgentCard";

export default function WaitingAgentsPanel() {
  const draftCount   = WAITING_AGENTS.filter((a) => a.state === "draft").length;
  const standbyCount = WAITING_AGENTS.filter((a) => a.state === "standby").length;

  return (
    <div
      className="panel"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
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
        {/* TODO: replace mock data with live agent registry */}
        {WAITING_AGENTS.map((agent) => (
          <WaitingAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

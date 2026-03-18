"use client";

// TODO: replace ACTIVE_AGENTS import with live agent registry fetch
import { ACTIVE_AGENTS } from "../../lib/mock/agents";
import AgentCard from "./AgentCard";

export default function ActiveAgentsPanel() {
  const onlineCount  = ACTIVE_AGENTS.filter((a) => a.state === "active").length;
  const standbyCount = ACTIVE_AGENTS.filter((a) => a.state === "standby").length;

  return (
    <div
      className="panel"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
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
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "8px",
          alignContent: "start",
        }}
      >
        {/* TODO: replace mock data with live agent registry */}
        {ACTIVE_AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

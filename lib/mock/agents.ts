// Agent Registry Adapter
// Transforms config/agents.config.ts into dashboard-ready data structures.
// The dashboard imports from HERE. To add or change agents, edit:
//   → /config/agents.config.ts
//
// TODO: replace AGENTS import with live agent registry API fetch

import { AGENTS, AgentEntry, AgentState } from "../../config/agents.config";

export type { AgentState };
export type AgentCategory = "active" | "waiting";

// Dashboard-internal type — extends AgentEntry with runtime fields
export interface Agent extends AgentEntry {
  // Aliases for template convenience
  currentModel:   string;         // = modelPrimary
  fallbackModels: string[];       // = modelFallback
  lastSeen?:      string;
  category:       AgentCategory;
}

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

const ALL_AGENTS: Agent[] = AGENTS.map(toAgent);

// TODO: replace with live agent registry API
export const ACTIVE_AGENTS  = ALL_AGENTS.filter((a) => a.category === "active");
export const WAITING_AGENTS = ALL_AGENTS.filter((a) => a.category === "waiting");

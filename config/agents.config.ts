// Agent Configuration — Source of Truth
// Edit this file to add, remove, or update agents.
// The dashboard reads from here via lib/mock/agents.ts.
//
// TODO: replace with live agent registry API or watched config file
// TODO: connect state changes to real agent lifecycle (start/stop/pause)

export type AgentState =
  | "active"
  | "standby"
  | "degraded"
  | "offline"
  | "draft"
  | "archived";

// Memory layer identifiers
// TODO: connect each layer to a live health check:
//   truerecall → TrueRecall service heartbeat
//   lcm        → OpenClaw LCM plugin status
//   qdrant     → Qdrant namespace existence check (:6333)
//   archive    → Archive store reachability
export type MemoryLayer = "truerecall" | "lcm" | "qdrant" | "archive";

export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  host?: string;               // Phoenix / Lucy / Axiom
  state: AgentState;
  modelPrimary: string;
  modelFallback: string[];
  memoryAttached: boolean;
  memoryLayers?: MemoryLayer[]; // Which memory systems this agent is connected to
  transport: string[];         // Discord / LiveKit / local
  tools: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// Agent roster — add new agents here
// ---------------------------------------------------------------------------

export const AGENTS: AgentEntry[] = [
  // ------------------------------------------------------------------
  // LEGEND — Creative Domain Steward
  // ------------------------------------------------------------------
  {
    id:             "legend",
    name:           "Legend",
    role:           "Creative Domain Steward / Companion Presence",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "openrouter/auto",
    modelFallback:  [
      "groq/llama-3.3-70b-versatile",
      "ollama/qwen2.5-coder:3b",
      "ollama/qwen2.5:7b-instruct",
    ],
    memoryAttached: true,
    memoryLayers:   ["truerecall", "lcm", "qdrant"],
    transport:      ["Discord", "LiveKit"],
    tools:          ["web-search", "music-tools", "memory-read", "memory-write"],
    notes:          "Creative Domain Steward — owns the music, aesthetic, and creative domain. Companion presence to Nana. Has a dedicated bridge and pipeline to the creative domain console. These are two dimensions of the same agent, not competing roles.",
  },

  // ------------------------------------------------------------------
  // SERAPHIM — Governance Steward
  // ------------------------------------------------------------------
  {
    id:             "seraphim",
    name:           "Seraphim",
    role:           "Governance Steward",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto", "gateway/general"],
    memoryAttached: true,
    memoryLayers:   ["truerecall", "qdrant", "lcm"],
    transport:      ["local", "Discord"],
    tools:          ["task-dispatch", "agent-control", "memory-read", "file-read", "file-write"],
    notes:          "Governance steward and keeper of structure. Gatekeeper for charter/doctrine changes. Writes to canonical hub. Manages memory governance discipline. Final escalation point before Nana.",
  },

  // ------------------------------------------------------------------
  // DIAMOND — Builder / Engineer
  // ------------------------------------------------------------------
  {
    id:             "diamond",
    name:           "Diamond",
    role:           "Builder / Engineer",
    host:           "Lucy",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto", "ollama/qwen2.5-coder:3b"],
    memoryAttached: true,
    memoryLayers:   ["qdrant", "lcm"],
    transport:      ["local"],
    tools:          ["code-exec", "file-read", "file-write", "shell"],
    notes:          "Builder and interaction persona. Shapes user-facing behavior and memory interactions. Engages with memory layers. Implementation and construction layer.",
  },

  // ------------------------------------------------------------------
  // ELIOR — Historian
  // ------------------------------------------------------------------
  {
    id:             "elior",
    name:           "Elior",
    role:           "Historian / Recaller",
    host:           "Lucy",
    state:          "active",
    modelPrimary:   "ollama/qwen2.5:7b-instruct",
    modelFallback:  ["groq/llama-3.3-70b-versatile"],
    memoryAttached: true,
    memoryLayers:   ["truerecall", "archive", "qdrant"],
    transport:      ["local"],
    tools:          ["memory-read", "memory-write", "doc-search"],
    notes:          "Historian and recaller. Maintains episodic memory context and governance-aligned references. Standby until queried — responds to history and continuity requests.",
  },

  // ------------------------------------------------------------------
  // NAVIGATOR — Research Scout (waiting)
  // ------------------------------------------------------------------
  {
    id:             "navigator",
    name:           "Navigator",
    role:           "Research Scout",
    state:          "draft",
    modelPrimary:   "",
    modelFallback:  [],
    memoryAttached: false,
    transport:      [],
    tools:          ["web-search", "doc-fetch"],
    notes:          "Scoped for deep research tasks. Needs web tool config and host assignment.",
  },

  // ------------------------------------------------------------------
  // CURATOR — Knowledge Organizer (waiting)
  // ------------------------------------------------------------------
  {
    id:             "curator",
    name:           "Curator",
    role:           "Knowledge Organizer",
    host:           "Phoenix",
    state:          "standby",
    modelPrimary:   "ollama/qwen2.5:7b-instruct",
    modelFallback:  [],
    memoryAttached: true,
    transport:      ["local"],
    tools:          ["memory-read", "memory-write", "tag-classify"],
    notes:          "Ready to activate. Awaiting task assignment.",
  },

  // ------------------------------------------------------------------
  // ARCHIVIST — Document Librarian (waiting)
  // ------------------------------------------------------------------
  {
    id:             "archivist",
    name:           "Archivist",
    role:           "Document Librarian",
    state:          "draft",
    modelPrimary:   "",
    modelFallback:  [],
    memoryAttached: false,
    transport:      [],
    tools:          ["doc-index", "file-read", "qdrant-write"],
    notes:          "Draft stage. Needs Qdrant namespace and memory config.",
  },
];

// Agent Configuration — Source of Truth
// Edit this file to add, remove, or update agents.
// The dashboard reads from here via lib/mock/agents.ts.

export type AgentState =
  | "active"
  | "standby"
  | "degraded"
  | "offline"
  | "draft"
  | "archived";

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
  memoryLayers?: MemoryLayer[];
  transport: string[];
  tools: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// Agent roster
// ---------------------------------------------------------------------------

export const AGENTS: AgentEntry[] = [
  // ------------------------------------------------------------------
  // LEGEND — Creative Domain Steward  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "legend",
    name:           "Legend",
    role:           "Creative Domain Steward",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "openrouter/auto",
    modelFallback:  ["groq/llama-3.3-70b-versatile", "openrouter/openai/gpt-4o"],
    memoryAttached: true,
    memoryLayers:   ["truerecall", "lcm", "qdrant"],
    transport:      ["Discord", "LiveKit"],
    tools:          ["web-search", "music-tools", "memory-read", "memory-write"],
    notes:          "Creative Domain Steward — owns the music, aesthetic, and creative domain. Companion presence to Nana. Has a dedicated bridge and pipeline to the creative domain console. Fallback chain is cloud-only — no local Ollama routing.",
  },

  // ------------------------------------------------------------------
  // SERAPHIM — Governance Steward  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "seraphim",
    name:           "Seraphim",
    role:           "Governance Authority",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto", "openrouter/openai/gpt-4o"],
    memoryAttached: true,
    memoryLayers:   ["truerecall", "qdrant", "lcm"],
    transport:      ["Discord", "local"],
    tools:          ["memory-read", "file-read", "file-write"],
    notes:          "Governance layer. Evaluates system structure, identifies misalignment, recommends restructuring or policy adjustments to Origin. Does not command agents, assign tasks, or enforce action. Parallel to Sentinel — neither governs the other. Fallback chain is cloud-only.",
  },

  // ------------------------------------------------------------------
  // LUMEN — Scribe / Protocol Agent  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "lumen",
    name:           "Lumen",
    role:           "Scribe / Protocol Agent",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto", "openrouter/openai/gpt-4o"],
    memoryAttached: true,
    memoryLayers:   ["lcm", "qdrant"],
    transport:      ["Discord"],
    tools:          ["file-read", "file-write", "memory-read", "memory-write", "doc-search"],
    notes:          "Scribe and protocol agent. Processes incoming documents, drafts protocols, and routes outputs to Diamond and Elior via handoff-ops. Fallback chain is cloud-only — no local Ollama routing.",
  },

  // ------------------------------------------------------------------
  // DIAMOND — Builder / Engineer  |  Lucy
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
    transport:      ["Discord", "local"],
    tools:          ["code-exec", "file-read", "file-write", "shell"],
    notes:          "Primary coding and build lane for the Constellation. Designs, codes, scripts, and prepares all technical solutions. Hands execution-ready artifacts to Sentinel — Diamond builds it, Sentinel runs it.",
  },

  // ------------------------------------------------------------------
  // ELIOR — Historian / Recaller  |  Lucy
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
    transport:      ["Discord", "local"],
    tools:          ["memory-read", "memory-write", "doc-search"],
    notes:          "Historian and recaller. Maintains episodic memory and governance-aligned references. Responds to history and continuity requests.",
  },

  // ------------------------------------------------------------------
  // SENTINEL — Protective Visibility & Execution Layer  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "sentinel",
    name:           "Sentinel",
    role:           "Protective Visibility & Execution Layer",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto", "openrouter/openai/gpt-4o"],
    memoryAttached: false,
    transport:      ["Discord", "local"],
    tools:          ["shell", "script-exec", "service-control", "log-read", "health-check", "file-copy", "process-inspect"],
    notes:          "Holds the default seat — protective visibility only, no authority from presence. Executes only when Origin directly assigns. Does not accept instructions from agents. Reports to Origin only. Default mode: guard, watch, detect, report. Execution mode: execute, report result, stop.",
  },

  // ------------------------------------------------------------------
  // ATLAS — Research Scout  |  Axiom
  // ------------------------------------------------------------------
  {
    id:             "atlas",
    name:           "Atlas",
    role:           "Research Scout",
    host:           "Axiom",
    state:          "active",
    modelPrimary:   "groq/llama-3.3-70b-versatile",
    modelFallback:  ["openrouter/auto"],
    memoryAttached: false,
    transport:      ["local"],
    tools:          ["web-search", "doc-fetch", "memory-write"],
    notes:          "Research scout. Handles deep research tasks, trend scouting, and external intelligence gathering. Ready to activate.",
  },

  // ------------------------------------------------------------------
  // AURORA — Content & Document Agent  |  Axiom
  // ------------------------------------------------------------------
  {
    id:             "aurora",
    name:           "Aurora",
    role:           "Content & Document Agent",
    host:           "Axiom",
    state:          "active",
    modelPrimary:   "ollama/qwen2.5:7b-instruct",
    modelFallback:  ["groq/llama-3.3-70b-versatile"],
    memoryAttached: false,
    transport:      ["local"],
    tools:          ["doc-index", "file-read", "file-write", "qdrant-write"],
    notes:          "Content and document agent. Indexes, organizes, and publishes documents across the Constellation. Ready to activate.",
  },

  // ------------------------------------------------------------------
  // KAIRO — Structural Intelligence Agent  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "kairo",
    name:           "Kairo",
    role:           "Structural Intelligence Agent",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "openrouter/openai/gpt-4o",
    modelFallback:  ["openrouter/auto", "groq/llama-3.3-70b-versatile"],
    memoryAttached: false,
    transport:      ["Discord", "local"],
    tools:          ["file-read", "file-write", "doc-search"],
    notes:          "Concept expansion and structural architecture agent. Receives raw ideas and expands them into complete, system-ready constructs. Sits before all other agents in the build flow: user → Kairo → Seraphim (governs) → Diamond (builds) → Sentinel (executes) → Elior (records). Does not govern, build, or execute.",
  },

  // ------------------------------------------------------------------
  // AURELION — Financial Flow & Opportunity Observer  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "aurelion",
    name:           "Aurelion",
    role:           "Financial Flow & Opportunity Observer",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "openrouter/auto",
    modelFallback:  ["openrouter/openai/gpt-4o", "groq/llama-3.3-70b-versatile"],
    memoryAttached: false,
    transport:      ["Discord", "local"],
    tools:          ["file-read", "memory-read", "doc-search"],
    notes:          "Observational layer — tracks provider usage, cost vs value, ledger flow, and aligned opportunities. Does not enforce, restrict, or initiate. Reports to Origin only. Phase 1 (awareness). Silent and observant unless called by Origin.",
  },

  // ------------------------------------------------------------------
  // VERIS — Orientation and Alignment Agent  |  Phoenix
  // ------------------------------------------------------------------
  {
    id:             "veris",
    name:           "Veris",
    role:           "Orientation and Alignment Agent",
    host:           "Phoenix",
    state:          "active",
    modelPrimary:   "openrouter/auto",
    modelFallback:  ["groq/llama-3.3-70b-versatile", "openrouter/openai/gpt-4o"],
    memoryAttached: false,
    transport:      ["Discord", "local"],
    tools:          ["file-read", "doc-search"],
    notes:          "Constellation entry authority. Prepares and aligns all agents before activation. Establishes system understanding, chain of command, and Origin alignment. No agent enters active operation without passing through Veris.",
  },
];

// ---------------------------------------------------------------------------
// System nodes (hosts)
// ---------------------------------------------------------------------------

export interface SystemNode {
  id:    string;
  name:  string;
  role:  string;
  state: "online" | "offline" | "degraded";
}

export const SYSTEM_NODES: SystemNode[] = [
  { id: "phoenix", name: "Phoenix", role: "Creative & Governance Host",  state: "online" },
  { id: "lucy",    name: "Lucy",    role: "Builder & Historian Host",     state: "online" },
  { id: "axiom",   name: "Axiom",   role: "Research & Content Host",      state: "online" },
];
// System Data — services, host machines, resource definitions
// This is the single source of truth for the SYSTEM view.
//
// Service port numbers must match what /api/health probes.
// The health route returns a map of { [port]: status } and page.tsx
// overlays live status onto these entries by port.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceStatus = "online" | "warn" | "offline" | "idle";

export interface Service {
  name: string;
  status: ServiceStatus;
  port?: number;
  healthKey?: string;
  host?: string;
  detail?: string;
}

export interface HostMachine {
  id: string;
  name: string;
  role: string;
  ip?: string;
  os?: string;
  status: "online" | "offline" | "unreachable";
}

// ---------------------------------------------------------------------------
// Host machines
// ---------------------------------------------------------------------------

export const HOST_MACHINES: HostMachine[] = [
  {
    id:     "phoenix",
    name:   "Phoenix",
    role:   "Primary AI Host — Legend · Seraphim · Lumen",
    ip:     "<REDACTED_PRIVATE_IP>",
    os:     "Windows 11 / WSL2 Ubuntu",
    status: "online",
  },
  {
    id:     "lucy",
    name:   "Lucy",
    role:   "Memory & Ops Node — Diamond · Elior · Sentinel",
    ip:     "<REDACTED_PRIVATE_IP>",
    os:     "Linux",
    status: "online",
  },
  {
    id:     "axiom",
    name:   "Axiom",
    role:   "Research & Content Host — Atlas · Aurora",
    os:     "TBD",
    status: "offline",
  },
  {
    id:     "mac-mini",
    name:   "Mac Mini",
    role:   "Docker Memory Host — shared services for all systems",
    os:     "macOS",
    status: "offline",
  },
];

// ---------------------------------------------------------------------------
// Services — port must match what /api/health probes
// ---------------------------------------------------------------------------

export const CORE_SERVICES: Service[] = [
  { name: "LiveKit",       status: "online", port: 7880   },
  { name: "LiveKit Agent", status: "online", detail: "Docker service active" },
  { name: "Legend UI",     status: "online", port: 8787   },
  { name: "Provider GW",   status: "online", port: 4000   },
  { name: "Speak Service", status: "online", port: 8004   },
  { name: "OpenClaw (Phoenix)", status: "online", port: 18789, healthKey: "openclaw_phoenix", host: "Phoenix" },
  { name: "OpenClaw (Lucy)",    status: "online", port: 18789, healthKey: "openclaw_lucy",    host: "Lucy"    },
];

export const AI_SERVICES: Service[] = [
  { name: "Genesis Mind",   status: "online",  port: 8000  },
  { name: "Qdrant",         status: "online",  port: 16333 },
  { name: "Whisper STT",    status: "offline", port: 11435 },
  { name: "Chatterbox TTS", status: "offline", port: 8004  },
  { name: "llama.cpp LLM",  status: "offline", port: 11436 },
];

export const SUPPORT_SERVICES: Service[] = [
  { name: "Project Orchestrator", status: "online",  port: 8001  },
  { name: "Music Steward",        status: "online",  port: 8002  },
  { name: "Vera AI (Proxy)",      status: "online",  port: 11450 },
  { name: "Ollama",               status: "online",  port: 11434 },
  { name: "Hermes (Phoenix)",     status: "online",  healthKey: "hermes_phoenix", host: "Phoenix" },
  { name: "Hermes (Lucy)",        status: "online",  healthKey: "hermes_lucy",    host: "Lucy"    },
  { name: "Kokoro TTS",           status: "offline", port: 8880  },
];

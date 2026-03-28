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
    ip:     "100.88.244.100",
    os:     "Windows 11 / WSL2 Ubuntu",
    status: "online",
  },
  {
    id:     "lucy",
    name:   "Lucy",
    role:   "Secondary AI Host — Diamond · Elior",
    ip:     "100.119.215.107",
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
];

// ---------------------------------------------------------------------------
// Services — port must match what /api/health probes
// ---------------------------------------------------------------------------

export const CORE_SERVICES: Service[] = [
  { name: "LiveKit",       status: "online", port: 7880   },
  { name: "LiveKit Agent", status: "offline"               },
  { name: "Legend UI",     status: "online", port: 8787   },
  { name: "Provider GW",   status: "online", port: 4000   },
  { name: "Speak Service", status: "online", port: 8500   },
  { name: "OpenClaw",      status: "online", port: 18789, host: "WSL2" },
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
  { name: "Kokoro TTS",           status: "offline", port: 8880  },
  { name: "OpenClaw (Windows — dissolved)", status: "offline", port: 18790 },
];

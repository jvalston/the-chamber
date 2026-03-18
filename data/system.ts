// System Data — services, host machines, resource definitions
// This is the single source of truth for the SYSTEM view.
//
// TODO: wire service status to Docker API health endpoints
// TODO: wire host metrics to system metrics endpoints (CPU/RAM/GPU per host)

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

// TODO: replace with live host registry (e.g., /api/hosts)
export const HOST_MACHINES: HostMachine[] = [
  {
    id: "phoenix",
    name: "Phoenix",
    role: "Primary AI Host",
    os: "Linux",
    status: "online",
  },
  {
    id: "lucy",
    name: "Lucy",
    role: "Secondary AI Host",
    os: "Linux",
    status: "online",
  },
  {
    id: "axiom",
    name: "Axiom",
    role: "Reserved",
    os: "TBD",
    status: "offline",
  },
];

// ---------------------------------------------------------------------------
// Services — edit these arrays to add, remove, or change service entries
// ---------------------------------------------------------------------------

// TODO: replace with Docker API health checks
export const CORE_SERVICES: Service[] = [
  { name: "LiveKit",       status: "online", port: 7880  },
  { name: "LiveKit Agent", status: "online"              },
  { name: "Gateway",       status: "online", port: 18790 },
  { name: "Provider GW",   status: "online", port: 4000  },
  { name: "OpenClaw",      status: "online", port: 18790 },
];

// TODO: replace with Docker API health checks
export const AI_SERVICES: Service[] = [
  { name: "Genesis Mind",   status: "online", port: 8000 },
  { name: "Qdrant",         status: "online", port: 6333 },
  { name: "Whisper STT",    status: "online"             },
  { name: "Chatterbox TTS", status: "online"             },
  { name: "llama.cpp LLM",  status: "online"             },
];

// TODO: replace with Docker API health checks
export const SUPPORT_SERVICES: Service[] = [
  { name: "Project Orchestrator", status: "online", port: 8001 },
  { name: "Music Steward",        status: "idle",   port: 8002 },
  { name: "Kokoro TTS",           status: "idle"             },
  { name: "Ollama",               status: "online", port: 11434 },
  { name: "OpenClaw",             status: "online", port: 18790 },
];

# Mission Control

Mission Control is a Next.js control plane for Constellation operations: stars/agent management, communications, approvals, memory, keys, docs, scripts, and translation.

## For Developers

- UI: `app/components/*` (tab views and system panels)
- APIs: `app/api/*` (state + integrations)
- Runtime data: `data/*`
- Agent profiles: `agents/*`
- Operations docs: `docs/*`
- Utility scripts: `scripts/*`

## Feature Diagram

```mermaid
flowchart TD
  UI["Mission Control UI (Tabs + Panels)"] --> APIS["Next.js API Routes"]

  APIS --> CORE["Core State APIs
  - /api/agents
  - /api/tasks
  - /api/projects
  - /api/repos
  - /api/approvals
  - /api/metrics
  - /api/health"]

  APIS --> OPS["Operations APIs
  - /api/scripts
  - /api/scripts/run
  - /api/gateway/status
  - /api/gateway/logs
  - /api/gateway/cloud/*"]

  APIS --> COMMS["Communications APIs
  - /api/comms/send
  - /api/comms/broadcast
  - /api/comms/log
  - /api/discord
  - /api/translate"]

  APIS --> KNOW["Knowledge + Memory APIs
  - /api/docs
  - /api/docs/content
  - /api/memory
  - /api/memory-layers
  - /api/obsidian/[...path]"]

  APIS --> KEYS["Secrets + Identity APIs
  - /api/keys
  - /api/keys/scan
  - /api/keys/[id]/write
  - /api/identities"]

  CORE --> DATA["Local JSON Data (data/*)"]
  KEYS --> DATA
  COMMS --> DATA

  OPS --> RUNTIME["WSL/Docker + OpenClaw Runtime"]
  COMMS --> RUNTIME

  UI --> AGENTS["Star/Agent Profiles (agents/*)"]
```

Full diagram doc: [`docs/FEATURES_DIAGRAM.md`](docs/FEATURES_DIAGRAM.md)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3030`.

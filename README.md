# Mission Control

Mission Control is a control plane for multi-agent operations.
It is for operators and technical teams coordinating stars/agents across comms, memory, keys, approvals, and runtime controls.
It replaces fragmented tool-switching with one place to see status, route work, and recover fast.

## Quick Start (2 Minutes)

```bash
npm install
npm run dev
```

Open `http://localhost:3030`.

## Demo

Add one screenshot or short GIF so visitors can feel the product quickly.

- Path: `docs/assets/mission-control-demo.gif`
- Size: ~1400x900 (16:9)
- Length: 8 to 20 seconds

Embed:

```md
![Mission Control Demo](docs/assets/mission-control-demo.gif)
```

Social preview spec: [`docs/assets/social-preview-spec.md`](docs/assets/social-preview-spec.md)

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

Full diagram docs:
- [`docs/FEATURES_DIAGRAM.md`](docs/FEATURES_DIAGRAM.md)
- [`docs/STAR_PROVIDER_FLOW.md`](docs/STAR_PROVIDER_FLOW.md)

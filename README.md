# Mission Control

Mission Control is an operations cockpit for running a multi-agent constellation from one place.
It is built for operators, founders, and technical teams coordinating stars/agents across comms, memory, keys, approvals, and runtime controls.
It solves the fragmentation problem: instead of jumping between tools and terminals, you get one control plane for visibility, routing, and recovery.

## Quick Start (2 Minutes)

```bash
npm install
npm run dev
```

Open `http://localhost:3030`.

## Demo

Add a screenshot or GIF here so visitors instantly see the product:

- Suggested path: `docs/assets/mission-control-demo.gif`
- Suggested size: 1400x900 (or similar 16:9)
- Keep duration short: 8 to 20 seconds

Example embed line to use after you add the file:

```md
![Mission Control Demo](docs/assets/mission-control-demo.gif)
```

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

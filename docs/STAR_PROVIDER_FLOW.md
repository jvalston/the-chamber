# Star-to-Provider Flow

Use this to debug delivery, timeout, and provider-fallback issues.

```mermaid
flowchart LR
  Origin["Origin message in Mission Control"] --> UI["Comms UI (single send or broadcast)"]
  UI --> API["/api/comms/send or /api/comms/broadcast"]

  API --> NodePick{"Target node?"}
  NodePick -->|Phoenix star| Phoenix["WSL local command
  openclaw agent --agent <id> --message <msg> --json"]
  NodePick -->|Lucy star| Lucy["SSH to Lucy + openclaw agent
  (LUCY_SSH_USER/LUCY_SSH_HOST)"]

  Phoenix --> Gateway["OpenClaw Gateway"]
  Lucy --> Gateway

  Gateway --> Route{"Provider route"}
  Route --> Fast["Primary fast model
  (chat/default profile)"]
  Route --> Build["Build/coding profile
  (codex-style model)"]
  Route --> Local["Local fallback
  (Ollama/local runtime)"]
  Route --> Cloud["Cloud fallback
  (OpenRouter/OpenAI/Groq/etc)"]

  Fast --> Response["Response returned to API"]
  Build --> Response
  Local --> Response
  Cloud --> Response

  Response --> Log["comms-log entry written"]
  Log --> UIOut["Result appears in Mission Control"]
```

## Quick Troubleshooting Order

1. Check node reachability (Phoenix local vs Lucy SSH).
2. Check gateway health (`/api/gateway/status` and `/api/gateway/logs`).
3. Check star model profile (fast vs build profile).
4. Check provider credentials in Key Keeper / env.
5. Re-run via single send before broadcast.

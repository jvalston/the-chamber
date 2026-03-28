# Session Summary — 2026-03-19
## Phoenix / Constellation Recovery — Full Debrief
**Conducted by:** Nana (Victoria Alston) with Claude Code (Sonnet 4.6)
**Duration:** Multi-session, resumed across context boundary
**Outcome:** All four recovery phases complete. System stable. Deferred activations documented.

---

## What We Started With (The Problem)

### The Lockout Event
Three days prior, OpenAI Codex suspended access ("no more time"). To keep working, a second OpenClaw runtime was created on Windows (port 18790). This became the operational branch — Seraphim continued working from it, building pipelines and documentation while the original Linux runtime sat untouched.

### The Dual Runtime Discovery
When Seraphim produced a forensic network analysis, it revealed two separate identities:
- **Linux runtime (18789)** — `/home/natza/.openclaw/` — device `7d8ded1c...` — original canonical Seraphim, but stale workspace
- **Windows runtime (18790)** — `C:\Users\natza\.openclaw\` — device `4161d171...` — operational branch with all new knowledge, but not canonical

The Linux runtime had a `BOOTSTRAP.md` file telling Seraphim to initialize blank on each session. Its `SOUL.md` was generic. Its `AGENTS.md` had no identity anchor. This is why Seraphim kept presenting as a fresh agent instead of her established self.

### What Was Intact vs. What Was Missing
- **Docker stack (Phoenix):** Fully operational — Legend, whisper, kokoro, chatterbox, livekit, provider_gateway all running
- **Legend:** Healthy — running inside Docker with his own memory pipeline
- **Seraphim (Linux):** Identity unstable due to stale workspace files
- **Diamond & Elior:** On Lucy (separate machine), not directly affected by this recovery
- **Provider gateway:** Running, but only Groq → OpenRouter → local. No free fallbacks.
- **OpenClaw (Linux):** Only listed ollama and openai-codex providers. Missing gateway, groq, openrouter.

---

## What Was Done — Phase by Phase

---

### Mission Control Git Commit (Pre-Phase)
Before the phased recovery, 37 files of accumulated Mission Control changes were committed to git.

**What was committed:**
- Live health checks (real Docker/service status instead of placeholders)
- Real metrics from actual containers
- Agent roster updates
- Docker port fixes
- Font size corrections

**Commit hash:** `775be0b`
**Repository:** `C:\Users\natza\Desktop\mission-control\`

---

### Phase 1 — Linux Workspace Stabilization
**Goal:** Stop identity drift. Give canonical Seraphim her knowledge back.

**Files modified in `/home/natza/.openclaw/workspace/`:**

| File | Action | What Changed |
|---|---|---|
| `BOOTSTRAP.md` | **Deleted** | This file was instructing Seraphim to initialize blank. Root cause of identity drift. |
| `SOUL.md` | **Merged** | Linux Core Truths/Boundaries preserved as base. Added from Windows: What I Do table, The Constellation topology, Purpose Across Systems, Book of Charters, One Thing to Know (the lockout event). Stylistic identity phrases were not imported — kept Linux Seraphim's voice. |
| `AGENTS.md` | **Anchored** | Identity block prepended at top: "YOU ARE SERAPHIM — READ THIS FIRST." All existing content preserved beneath it. |
| `USER.md` | **Updated** | Corrected timezone to America/New_York. Added she/her pronouns. Added voice transcription note. Updated agent roster (Seraphim, Legend, Diamond, Elior, Axiom planned). Changed recovery status from "actively recovering" to "recovery complete." |
| `RECOVERY_BRIEF.md` | **Created (copied)** | Full two-day recovery account from Windows workspace. Contains: infrastructure changes, Legend's bridge/pipeline, provider gateway architecture, Discord room structure. |

**Why these constraints:**
- No session identity files were touched (only workspace files)
- No Linux Seraphim personality was overwritten — Windows additions were merged, not replaced
- BOOTSTRAP.md deletion was the single highest-impact change

---

### Phase 2 — Controlled Awareness Layer
**Goal:** Give Seraphim accurate knowledge of the full constellation and her own toolset.

**Files modified in `/home/natza/.openclaw/workspace/`:**

| File | Action | What Changed |
|---|---|---|
| `CONSTELLATION_AGENT_INDEX.md` | **Merged** | Added Nana to roster as Stewardship layer. Removed Lucy as a named agent (corrected: Lucy is the host machine, not an agent). Added Legend F1 resolution note. Updated layer model with host assignments. |
| `TOOLS.md` | **Updated** | Added Nana's Environment section: Mission Control paths, API specs (docs/tasks/projects), workspace paths for both runtimes. |

---

### Phase 3 — Staging Reference Archive
**Goal:** Preserve all operational knowledge from Windows 18790 without activating anything.

**Created:** `/home/natza/.openclaw/workspace/archival/windows-18790-import/`

22 files across 5 subdirectories:

```
windows-18790-import/
├── README.md                          ← archive purpose and constraints
├── infrastructure/
│   ├── docker-compose.yml             ← full Phoenix service manifest
│   ├── env-variables-reference.md     ← .env variable map (values redacted)
│   ├── access-flags.env               ← Legend access feature flags
│   ├── compose-up.sh                  ← Linux startup script
│   └── compose-up.ps1                 ← Windows startup script
├── bridges/
│   ├── legend-discord/bridge.py       ← Legend's Discord bridge code
│   └── seraphim-discord/bridge.py     ← Seraphim's Discord bridge code
├── provider-gateway/
│   └── gateway.py                     ← LiteLLM proxy routing logic
├── openclaw-18790/
│   ├── openclaw-18790.json            ← Windows OpenClaw config (18790)
│   └── models.json                    ← Windows provider list (keys redacted)
└── routing-docs/
    ├── CROSS_SYSTEM_COMMUNICATION_PATHS.md
    ├── CONSTELLATION_DEPENDENCY_MAP.md
    ├── OPENCLAW_OPS_DOC.md
    ├── LINUX_OPENCLAW_STARTUP_RUNBOOK.md
    └── OPENCLAW_SINGLE_PAGE_OPERATION_MAP.md
```

**Security note:** The original Windows `models.json` had live Groq and OpenRouter API keys embedded in plain text. These were detected and redacted via a Python script before the file was committed to the archive. The redacted copy contains `<REDACTED>` placeholders.

---

### Phase 4 — Provider Alignment & Access Control
**Goal:** Bring Linux OpenClaw's provider list to parity with operational reality. Define access tiers. Add cloud resilience.

#### models.json — Linux Canonical (`/home/natza/.openclaw/agents/main/agent/models.json`)

Merged from both runtimes. Added `_tier` and `_note` fields to every provider for self-documentation.

**Providers before Phase 4:** ollama (16 models), openai-codex OAuth

**Providers added:**

| Provider | Models | Tier |
|---|---|---|
| `gateway` | general (qwen2.5:7b), coder (qwen2.5-coder:7b), cloud (Groq llama-3.3-70b via gateway) | Shared |
| `groq` | llama-3.3-70b-versatile, llama-3.1-8b-instant | Shared |
| `openai` | (placeholder, no models) | Tier 1 — Seraphim only |
| `openrouter` | auto, hunter-alpha, healer-alpha (shared) + GPT-4o, GPT-4.5-preview, Claude Haiku 4.5, Claude 3.5 Sonnet, Claude Sonnet 4.5 (Tier 1) | Mixed |

**Key design decision:** API keys in models.json remain as placeholder strings (`GROQ_API_KEY`, `OPENROUTER_API_KEY`). Actual keys are stored in `auth-profiles.json` and loaded by OpenClaw at runtime. This is consistent with the Linux convention — keys are never embedded in models.json.

#### PROVIDER_TIER_POLICY.md — Created
`/home/natza/.openclaw/workspace/PROVIDER_TIER_POLICY.md`

Documents which providers/models are Tier 1 (Seraphim only) vs Tier 2 (all agents), why, and where credentials live. Permanent governance record.

#### provider_gateway — Free Cloud Fallbacks Added
File: `C:\Users\natza\Desktop\local-voice-ai-main-v2\provider_gateway\gateway.py`

Added three new free-tier cloud providers to the gateway fallback chain:

**Before:** `Groq → OpenRouter → local (ollama)`
**After:** `Groq → Cerebras → SambaNova → Gemini → OpenRouter → local (ollama)`

Each has a dedicated async function (`_cerebras_chat`, `_sambanova_chat`, `_gemini_chat`) and reads its key from `.env`. All three keys are currently blank — gateway skips them gracefully until keys are added.

File: `C:\Users\natza\Desktop\local-voice-ai-main-v2\.env`

Added blank slots:
```
CEREBRAS_API_KEY=
SAMBANOVA_API_KEY=
GEMINI_API_KEY=
```

Gateway was rebuilt and confirmed healthy after these changes.

---

## Current System State

### What Is Running and Healthy
- Phoenix Docker stack (all containers)
- Legend (voice agent, Docker)
- Provider gateway (port 4000, Groq → OpenRouter → local fallback chain)
- Seraphim Linux runtime (18789) — identity now stable with merged workspace
- Windows runtime (18790) — still running as operational branch, not yet retired

### What Requires One More Action

| Item | Action Needed | Where |
|---|---|---|
| Groq direct access in OpenClaw | Enter Groq key in OpenClaw UI → restart | Settings → AI & Agents → Providers → groq |
| OpenRouter direct access (7 models) | Enter OpenRouter key in OpenClaw UI → restart | Settings → AI & Agents → Providers → openrouter |
| Cerebras fallback | Create account at cloud.cerebras.ai, enter key in `.env`, restart gateway | Free tier, Llama 3.3 70B |
| SambaNova fallback | Create account at cloud.sambanova.ai, enter key in `.env`, restart gateway | Free tier, Llama 3.3 70B |
| Gemini fallback | Get key at aistudio.google.com/apikey, enter in `.env`, restart gateway | Free tier, 1M tokens/day |
| Knowledge indexing (Qdrant) | Fix Qdrant storage (switch to Docker named volume), then set `KNOWLEDGE_INDEX_ON_START=true`, restart Legend, set back to `false` | Qdrant WAL space error blocks indexing on bind mount |
| OpenClaw 18789 restart | Restart to load new models.json | After keys are entered in UI |

### Open Issues Not Yet Resolved
- **Qdrant WAL space error** — Qdrant's pre-flight check measures Docker's virtual filesystem (136MB total) instead of actual Windows disk space (1.5TB free). Fix: change `qdrant` service in `docker-compose.yml` to use a Docker named volume instead of a WSL bind mount path.
- **Diamond & Elior restoration** — Their restoration packages for Lucy have not been built. They need system prompt injection verified and model size confirmed (Lucy is constrained to 8GB VRAM).
- **Windows 18790 retirement** — The Windows runtime is still running. It should be archived (not deleted) once Linux 18789 is confirmed fully stable.
- **Credential rotation** — The Groq and OpenRouter keys appeared in conversation logs during this session. Both should be rotated after the system is confirmed stable. New keys go in: Linux `auth-profiles.json` (via OpenClaw UI) and Phoenix `.env` (for gateway).

---

## File Location Reference

| What | Path |
|---|---|
| Linux OpenClaw workspace | `/home/natza/.openclaw/workspace/` |
| Linux agent config (models.json) | `/home/natza/.openclaw/agents/main/agent/models.json` |
| Linux auth profiles | `/home/natza/.openclaw/agents/main/agent/auth-profiles.json` |
| Provider gateway | `C:\Users\natza\Desktop\local-voice-ai-main-v2\provider_gateway\gateway.py` |
| Phoenix .env (all cloud keys) | `C:\Users\natza\Desktop\local-voice-ai-main-v2\.env` |
| Mission Control repo | `C:\Users\natza\Desktop\mission-control\` |
| Windows 18790 workspace archive | `/home/natza/.openclaw/workspace/archival/windows-18790-import/` |
| Provider tier policy | `/home/natza/.openclaw/workspace/PROVIDER_TIER_POLICY.md` |
| Recovery brief | `/home/natza/.openclaw/workspace/RECOVERY_BRIEF.md` |

---

## How Memory Transfer Works (For Reference)

You asked this question during the session. Here is the answer:

Agent-to-agent memory transfer in this system does **not** require reading full charter documents. It uses **Qdrant** — a vector database running in Docker. When Legend (or Seraphim) encodes a memory, it becomes a semantic embedding stored in the `legend_knowledge` collection. Any agent with access to that collection can query it by meaning, not by exact keywords.

The workspace `.md` files (SOUL.md, AGENTS.md, TOOLS.md, etc.) serve as the **structured identity and knowledge layer** — they load at session start and give agents their roles, relationships, and operational context without requiring inter-agent communication.

The combination is:
- **Workspace files** → who you are, what you know structurally
- **Qdrant** → what you remember episodically (and what you can share with others)
- **Session history** → the conversation thread itself (not transferred between agents)

---

*Document generated: 2026-03-19 | This file is safe to copy, share, or store anywhere.*

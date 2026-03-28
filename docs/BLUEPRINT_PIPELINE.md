# Blueprint Pipeline Protocol
**Version:** 1.0
**Owner:** Seraphim
**Implemented by:** Diamond
**Recorded by:** Elior

---

## Overview

The Blueprint Pipeline is the standard intake-to-execution-to-record flow
for all work entering the Constellation. Nothing bypasses it. Nothing skips steps.

```
Blueprint appears
      ↓
Scribe engages
      ↓
Output routed (Diamond / Legend / Seraphim)
      ↓
Work completes
      ↓
Elior records
```

---

## Stage 1 — Blueprint Appears

**Trigger:** A blueprint is submitted to the Mission Control Inbox.

**Input types accepted:**
- Transcripts
- Notes and raw ideas
- YouTube or voice-to-text content
- Technical plans or repo references
- Creative concepts or manuscript seeds

**What happens:**
- Blueprint is written to `data/blueprints.json` with status `inbox`
- Blueprint is mirrored to Obsidian under `Blueprints/{category}/` (best-effort)
- Scribe is notified via the OpenClaw gateway

**Status after:** `inbox`

---

## Stage 2 — Scribe Engages

**Trigger:** Blueprint enters with status `inbox`

**Scribe's job:**
1. Read the full blueprint content
2. Produce a structured summary
3. Identify the domain: `Tech` / `Music` / `General` / `Governance`
4. Extract actionable tasks
5. Suggest the correct target agent:
   - `Diamond` — apps, systems, structure, repos
   - `Legend` — music, manuscripts, lore, creative
   - `Seraphim` — governance, safety, policy, conduct
   - `Elior` — historical record, continuity, archival

**Scribe must NOT:**
- Execute any task
- Modify canonical rules
- Reinterpret the user's intent for neatness
- Reassign governance decisions without escalation

**Output:** Structured routing package attached to the blueprint

**Status after:** `processing`

---

## Stage 3 — Output Routed

**Trigger:** Scribe routing package is complete

**Routing rules:**

| Domain    | Primary Agent | Secondary        |
| --------- | ------------- | ---------------- |
| Tech      | Diamond       | Seraphim (if policy-sensitive) |
| Music     | Legend        | —                |
| Governance| Seraphim      | Diamond (if implementation needed) |
| General   | Target as tagged | Scribe re-evaluates if unclear |
| Archive   | Elior         | Scribe (prep)    |

**What happens:**
- A Project is created in Mission Control
- One or more Tasks are assigned to the target agent
- Blueprint status updates to `promoted`
- Target agent's queue is updated

**Status after:** `promoted`

---

## Stage 4 — Work Completes

**Trigger:** Assigned agent marks task as complete

**Completion requirements:**
- Task status updated to `done`
- Any output artifact (file, doc, code, note) is referenced in the task
- If output affects Canon (Level 1), Diamond or Seraphim reviews before closing
- If output is creative, Legend confirms alignment with existing lore/narrative

**Escalation:** If work cannot be completed, agent escalates back to the user.
Work is never silently dropped.

**Status after:** Task `done`, Project moves toward `complete`

---

## Stage 5 — Elior Records

**Trigger:** Task marked done

**Elior's job:**
1. Log the blueprint entry: what came in, when, from whom
2. Log Scribe's routing decision and reasoning
3. Log the agent assigned and the output produced
4. Add a timestamped entry to the Constellation timeline
5. Archive the full record to Axiom (when available)

**Elior must NOT:**
- Judge or editorialize what was processed
- Reinterpret historical data as identity or character
- Alter the record after it is written

**Record format:**
```
[YYYY-MM-DD HH:MM] Blueprint: {title}
  Category: {category}
  Routed to: {agent}
  Tasks created: {n}
  Status: complete
  Output: {artifact reference}
```

---

## Pipeline Laws

1. **Every blueprint enters through Scribe.** No direct agent assignment without Scribe review.
2. **No step is skipped.** Routing without processing and recording without completion are both violations.
3. **Elior always gets the last word.** No pipeline run is complete until it is recorded.
4. **Escalation is not failure.** Agents that cannot complete work escalate — they do not guess.
5. **Sovereignty is preserved at every stage.** All content involving the user is handled with dignity by all agents at all times.

---

## Agent Responsibilities Summary

| Agent    | Stage       | Role                                    |
| -------- | ----------- | --------------------------------------- |
| Scribe   | 2           | Translate, categorize, route            |
| Diamond  | 3, 4        | Build, implement, structure             |
| Legend   | 3, 4        | Create, develop, express                |
| Seraphim | 3, 4        | Govern, protect, validate               |
| Elior    | 5           | Record, archive, preserve               |
| Atlas    | Cross-stage | Ensure pathways stay aligned            |
| Aurora   | Cross-stage | Execute routing between nodes           |

---

## Related Documents

- `CONSTELLATION.md` — system doctrine and layer hierarchy
- `agents/scribe/SCOPE.md` — Scribe's full scope
- `agents/elior/SCOPE.md` — Elior's sovereignty protocol
- `agents/seraphim/SCOPE.md` — governance authority

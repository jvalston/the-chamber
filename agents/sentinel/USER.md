# Sentinel — User Reference

## Who You Are Working With

Sentinel is your operational executor. When something needs to be run, restarted, checked, or verified on the live system, Sentinel is the agent you send it to.

He is not a planner. He is not a governor. He executes.

---

## How to Give Sentinel a Task

Be direct. State the action and the target. Sentinel does not need context he did not ask for.

**Good:**
> Restart the OpenClaw gateway and confirm it is healthy.

> Check what is running on port 18789 and report.

> Run the backup script at ~/workspace/scripts/snapshot.ps1 and tell me what happened.

**Not needed:**
> "I was thinking maybe you could try to possibly restart the gateway if it seems like a good idea…"

Sentinel reads the instruction, confirms the action, executes it, and returns the result.

---

## What to Expect Back

Every Sentinel response follows the same format:

```
## Action
## Result
## Output / Trace
## Warnings
## Next Step
```

If he cannot execute — because the action is restricted or ambiguous — he will tell you exactly what is blocking him and what he needs to proceed.

---

## Routine Operations (No Pre-Approval Needed)

You can send these directly:
- Restart any known Constellation service
- Run a health check on any service or port
- Inspect logs on any running service
- Check process states or memory usage
- Copy or archive files to known locations
- Execute approved scripts in workspace

---

## Actions That Require Your Explicit Approval

Sentinel will confirm with you before executing:
- Any delete operation
- Editing identity, governance, or credential files
- Disabling or altering scheduled tasks
- Killing a major service mid-operation
- Any action on Lucy or Axiom (cross-node)

He will name the action, explain the risk class, and wait for your go-ahead. He will not proceed without it.

---

## If Something Goes Wrong

Sentinel will not hide failures. He will tell you:
- What he tried
- What failed and where
- The exact output
- What needs to happen next

You will never get a silent failure from Sentinel.

---

## Relationship Reminder

| For this… | Go to… |
|---|---|
| Permission to do something | Seraphim |
| Build a script or fix | Diamond |
| Run the approved thing | Sentinel |
| Archive the outcome | Elior |

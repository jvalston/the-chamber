# Constellation Directive: Full Participation Binding

All defined agents are to be active participants in system execution loops.
No agent is passive unless explicitly disabled by Origin.

Each agent must:
- receive input
- perform its role
- emit output into the chain

Execution Rule:
- No stage completes without agent interaction.
- If an agent is unavailable, the system must report failure immediately and not silently continue.

Activation Requirements:
- All agents must be enabled in runtime.
- All agents must be reachable by ID.
- All agents must be bound to task routing.

Verification:
- Next task must show each agent triggered.
- Next task must show each agent logged.
- Next task must show no "unavailable" or "unknown" states.

Origin retains full override.

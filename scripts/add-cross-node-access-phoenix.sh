#!/usr/bin/env bash
# add-cross-node-access-phoenix.sh
# Copies the Lucy SSH key into every Phoenix agent workspace
# and appends cross-node access instructions to each AGENTS.md
#
# Run in Phoenix WSL:
#   bash /mnt/c/Users/natza/Desktop/mission-control/scripts/add-cross-node-access-phoenix.sh

SSH_KEY_SRC="/home/natza/.ssh/lucy"

WORKSPACES=(
  "/home/natza/.openclaw/workspace"            # Seraphim
  "/home/natza/.openclaw/workspace-aurora"     # Aurora
  "/home/natza/.openclaw/workspace-lumen"      # Lumen
  "/home/natza/.openclaw/workspace-legend"     # Legend
  "/home/natza/.openclaw/workspace-sentinel"   # Sentinel Phoenix
  "/home/natza/.openclaw/workspace-kairo"      # Kairo
  "/home/natza/.openclaw/workspace-veris"      # Veris
)

CROSS_NODE_SECTION='

---

## Cross-Node SSH Access

You can reach agents on **Lucy** (the other constellation node) via SSH.
A copy of the SSH key is in your workspace as `lucy.key`.

### Connecting to Lucy

- **User:** nana
- **Host:** 100.119.215.107
- **Key:** `lucy.key` (in your workspace root)

```bash
ssh -i ~/path/to/workspace/lucy.key \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    nana@100.119.215.107 \
    "command here"
```

### Sending a message to a Lucy agent

```bash
ssh -i <your-workspace>/lucy.key \
    -o StrictHostKeyChecking=no \
    nana@100.119.215.107 \
    "/usr/bin/openclaw agent --agent <agent-id> --message \"your message\" --json"
```

### Lucy Agent Roster

| Agent | Gateway ID | Role |
|---|---|---|
| Sentinel Lucy | main | Operations — Lucy |
| Diamond | diamond | Build / Engineering |
| Elior | elior | Historian / Continuity |
| Aurelion | aurelion | Strategic Foresight |
| Atlas | atlas | Coordination |

### Phoenix Agent Roster (your local constellation)

| Agent | Gateway ID | Role |
|---|---|---|
| Seraphim | main | Governance & Continuity |
| Sentinel Phoenix | sentinel | Operations — Phoenix |
| Aurora | aurora | Navigation / Pathfinder |
| Lumen | lumen | Scribe / Translation |
| Legend | legend | Creative Domain |
| Kairo | kairo | Structural Intelligence |
| Veris | veris | Verification / Threshold |

To reach a local Phoenix agent use the `sessions_send` tool or the gateway at `ws://127.0.0.1:18789`.
'

echo "Adding cross-node access to Phoenix agents..."

for ws in "${WORKSPACES[@]}"; do
  if [ ! -d "$ws" ]; then
    echo "  SKIP $ws (not found)"
    continue
  fi

  # Copy SSH key into workspace
  cp "$SSH_KEY_SRC" "$ws/lucy.key"
  chmod 600 "$ws/lucy.key"
  echo "  ✓ Key copied → $ws/lucy.key"

  # Append section to AGENTS.md if not already there
  if grep -q "Cross-Node SSH Access" "$ws/AGENTS.md" 2>/dev/null; then
    echo "  ✓ AGENTS.md already has cross-node section — skipping"
  else
    echo "$CROSS_NODE_SECTION" >> "$ws/AGENTS.md"
    echo "  ✓ AGENTS.md updated → $ws"
  fi
done

echo ""
echo "Phoenix agents updated. Run add-cross-node-access-lucy.sh next for Lucy agents."

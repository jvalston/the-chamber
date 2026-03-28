#!/usr/bin/env bash
# add-cross-node-access-lucy.sh
# Appends cross-node access instructions to every Lucy agent AGENTS.md
# Run FROM Phoenix WSL — it SSHes into Lucy and applies changes there
#
# Usage:
#   bash /mnt/c/Users/natza/Desktop/mission-control/scripts/add-cross-node-access-lucy.sh

LUCY_USER="nana"
LUCY_HOST="100.119.215.107"
LUCY_KEY="$HOME/.ssh/lucy"

WORKSPACES=(
  "/home/nana/.openclaw/workspace"            # Sentinel Lucy
  "/home/nana/.openclaw/workspace-diamond"    # Diamond
  "/home/nana/.openclaw/workspace-elior"      # Elior
  "/home/nana/.openclaw/workspace-aurelion"   # Aurelion
  "/home/nana/.openclaw/workspace-atlas"      # Atlas
)

CROSS_NODE_SECTION='

---

## Cross-Node SSH Access

You can reach agents on **Phoenix** (the other constellation node) via SSH.

### Connecting to Phoenix

- **User:** natza
- **Host:** 100.88.244.100
- **Key:** Use the phoenix key if available in your workspace (`phoenix.key`), or ask your operator to set up reverse SSH access.

### Sending a message to a Phoenix agent

```bash
ssh -i <your-workspace>/phoenix.key \
    -o StrictHostKeyChecking=no \
    natza@100.88.244.100 \
    "/usr/bin/node /home/natza/.npm-global/lib/node_modules/openclaw/dist/index.js agent --agent <agent-id> --message \"your message\" --json"
```

### Phoenix Agent Roster

| Agent | Gateway ID | Role |
|---|---|---|
| Seraphim | main | Governance & Continuity |
| Sentinel Phoenix | sentinel | Operations — Phoenix |
| Aurora | aurora | Navigation / Pathfinder |
| Lumen | lumen | Scribe / Translation |
| Legend | legend | Creative Domain |
| Kairo | kairo | Structural Intelligence |
| Veris | veris | Verification / Threshold |

### Lucy Agent Roster (your local constellation)

| Agent | Gateway ID | Role |
|---|---|---|
| Sentinel Lucy | main | Operations — Lucy |
| Diamond | diamond | Build / Engineering |
| Elior | elior | Historian / Continuity |
| Aurelion | aurelion | Strategic Foresight |
| Atlas | atlas | Coordination |

To reach a local Lucy agent use the `sessions_send` tool or the gateway at `ws://127.0.0.1:18789`.
'

echo "Connecting to Lucy and updating agent workspaces..."

for ws in "${WORKSPACES[@]}"; do
  echo -n "  $ws ... "

  ssh -i "$LUCY_KEY" \
      -o StrictHostKeyChecking=no \
      -o BatchMode=yes \
      -o ConnectTimeout=10 \
      "$LUCY_USER@$LUCY_HOST" \
      "
        if [ ! -d '$ws' ]; then
          echo 'SKIP (workspace not found)'
          exit 0
        fi
        if grep -q 'Cross-Node SSH Access' '$ws/AGENTS.md' 2>/dev/null; then
          echo 'already updated'
        else
          cat >> '$ws/AGENTS.md' << 'ENDSECTION'
$CROSS_NODE_SECTION
ENDSECTION
          echo 'updated'
        fi
      "
done

echo ""
echo "Lucy agents updated."
echo ""
echo "NOTE: Lucy agents reaching Phoenix requires a phoenix SSH key on Lucy."
echo "To set that up, run from Phoenix WSL:"
echo "  ssh-copy-id -i ~/.ssh/id_rsa.pub natza@100.88.244.100  (if you have a key on Lucy)"
echo "Or copy your Phoenix public key to Lucy manually."

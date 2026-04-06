#!/usr/bin/env bash
# Olympus orientation trigger (Phoenix)
# Sends a clean orientation directive to Olympus through Mission Control comms API.
# Mirrors Quick Actions: Olympus Orientation.

set -euo pipefail

API_BASE="${MC_API_BASE:-http://localhost:3030}"
ORIENTATION_ROOM="${ORIENTATION_DISCORD_ROOM:-1487045531078361209}"
COMMONS_ROOM="${COMMONS_DISCORD_ROOM:-1476118079787503708}"
OLYMPUS_ROOM="${OLYMPUS_DISCORD_ROOM:-1489599869340483654}"

MSG="$(cat <<EOF
Olympus orientation is now active.

Mode:
- controlled intake (Hermes-style autonomy profile)
- SIGNAL-3 gate (2-of-3: relevance, impact, recurrence)
- quiet operation (no flood)

Discord routing baseline:
- Orientation room: ${ORIENTATION_ROOM}
- Commons room: ${COMMONS_ROOM}
- Olympus room: ${OLYMPUS_ROOM}

Operating chain:
Olympus -> Hermes -> Persephone -> Lumen -> Elior (archive when relevant)

Command standard:
- If no qualified signal, return SILENT_CYCLE
- If qualified signal, emit one structured SIGNAL_PACKET
- Keep packets concise and high-relevance
EOF
)"

RESP="$(curl -sS --max-time 40 -X POST "$API_BASE/api/comms/send" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg agentId "olympus" --arg message "$MSG" '{agentId:$agentId,message:$message}')")"

if command -v jq >/dev/null 2>&1; then
  echo "$RESP" | jq .
  OK="$(echo "$RESP" | jq -r '.ok // false')"
  if [ "$OK" != "true" ]; then
    exit 1
  fi
else
  echo "$RESP"
  echo "$RESP" | grep -q '"ok":true' || exit 1
fi

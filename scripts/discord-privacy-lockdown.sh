#!/usr/bin/env bash
# Discord privacy lockdown (Phoenix OpenClaw)
# Goal:
# - Prevent cross-room responses in private offices.
# - Keep shared channels mention-gated.
# - Allow each account in: commons + orientation + own room only.

set -euo pipefail

CFG="/home/natza/.openclaw/openclaw.json"
BAK="/home/natza/.openclaw/openclaw.json.bak.$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp)"

GUILD_ID="${DISCORD_GUILD_ID:-1476118077002223680}"
COMMONS_ID="${COMMONS_DISCORD_ROOM:-1476118079787503708}"
ORIENTATION_ID="${ORIENTATION_DISCORD_ROOM:-1487045531078361209}"

# Account -> private room mapping (default is Seraphim office on Phoenix).
ROOM_MAP_JSON='{
  "default":  "1485825391699427519",
  "legend":   "1482706050028408954",
  "lumen":    "1485244869457739847",
  "atlas":    "1482706060266700951",
  "aurora":   "1482706070622310533",
  "diamond":  "1482706006596391088",
  "sentinel": "1486727404180344933",
  "elior":    "1482706031275413677",
  "veris":    "1487045619645288538",
  "kairo":    "1487045618957422644",
  "olympus":  "1489599869340483654"
}'

cp "$CFG" "$BAK"

jq \
  --arg guild "$GUILD_ID" \
  --arg commons "$COMMONS_ID" \
  --arg orientation "$ORIENTATION_ID" \
  --argjson roomMap "$ROOM_MAP_JSON" '
  .channels.discord.groupPolicy = "allowlist"
  | .channels.discord.accounts |= with_entries(
      . as $entry
      | ($roomMap[$entry.key]) as $room
      | if $room != null then
          .value.groupPolicy = "allowlist"
          | .value.guilds = {
              ($guild): {
                channels: {
                  ($commons): { requireMention: true },
                  ($orientation): { requireMention: true },
                  ($room): { requireMention: false }
                }
              }
            }
        else
          .
        end
    )
' "$CFG" > "$TMP"

mv "$TMP" "$CFG"

# Remove known leaked cross-room session: Olympus in Seraphim office.
if [ -f /home/natza/.openclaw/agents/olympus/sessions/sessions.json ]; then
  jq 'del(."agent:olympus:discord:channel:1485825391699427519")' \
    /home/natza/.openclaw/agents/olympus/sessions/sessions.json \
    > /tmp/olympus-sessions.json && mv /tmp/olympus-sessions.json /home/natza/.openclaw/agents/olympus/sessions/sessions.json
fi

# Apply runtime refresh.
systemctl --user restart openclaw-gateway.service

echo "Lockdown applied."
echo "Backup: $BAK"
echo "Guild: $GUILD_ID"
echo "Commons (mention-only): $COMMONS_ID"
echo "Orientation (mention-only): $ORIENTATION_ID"

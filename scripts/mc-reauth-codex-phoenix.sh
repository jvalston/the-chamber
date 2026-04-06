#!/usr/bin/env bash
# Re-auth OpenAI Codex on PHOENIX using Mission Control API.
# Mirrors Quick Actions: Re-auth Codex.
# Use when codex auth expires or provider login breaks.

set -euo pipefail
API_BASE="${MC_API_BASE:-http://localhost:3030}"

RESP="$(curl -sS -X POST "$API_BASE/api/system" \
  -H "Content-Type: application/json" \
  -d '{"action":"reauth-codex","target":"phoenix"}')"

echo "$RESP" | { command -v jq >/dev/null 2>&1 && jq . || cat; }


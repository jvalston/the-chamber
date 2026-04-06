#!/usr/bin/env bash
# Update OpenClaw on BOTH nodes (Phoenix + Lucy) using Mission Control API.
# Mirrors Quick Actions: Update OpenClaw.
# Safe one-click wrapper for Scripts tab.

set -euo pipefail
API_BASE="${MC_API_BASE:-http://localhost:3030}"

RESP="$(curl -sS -X POST "$API_BASE/api/system" \
  -H "Content-Type: application/json" \
  -d '{"action":"update","target":"both"}')"

echo "$RESP" | { command -v jq >/dev/null 2>&1 && jq . || cat; }


#!/usr/bin/env bash
# Restart gateway on BOTH nodes (Phoenix + Lucy) using Mission Control API.
# Mirrors Quick Actions: Restart Gateway.
# Safe one-click wrapper for Scripts tab.

set -euo pipefail
API_BASE="${MC_API_BASE:-http://localhost:3030}"

RESP="$(curl -sS -X POST "$API_BASE/api/system" \
  -H "Content-Type: application/json" \
  -d '{"action":"restart","target":"both"}')"

echo "$RESP" | { command -v jq >/dev/null 2>&1 && jq . || cat; }


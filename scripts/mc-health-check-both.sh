#!/usr/bin/env bash
# Run service health check on BOTH nodes (Phoenix + Lucy).
# Mirrors Quick Actions: Health Check.
# Useful for quick up/down confirmation before or after updates.

set -euo pipefail
API_BASE="${MC_API_BASE:-http://localhost:3030}"

RESP="$(curl -sS -X POST "$API_BASE/api/system" \
  -H "Content-Type: application/json" \
  -d '{"action":"health","target":"both"}')"

echo "$RESP" | { command -v jq >/dev/null 2>&1 && jq . || cat; }


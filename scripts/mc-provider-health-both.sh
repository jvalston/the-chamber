#!/usr/bin/env bash
# Run provider health checks on BOTH nodes (Phoenix + Lucy).
# Mirrors Quick Actions: Provider Health.
# Reports local model/provider/channel health in one run.

set -euo pipefail
API_BASE="${MC_API_BASE:-http://localhost:3030}"

RESP="$(curl -sS -X POST "$API_BASE/api/system" \
  -H "Content-Type: application/json" \
  -d '{"action":"provider-health","target":"both"}')"

echo "$RESP" | { command -v jq >/dev/null 2>&1 && jq . || cat; }


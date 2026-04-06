#!/usr/bin/env bash
# Show OpenClaw status on Phoenix directly (no API wrapper).
# Helpful when you want raw CLI status JSON quickly.
# Uses the known OpenClaw node path in WSL.

set -euo pipefail
OC_NODE="/home/natza/.npm-global/lib/node_modules/openclaw/dist/index.js"

node "$OC_NODE" status --json 2>&1 | { command -v jq >/dev/null 2>&1 && jq . || cat; }


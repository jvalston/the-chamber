#!/usr/bin/env bash
# discord-allowlist.sh
# Sets all Discord accounts on this machine to groupPolicy: allowlist
# Run this in Phoenix WSL and again on Lucy WSL (via SSH)
#
# Usage:  bash ./scripts/discord-allowlist.sh

OPENCLAW="${OPENCLAW_BIN:-/usr/bin/openclaw}"

ACCOUNTS=(
  lumen
  atlas
  aurora
  default
  diamond
  sentinel
  legend
  elior
  veris
  kairo
)

echo "Setting all Discord accounts to groupPolicy: allowlist..."

for account in "${ACCOUNTS[@]}"; do
  echo -n "  $account ... "
  $OPENCLAW config set "channels.discord.accounts.${account}.groupPolicy" allowlist
  echo "done"
done

echo ""
echo "All accounts locked to allowlist."
echo "Restart the gateway for changes to take effect:"
echo "  $OPENCLAW gateway restart"

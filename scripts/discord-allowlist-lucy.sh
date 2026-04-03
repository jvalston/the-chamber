#!/usr/bin/env bash
# discord-allowlist-lucy.sh
# Sets all Discord accounts on Lucy to groupPolicy: allowlist
# Run this FROM Phoenix WSL — it SSHes into Lucy and applies the changes
#
# Usage:  bash ./scripts/discord-allowlist-lucy.sh

LUCY_USER="${LUCY_SSH_USER:-user}"
LUCY_HOST="${LUCY_SSH_HOST:-127.0.0.1}"
LUCY_KEY="${LUCY_SSH_KEY:-$HOME/.ssh/lucy}"
OPENCLAW="${LUCY_OPENCLAW_BIN:-/usr/bin/openclaw}"

ACCOUNTS=(
  sentinel
  diamond
  elior
  aurelion
  atlas
)

echo "Connecting to Lucy ($LUCY_HOST)..."

for account in "${ACCOUNTS[@]}"; do
  echo -n "  $account ... "
  ssh -i "$LUCY_KEY" \
      -o StrictHostKeyChecking=no \
      -o BatchMode=yes \
      -o ConnectTimeout=10 \
      "$LUCY_USER@$LUCY_HOST" \
      "$OPENCLAW config set channels.discord.accounts.${account}.groupPolicy allowlist"
  echo "done"
done

echo ""
echo "All Lucy accounts locked to allowlist."
echo "Restarting Lucy gateway..."

ssh -i "$LUCY_KEY" \
    -o StrictHostKeyChecking=no \
    -o BatchMode=yes \
    -o ConnectTimeout=10 \
    "$LUCY_USER@$LUCY_HOST" \
    "$OPENCLAW gateway restart"

echo "Done."

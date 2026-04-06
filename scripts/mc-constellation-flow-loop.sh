#!/usr/bin/env bash
# Star Verification Loop
# Usage:
#   bash scripts/mc-constellation-flow-loop.sh [source_dir] [archive_dir]
#
# What it does:
# 1) Health preflight on Phoenix+Lucy
# 2) Copies dataset Phoenix -> Lucy
# 3) Applies Lucy-side normalization pass
# 4) Pulls Lucy result back to archive
# 5) Sends handoff prompts across stars
# 6) Scores readiness + writes a unified report JSON

set -euo pipefail

DEFAULT_SRC="/home/natza/.openclaw/mission-control/test_flow"
SRC_DIR="${1:-$DEFAULT_SRC}"
if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory not found: $SRC_DIR"
  echo "Set a dataset path in Quick Actions, or run with:"
  echo "  bash $0 \"/home/natza/.openclaw/mission-control/<your-folder>\""
  exit 1
fi

API_BASE="${MC_API_BASE:-http://localhost:3030}"
API_TIMEOUT_SECONDS="${API_TIMEOUT_SECONDS:-60}"
LUCY_HOST="${LUCY_SSH_HOST:-100.119.215.107}"
LUCY_USER="${LUCY_SSH_USER:-nana}"
LUCY_KEY="${LUCY_SSH_KEY:-$HOME/.ssh/lucy}"

TS="$(date +%Y%m%d-%H%M%S)"
RUN_ID="flow-${TS}"
LOCAL_STAGE="${TMPDIR:-/tmp}/constellation-flow-${TS}"
LUCY_STAGE="/home/nana/constellation-flow/${RUN_ID}"
ARCHIVE_DIR="${2:-$HOME/constellation-archives/flow-validation/${RUN_ID}}"
REPORT_PATH="${ARCHIVE_DIR}/flow-report.json"
ARCHIVE_PACKET_JSON="${ARCHIVE_DIR}/elior-archive-packet.json"
ARCHIVE_PACKET_MD="${ARCHIVE_DIR}/elior-archive-packet.md"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS_PATH="${REPO_ROOT}/data/flow-status.json"
RUN_LEDGER_PATH="${REPO_ROOT}/data/star-verification-runs.jsonl"
START_EPOCH="$(date +%s)"
CURRENT_STAGE="init"

mkdir -p "$LOCAL_STAGE/input" "$ARCHIVE_DIR"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

status_write() {
  local stage="$1"
  local state="$2"
  local message="$3"
  local now_epoch now_iso elapsed
  now_epoch="$(date +%s)"
  now_iso="$(date -Iseconds)"
  elapsed="$((now_epoch - START_EPOCH))"

  cat > "$STATUS_PATH" <<EOF
{
  "runId": "${RUN_ID}",
  "stage": "${stage}",
  "state": "${state}",
  "message": "${message}",
  "source": "${SRC_DIR}",
  "archive": "${ARCHIVE_DIR}",
  "reportPath": "${REPORT_PATH}",
  "startedAt": "${START_EPOCH}",
  "updatedAt": "${now_iso}",
  "elapsedSec": ${elapsed}
}
EOF
}

on_exit() {
  local rc="$?"
  if [ "$rc" -ne 0 ]; then
    status_write "${CURRENT_STAGE}" "failed" "Star verification failed (exit ${rc}). Run ${RUN_ID} at $(date -Iseconds)."
  fi
}
trap on_exit EXIT

json_escape() {
  if command -v jq >/dev/null 2>&1; then
    jq -Rn --arg v "$1" '$v'
  else
    printf '%s' "$1" | sed 's/"/\\"/g; s/$/\\n/'
  fi
}

api_post() {
  local endpoint="$1"
  local body="$2"
  local resp rc
  resp="$(curl -sS --connect-timeout 5 --max-time "$API_TIMEOUT_SECONDS" -X POST "$API_BASE$endpoint" -H "Content-Type: application/json" -d "$body")"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    printf '%s' "$resp"
    return 0
  fi
  # Return machine-parsable error so callers can retry/fail cleanly.
  printf '{"ok":false,"error":"curl_exit_%s"}' "$rc"
}

notify_star() {
  local agent="$1"
  local msg="$2"
  local required="${3:-required}"
  local resp ok err level err_safe attempt
  status_write "star-loop" "running" "(${STAR_DONE}/${STAR_TOTAL}) waiting on ${agent}"
  attempt=1
  resp="$(api_post "/api/comms/send" "{\"agentId\":\"${agent}\",\"message\":$(json_escape "$msg")}")"
  if command -v jq >/dev/null 2>&1; then
    ok="$(printf '%s' "$resp" | jq -r '.ok // false' 2>/dev/null || echo false)"
    err="$(printf '%s' "$resp" | jq -r '.error // empty' 2>/dev/null || true)"
  else
    ok="unknown"
    err=""
  fi
  if [ "$ok" != "true" ]; then
    # One retry with jitter to smooth transient queue/collision timeouts.
    sleep 2
    attempt=2
    resp="$(api_post "/api/comms/send" "{\"agentId\":\"${agent}\",\"message\":$(json_escape "$msg")}")"
    if command -v jq >/dev/null 2>&1; then
      ok="$(printf '%s' "$resp" | jq -r '.ok // false' 2>/dev/null || echo false)"
      err="$(printf '%s' "$resp" | jq -r '.error // empty' 2>/dev/null || true)"
    else
      ok="unknown"
      err=""
    fi
  fi

  if [ "$ok" = "true" ]; then
    log "star:$agent ok (attempt ${attempt})"
    STAR_LOGS+="\n- ${agent}: ok"
    STAR_MATRIX_LINES+=("{\"agent\":\"${agent}\",\"required\":$([ "$required" = "required" ] && echo true || echo false),\"status\":\"ok\",\"error\":\"\"}")
    STAR_OK="$((STAR_OK + 1))"
    if [ "$required" = "required" ]; then
      STAR_REQUIRED_OK="$((STAR_REQUIRED_OK + 1))"
    fi
    STAR_DONE="$((STAR_DONE + 1))"
    status_write "star-loop" "running" "(${STAR_DONE}/${STAR_TOTAL}) completed ${agent}"
  else
    level="warning"
    if [ "$required" = "required" ]; then
      level="failed"
      STAR_REQUIRED_FAIL="$((STAR_REQUIRED_FAIL + 1))"
    fi
    err_safe="$(printf '%s' "${err:-unavailable}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    log "star:$agent ${level} ${err:-unavailable}"
    STAR_LOGS+="\n- ${agent}: ${level} ${err:-unavailable}"
    STAR_MATRIX_LINES+=("{\"agent\":\"${agent}\",\"required\":$([ "$required" = "required" ] && echo true || echo false),\"status\":\"${level}\",\"error\":\"${err_safe}\"}")
    STAR_DONE="$((STAR_DONE + 1))"
    status_write "star-loop" "running" "(${STAR_DONE}/${STAR_TOTAL}) ${level} on ${agent}: ${err:-unavailable}"
  fi
}

log "run_id=$RUN_ID"
log "source=$SRC_DIR"
log "archive=$ARCHIVE_DIR"
CURRENT_STAGE="init"
status_write "init" "running" "Run initialized"

# 1) Preflight
CURRENT_STAGE="preflight"
status_write "preflight" "running" "Health check on both nodes"
log "preflight health both"
HEALTH_PRE="$(api_post "/api/system" '{"action":"health","target":"both"}' || true)"

# 2) Intake + route
CURRENT_STAGE="intake"
status_write "intake" "running" "Copy source into staging"
log "copy source -> local stage"
rsync -a --delete "$SRC_DIR/" "$LOCAL_STAGE/input/"

CURRENT_STAGE="routing"
status_write "routing" "running" "Transfer staged data Phoenix to Lucy"
log "route Phoenix -> Lucy"
ssh -i "$LUCY_KEY" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "$LUCY_USER@$LUCY_HOST" "mkdir -p '$LUCY_STAGE/input' '$LUCY_STAGE/output'"
rsync -a --delete -e "ssh -i $LUCY_KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10" "$LOCAL_STAGE/input/" "$LUCY_USER@$LUCY_HOST:$LUCY_STAGE/input/"

# 3) Lucy transform (simple normalization pass)
CURRENT_STAGE="execution"
status_write "execution" "running" "Lucy normalization and transform"
log "lucy normalization pass"
REMOTE_NORM_CMD="set -e; cp -a '$LUCY_STAGE/input/.' '$LUCY_STAGE/output/'; find '$LUCY_STAGE/output' -type f -name '*.txt' -exec sed -i 's/[[:space:]]\\+\$//' {} \\;; find '$LUCY_STAGE/output' -type f | wc -l > '$LUCY_STAGE/output/.file_count'"
ssh -i "$LUCY_KEY" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "$LUCY_USER@$LUCY_HOST" "bash -lc \"$REMOTE_NORM_CMD\""

# 4) Archive pullback
CURRENT_STAGE="archive"
status_write "archive" "running" "Pull Lucy output into archive"
log "pull Lucy output -> archive"
rsync -a -e "ssh -i $LUCY_KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10" "$LUCY_USER@$LUCY_HOST:$LUCY_STAGE/output/" "$ARCHIVE_DIR/output/"

# 5) Star loop notifications
CURRENT_STAGE="star-loop"
status_write "star-loop" "running" "Touch all star lanes and collect confirmations"
STAR_LOGS=""
STAR_TOTAL=8
STAR_DONE=0
STAR_OK=0
STAR_REQUIRED_OK=0
STAR_REQUIRED_FAIL=0
STAR_MATRIX_LINES=()
FLOW_MSG="Star Verification Loop ${RUN_ID}: dataset moved Phoenix->Lucy->Archive at ${ARCHIVE_DIR}. Reply with exactly one line: ACK ${RUN_ID} <agent> ready."
notify_star "kairo" "$FLOW_MSG [structure check]" "required"
notify_star "diamond" "$FLOW_MSG [execution + file ops check]" "required"
notify_star "sentinel" "$FLOW_MSG [transfer integrity + error check]" "required"
notify_star "lumen" "$FLOW_MSG [documentation + routing log check]" "required"
notify_star "aurelion" "$FLOW_MSG [resource/cost observation check]" "required"
notify_star "seraphim" "$FLOW_MSG [governance boundary check + close loop]" "required"
# Optional stars if configured in your comms roster:
notify_star "hermes" "$FLOW_MSG [flow oversight check]" "optional"
notify_star "persephone" "$FLOW_MSG [translation/standardization check]" "optional"

# 6) Post health + report
CURRENT_STAGE="postflight"
status_write "postflight" "running" "Post-flight health and report build"
log "postflight health both"
HEALTH_POST="$(api_post "/api/system" '{"action":"health","target":"both"}' || true)"

REQUIRED_TOTAL=6
if [ "$STAR_REQUIRED_FAIL" -gt 0 ]; then
  READINESS="failed"
  READINESS_MSG="Readiness failed: ${STAR_REQUIRED_FAIL}/${REQUIRED_TOTAL} required stars unavailable."
else
  READINESS="passed"
  READINESS_MSG="Readiness passed: all ${REQUIRED_TOTAL} required stars confirmed."
fi

status_write "postflight" "running" "$READINESS_MSG"

if command -v jq >/dev/null 2>&1; then
  STAR_MATRIX_JSON="$(printf '%s\n' "${STAR_MATRIX_LINES[@]}" | jq -s '.' 2>/dev/null || echo '[]')"
  HEALTH_PRE_STATE="$(printf '%s' "${HEALTH_PRE:-{}}" | jq -r 'if ((.steps // []) | length) == 0 then "unknown" elif ((.steps // []) | all(.ok == true)) then "ok" else "degraded" end' 2>/dev/null || echo 'unknown')"
  HEALTH_POST_STATE="$(printf '%s' "${HEALTH_POST:-{}}" | jq -r 'if ((.steps // []) | length) == 0 then "unknown" elif ((.steps // []) | all(.ok == true)) then "ok" else "degraded" end' 2>/dev/null || echo 'unknown')"
else
  STAR_MATRIX_JSON="[]"
  HEALTH_PRE_STATE="unknown"
  HEALTH_POST_STATE="unknown"
fi

if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg runId "$RUN_ID" \
    --arg source "$SRC_DIR" \
    --arg archive "$ARCHIVE_DIR" \
    --arg generatedAt "$(date -Iseconds)" \
    --arg readiness "$READINESS" \
    --arg readinessMsg "$READINESS_MSG" \
    --arg stars "$STAR_LOGS" \
    --arg starMatrixText "${STAR_MATRIX_JSON:-[]}" \
    --arg healthPreState "${HEALTH_PRE_STATE:-unknown}" \
    --arg healthPostState "${HEALTH_POST_STATE:-unknown}" \
    '{
      runId: $runId,
      generatedAt: $generatedAt,
      source: $source,
      archive: $archive,
      status: (if $readiness == "passed" then "completed" else "degraded" end),
      readiness: $readiness,
      readinessMessage: $readinessMsg,
      stages: [
        "intake",
        "routing",
        "execution",
        "structure",
        "observation",
        "documentation",
        "governance"
      ],
      starTouches: ($stars | split("\n") | map(select(length>0))),
      starMatrix: $starMatrixText,
      healthPreState: $healthPreState,
      healthPostState: $healthPostState
    }' > "$REPORT_PATH"
else
  cat > "$REPORT_PATH" <<EOF
{
  "runId": "$RUN_ID",
  "generatedAt": "$(date -Iseconds)",
  "source": "$SRC_DIR",
  "archive": "$ARCHIVE_DIR",
  "status": "completed"
}
EOF
fi

# 7) Build Elior archive packet (ingest-ready)
if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg runId "$RUN_ID" \
    --arg createdAt "$(date -Iseconds)" \
    --arg source "$SRC_DIR" \
    --arg archive "$ARCHIVE_DIR" \
    --arg reportPath "$REPORT_PATH" \
    --arg status "$( [ "$READINESS" = "passed" ] && echo completed || echo degraded )" \
    --arg readiness "$READINESS" \
    --arg readinessMessage "$READINESS_MSG" \
    --argjson requiredTotal "$REQUIRED_TOTAL" \
    --argjson requiredFailed "$STAR_REQUIRED_FAIL" \
    --arg starMatrixText "${STAR_MATRIX_JSON:-[]}" \
    '{
      type: "star_verification_archive_packet",
      runId: $runId,
      createdAt: $createdAt,
      source: $source,
      archive: $archive,
      reportPath: $reportPath,
      status: $status,
      readiness: $readiness,
      readinessMessage: $readinessMessage,
      requiredTotal: $requiredTotal,
      requiredFailed: $requiredFailed,
      starMatrix: $starMatrixText
    }' > "$ARCHIVE_PACKET_JSON"

  printf '%s\n' "$(jq -c . "$ARCHIVE_PACKET_JSON")" >> "$RUN_LEDGER_PATH"
else
  cat > "$ARCHIVE_PACKET_JSON" <<EOF
{
  "type": "star_verification_archive_packet",
  "runId": "$RUN_ID",
  "createdAt": "$(date -Iseconds)",
  "source": "$SRC_DIR",
  "archive": "$ARCHIVE_DIR",
  "reportPath": "$REPORT_PATH",
  "status": "$( [ "$READINESS" = "passed" ] && echo completed || echo degraded )",
  "readiness": "$READINESS",
  "readinessMessage": "$READINESS_MSG",
  "requiredTotal": $REQUIRED_TOTAL,
  "requiredFailed": $STAR_REQUIRED_FAIL
}
EOF
  printf '%s\n' "{\"runId\":\"$RUN_ID\",\"status\":\"$READINESS\",\"reportPath\":\"$REPORT_PATH\"}" >> "$RUN_LEDGER_PATH"
fi

cat > "$ARCHIVE_PACKET_MD" <<EOF
# Star Verification Archive Packet

Run ID: \`$RUN_ID\`  
Timestamp: \`$(date -Iseconds)\`

Readiness: \`$READINESS\`  
Summary: $READINESS_MSG

Source Dataset: \`$SRC_DIR\`  
Archive Directory: \`$ARCHIVE_DIR\`

Report JSON: \`$REPORT_PATH\`  
Elior Packet JSON: \`$ARCHIVE_PACKET_JSON\`
EOF

# Notify Elior with packet location (best-effort, non-blocking)
ELIOR_MSG="Star verification archive packet ready. Run ${RUN_ID}. Readiness: ${READINESS}. Packet: ${ARCHIVE_PACKET_JSON}. Report: ${REPORT_PATH}."
ELIOR_NOTIFY="$(api_post "/api/comms/send" "{\"agentId\":\"elior\",\"message\":$(json_escape "$ELIOR_MSG")}")" || true
if command -v jq >/dev/null 2>&1; then
  ELIOR_OK="$(printf '%s' "$ELIOR_NOTIFY" | jq -r '.ok // false' 2>/dev/null || echo false)"
  if [ "$ELIOR_OK" = "true" ]; then
    log "elior: archive packet notification sent"
  else
    log "elior: notification unavailable"
  fi
fi

CURRENT_STAGE="complete"
if [ "$READINESS" = "passed" ]; then
  status_write "complete" "completed" "Star verification complete. Run ${RUN_ID} at $(date -Iseconds). $READINESS_MSG"
else
  status_write "complete" "failed" "Star verification failed. Run ${RUN_ID} at $(date -Iseconds). $READINESS_MSG"
fi

log "readiness=${READINESS}"
log "$READINESS_MSG"
log "report: $REPORT_PATH"
log "archive_packet_json: $ARCHIVE_PACKET_JSON"
log "archive_packet_md: $ARCHIVE_PACKET_MD"
log "run_ledger: $RUN_LEDGER_PATH"
if command -v jq >/dev/null 2>&1; then
  jq '{runId, status, readiness, readinessMessage, starMatrix}' "$REPORT_PATH"
fi

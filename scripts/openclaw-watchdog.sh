#!/bin/bash
# ============================================================
# OpenClaw Config & Health Watchdog
# Runs every 5 minutes via crontab
# Checks: model validity, contextTokens, process health
# Auto-reverts config and restarts processes if needed
# ============================================================

CONFIG=/root/.openclaw/openclaw.json
BACKUP=/root/.openclaw/openclaw.json.backup
LOG=/var/log/openclaw-watchdog.log
LOCKFILE=/tmp/openclaw-watchdog.lock
MIN_CONTEXT=16000
MAX_CONTEXT=30000
MAX_LOG_LINES=500
NEEDS_FIX=0

# --- Prevent concurrent runs ---
if [ -f "$LOCKFILE" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCKFILE" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -lt 300 ]; then
    exit 0
  fi
  rm -f "$LOCKFILE"
fi
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

# --- Log rotation (keep last 500 lines) ---
if [ -f "$LOG" ]; then
  LINE_COUNT=$(wc -l < "$LOG")
  if [ "$LINE_COUNT" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
  fi
fi

# --- Check 1: Config file exists ---
if [ ! -f "$CONFIG" ]; then
  echo "$(date): CRITICAL - Config file missing, restoring from backup" >> "$LOG"
  cp "$BACKUP" "$CONFIG" 2>/dev/null
  NEEDS_FIX=1
fi

# --- Check 2: Valid model ---
VALID_MODELS="anthropic/claude-3-5-haiku-latest anthropic/claude-3-5-sonnet-latest anthropic/claude-sonnet-4-5 anthropic/claude-3-haiku-20240307 anthropic/claude-3-5-sonnet-20241022 anthropic/claude-3-5-haiku-20241022"
CURRENT_MODEL=$(grep -oP '"primary":\s*"\K[^"]+' "$CONFIG" 2>/dev/null)

if [ -z "$CURRENT_MODEL" ]; then
  echo "$(date): ERROR - No model found in config" >> "$LOG"
  NEEDS_FIX=1
else
  FOUND=0
  for m in $VALID_MODELS; do
    if [ "$CURRENT_MODEL" = "$m" ]; then
      FOUND=1
      break
    fi
  done
  if [ "$FOUND" -eq 0 ]; then
    echo "$(date): INVALID model '$CURRENT_MODEL' - reverting" >> "$LOG"
    NEEDS_FIX=1
  fi
fi

# --- Check 3: contextTokens in valid range ---
TOKENS=$(grep -oP '"contextTokens":\s*\K[0-9]+' "$CONFIG" 2>/dev/null)
if [ -n "$TOKENS" ]; then
  if [ "$TOKENS" -lt "$MIN_CONTEXT" ]; then
    echo "$(date): contextTokens too low ($TOKENS < $MIN_CONTEXT) - reverting" >> "$LOG"
    NEEDS_FIX=1
  elif [ "$TOKENS" -gt "$MAX_CONTEXT" ]; then
    echo "$(date): contextTokens too high ($TOKENS > $MAX_CONTEXT, wastes API) - reverting" >> "$LOG"
    NEEDS_FIX=1
  fi
fi

# --- Check 4: JSON validity ---
if ! python3 -c "import json; json.load(open('$CONFIG'))" 2>/dev/null; then
  echo "$(date): CORRUPT JSON in config - reverting" >> "$LOG"
  NEEDS_FIX=1
fi

# --- Apply config fix if needed ---
if [ "$NEEDS_FIX" -eq 1 ]; then
  cp "$BACKUP" "$CONFIG"
  REVERTED_MODEL=$(grep -oP '"primary":\s*"\K[^"]+' "$CONFIG")
  REVERTED_TOKENS=$(grep -oP '"contextTokens":\s*\K[0-9]+' "$CONFIG")
  echo "$(date): REVERTED to backup (model: $REVERTED_MODEL, tokens: $REVERTED_TOKENS)" >> "$LOG"
fi

# --- Check 5: Process health ---
OC_MAIN=$(pgrep -x openclaw 2>/dev/null)
OC_GW=$(pgrep -f openclaw-gateway 2>/dev/null)

if [ -z "$OC_MAIN" ] || [ -z "$OC_GW" ]; then
  echo "$(date): PROCESS DOWN (main: ${OC_MAIN:-dead}, gateway: ${OC_GW:-dead}) - restarting" >> "$LOG"
  # Kill any remaining orphan processes
  pkill -9 -f openclaw 2>/dev/null
  sleep 2
  # Restart via systemd if available, else manual
  if systemctl is-active openclaw.service >/dev/null 2>&1; then
    systemctl restart openclaw.service
  else
    cd /root && nohup openclaw status >/dev/null 2>&1 &
    sleep 3
  fi
  echo "$(date): Restart attempted" >> "$LOG"
elif [ "$NEEDS_FIX" -eq 1 ]; then
  # Config was fixed, signal gateway to reload
  kill -HUP $OC_GW 2>/dev/null
  echo "$(date): Sent HUP to gateway (pid $OC_GW)" >> "$LOG"
fi

# --- Hourly health log ---
MINUTE=$(date +%M)
if [ "$MINUTE" = "00" ] && [ "$NEEDS_FIX" -eq 0 ]; then
  MEM=$(ps -o rss= -p $OC_GW 2>/dev/null | awk '{printf "%.0f", $1/1024}')
  echo "$(date): OK - model: $CURRENT_MODEL, tokens: ${TOKENS:-default}, gateway_mem: ${MEM:-?}MB" >> "$LOG"
fi

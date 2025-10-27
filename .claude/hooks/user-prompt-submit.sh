#!/bin/bash
# Claude Code Hook: user-prompt-submit.sh
# Purpose: Auto-load tier1 and selective tier2 files based on keywords
# Security: Input sanitization (printf, grep -F), path validation, user visibility

set -euo pipefail

PROMPT="$1"
TIER1_DIR="base-rules/tier1"
TIER2_DIR="base-rules/tier2"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check opt-out
if [[ -f .claude/no-auto-load ]]; then
  exit 0
fi

# Validate tier1 directory exists
if [[ ! -d "$TIER1_DIR" ]]; then
  echo "⚠️  Warning: $TIER1_DIR directory not found" >&2
  exit 0
fi

# Initialize auto-load log
mkdir -p .claude-state
touch .claude-state/auto-load.log

# Function to safely load a tier1 file
load_tier1_file() {
  local filename="$1"
  local trigger_keywords="$2"
  local filepath="$TIER1_DIR/$filename"

  # Validate file exists and is regular file
  if [[ ! -f "$filepath" ]]; then
    return 0
  fi

  # Resolve symlinks and verify path is within tier1 directory
  local realpath_result
  realpath_result=$(realpath "$filepath" 2>/dev/null || echo "")

  if [[ -z "$realpath_result" ]]; then
    echo "⚠️  Warning: Could not resolve path for $filename" >&2
    return 0
  fi

  local tier1_realpath
  tier1_realpath=$(realpath "$TIER1_DIR" 2>/dev/null || echo "")

  if [[ -z "$tier1_realpath" ]]; then
    echo "⚠️  Warning: Could not resolve tier1 directory path" >&2
    return 0
  fi

  # Security check: ensure file is within tier1 directory
  if [[ "$realpath_result" != "$tier1_realpath"/* ]]; then
    echo "🚨 Security: Blocked attempt to read file outside tier1 directory" >&2
    return 1
  fi

  # Load file
  echo "📖 Auto-loaded $filename (trigger: $trigger_keywords)"
  cat -- "$realpath_result"
  echo ""

  # Log to audit trail
  echo "[$TIMESTAMP] Auto-loaded: $filename (trigger: $trigger_keywords)" >> .claude-state/auto-load.log

  # Update metrics
  if [[ -f .claude-state/metrics.json ]]; then
    jq ".current_session.tier1_loads[\"$filename\"] = (.current_session.tier1_loads[\"$filename\"] // 0) + 1" \
      .claude-state/metrics.json > .claude-state/metrics.json.tmp \
      && mv .claude-state/metrics.json.tmp .claude-state/metrics.json
  fi
}

# Function to safely load a tier2 file (selective auto-load)
load_tier2_file() {
  local filename="$1"
  local trigger_keywords="$2"
  local filepath="$TIER2_DIR/$filename"

  # Validate tier2 directory exists
  if [[ ! -d "$TIER2_DIR" ]]; then
    return 0
  fi

  # Validate file exists and is regular file
  if [[ ! -f "$filepath" ]]; then
    return 0
  fi

  # Resolve symlinks and verify path is within tier2 directory
  local realpath_result
  realpath_result=$(realpath "$filepath" 2>/dev/null || echo "")

  if [[ -z "$realpath_result" ]]; then
    echo "⚠️  Warning: Could not resolve path for $filename" >&2
    return 0
  fi

  local tier2_realpath
  tier2_realpath=$(realpath "$TIER2_DIR" 2>/dev/null || echo "")

  if [[ -z "$tier2_realpath" ]]; then
    echo "⚠️  Warning: Could not resolve tier2 directory path" >&2
    return 0
  fi

  # Security check: ensure file is within tier2 directory
  if [[ "$realpath_result" != "$tier2_realpath"/* ]]; then
    echo "🚨 Security: Blocked attempt to read file outside tier2 directory" >&2
    return 1
  fi

  # Load file
  echo "📖 Auto-loaded tier2/$filename (trigger: $trigger_keywords)"
  cat -- "$realpath_result"
  echo ""

  # Log to audit trail
  echo "[$TIMESTAMP] Auto-loaded: tier2/$filename (trigger: $trigger_keywords)" >> .claude-state/auto-load.log

  # Update metrics
  if [[ -f .claude-state/metrics.json ]]; then
    jq ".current_session.tier2_loads[\"$filename\"] = (.current_session.tier2_loads[\"$filename\"] // 0) + 1" \
      .claude-state/metrics.json > .claude-state/metrics.json.tmp \
      && mv .claude-state/metrics.json.tmp .claude-state/metrics.json
  fi
}

# Testing keywords (case-insensitive, literal matching)
# Security: Use printf (not echo), grep -F (literal, not regex)
if printf '%s' "$PROMPT" | grep -qiF -e "test" -e "pytest" -e "jest" -e "mocha" -e "coverage" -e "spec" -e "mock" -e "fixture"; then
  load_tier1_file "testing.md" "testing keywords"
fi

# Security keywords
if printf '%s' "$PROMPT" | grep -qiF -e "auth" -e "password" -e "token" -e "secret" -e "credential" -e "session" -e "cookie" -e "login" -e "permission" -e "security"; then
  load_tier1_file "security.md" "security keywords"
fi

# Issue tracking keywords
if printf '%s' "$PROMPT" | grep -qiF -e "bug" -e "error" -e "failure" -e "crash" -e "fix" -e "broken" -e "issue" -e "TO-FIX"; then
  load_tier1_file "issue-tracking.md" "issue tracking keywords"
fi

# Coding keywords
if printf '%s' "$PROMPT" | grep -qiF -e "refactor" -e "code review" -e "style" -e "naming" -e "convention" -e "linting"; then
  load_tier1_file "coding.md" "coding keywords"
fi

# Process cleanup keywords
if printf '%s' "$PROMPT" | grep -qiF -e "server" -e "chrome" -e "launch" -e "background" -e "process" -e "cleanup" -e "kill"; then
  load_tier1_file "process-cleanup.md" "process management keywords"
fi

# Debugging keywords
if printf '%s' "$PROMPT" | grep -qiF -e "debug" -e "investigate" -e "troubleshoot" -e "diagnose" -e "not working"; then
  load_tier1_file "debugging.md" "debugging keywords"
fi

# WebSocket keywords (tier2 selective auto-load)
if printf '%s' "$PROMPT" | grep -qiF -e "websocket" -e "ws://" -e "wss://" -e "socket.io" -e "sockjs" -e "real-time connection"; then
  load_tier2_file "websocket-testing.md" "WebSocket keywords"
fi

exit 0

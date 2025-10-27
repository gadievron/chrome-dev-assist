#!/bin/bash
# Claude Code Hook: post-tool-use.sh
# Purpose: Track tool usage metrics automatically
# Security: No user input processed, write to safe location only

set -euo pipefail

TOOL="$1"
FILE="${2:-}"

# Ensure metrics file exists
mkdir -p .claude-state
if [[ ! -f .claude-state/metrics.json ]]; then
  cat > .claude-state/metrics.json <<'EOF'
{
  "version": "1.0",
  "sessions": [],
  "current_session": {
    "session_id": "",
    "start_time": "",
    "tool_uses": {},
    "tier1_loads": {},
    "validations": 0
  }
}
EOF
fi

# Increment tool counter
jq ".current_session.tool_uses[\"$TOOL\"] = (.current_session.tool_uses[\"$TOOL\"] // 0) + 1" \
  .claude-state/metrics.json > .claude-state/metrics.json.tmp \
  && mv .claude-state/metrics.json.tmp .claude-state/metrics.json

# Special handling for validation
if [[ "$TOOL" == "SlashCommand" ]] && [[ "$FILE" == *"validate"* ]]; then
  jq ".current_session.validations += 1" \
    .claude-state/metrics.json > .claude-state/metrics.json.tmp \
    && mv .claude-state/metrics.json.tmp .claude-state/metrics.json
fi

exit 0

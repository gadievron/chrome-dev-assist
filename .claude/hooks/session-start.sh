#!/bin/bash
# Claude Code Hook: session-start.sh
# Purpose: Announce session startup, initialize metrics
# Security: No user input processed, read-only operations

set -euo pipefail

PROJECT_NAME=$(cat .project-name 2>/dev/null || basename "$PWD")
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "✓ Session started: %s\n" "$TIMESTAMP"
printf "✓ Project: %s\n" "$PROJECT_NAME"
printf "%s\n" "✓ Hooks active: Auto-loading enabled"
printf "%s\n" "✓ Rules system: v2.0 (Pragmatic)"
printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "\n"
printf "Working directory: %s\n" "$PWD"
printf "Auto-load disabled? %s\n" "$([ -f .claude/no-auto-load ] && printf 'YES' || printf 'NO')"
printf "\n"

# Initialize metrics if doesn't exist
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

# Log session start
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
jq ".current_session.session_id = \"$SESSION_ID\" | .current_session.start_time = \"$TIMESTAMP\"" \
  .claude-state/metrics.json > .claude-state/metrics.json.tmp \
  && mv .claude-state/metrics.json.tmp .claude-state/metrics.json

exit 0

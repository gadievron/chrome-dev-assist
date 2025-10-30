#!/bin/bash
# Pre-Validation Check Script
# Catches common mistakes BEFORE validation

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PRE-VALIDATION CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "\n"

FAILED=0

# 1. Check for running test processes
printf "1. Checking for running test processes...\n"
TEST_PROCS=$(ps aux | grep -iE "(npm.*test|jest|chrome.*--test)" | grep -v grep | wc -l)
if [ "$TEST_PROCS" -gt 0 ]; then
  printf "   ❌ FAIL: %s test process(es) still running\n" "$TEST_PROCS"
  ps aux | grep -iE "(npm.*test|jest|chrome.*--test)" | grep -v grep
  FAILED=1
else
  printf "   ✅ PASS: No test processes running\n"
fi

# 2. Check for WebSocket server
printf "\n"
printf "2. Checking for WebSocket server...\n"
if lsof -i :9876 2>/dev/null | grep -q LISTEN; then
  printf "   ⚠️  WARNING: WebSocket server still running on port 9876\n"
  lsof -i :9876
  printf "   (May be intentional - verify manually)\n"
else
  printf "   ✅ PASS: No server on port 9876\n"
fi

# 3. Check for temp test files
printf "\n"
printf "3. Checking for temporary test files...\n"
TEMP_FILES=$(find . -maxdepth 1 -name "test-*.js" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TEMP_FILES" -gt 0 ]; then
  printf "   ❌ FAIL: %s temporary test file(s) found:\n" "$TEMP_FILES"
  find . -maxdepth 1 -name "test-*.js" 2>/dev/null
  FAILED=1
else
  printf "   ✅ PASS: No temporary test files\n"
fi

# 4. Check for uncommitted changes
printf "\n"
printf "4. Checking git status...\n"
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  printf "   ⚠️  WARNING: %s uncommitted change(s)\n" "$UNCOMMITTED"
  git status --short
  printf "   (Expected during development - verify these are intentional)\n"
else
  printf "   ✅ PASS: No uncommitted changes\n"
fi

# 5. Check if tests were run recently
printf "\n"
printf "5. Checking test results...\n"
if [ -d "node_modules/.cache/jest" ] || [ -d ".jest" ]; then
  printf "   ✅ INFO: Test artifacts found (tests were run)\n"
else
  printf "   ⚠️  WARNING: No test artifacts found\n"
  printf "   Did you run 'npm test' before validation?\n"
fi

# 6. Check for debug logging
printf "\n"
printf "6. Checking for debug markers...\n"
if [ -d "extension" ] && [ -d "server" ]; then
  DEBUG_COUNT=$(grep -r "🔍 DEBUG" extension/ server/ claude-code/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DEBUG_COUNT" -gt 0 ]; then
    printf "   ❌ FAIL: %s debug marker(s) found:\n" "$DEBUG_COUNT"
    grep -rn "🔍 DEBUG" extension/ server/ claude-code/ 2>/dev/null
    FAILED=1
  else
    printf "   ✅ PASS: No debug markers\n"
  fi
else
  printf "   ⚠️  SKIP: Project directories not found\n"
fi

# 7. Check for console.log in production code
printf "\n"
printf "7. Checking for debug console.log...\n"
if [ -f "extension/background.js" ]; then
  CONSOLE_LOGS=$(grep -n "console\.log" extension/background.js server/websocket-server.js claude-code/index.js 2>/dev/null | grep -v "^\s*//" | wc -l | tr -d ' ')
  if [ "$CONSOLE_LOGS" -gt 20 ]; then
    printf "   ⚠️  WARNING: %s console.log statements (review if temporary)\n" "$CONSOLE_LOGS"
  else
    printf "   ✅ PASS: Console logging reasonable\n"
  fi
else
  printf "   ⚠️  SKIP: Source files not found\n"
fi

printf "\n"
printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
if [ $FAILED -eq 1 ]; then
  printf "❌ PRE-VALIDATION CHECK FAILED\n"
  printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  printf "\n"
  printf "Fix issues above before running /validate\n"
  exit 1
else
  printf "✅ PRE-VALIDATION CHECK PASSED\n"
  printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  printf "\n"
  printf "Ready to run /validate\n"
  exit 0
fi

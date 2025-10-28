#!/bin/bash
# Cleanup after test/debug session
# Run this before marking task complete

printf "%s\n" "🧹 Cleaning up test session..."
printf "\n"

# Kill Chrome instances (testing profile)
printf "%s\n" "🔍 Checking for Chrome (testing profile)..."
CHROME_PIDS=$(ps aux | grep "chrome.*tmp.*chrome-dev-assist-testing" | grep -v grep | awk '{print $2}')
if [ -n "$CHROME_PIDS" ]; then
  printf "   Found Chrome PIDs: %s\n" "$CHROME_PIDS"
  for PID in $CHROME_PIDS; do
    kill $PID 2>/dev/null && printf "   ✅ Killed Chrome PID: %s\n" "$PID" || printf "   ⚠️  Could not kill PID: %s\n" "$PID"
  done
else
  printf "%s\n" "   ✅ No Chrome test instances found"
fi

# Kill WebSocket server
printf "\n"
printf "%s\n" "🔍 Checking for WebSocket server..."
if [ -f .server-pid ]; then
  SERVER_PID=$(cat .server-pid)
  if ps -p $SERVER_PID > /dev/null 2>&1; then
    kill $SERVER_PID 2>/dev/null && printf "   ✅ Server killed (PID: %s)\n" "$SERVER_PID" || printf "%s\n" "   ⚠️  Could not kill server"
  else
    printf "   ℹ️  Server PID %s not running\n" "$SERVER_PID"
  fi
  rm .server-pid
  printf "%s\n" "   ✅ Removed .server-pid file"
else
  # Try to find server by process name
  SERVER_PIDS=$(ps aux | grep "node.*websocket-server" | grep -v grep | awk '{print $2}')
  if [ -n "$SERVER_PIDS" ]; then
    printf "   Found server PIDs: %s\n" "$SERVER_PIDS"
    for PID in $SERVER_PIDS; do
      kill $PID 2>/dev/null && printf "   ✅ Killed server PID: %s\n" "$PID" || printf "   ⚠️  Could not kill PID: %s\n" "$PID"
    done
  else
    printf "%s\n" "   ✅ No server found"
  fi
fi

# Kill any background test processes
printf "\n"
printf "%s\n" "🔍 Checking for background test processes..."
TEST_PIDS=$(ps aux | grep "npm.*test" | grep -v grep | awk '{print $2}')
if [ -n "$TEST_PIDS" ]; then
  printf "   Found test PIDs: %s\n" "$TEST_PIDS"
  for PID in $TEST_PIDS; do
    kill $PID 2>/dev/null && printf "   ✅ Killed test PID: %s\n" "$PID" || printf "   ⚠️  Could not kill PID: %s\n" "$PID"
  done
else
  printf "%s\n" "   ✅ No background tests found"
fi

# Remove temporary files
printf "\n"
printf "%s\n" "🔍 Checking for temporary files..."
TEMP_FILES=$(find . -maxdepth 1 -name "test-*.js" -o -name "reload-*.sh" 2>/dev/null)
if [ -n "$TEMP_FILES" ]; then
  printf "%s\n" "   Found temp files:"
  printf "%s\n" "$TEMP_FILES" | sed 's/^/     /'
  rm -f test-*.js reload-*.sh 2>/dev/null && printf "%s\n" "   ✅ Temp files removed" || printf "%s\n" "   ⚠️  Could not remove some files"
else
  printf "%s\n" "   ✅ No temp files found"
fi

# Remove debug logging (check for 🔍 DEBUG markers)
printf "\n"
printf "%s\n" "🔍 Checking for debug logging in code..."
DEBUG_FILES=$(grep -r "🔍 DEBUG" extension/ server/ 2>/dev/null | cut -d: -f1 | sort -u)
if [ -n "$DEBUG_FILES" ]; then
  printf "%s\n" "   ⚠️  Found debug logging in:"
  printf "%s\n" "$DEBUG_FILES" | sed 's/^/     /'
  printf "%s\n" "   ⚠️  MANUAL ACTION REQUIRED: Remove debug logging before commit"
else
  printf "%s\n" "   ✅ No debug logging found"
fi

# Verify cleanup
printf "\n"
printf "%s\n" "═══════════════════════════════════════"
printf "%s\n" "🔍 VERIFICATION"
printf "%s\n" "═══════════════════════════════════════"

printf "\n"
printf "%s\n" "Chrome test instances:"
REMAINING_CHROME=$(ps aux | grep "chrome.*tmp.*chrome-dev-assist" | grep -v grep)
if [ -n "$REMAINING_CHROME" ]; then
  printf "%s\n" "   ⚠️  Still running:"
  printf "%s\n" "$REMAINING_CHROME" | sed 's/^/     /'
else
  printf "%s\n" "   ✅ None found"
fi

printf "\n"
printf "%s\n" "Node/Server processes:"
REMAINING_NODE=$(ps aux | grep -F "node" | grep -F "server" | grep -v grep)
if [ -n "$REMAINING_NODE" ]; then
  printf "%s\n" "   ⚠️  Still running:"
  printf "%s\n" "$REMAINING_NODE" | sed 's/^/     /'
else
  printf "%s\n" "   ✅ None found"
fi

printf "\n"
printf "%s\n" "Temporary files:"
REMAINING_TEMP=$(find . -maxdepth 1 -name "test-*.js" -o -name "reload-*.sh" 2>/dev/null)
if [ -n "$REMAINING_TEMP" ]; then
  printf "%s\n" "   ⚠️  Still present:"
  printf "%s\n" "$REMAINING_TEMP" | sed 's/^/     /'
else
  printf "%s\n" "   ✅ None found"
fi

printf "\n"
printf "%s\n" "═══════════════════════════════════════"
printf "%s\n" "✅ Cleanup complete!"
printf "%s\n" "═══════════════════════════════════════"

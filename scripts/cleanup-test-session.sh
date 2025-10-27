#!/bin/bash
# Cleanup after test/debug session
# Run this before marking task complete

echo "🧹 Cleaning up test session..."
echo ""

# Kill Chrome instances (testing profile)
echo "🔍 Checking for Chrome (testing profile)..."
CHROME_PIDS=$(ps aux | grep "chrome.*tmp.*chrome-dev-assist-testing" | grep -v grep | awk '{print $2}')
if [ -n "$CHROME_PIDS" ]; then
  echo "   Found Chrome PIDs: $CHROME_PIDS"
  for PID in $CHROME_PIDS; do
    kill $PID 2>/dev/null && echo "   ✅ Killed Chrome PID: $PID" || echo "   ⚠️  Could not kill PID: $PID"
  done
else
  echo "   ✅ No Chrome test instances found"
fi

# Kill WebSocket server
echo ""
echo "🔍 Checking for WebSocket server..."
if [ -f .server-pid ]; then
  SERVER_PID=$(cat .server-pid)
  if ps -p $SERVER_PID > /dev/null 2>&1; then
    kill $SERVER_PID 2>/dev/null && echo "   ✅ Server killed (PID: $SERVER_PID)" || echo "   ⚠️  Could not kill server"
  else
    echo "   ℹ️  Server PID $SERVER_PID not running"
  fi
  rm .server-pid
  echo "   ✅ Removed .server-pid file"
else
  # Try to find server by process name
  SERVER_PIDS=$(ps aux | grep "node.*websocket-server" | grep -v grep | awk '{print $2}')
  if [ -n "$SERVER_PIDS" ]; then
    echo "   Found server PIDs: $SERVER_PIDS"
    for PID in $SERVER_PIDS; do
      kill $PID 2>/dev/null && echo "   ✅ Killed server PID: $PID" || echo "   ⚠️  Could not kill PID: $PID"
    done
  else
    echo "   ✅ No server found"
  fi
fi

# Kill any background test processes
echo ""
echo "🔍 Checking for background test processes..."
TEST_PIDS=$(ps aux | grep "npm.*test" | grep -v grep | awk '{print $2}')
if [ -n "$TEST_PIDS" ]; then
  echo "   Found test PIDs: $TEST_PIDS"
  for PID in $TEST_PIDS; do
    kill $PID 2>/dev/null && echo "   ✅ Killed test PID: $PID" || echo "   ⚠️  Could not kill PID: $PID"
  done
else
  echo "   ✅ No background tests found"
fi

# Remove temporary files
echo ""
echo "🔍 Checking for temporary files..."
TEMP_FILES=$(find . -maxdepth 1 -name "test-*.js" -o -name "reload-*.sh" 2>/dev/null)
if [ -n "$TEMP_FILES" ]; then
  echo "   Found temp files:"
  echo "$TEMP_FILES" | sed 's/^/     /'
  rm -f test-*.js reload-*.sh 2>/dev/null && echo "   ✅ Temp files removed" || echo "   ⚠️  Could not remove some files"
else
  echo "   ✅ No temp files found"
fi

# Remove debug logging (check for 🔍 DEBUG markers)
echo ""
echo "🔍 Checking for debug logging in code..."
DEBUG_FILES=$(grep -r "🔍 DEBUG" extension/ server/ 2>/dev/null | cut -d: -f1 | sort -u)
if [ -n "$DEBUG_FILES" ]; then
  echo "   ⚠️  Found debug logging in:"
  echo "$DEBUG_FILES" | sed 's/^/     /'
  echo "   ⚠️  MANUAL ACTION REQUIRED: Remove debug logging before commit"
else
  echo "   ✅ No debug logging found"
fi

# Verify cleanup
echo ""
echo "═══════════════════════════════════════"
echo "🔍 VERIFICATION"
echo "═══════════════════════════════════════"

echo ""
echo "Chrome test instances:"
REMAINING_CHROME=$(ps aux | grep "chrome.*tmp.*chrome-dev-assist" | grep -v grep)
if [ -n "$REMAINING_CHROME" ]; then
  echo "   ⚠️  Still running:"
  echo "$REMAINING_CHROME" | sed 's/^/     /'
else
  echo "   ✅ None found"
fi

echo ""
echo "Node/Server processes:"
REMAINING_NODE=$(ps aux | grep -E "node.*(server|test)" | grep -v grep)
if [ -n "$REMAINING_NODE" ]; then
  echo "   ⚠️  Still running:"
  echo "$REMAINING_NODE" | sed 's/^/     /'
else
  echo "   ✅ None found"
fi

echo ""
echo "Temporary files:"
REMAINING_TEMP=$(find . -maxdepth 1 -name "test-*.js" -o -name "reload-*.sh" 2>/dev/null)
if [ -n "$REMAINING_TEMP" ]; then
  echo "   ⚠️  Still present:"
  echo "$REMAINING_TEMP" | sed 's/^/     /'
else
  echo "   ✅ None found"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Cleanup complete!"
echo "═══════════════════════════════════════"

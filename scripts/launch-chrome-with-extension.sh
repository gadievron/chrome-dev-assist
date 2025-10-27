#!/bin/bash
# Launch Chrome with Chrome Dev Assist extension loaded
# Usage: ./scripts/launch-chrome-with-extension.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
EXTENSION_DIR="$PROJECT_ROOT/extension"

# Chrome binary location (macOS)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# User data directory for testing (isolated from regular Chrome profile)
USER_DATA_DIR="/tmp/chrome-dev-assist-testing"

echo "🚀 Launching Chrome with Chrome Dev Assist extension..."
echo ""
echo "Extension directory: $EXTENSION_DIR"
echo "User data directory: $USER_DATA_DIR"
echo ""

# Clean up old user data directory
if [ -d "$USER_DATA_DIR" ]; then
  echo "⚠️  Cleaning up old user data directory..."
  rm -rf "$USER_DATA_DIR"
fi

# Launch Chrome with extension loaded
# --load-extension loads the extension
# --user-data-dir uses isolated profile (won't interfere with your regular Chrome)
# --no-first-run skips first-run wizard
# --no-default-browser-check skips default browser check
"$CHROME" \
  --load-extension="$EXTENSION_DIR" \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  &

CHROME_PID=$!

echo "✅ Chrome launched (PID: $CHROME_PID)"
echo ""
echo "📋 Next steps:"
echo "  1. Wait for Chrome to open"
echo "  2. Extension will auto-connect to WebSocket server (localhost:9876)"
echo "  3. Run tests: npm test"
echo ""
echo "To kill Chrome:"
echo "  kill $CHROME_PID"
echo ""

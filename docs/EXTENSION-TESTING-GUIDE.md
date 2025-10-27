# Chrome Dev Assist Extension Testing Guide

**For:** Claude Code AI assistance
**Purpose:** Instructions on how to interact with the extension for testing
**Version:** 1.0 (2025-10-25)

---

## Quick Reference

**Extension:** Chrome Dev Assist (Browser DevTools Remote Control)
**Server:** WebSocket server on localhost:9876
**Install Location:** `/Users/gadievron/Documents/Claude Code/chrome-dev-assist/extension`

---

## Core Functionality

### What the Extension Does

1. **Connects to WebSocket Server** (localhost:9876)
2. **Captures Console Output** from all browser tabs
3. **Executes Remote Commands** sent by server:
   - `open-url` - Navigate to URL
   - `get-console` - Retrieve console logs
   - `reload-tab` - Reload specific tab
   - `close-tab` - Close specific tab

### Key States

- **CONNECTING** → Extension trying to connect to server
- **CONNECTED** → WebSocket connection established
- **REGISTERED** → Extension sent registration, awaiting ACK
- **READY** → Fully operational, can execute commands
- **RECONNECTING** → Connection lost, attempting reconnection

---

## How to Check Extension Status

### Method 1: View Service Worker Console

```bash
# 1. Open chrome://extensions in browser
# 2. Find "Chrome Dev Assist"
# 3. Click "service worker" link (creates DevTools for background.js)
# 4. Check console output
```

**What to Look For:**
- ✅ `Connected to server at [timestamp]` - Connection successful
- ✅ `Registration confirmed by server` - Ready to receive commands
- ⚠️ `WebSocket connection issue (will reconnect)` - Expected if server down
- ❌ Red console.error messages - Programming bugs (investigate!)

### Method 2: Check Server Logs

```bash
# Server shows connected extensions
$ curl http://localhost:9876/list-extensions
{
  "extensions": [
    {
      "extensionId": "abc123...",
      "connectedAt": "2025-10-25T20:27:07.484Z",
      "registered": true
    }
  ]
}
```

### Method 3: Check Reload Button Visibility

```bash
# Navigate to: chrome://extensions
# Find "Chrome Dev Assist"
# Verify reload button (↻) is VISIBLE
```

**If reload button is MISSING:**
- Chrome thinks extension crashed
- Check for console.error() in service worker console
- See RELOAD-BUTTON-FIX.md for details

---

## Common Testing Scenarios

### Scenario 1: Test Extension Connects on Startup

**User Story:** As a developer, I want the extension to automatically connect when Chrome starts

**Steps:**
```bash
# 1. Start server
npm run server

# 2. Launch Chrome with extension
./scripts/launch-chrome-with-extension.sh

# 3. Check service worker console (Method 1 above)
# Expected: "Connected to server" within 5 seconds

# 4. Verify registration
# Expected: "Registration confirmed by server" within 5 seconds
```

**What Can Go Wrong:**
- Server not running → See yellow warning (console.warn)
- Server running on different port → Connection timeout
- Extension not loaded → Check chrome://extensions

### Scenario 2: Test Extension Reconnects After Server Restart

**User Story:** As a developer, I want the extension to reconnect when I restart the server

**Steps:**
```bash
# 1. Start server and connect extension (Scenario 1)

# 2. Kill server
kill $(cat .server-pid)

# 3. Check service worker console
# Expected: "Disconnected from server, will reconnect with backoff..."
# Expected: Yellow warnings (console.warn) for reconnection attempts

# 4. Restart server
npm run server

# 5. Wait for reconnection
# Expected: "Connected to server" within 30 seconds
# Expected: "Registration confirmed by server"
```

**Known Issue:** ISSUE-012 - Extension may not reconnect automatically
**Workaround:** Reload extension in chrome://extensions

### Scenario 3: Test Command Execution

**User Story:** As a test, I want to send commands to the extension

**Steps:**
```bash
# 1. Connect extension (Scenario 1)

# 2. Send command via server API
curl -X POST http://localhost:9876/execute \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "YOUR_EXTENSION_ID",
    "command": {
      "type": "open-url",
      "url": "https://example.com",
      "testId": "test-123"
    }
  }'

# 3. Check service worker console
# Expected: "[ChromeDevAssist] Command received: open-url"
# Expected: New tab opens with example.com

# 4. Check console capture
curl http://localhost:9876/get-console/test-123
```

**What Can Go Wrong:**
- Extension not registered → Command rejected
- Invalid command type → console.error in service worker
- Tab blocked by popup blocker → Check Chrome settings

### Scenario 4: Test Crash Recovery

**User Story:** As a developer, I want to verify the extension doesn't crash Chrome

**Steps:**
```bash
# 1. Stop server
kill $(cat .server-pid)

# 2. Reload extension in chrome://extensions
# Click reload button (↻)

# 3. Check service worker console
# Expected: YELLOW warnings (console.warn) for connection failures
# NOT EXPECTED: RED errors (console.error)

# 4. Check reload button still visible
# Navigate to chrome://extensions
# Verify reload button (↻) is STILL VISIBLE

# 5. If reload button disappeared:
# - Take screenshot
# - Check for console.error() in service worker
# - Report as bug with screenshot
```

**Why This Matters:**
- console.error() triggers Chrome crash detection
- Chrome hides reload button for "crashed" extensions
- See RELOAD-BUTTON-FIX.md for root cause analysis

### Scenario 5: Test Message Queue Overflow

**User Story:** As a tester, I want to verify the extension handles message queue overflow

**Steps:**
```bash
# 1. Connect extension with server STOPPED (queues messages)

# 2. Send 150 commands while server is stopped
for i in {1..150}; do
  # Extension will queue these messages
  echo "Queuing message $i"
done

# 3. Check service worker console
# Expected: "Message queue full (100), dropping oldest message"

# 4. Start server
npm run server

# 5. Verify only last 100 messages are sent
# Check server logs for received messages
```

**Security Concern:** Queue overflow can cause DoS
**Mitigation:** MAX_QUEUE_SIZE = 100 (enforced)

---

## Verification Checklist

Before considering extension "working", verify:

- [ ] ✅ Extension connects within 5 seconds of server start
- [ ] ✅ Registration confirmed within 5 seconds of connection
- [ ] ✅ Reload button visible in chrome://extensions
- [ ] ⚠️ Connection failures show console.warn (yellow), NOT console.error (red)
- [ ] ✅ Extension reconnects after server restart (within 30s)
- [ ] ✅ Commands execute successfully (open-url, get-console, etc.)
- [ ] ✅ Console capture works for all tabs
- [ ] ✅ Message queue enforces MAX_QUEUE_SIZE limit
- [ ] ✅ No red console.error messages in service worker (except for programming bugs)

---

## When to Ask User for Manual Testing

**DO ask user when:**
1. Verifying reload button visibility (can't automate Chrome UI inspection)
2. Testing across Chrome restarts (requires user action)
3. Debugging visual issues (screenshots needed)
4. Testing user-facing features (popup, options page)

**DON'T ask user when:**
1. Running automated Jest tests (run directly)
2. Checking server logs (curl requests work)
3. Verifying code exists (Read tool works)
4. Running scripts (Bash tool works)

---

## Extension File Structure

```
extension/
├── manifest.json          - Extension metadata, permissions
├── background.js          - Service worker (WebSocket client)
├── content-script.js      - Injected into pages (console capture)
├── popup.html            - Extension popup UI
├── popup.js              - Popup logic
└── icons/                - Extension icons
```

**Key Files for Testing:**
- `background.js:569` - Auto-connects on extension load
- `background.js:516-530` - ws.onerror handler (uses console.warn)
- `background.js:532-556` - ws.onclose handler (triggers reconnection)
- `background.js:259-269` - Connection timeout (5 seconds)
- `background.js:335-344` - Registration timeout (5 seconds)

---

## Test Categories

### Unit Tests
- `tests/unit/timeout-wrapper.test.js` - Async timeout handling
- `tests/unit/websocket-mock.test.js` - WebSocket mocking utilities

### Integration Tests
- `tests/integration/reconnection-behavior.test.js` - Full reconnection flow
- `tests/integration/reload-button-fix.test.js` - Chrome crash prevention
- `tests/integration/chrome-crash-prevention.test.js` - Error handling patterns
- `tests/integration/resource-cleanup.test.js` - Cleanup verification

### Security Tests
- `tests/security/websocket-client-security.test.js` - 6 known vulnerabilities

### HTML Tests (Manual)
- `tests/html/test-reload-button-persistence.html` - Interactive reload button test

---

## Common Issues

### Issue 1: Extension Not Connecting

**Symptoms:** No "Connected to server" message in service worker console

**Diagnosis:**
```bash
# Check server running
curl http://localhost:9876/health
# Expected: {"status":"ok"}

# Check extension loaded
# Navigate to chrome://extensions
# Verify "Chrome Dev Assist" is enabled

# Check for errors
# Open service worker console (Method 1)
# Look for red console.error messages
```

**Fixes:**
1. Start server: `npm run server`
2. Reload extension: Click reload button (↻) in chrome://extensions
3. Check port: Verify server on port 9876 (not 9877, etc.)

### Issue 2: Reload Button Disappeared

**Symptoms:** Can't reload extension, button missing from chrome://extensions

**Root Cause:** Chrome saw console.error() in error handlers

**Diagnosis:**
```bash
# Check service worker console
# Look for RED console.error messages

# Check for crash detection trigger
# Look for errors related to:
# - WebSocket connection failures
# - Connection timeouts
# - Registration timeouts
```

**Fix:** See RELOAD-BUTTON-FIX.md
**Prevention:** Use console.warn for expected failures, console.error only for bugs

### Issue 3: Extension Not Reconnecting (ISSUE-012)

**Symptoms:** Extension connected, server restarted, no reconnection

**Root Cause:** See REGISTRATION-TIMEOUT-DEBUG-FINDINGS.md

**Diagnosis:**
```bash
# 1. Connect extension
# 2. Kill server: kill $(cat .server-pid)
# 3. Wait 60 seconds
# 4. Restart server: npm run server
# 5. Wait 60 seconds
# 6. Check connection: curl http://localhost:9876/list-extensions
# Expected: Extension should reconnect
# Actual: Extension may not reconnect
```

**Workaround:** Reload extension manually in chrome://extensions

**Status:** Root cause identified, fix pending

---

## Useful Commands

### Server Management
```bash
# Start server
npm run server

# Check server health
curl http://localhost:9876/health

# List connected extensions
curl http://localhost:9876/list-extensions

# Get console logs for test
curl http://localhost:9876/get-console/test-id-123

# Kill server
kill $(cat .server-pid)
```

### Extension Management
```bash
# Launch Chrome with extension
./scripts/launch-chrome-with-extension.sh

# Kill Chrome
./scripts/kill-chrome.sh

# Cleanup test artifacts
./scripts/cleanup-test-session.sh
```

### Test Execution
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/integration/reload-button-fix.test.js

# Run HTML tests (manual)
open tests/html/test-reload-button-persistence.html
```

---

## When in Doubt

1. **Check service worker console** (Method 1) - Most issues show up here
2. **Verify reload button visible** - If missing, extension "crashed" in Chrome's view
3. **Check server logs** - See what server received/sent
4. **Run cleanup script** - `./scripts/cleanup-test-session.sh` fixes 80% of issues
5. **Reload extension** - Click reload button (↻) in chrome://extensions

---

**Last Updated:** 2025-10-25
**Related Docs:** RELOAD-BUTTON-FIX.md, ISSUE-012.md, REGISTRATION-TIMEOUT-DEBUG-FINDINGS.md

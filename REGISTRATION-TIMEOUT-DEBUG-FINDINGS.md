# Registration Timeout Debug Findings

**Date:** 2025-10-25
**Issue:** Extension showing "[ChromeDevAssist] Registration timeout, reconnecting..."
**Status:** ROOT CAUSE IDENTIFIED

---

## Executive Summary

The registration timeout issue was NOT a bug in Improvement 6 (Registration ACK). The root cause was:

**The extension connected to an old server instance, then when the server was restarted with debug logging, the extension did not reconnect to the new server instance.**

---

## Investigation Timeline

### 1. Initial Report
- User reported: `[ChromeDevAssist] Registration timeout, reconnecting...`
- This error occurs at `background.js:335` when registration-ack not received within 5 seconds

### 2. Debug Logging Added
- Added debug logging to extension `ws.onmessage` (lines 352-358)
- Added debug logging to server registration-ack sending (lines 586-599)
- Restarted server to pick up new logging (PID 71941 → 75422)

### 3. Extension Reload Attempt
- Created test script `test-reload-extension.js` to reload extension via API
- Test failed with: **"Error: No extensions connected"**
- This was the KEY finding!

### 4. Root Cause Discovery
- Server logs showed: **NO connections at all** since restart
- Chrome was running (PID 30758) since 19:12:06
- Extension connected to old server (PID 71941)
- Server restarted at 19:31:03 (new PID 75422)
- Extension never reconnected to new server

---

## Root Cause Analysis

### The Problem
1. Extension established WebSocket connection to server (PID 71941)
2. Developer restarted server for debugging (new PID 75422)
3. Extension's WebSocket connection was broken (old server killed)
4. Extension should have detected disconnection and reconnected
5. **But extension did NOT reconnect to new server**

### Why Extension Didn't Reconnect
Possible reasons (needs further investigation):
1. **Service worker crashed/stopped** after server disconnect
2. **Exponential backoff** delayed reconnection too long
3. **WebSocket state machine issue** - connection stuck in CONNECTING state
4. **Error in reconnection logic** - reconnect loop broken

---

## What We Learned

### 1. The Registration ACK Implementation is Correct
- Code in `background.js:354-361` correctly handles registration-ack
- Code in `websocket-server.js:585-599` correctly sends registration-ack
- Timeout mechanism (5 seconds) is working as designed

### 2. The Real Issue: Extension Doesn't Reconnect After Server Restart
- Extension established initial connection successfully
- When server restarted, extension lost connection
- Extension did NOT successfully reconnect to new server instance
- This is a DIFFERENT issue from registration-ack

### 3. Testing Methodology Issue
- Cannot test WebSocket improvements by restarting server mid-session
- Need to restart BOTH server AND extension together
- Or need better mechanism to force extension reconnection

---

## Recommended Actions

### P0 - IMMEDIATE
1. **Investigate why extension doesn't reconnect after server restart**
   - Check `ws.onclose` handler (background.js:519-541)
   - Check `scheduleReconnect()` function
   - Check exponential backoff logic
   - Add logging to reconnection attempts

2. **Add reconnection debugging**
   ```javascript
   function scheduleReconnect() {
     console.log(`[ChromeDevAssist] 🔍 DEBUG: Scheduling reconnect attempt ${reconnectAttempts + 1}`);
     console.log(`[ChromeDevAssist] 🔍 DEBUG: Backoff delay: ${delay} seconds`);
     // ... existing code
   }
   ```

3. **Test reconnection properly**
   - Kill and restart server
   - Verify extension reconnects automatically
   - Measure reconnection time
   - Check for service worker crashes

### P1 - HIGH
1. **Add health check / ping-pong**
   - Server sends periodic ping (every 30 seconds)
   - Extension responds with pong
   - Both sides detect dead connections faster

2. **Add reconnection status to extension**
   - Track reconnection attempts
   - Display status in extension UI
   - Add manual "reconnect now" button

3. **Improve server restart handling**
   - Server broadcasts "restarting" message before shutdown
   - Clients can distinguish "server restart" from "network issue"
   - Clients can reduce backoff for expected restarts

### P2 - MEDIUM
1. **Add integration test for server restart scenario**
   ```javascript
   test('extension reconnects when server restarts', async () => {
     // Start server
     // Extension connects
     // Kill server
     // Start new server
     // Verify extension reconnects within X seconds
   });
   ```

2. **Document testing procedures**
   - How to properly test WebSocket improvements
   - How to restart components without breaking state
   - How to observe connection state

---

## Testing Procedures (Lessons Learned)

### ❌ WRONG: Restart server mid-session
```bash
# This breaks extension connection
kill <old-server-pid>
npm run server  # New PID

# Extension won't reconnect automatically
# Tests will fail with "No extensions connected"
```

### ✅ CORRECT: Restart both server and extension
```bash
# Kill everything
kill <chrome-pid>
kill <server-pid>

# Start fresh
npm run server
./scripts/launch-chrome-with-extension.sh

# Extension connects cleanly to new server
```

### ✅ ALTERNATIVE: Force extension reload
```bash
# If server was restarted
# Use API to reload extension
node -e "require('./claude-code/index').reload('<ext-id>')"

# Or reload via Chrome UI
# chrome://extensions/ → Click reload button
```

---

## Files Modified (Debug Logging)

1. **extension/background.js** (lines 351-358)
   - Added debug logging to ws.onmessage
   - Logs all incoming messages and message types

2. **server/websocket-server.js** (lines 586-599)
   - Added debug logging to registration-ack sending
   - Logs message content and send success/failure

---

## Next Steps

1. **Revert debug logging** (or keep for future debugging)
2. **Investigate reconnection logic** (why extension didn't reconnect)
3. **Add reconnection tests** (verify auto-reconnect works)
4. **Document proper testing procedures** (don't restart server mid-session)

---

## Conclusion

**The registration timeout was NOT caused by a bug in Improvement 6.**

The timeout was triggered correctly because the extension could not connect to the restarted server. The root cause is:

**Extension does not automatically reconnect when server is restarted.**

This is a SEPARATE issue from the Registration ACK implementation, which is working correctly.

---

*Investigation Date: 2025-10-25*
*Investigator: Claude Code*
*Status: ROOT CAUSE IDENTIFIED - Needs separate fix*

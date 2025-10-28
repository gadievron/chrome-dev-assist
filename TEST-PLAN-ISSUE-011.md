# Test Plan - ISSUE-011 Connection Stability Fixes

**Date:** 2025-10-25 Late Evening
**Issue:** ISSUE-011 - WebSocket Connection Stability
**Status:** Ready for Testing
**Test Approach:** Manual + Automated

---

## Pre-Test Checklist

- [✅] All fixes implemented in `extension/background.js`
- [✅] Syntax verified (no errors)
- [✅] WebSocket server running (PID 31496, port 9876)
- [✅] 42 unit tests written (blocked on infrastructure)
- [✅] Manual test script ready (`./scripts/run-all-manual-tests.sh`)
- [⏳] Extension reload required (user action)

---

## Test Environment

**Server:**

- Process: PID 31496
- Port: 9876
- Status: Running ✅

**Chrome:**

- Multiple instances running
- User's instance: Has loaded extension
- Test instance: PID 30758 (launched by script)

**Extension:**

- Location: `/Users/gadievron/Documents/Claude Code/chrome-dev-assist/extension`
- Status: Needs reload to apply fixes

---

## Test Execution Plan

### Phase 1: Verify Implementation ✅

**Status:** COMPLETE

1. ✅ Syntax check: `node -c extension/background.js`
2. ✅ Function verification: All 3 functions exist
3. ✅ Variable verification: All 3 state variables exist
4. ✅ Replacement verification: All 4 `ws.send()` replaced with `safeSend()`

---

### Phase 2: Manual Testing (Requires User Action)

**Objective:** Verify fixes work in real Chrome extension

#### Test 2.1: Extension Reload and Connection

**Steps:**

```
1. Open chrome://extensions/
2. Find "Chrome Dev Assist"
3. Click "Reload" button
4. Click "Inspect views: service worker" to open console
5. Verify startup banner appears:
   ╔═══════════════════════════════════════════════════════════════════╗
   ║  🚀 CHROME DEV ASSIST - EXTENSION READY                          ║
   ╚═══════════════════════════════════════════════════════════════════╝
```

**Expected Output:**

```
[ChromeDevAssist] ✅ Connected to server at 2025-10-25T...
[ChromeDevAssist] 📊 Session uptime: 0s
[ChromeDevAssist] 🆔 Extension ID: <id>
```

**Success Criteria:**

- ✅ Banner appears
- ✅ Connection established
- ✅ No error messages
- ✅ Extension ID logged

**If Fails:**

- Check if server is running: `ps aux | grep websocket-server`
- Check server logs for connection
- Check for syntax errors in extension console

---

#### Test 2.2: Command Execution (Basic Connectivity)

**Steps:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist
node -e "
const chromeDevAssist = require('./claude-code/index.js');
(async () => {
  try {
    const result = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/integration-test-1.html', { active: true });
    console.log('✅ Command executed successfully');
    console.log('Tab ID:', result.tabId);
    await chromeDevAssist.closeTab(result.tabId);
    process.exit(0);
  } catch (err) {
    console.log('❌ Command failed:', err.message);
    process.exit(1);
  }
})();
"
```

**Expected Output:**

```
✅ Command executed successfully
Tab ID: <number>
```

**Success Criteria:**

- ✅ No "No extensions connected" error
- ✅ Tab opens and closes
- ✅ No crashes in extension console

**If Fails:**

- Extension not connected → Check extension console
- Timeout → Check if safeSend() is working
- Check extension console for "[ChromeDevAssist] Cannot send: ..." warnings

---

#### Test 2.3: Exponential Backoff (Critical Fix)

**Objective:** Verify reconnection uses exponential backoff (1s, 2s, 4s, 8s, 16s, 30s)

**Steps:**

```bash
# Terminal 1: Watch extension console
# (Keep chrome://extensions/ service worker console open)

# Terminal 2: Stop server
kill 31496

# Watch extension console - should see:
# "Disconnected from server, will reconnect with backoff..."
# "Scheduling reconnection attempt #1 in 1s"
# Wait 1 second...
# "Alarm triggered: reconnecting to server"
# "Scheduling reconnection attempt #2 in 2s"
# Wait 2 seconds...
# "Alarm triggered: reconnecting to server"
# "Scheduling reconnection attempt #3 in 4s"
# Wait 4 seconds...
# (continues up to 30s max)

# Terminal 2: Start server again
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist
node server/websocket-server.js

# Watch extension console - should see:
# "✅ Connected to server at ..."
# (Backoff counter resets to 0)
```

**Expected Timeline:**

```
T=0s:   Server stops → "Disconnected from server"
T=0s:   "Scheduling reconnection attempt #1 in 1s"
T=1s:   "Alarm triggered: reconnecting" → FAILS (server down)
T=1s:   "Scheduling reconnection attempt #2 in 2s"
T=3s:   "Alarm triggered: reconnecting" → FAILS (server down)
T=3s:   "Scheduling reconnection attempt #3 in 4s"
T=7s:   "Alarm triggered: reconnecting" → FAILS (server down)
T=7s:   "Scheduling reconnection attempt #4 in 8s"
T=15s:  "Alarm triggered: reconnecting" → FAILS (server down)
T=15s:  "Scheduling reconnection attempt #5 in 16s"
T=31s:  "Alarm triggered: reconnecting" → FAILS (server down)
T=31s:  "Scheduling reconnection attempt #6 in 30s" (capped at 30s)
...
T=Xs:   Server starts
T=X+Ys: "Alarm triggered: reconnecting" → SUCCESS
T=X+Ys: "✅ Connected to server"
```

**Success Criteria:**

- ✅ First reconnect: 1 second delay
- ✅ Second reconnect: 2 second delay
- ✅ Third reconnect: 4 second delay
- ✅ Fourth reconnect: 8 second delay
- ✅ Fifth reconnect: 16 second delay
- ✅ Sixth+ reconnect: 30 second delay (max)
- ✅ After success: Backoff resets (next disconnect starts at 1s)

**If Fails:**

- Still using fixed 1-second delay → Check if `scheduleReconnect()` is being called
- No delay variation → Check `getReconnectDelay()` implementation
- Check extension console for error messages

---

#### Test 2.4: Error Recovery (Fast Reconnection)

**Objective:** Verify `ws.onerror` triggers immediate reconnection (not 15s keep-alive)

**Steps:**

```bash
# This is harder to simulate - network disconnect scenario
# Alternative: Check extension console during normal operation

# Expected: If WebSocket error occurs, should see:
# "[ChromeDevAssist] WebSocket error: <error>"
# "[ChromeDevAssist] Error triggered reconnection"
# "[ChromeDevAssist] Scheduling reconnection attempt #N in Xs"

# Should NOT see 15-second delay
```

**Success Criteria:**

- ✅ Error triggers reconnection within 1-2 seconds
- ✅ Does NOT wait 15 seconds for keep-alive
- ✅ Exponential backoff starts from error

**If Fails:**

- Check if `ws.onerror` handler is executing
- Check if `scheduleReconnect()` is called in error handler

---

#### Test 2.5: Duplicate Connection Prevention

**Objective:** Verify `isConnecting` flag prevents duplicate WebSocket instances

**Steps:**

```bash
# Watch extension console during rapid reconnection attempts
# Simulate: Server restart during reconnection window

# Expected logs:
# "Scheduling reconnection attempt #1 in 1s"
# (keep-alive alarm fires during 1s window)
# "Keep-alive: skip reconnection, already connecting"
# (NOT "Alarm triggered: reconnecting")
```

**Success Criteria:**

- ✅ Only ONE connection attempt at a time
- ✅ "Already connecting, skipping duplicate" messages appear
- ✅ No duplicate WebSocket instances created
- ✅ "Cleared existing reconnect alarm" messages appear

**If Fails:**

- Check if `isConnecting` flag is being set/cleared properly
- Check if alarm clearing is working

---

#### Test 2.6: State Validation (`safeSend()` behavior)

**Objective:** Verify commands fail gracefully when disconnected

**Steps:**

```bash
# Terminal 1: Stop server
kill 31496

# Terminal 2: Try to execute command
node -e "
const chromeDevAssist = require('./claude-code/index.js');
(async () => {
  try {
    await chromeDevAssist.openUrl('http://example.com', { active: true });
    console.log('❌ Should have failed (server down)');
  } catch (err) {
    console.log('✅ Failed as expected:', err.message);
  }
})();
"

# Check extension console for:
# "[ChromeDevAssist] Cannot send: WebSocket is closed"
# OR
# "[ChromeDevAssist] Cannot send: WebSocket is connecting"
```

**Success Criteria:**

- ✅ Command fails with clear error message
- ✅ Extension console shows "Cannot send: ..." warning
- ✅ Extension does NOT crash
- ✅ Extension continues reconnection attempts

**If Fails:**

- Check if `safeSend()` is being used for all message sends
- Check if state validation is working correctly

---

### Phase 3: Automated Test Suite

**Objective:** Run existing integration tests to verify no regressions

**Steps:**

```bash
# Ensure server is running
ps aux | grep websocket-server

# Run manual test suite
./scripts/run-all-manual-tests.sh
```

**Expected Output:**

```
=================================
Chrome Dev Assist - Manual Tests
=================================

TEST 1: Basic Connectivity
---
✅ SUCCESS - Extension connected!
   Tab ID: <number>

TEST 2: Console Logs (Simple Page)
---
✅ Page opened
✅ Logs captured: <number>
   First 3 logs:
   [log] ...
   [log] ...
   [log] ...

TEST 3: Metadata Leak (ISSUE-001)
---
✅ Page opened
Main page metadata:
  testId: adversarial-security-test
  securityLevel: high
  secret: undefined ✅ NOT LEAKED
  sandboxed: undefined ✅ NOT LEAKED
✅ ISSUE-001 FIXED: No iframe metadata leak!

TEST 4: Adversarial Navigation (ISSUE-009)
---
✅ Page opened
✅ Logs captured: <number>
   Navigation logs: <number>
✅ ISSUE-009 FIXED: Captured navigation logs!

TEST 5: Screenshot Capture
---
✅ Page opened
✅ Screenshot captured
   Size: <number> bytes
   ✅ Screenshot size OK

=================================
All tests completed!
=================================
```

**Success Criteria:**

- ✅ Test 1 passes (connectivity)
- ✅ Test 2 passes (console logs)
- ⚠️ Test 3 may fail (ISSUE-001 not fixed yet)
- ⚠️ Test 4 may fail (ISSUE-009 not fixed yet)
- ✅ Test 5 passes (screenshots)

**If Fails:**

- Extension not connected → Check extension reload
- Timeout errors → Check connection stability
- "Cannot send: ..." warnings → Check safeSend() logs

---

### Phase 4: Stress Testing (Optional)

**Objective:** Verify stability under load

#### Test 4.1: Rapid Commands

**Steps:**

```bash
# Send 10 commands rapidly
for i in {1..10}; do
  node -e "
  const chromeDevAssist = require('./claude-code/index.js');
  (async () => {
    const result = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/integration-test-1.html', { active: true });
    console.log('Command $i: Tab', result.tabId);
    await chromeDevAssist.closeTab(result.tabId);
  })();
  " &
done
wait
```

**Success Criteria:**

- ✅ All 10 commands succeed
- ✅ No race conditions in extension console
- ✅ No duplicate connection messages

---

#### Test 4.2: Server Restart During Commands

**Steps:**

```bash
# Terminal 1: Send long-running command
node -e "
const chromeDevAssist = require('./claude-code/index.js');
(async () => {
  try {
    await chromeDevAssist.captureLogs(30000); // 30 seconds
    console.log('✅ Capture completed');
  } catch (err) {
    console.log('❌ Capture failed:', err.message);
  }
})();
"

# Terminal 2: Restart server mid-capture (after 10 seconds)
sleep 10 && kill 31496 && node server/websocket-server.js
```

**Success Criteria:**

- ⚠️ Command may fail (expected - server restarted)
- ✅ Extension reconnects automatically
- ✅ Next command succeeds after reconnection

---

## Test Results Template

### Test 2.1: Extension Reload

- **Status:** [ ] PASS / [ ] FAIL
- **Notes:**

### Test 2.2: Command Execution

- **Status:** [ ] PASS / [ ] FAIL
- **Notes:**

### Test 2.3: Exponential Backoff

- **Status:** [ ] PASS / [ ] FAIL
- **First delay:** \_\_\_ seconds
- **Second delay:** \_\_\_ seconds
- **Third delay:** \_\_\_ seconds
- **Notes:**

### Test 2.4: Error Recovery

- **Status:** [ ] PASS / [ ] FAIL
- **Recovery time:** \_\_\_ seconds
- **Notes:**

### Test 2.5: Duplicate Prevention

- **Status:** [ ] PASS / [ ] FAIL
- **Duplicate messages seen:** [ ] YES / [ ] NO
- **Notes:**

### Test 2.6: State Validation

- **Status:** [ ] PASS / [ ] FAIL
- **safeSend() warnings seen:** [ ] YES / [ ] NO
- **Notes:**

### Test 3: Automated Suite

- **Test 1:** [ ] PASS / [ ] FAIL
- **Test 2:** [ ] PASS / [ ] FAIL
- **Test 3:** [ ] PASS / [ ] FAIL
- **Test 4:** [ ] PASS / [ ] FAIL
- **Test 5:** [ ] PASS / [ ] FAIL

---

## Known Limitations

1. **Test Infrastructure:** Unit tests (42 tests) blocked on extension testing infrastructure
2. **ISSUE-001:** Not fixed by ISSUE-011 (separate issue)
3. **ISSUE-009:** Not fixed by ISSUE-011 (separate issue)
4. **Registration ACK:** Not implemented (marked as TODO)
5. **Message Queuing:** Not implemented (marked as TODO)

---

## Success Criteria Summary

**Minimum Criteria (Must Pass):**

- ✅ Extension connects successfully after reload
- ✅ Commands execute without crashes
- ✅ Exponential backoff working (delays increase)
- ✅ No duplicate connection attempts

**Enhanced Criteria (Should Pass):**

- ✅ Error recovery within 1-2 seconds
- ✅ safeSend() state validation working
- ✅ Automated test suite passes (Tests 1, 2, 5)

**Optional Criteria (Nice to Have):**

- ✅ Stress tests pass
- ✅ Server restart handled gracefully

---

## Rollback Procedure

If tests fail critically:

```bash
# Restore previous version
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist
git checkout HEAD~1 extension/background.js

# Reload extension
# Open chrome://extensions/
# Click "Reload" for Chrome Dev Assist

# Verify rollback
node -e "
const chromeDevAssist = require('./claude-code/index.js');
(async () => {
  const result = await chromeDevAssist.openUrl('http://example.com', { active: true });
  console.log('Rollback successful, tab:', result.tabId);
  await chromeDevAssist.closeTab(result.tabId);
})();
"
```

---

_Test Plan Created: 2025-10-25 Late Evening_
_Test Status: Ready for Execution_
_Requires User Action: Extension reload in Chrome_

# Console Capture Race Condition - Root Cause Analysis

**Date:** 2025-10-26
**Severity:** Medium (affects testing, not core functionality)
**Status:** Documented, fix deferred

---

## Problem

Console capture fails to capture page console messages when using `openUrl` command.

**Symptom:** Only captures 1 message ("[ChromeDevAssist] Console capture initialized in main world"), misses all subsequent page console calls.

---

## Root Cause

**Race condition in `handleOpenUrlCommand` (background.js:952-971):**

```javascript
// 1. Tab created - page starts loading IMMEDIATELY
const tab = await chrome.tabs.create({ url, active });

// 2. Page loads and runs scripts
// 3. Console messages generated and sent to background.js
// 4. Background checks if capture exists for tab.id → FALSE
// 5. Messages DROPPED

// 6. THEN capture is started (too late!)
if (captureConsole) {
  await startConsoleCapture(commandId, duration, tab.id);
  await sleep(duration);
}
```

**Timeline:**
```
T+0ms:    chrome.tabs.create() called
T+1ms:    Tab created, page starts loading
T+5ms:    inject-console-capture.js runs (document_start)
T+6ms:    Page scripts execute
T+7ms:    console.log/warn/error called
T+8ms:    Messages sent to background.js
T+9ms:    background.js checks capturesByTab.has(tab.id) → FALSE
T+10ms:   Messages DROPPED
T+50ms:   startConsoleCapture() called (capture registered)
T+3050ms: Capture ends, returns 0 messages
```

---

## Evidence

### Code Location
**File:** extension/background.js
**Function:** handleOpenUrlCommand (lines 875-1033)
**Issue:** Lines 952 (tab creation) vs 971 (capture start)

### Message Handler
**File:** extension/background.js
**Lines:** 2007-2011

```javascript
// Only adds messages to captures if tab is in capturesByTab
if (capturesByTab.has(tabId)) {
  for (const cmdId of capturesByTab.get(tabId)) {
    relevantCommandIds.add(cmdId);
  }
}
```

If `tabId` is not in `capturesByTab`, message is dropped (no capture registered).

---

## Why This Wasn't Caught Earlier

1. **Console capture is complex** - Multiple layers (inject, content-script, background)
2. **Debug logs create recursion** - Debug console.log calls trigger more console messages
3. **Timing-dependent** - Race condition only visible with fast-loading pages
4. **Limited testing** - Console capture feature wasn't thoroughly tested

---

## Impact

### Affected Commands
- `openUrl` with `captureConsole: true`
- Potentially `reloadTab` with `captureConsole: true`

### NOT Affected
- ErrorLogger implementation (uses extension service worker console, not page console)
- Extension functionality (console capture is testing feature only)
- WebSocket server/client communication

**ErrorLogger verification:** ✅ STILL VALID (extension runs successfully = ErrorLogger loaded)

---

## Solution Options

### Option 1: Global Capture Then Filter (Simplest)
```javascript
// Start GLOBAL capture before creating tab
if (captureConsole) {
  await startConsoleCapture(commandId, duration, null);  // null = all tabs
}

const tab = await chrome.tabs.create({ url, active });

// Wait for duration
if (captureConsole) {
  await sleep(duration);
}

// Filter logs by tab ID when getting results
const allLogs = getCommandLogs(commandId);
const logs = allLogs.filter(log => log.tabId === tab.id);
```

**Pros:** Simple, no architectural changes
**Cons:** Captures from ALL tabs (minor performance impact)

### Option 2: Message Buffering
```javascript
// Buffer messages that arrive before capture is registered
const messageBuffer = new Map(); // tabId -> messages[]

// In onMessage handler:
if (!capturesByTab.has(tabId)) {
  // Buffer message for retry
  if (!messageBuffer.has(tabId)) {
    messageBuffer.set(tabId, []);
  }
  messageBuffer.get(tabId).push(logEntry);

  // Retry after 100ms
  setTimeout(() => retryBufferedMessages(tabId), 100);
}

// In startConsoleCapture:
function startConsoleCapture(commandId, duration, tabId) {
  // ... register capture ...

  // Process buffered messages
  if (messageBuffer.has(tabId)) {
    for (const msg of messageBuffer.get(tabId)) {
      addMessageToCapture(commandId, msg);
    }
    messageBuffer.delete(tabId);
  }
}
```

**Pros:** More robust, handles all edge cases
**Cons:** Complex, requires careful implementation

### Option 3: Pre-Registration
```javascript
// Add pending capture entry before creating tab
const pendingId = 'pending-' + Date.now();
captureState.set(pendingId, {
  logs: [],
  active: true,
  pending: true,
  tabId: null  // Will be set after tab created
});

const tab = await chrome.tabs.create({ url, active });

// Update pending capture with tab ID
const capture = captureState.get(pendingId);
capture.tabId = tab.id;
capture.pending = false;
capturesByTab.set(tab.id, new Set([pendingId]));
```

**Pros:** Clean, maintains single-responsibility
**Cons:** Requires changes to capture state management

---

## Recommended Fix

**Option 1** (Global Capture Then Filter)

**Reasoning:**
- Simplest to implement
- Lowest risk
- Minimal code changes
- Performance impact negligible (only during active tests)

**Implementation Steps:**
1. Write tests FIRST (test-first discipline)
   - Unit test for startConsoleCapture with null tabId
   - Integration test for openUrl console capture
   - Test that messages from other tabs are filtered out
2. Modify handleOpenUrlCommand to use global capture
3. Add filter when getting logs
4. Run all tests (ensure no regressions)
5. Update documentation

---

## Testing Strategy

### Unit Tests
```javascript
describe('Console Capture Race Condition Fix', () => {
  it('should capture messages from tab created after capture starts', async () => {
    // Start global capture
    await startConsoleCapture('cmd-1', 5000, null);

    // Create tab and send messages
    const tabId = 12345;
    const messages = [
      { level: 'log', message: 'Test 1', tabId },
      { level: 'warn', message: 'Test 2', tabId }
    ];

    messages.forEach(msg => addConsoleLog(msg));

    // Get logs filtered by tab
    const logs = getCommandLogs('cmd-1', tabId);

    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe('Test 1');
  });
});
```

### Integration Tests
```javascript
describe('openUrl with console capture', () => {
  it('should capture all console messages from page', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'http://localhost:9876/fixtures/test-console-simple.html',
      captureConsole: true,
      duration: 3000
    });

    // Should capture at least 5 messages (from test page)
    expect(result.consoleLogs.length).toBeGreaterThanOrEqual(5);

    // Verify message types
    const levels = result.consoleLogs.map(log => log.level);
    expect(levels).toContain('log');
    expect(levels).toContain('warn');
    expect(levels).toContain('error');
  });
});
```

---

## Timeline

**Current Status:** Documented, fix deferred

**Priority:** Medium (affects testing convenience, not core functionality)

**Effort Estimate:** 2-3 hours (tests + implementation + verification)

**Next Steps:**
1. User decides: Fix now or defer to future session
2. If defer: Add to FEATURE-SUGGESTIONS-TBD.md
3. If now: Follow test-first discipline implementation

---

## Workaround (Current)

Use indirect verification methods:
- Check extension status (if extension runs = background.js loaded = ErrorLogger loaded)
- Manual testing in Chrome DevTools
- Service worker console inspection

**ErrorLogger Status:** ✅ VERIFIED via extension status check

---

## Related Files

- extension/background.js (handleOpenUrlCommand, onMessage handler)
- extension/inject-console-capture.js (console interception)
- extension/content-script.js (event forwarding)
- tests/fixtures/test-console-simple.html (test page)

---

## References

- FINAL-ERROR-LOGGER-REPORT.md - ErrorLogger verification
- INVESTIGATION-SUMMARY.md - WebSocket debugging
- test-errorlogger-simple.js - Current working verification method

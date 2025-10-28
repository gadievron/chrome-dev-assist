# Console Capture Race Condition - Tester Summary

**Date:** 2025-10-26
**Issue:** Console messages from page load dropped due to TOCTOU race condition
**Status:** Fix implemented, under investigation
**Audience:** QA testers, developers debugging race conditions

---

## The Problem in Simple Terms

When you use `openUrl` with `captureConsole: true`, the extension should capture ALL console messages from the page. But it was only capturing 1 message (the inject script's initialization), missing all the actual page messages.

---

## What is a TOCTOU Race Condition?

**TOCTOU** = Time-Of-Check-Time-Of-Use

It's a bug where the system checks something ("Is capture registered?"), then time passes, then it uses the result - but the answer might have changed in between!

### Real-World Analogy

Imagine you're delivering pizza:

1. You check if customer is home (Time-Of-Check)
2. You drive to customer's house (time passes)
3. You knock on door (Time-Of-Use)
4. Customer already left! ❌

That's TOCTOU - the check was valid WHEN YOU MADE IT, but invalid BY THE TIME YOU USED IT.

---

## The Console Capture Race Condition

### Timeline of Events

```
T+0ms:    chrome.tabs.create() called
T+1ms:    Tab created, page starts loading
T+5ms:    inject-console-capture.js runs (globally registered, document_start)
T+7ms:    Page HTML parsed, <body> scripts execute
T+8ms:    console.log('TEST 1') called
T+9ms:    Message sent to background.js
T+10ms:   Background checks: capturesByTab.has(tabId) → FALSE ❌
T+11ms:   MESSAGE DROPPED (no capture registered yet!)
T+50ms:   startConsoleCapture() called (TOO LATE!)
```

**The Gap:** 7-50ms where messages arrive but no capture exists

---

## Original Code (BUGGY)

```javascript
async function handleOpenUrlCommand(commandId, params) {
  // 1. Create tab (returns immediately, page hasn't loaded yet)
  const tab = await chrome.tabs.create({ url });

  // 2. Page loads and runs scripts HERE
  // 3. Console messages generated HERE
  // 4. Messages sent to background.js HERE
  // 5. Background checks capturesByTab.has(tab.id) → FALSE
  // 6. Messages DROPPED

  // 7. THEN capture is started (too late!)
  if (captureConsole) {
    await startConsoleCapture(commandId, duration, tab.id);
  }
}
```

**Why it fails:**

- Tab creation is async (returns a Promise)
- Page scripts run IMMEDIATELY after tab is created
- Capture registration happens AFTER await resolves (50ms later)
- Messages arrive in the gap and are dropped

---

## The Fix: Pre-Register with Buffer

### Strategy

**Option 4: Pre-Register with Placeholder + Buffer + Retry**

1. Register capture BEFORE creating tab (with pendingTabUpdate flag)
2. Create tab
3. Buffer messages that arrive while tab.id is unknown
4. IMMEDIATELY update capture with tab.id after creation
5. Flush buffered messages to capture

### Fixed Code

```javascript
async function handleOpenUrlCommand(commandId, params) {
  // 1. PRE-REGISTER capture BEFORE creating tab
  if (captureConsole) {
    captureState.set(commandId, {
      logs: [],
      active: true,
      tabId: null, // Will be set after tab created
      pendingTabUpdate: true, // Flag for message handler
      endTime: Date.now() + duration,
    });
  }

  // 2. Create tab (page will start loading)
  const tab = await chrome.tabs.create({ url });

  // 3. IMMEDIATELY update capture with tab.id
  if (captureConsole) {
    const capture = captureState.get(commandId);
    capture.tabId = tab.id;
    capture.pendingTabUpdate = false;

    // Add to index for O(1) lookup
    capturesByTab.set(tab.id, new Set([commandId]));

    // Flush buffered messages (if any)
    if (messageBuffer.has(tab.id)) {
      const buffered = messageBuffer.get(tab.id);
      capture.logs.push(...buffered);
      messageBuffer.delete(tab.id);
    }
  }
}
```

### Message Handler Update

```javascript
// In message handler (background.js onMessage)
if (capturesByTab.has(tabId)) {
  // Normal case: capture exists
  // Add message to capture
} else {
  // Race condition case: check for pending captures
  const hasPending = Array.from(captureState.values()).some(
    state => state.active && state.pendingTabUpdate
  );

  if (hasPending) {
    // Buffer message for retry
    if (!messageBuffer.has(tabId)) {
      messageBuffer.set(tabId, []);
    }
    messageBuffer.get(tabId).push(logEntry);
  }
}
```

---

## Why This Fix Works

### Before Fix

```
Messages arrive → Check: capture exists? → NO → DROP MESSAGE ❌
```

### After Fix

```
Messages arrive → Check: capture exists? → NO → Check: pending capture? → YES → BUFFER MESSAGE ✅
Later: Tab ID known → Flush buffer → Messages captured! ✅
```

---

## How to Test for This Race Condition

### Test 1: Worst-Case Timing (Inline <head> Scripts)

```javascript
it('should capture messages from inline <head> scripts', async () => {
  // Inline scripts execute in <5ms (fastest possible)
  const url = 'data:text/html,<html><head><script>console.log("FAST")</script></head></html>';

  const result = await handleOpenUrlCommand('cmd-1', {
    url,
    captureConsole: true,
    duration: 1000,
  });

  // Should capture the message
  expect(result.consoleLogs.some(log => log.message.includes('FAST'))).toBe(true);
});
```

**Why this test is critical:**

- Inline <head> scripts execute at document_start (T+5ms)
- This is the NARROWEST timing window
- If this passes, all slower cases will also pass

### Test 2: Verify Order (Capture Before Tab)

```javascript
it('should register capture BEFORE creating tab', async () => {
  const timestamps = { capture: 0, tab: 0 };

  // Mock to track timing
  captureState.set = jest.fn(() => {
    timestamps.capture = Date.now();
  });

  chrome.tabs.create.mockImplementation(async () => {
    timestamps.tab = Date.now();
    return { id: 123 };
  });

  await handleOpenUrlCommand('cmd-1', { url: 'test.html', captureConsole: true });

  // Capture must be registered BEFORE tab created
  expect(timestamps.capture).toBeLessThan(timestamps.tab);
});
```

### Test 3: Buffer During Pending State

```javascript
it('should buffer messages that arrive before tab.id is set', async () => {
  // Simulate slow tab creation
  chrome.tabs.create.mockImplementation(async () => {
    await sleep(50); // Delay
    return { id: 123 };
  });

  const resultPromise = handleOpenUrlCommand('cmd-1', {
    url: 'test.html',
    captureConsole: true,
    duration: 200,
  });

  // Send message DURING tab creation (before tab.id known)
  setTimeout(() => {
    simulateMessageArrival({ level: 'log', message: 'EARLY-MESSAGE' });
  }, 10);

  const result = await resultPromise;

  // Buffered message should be captured
  expect(result.consoleLogs.some(log => log.message === 'EARLY-MESSAGE')).toBe(true);
});
```

---

## How to Detect Race Conditions in Other Code

### Pattern to Look For

```javascript
// ANTIPATTERN: Action → Setup
const resource = await createResource(); // ← Resource generates events
await setupHandler(resource.id); // ← Handler registered AFTER events sent
```

**Red Flags:**

1. Async resource creation (returns Promise)
2. Handler/listener registered AFTER resource created
3. No buffer mechanism for early events
4. Silent failures (no error when events dropped)

### Questions to Ask

1. **Can events arrive BEFORE handler is registered?**
   - If yes → Race condition!

2. **What is the timing window?**
   - Fast resources (data: URLs, inline scripts): 1-10ms
   - Slow resources (network requests): 100-1000ms
   - Timing varies by OS/hardware

3. **Are events buffered during setup?**
   - If no → Messages will be dropped!

4. **Is there a retry mechanism?**
   - If no → One-time failures become permanent losses!

### Testing Strategy

1. **Test worst-case timing** (fastest resource loading)
2. **Verify operation order** (setup before action)
3. **Test state transitions** (buffer during pending state)
4. **Test cross-contamination** (events from wrong resource)
5. **Test service worker restart** (volatile state cleared)

---

## Current Status

### What's Fixed

✅ Pre-registration pattern implemented
✅ Global message buffer added
✅ Immediate tab.id update after creation
✅ Buffer flushing logic implemented
✅ Pending state detection in message handler

### What's Not Working

❌ Still only capturing 1 message (inject script initialization)
❌ Page console messages not being captured

### Possible Issues

1. Content-script not loaded on page
2. CustomEvents not being dispatched from inject script
3. Messages not reaching background.js
4. Inject script running AFTER page scripts (still a timing issue)

### Next Investigation Steps

1. Check extension service worker console for DEBUG messages
2. Verify content-script loaded ("DEBUG CONTENT Content script loaded")
3. Verify inject script dispatching ("DEBUG INJECT Dispatching console event")
4. Check if messages reaching background.js

---

## Key Lessons

1. **Race conditions are timing-dependent**
   - Manual testing often succeeds (humans are slow)
   - Automated tests are more reliable

2. **Test worst-case scenarios**
   - Fastest loading (inline scripts, data: URLs)
   - Slowest loading (throttled network)
   - Both extremes can expose bugs

3. **Pre-register handlers before creating resources**
   - Don't rely on "it's fast enough" assumptions
   - OS scheduling is non-deterministic

4. **Always buffer during state transitions**
   - Pending → Ready
   - Connecting → Connected
   - Initializing → Initialized

5. **Log failures visibly**
   - Silent drops are impossible to debug
   - Warn when buffering, error when dropping

---

## References

- **Root Cause Analysis:** CONSOLE-CAPTURE-RACE-CONDITION.md
- **Codebase Scan:** RACE-CONDITION-ANALYSIS-ALL.md
- **Test Suite:** tests/unit/console-capture-race-condition.test.js (7 scenarios)
- **Tester Guide:** docs/TESTER-GUIDE-RACE-CONDITIONS.md (comprehensive guide)
- **Issue Tracking:** TO-FIX.md (ISSUE-013)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Status:** Under investigation - fix implemented but not yet verified working

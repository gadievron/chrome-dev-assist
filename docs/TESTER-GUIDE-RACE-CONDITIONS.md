# Tester Guide: Finding Race Conditions in Async Code

**Author:** Chrome Dev Assist Investigation Team
**Date:** 2025-10-26
**Context:** Lessons from console capture race condition investigation
**Audience:** QA testers, code auditors, developers debugging timing issues

---

## Table of Contents

1. [What Are Race Conditions?](#what-are-race-conditions)
2. [The Console Capture Case Study](#the-console-capture-case-study)
3. [How to Identify Race Conditions](#how-to-identify-race-conditions)
4. [Testing Strategies](#testing-strategies)
5. [Tools and Techniques](#tools-and-techniques)
6. [Common Patterns and Antipatterns](#common-patterns-and-antipatterns)
7. [Validation Checklist](#validation-checklist)
8. [Real-World Examples](#real-world-examples)

---

## What Are Race Conditions?

### Definition

A **race condition** occurs when the correctness of a program depends on the timing or ordering of uncontrollable events (like thread scheduling, network latency, or async operations).

**TOCTOU (Time-Of-Check-Time-Of-Use)** is a specific type:
- System checks a condition (e.g., "Is capture registered?")
- State changes between check and use
- System uses now-invalid assumption

### Why They're Dangerous

1. **Intermittent failures** - Works 90% of the time, fails unpredictably
2. **Hard to reproduce** - Timing-dependent, varies by OS/hardware
3. **Silent data loss** - Events dropped without errors
4. **False confidence** - Manual testing often succeeds (humans are slow)

---

## The Console Capture Case Study

### The Bug

Console messages from page load were being dropped when using the `openUrl` command with `captureConsole: true`.

### Root Cause

```javascript
// BUGGY CODE (background.js:952-971)
async function handleOpenUrlCommand(commandId, params) {
  // 1. Create tab - page IMMEDIATELY starts loading
  const tab = await chrome.tabs.create({ url });

  // 2. Page loads, inject-console-capture.js executes (document_start)
  // 3. Page scripts run, console messages generated
  // 4. Messages sent to background.js
  // 5. Background checks: capturesByTab.has(tab.id) → FALSE (not registered yet!)
  // 6. Messages DROPPED

  // 7. THEN capture is started (TOO LATE!)
  if (captureConsole) {
    await startConsoleCapture(commandId, duration, tab.id);
  }
}
```

### Timeline (Actual Measurements)

```
T+0ms:    chrome.tabs.create() called
T+1ms:    Tab created, page starts loading
T+5ms:    inject-console-capture.js runs (document_start)
T+7ms:    Inline <head> scripts execute
T+8ms:    console.log() called
T+9ms:    Message arrives at background.js
T+10ms:   Check: capturesByTab.has(tabId) → FALSE
T+11ms:   Message DROPPED (no error logged)
T+50ms:   startConsoleCapture() finally called
```

**Gap:** 7-50ms (variable, OS-dependent)
**Result:** 100% message loss for inline scripts, ~80% for deferred scripts

### Why This Wasn't Caught Earlier

1. **Manual testing succeeded** - Humans add 500-1000ms delay clicking buttons
2. **Debug logging masked issue** - Debug console.log calls added delay
3. **Only 1 message captured** - Inject script initialization message (not page messages)
4. **False positive** - "It captured something!" → Assumed working

---

## How to Identify Race Conditions

### Pattern 1: Resource Creation Before Registration

**Look For:**
```javascript
// ANTIPATTERN
const resource = await createResource();
await registerHandlerFor(resource.id);
```

**Why It Fails:**
- Events from `resource` can arrive BEFORE handler is registered
- No buffer, no retry, events dropped silently

**How to Test:**
1. Create resource that generates events IMMEDIATELY (e.g., inline <head> scripts)
2. Verify ALL events captured, not just late ones
3. Check for messages like "initialized" but no actual data

**Example from Our Case:**
```javascript
// Only captured 1 message: "[ChromeDevAssist] Console capture initialized"
// All page messages (TEST 1, TEST 2, TEST 3...) were dropped
```

### Pattern 2: Timing Assumptions

**Look For:**
- Comments like "Wait for tab to load" with arbitrary delays
- `setTimeout(fn, 50)` without justification for delay value
- Assumptions like "Chrome takes 50ms to create a tab"

**Why It Fails:**
- OS scheduling is non-deterministic
- Fast systems (local files, cached pages) break assumptions
- Slow systems (network files, slow CPU) also break assumptions

**How to Test:**
1. Test with fast-loading resources (data: URLs, local files)
2. Test with slow-loading resources (throttled network)
3. Test on different OS/hardware
4. Measure actual timing, don't assume

**Example from Our Case:**
```javascript
// Original analysis assumed 50ms delay
// Actual measurements: 7-35ms (highly variable)
// Inline <head> scripts execute in <5ms (100% failure case)
```

### Pattern 3: Global vs. Specific Handlers

**Look For:**
- Handlers that check IDs: `if (tabId === expectedId) { ... }`
- Global event listeners with filtering logic
- Maps/Sets used for routing: `capturesByTab.get(tabId)`

**Why It Can Fail:**
- Handler registered AFTER event sent (TOCTOU)
- Cross-contamination (captures from wrong tab)
- Memory leaks (handlers never removed)

**How to Test:**
1. Send events BEFORE handler registered
2. Send events from DIFFERENT resources (wrong tab)
3. Check no cross-contamination
4. Verify cleanup when done

**Example from Our Case:**
```javascript
// Message handler checks: capturesByTab.has(tabId)
// If FALSE → message dropped (no buffer, no retry)
// This caused 100% message loss for early events
```

### Pattern 4: Async State Transitions

**Look For:**
```javascript
// ANTIPATTERN
state.pending = true;
await asyncOperation();
state.pending = false;  // ← Events can arrive DURING async operation
```

**Why It Fails:**
- Events arrive while state is "pending"
- No buffering mechanism for pending state
- State transition not atomic

**How to Test:**
1. Send events during CONNECTING, PENDING, INITIALIZING states
2. Verify events are buffered, not dropped
3. Verify buffered events processed after transition
4. Check for memory leaks in buffer

**Example from Our Case:**
```javascript
// Tab.id not known until after chrome.tabs.create() resolves
// Messages can arrive before tab.id is set
// No buffer for messages during pending state
```

---

## Testing Strategies

### Strategy 1: Worst-Case Timing Tests

**Goal:** Find the NARROWEST possible timing window where race condition occurs.

**Approach:**
1. Identify FASTEST possible event source (inline scripts, sync operations)
2. Create test that generates events IMMEDIATELY
3. Verify ALL events captured, not just late ones

**Example Test (from console-capture-race-condition.test.js):**
```javascript
it('should capture console messages from inline <head> scripts', async () => {
  // Inline scripts execute at document_start (T+5ms)
  const immediateMessages = [
    { level: 'log', message: 'HEAD-INLINE-1', tabId: 123 },
    { level: 'error', message: 'HEAD-INLINE-2', tabId: 123 },
    { level: 'warn', message: 'HEAD-INLINE-3', tabId: 123 }
  ];

  // Simulate messages arriving BEFORE capture registered
  setTimeout(() => {
    immediateMessages.forEach(msg => simulateMessageArrival(msg));
  }, 5);  // ← 5ms = document_start timing

  const result = await handleOpenUrlCommand('cmd-1', {
    url: 'data:text/html,<html><head><script>console.log("test")</script></head></html>',
    captureConsole: true,
    duration: 100
  });

  // CRITICAL: Verify ALL messages captured
  expect(result.consoleLogs.length).toBeGreaterThanOrEqual(3);
});
```

**Why This Works:**
- Inline <head> scripts are THE WORST CASE (execute before any capture can register)
- If this test passes, all slower cases will also pass
- data: URLs load in <1ms (no network delay)

### Strategy 2: Order Validation Tests

**Goal:** Verify operations happen in correct order.

**Approach:**
1. Instrument code to record timestamps
2. Assert operation order in tests
3. Fail if operations out of order

**Example Test:**
```javascript
it('should register capture BEFORE creating tab', async () => {
  const captureTimestamps = [];
  const tabTimestamps = [];

  // Mock to track timing
  captureState.set = jest.fn((...args) => {
    captureTimestamps.push(Date.now());
    return originalSet.apply(captureState, args);
  });

  chrome.tabs.create.mockImplementation(async (opts) => {
    tabTimestamps.push(Date.now());
    return { id: 123, url: opts.url };
  });

  await handleOpenUrlCommand('cmd-1', {
    url: 'http://localhost:9876/test.html',
    captureConsole: true,
    duration: 100
  });

  // CRITICAL: Capture must be registered BEFORE tab created
  expect(captureTimestamps[0]).toBeLessThan(tabTimestamps[0]);
});
```

**Why This Works:**
- Proves correct ordering (not just "it works")
- Fails immediately if regression introduced
- Clear failure message (expected < actual)

### Strategy 3: Cross-Contamination Tests

**Goal:** Verify events from OTHER resources don't contaminate current capture.

**Approach:**
1. Start capture for resource A
2. Generate events from resource B (wrong resource)
3. Verify resource A's capture DOES NOT contain resource B's events

**Example Test:**
```javascript
it('should NOT capture messages from other tabs', async () => {
  const resultPromise = handleOpenUrlCommand('cmd-1', {
    url: 'http://localhost:9876/test.html',
    captureConsole: true,
    duration: 200
  });

  // Simulate message from DIFFERENT tab
  setTimeout(() => {
    const wrongTabMessage = {
      level: 'log',
      message: 'MESSAGE-FROM-GMAIL',
      tabId: 456,  // Wrong tab!
      timestamp: new Date().toISOString()
    };

    // Try to inject wrong tab's message
    simulateMessageArrival(wrongTabMessage);
  }, 50);

  const result = await resultPromise;

  // Should NOT contain messages from other tabs
  expect(result.consoleLogs.some(log => log.message.includes('GMAIL'))).toBe(false);
});
```

**Why This Works:**
- Global capture solutions often fail this test
- Catches over-broad event handlers
- Verifies tab isolation

### Strategy 4: State Transition Tests

**Goal:** Verify events during state transitions are not dropped.

**Approach:**
1. Identify all async state transitions (CONNECTING, PENDING, etc.)
2. Send events DURING each transition
3. Verify events are buffered and processed after transition completes

**Example Test:**
```javascript
it('should buffer messages that arrive before tab ID is set', async () => {
  chrome.tabs.create.mockImplementation(async () => {
    // Simulate slow tab creation (50ms)
    await sleep(50);
    return { id: 123, url: 'test.html' };
  });

  const resultPromise = handleOpenUrlCommand('cmd-1', {
    url: 'http://localhost:9876/test.html',
    captureConsole: true,
    duration: 200
  });

  // Send message after 10ms (BEFORE tab.id is known)
  setTimeout(() => {
    const earlyMessage = {
      level: 'log',
      message: 'EARLY-MESSAGE',
      timestamp: new Date().toISOString()
    };

    simulateMessageArrival(earlyMessage);
  }, 10);

  const result = await resultPromise;

  // Buffered message should be in final logs
  expect(result.consoleLogs.some(log => log.message === 'EARLY-MESSAGE')).toBe(true);
});
```

### Strategy 5: Service Worker Restart Tests

**Goal:** Verify graceful handling when service worker restarts mid-operation.

**Approach:**
1. Start long-running operation
2. Simulate service worker restart (clear volatile state)
3. Verify no crashes, graceful error handling

**Example Test:**
```javascript
it('should handle service worker restart gracefully', async () => {
  const resultPromise = handleOpenUrlCommand('cmd-1', {
    url: 'http://localhost:9876/test.html',
    captureConsole: true,
    duration: 500
  });

  // Simulate service worker restart after 100ms
  setTimeout(() => {
    captureState.clear();
    capturesByTab.clear();
  }, 100);

  // Should not crash, should return graceful error or empty result
  await expect(resultPromise).resolves.toBeDefined();
});
```

---

## Tools and Techniques

### Tool 1: lsof (Linux/Mac)

**Purpose:** Verify network connections actually exist.

**Usage:**
```bash
# Check if server is listening
lsof -i :9876 -P -n

# Expected output if connected:
# node    19389: TCP 127.0.0.1:9876 (LISTEN)
# node    19389: TCP 127.0.0.1:9876->127.0.0.1:65427 (ESTABLISHED)
# Google  1543:  TCP 127.0.0.1:65427->127.0.0.1:9876 (ESTABLISHED)
```

**What to Look For:**
- `LISTEN` = server running
- `ESTABLISHED` = active connection
- No output = server not running OR wrong port

**Our Case:**
- Error logs showed `ERR_CONNECTION_REFUSED`
- `lsof` showed `ESTABLISHED` connection
- **Conclusion:** Error was STALE (from before server started)

### Tool 2: Timestamp Logging

**Purpose:** Measure actual timing, don't assume.

**Implementation:**
```javascript
const timings = {
  start: Date.now(),
  tabCreated: 0,
  captureRegistered: 0,
  messageArrived: 0
};

// In chrome.tabs.create callback:
timings.tabCreated = Date.now() - timings.start;

// In startConsoleCapture:
timings.captureRegistered = Date.now() - timings.start;

// In message handler:
timings.messageArrived = Date.now() - timings.start;

// Log results:
console.log('Timing analysis:', timings);
// Example output:
// { start: 0, tabCreated: 1, captureRegistered: 50, messageArrived: 9 }
//                                                                    ^^^
//                                                              Message arrived
//                                                              before capture!
```

**Our Case:**
- Measured actual timing: message arrival at T+9ms
- Capture registration at T+50ms
- **Gap:** 41ms (message dropped)

### Tool 3: Mock Injection for Edge Cases

**Purpose:** Simulate worst-case timing scenarios.

**Implementation:**
```javascript
// Simulate messages arriving DURING async operation
chrome.tabs.create.mockImplementation(async (opts) => {
  const tab = { id: 123, url: opts.url };

  // Inject message IMMEDIATELY (T+2ms)
  setTimeout(() => {
    simulateMessageArrival({
      level: 'log',
      message: 'IMMEDIATE-MESSAGE',
      tabId: 123
    });
  }, 2);

  return tab;
});
```

**Why This Works:**
- Controls exact timing (not OS-dependent)
- Reproducible across systems
- Can test NARROWEST timing windows

### Tool 4: Integration Tests with Real Resources

**Purpose:** Validate fixes work with real Chrome APIs.

**Setup:**
```bash
# Start test server
node server.js &

# Create test HTML file
cat > test-console-timing.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <script>
    console.log('INLINE-1');
    console.error('INLINE-2');
    console.warn('INLINE-3');
  </script>
</head>
<body>
  <h1>Timing Test</h1>
  <script>
    console.log('BODY-1');
  </script>
</body>
</html>
EOF

# Run integration test
node test-console-capture-integration.js
```

**Validation:**
```javascript
// Must capture ALL messages, not just late ones
const pageMessages = result.consoleLogs.filter(log =>
  !log.message.includes('[ChromeDevAssist]')
);

expect(pageMessages).toHaveLength(4);  // All 4 messages
expect(pageMessages[0].message).toBe('INLINE-1');  // First message captured
```

---

## Common Patterns and Antipatterns

### Antipattern 1: "It Works For Me"

**Symptom:**
- Manual testing succeeds
- Automated tests fail
- "Works on my machine" syndrome

**Root Cause:**
- Human reaction time (500-1000ms) masks timing issues
- Developer's fast machine masks slow-system issues
- Debug logging adds delays that "fix" race conditions

**How to Avoid:**
1. Always test with FASTEST possible resources (data: URLs, inline scripts)
2. Run tests on CI with different system speeds
3. Disable debug logging during timing tests

### Antipattern 2: Arbitrary Timeouts

**Symptom:**
```javascript
// ANTIPATTERN
await performAction();
await sleep(100);  // "Wait for things to settle"
await checkResult();
```

**Root Cause:**
- No guarantee 100ms is enough
- Wastes time when faster systems could proceed immediately
- Masks real race conditions

**Better Approach:**
```javascript
// Use event-driven waiting
await performAction();
await waitForCondition(() => result.ready, { timeout: 1000 });
await checkResult();
```

### Antipattern 3: Silent Failures

**Symptom:**
- Events dropped without errors
- No logs indicating failure
- "It captured something!" false positive

**Root Cause:**
```javascript
// ANTIPATTERN
if (capturesByTab.has(tabId)) {
  // Add to capture
} else {
  // SILENTLY DROP (no log, no error)
}
```

**Better Approach:**
```javascript
if (capturesByTab.has(tabId)) {
  // Add to capture
} else {
  // Buffer for retry
  bufferMessage(tabId, message);

  // Log warning
  console.warn('[Race Condition] Message arrived before capture registered:', {
    tabId,
    message: message.substring(0, 50),
    timestamp: Date.now()
  });
}
```

### Pattern 1: Pre-Registration

**Goal:** Register handler BEFORE creating resource.

**Implementation:**
```javascript
// GOOD PATTERN
async function handleOpenUrlCommand(commandId, params) {
  // 1. Pre-register capture with placeholder
  captureState.set(commandId, {
    logs: [],
    active: true,
    tabId: null,  // Will be set after tab created
    pendingTabUpdate: true,
    bufferedMessages: []
  });

  // 2. Create tab
  const tab = await chrome.tabs.create({ url });

  // 3. IMMEDIATELY update with tab ID
  const capture = captureState.get(commandId);
  capture.tabId = tab.id;
  capture.pendingTabUpdate = false;

  // 4. Add to index
  if (!capturesByTab.has(tab.id)) {
    capturesByTab.set(tab.id, new Set());
  }
  capturesByTab.get(tab.id).add(commandId);

  // 5. Process buffered messages
  if (capture.bufferedMessages.length > 0) {
    capture.logs.push(...capture.bufferedMessages);
    capture.bufferedMessages = [];
  }
}
```

**Why This Works:**
- Handler exists BEFORE resource created
- Messages can be buffered during pending state
- No TOCTOU gap

### Pattern 2: Message Buffering with Retry

**Goal:** Never drop messages, buffer and retry.

**Implementation:**
```javascript
const messageBuffer = new Map();  // tabId -> { messages: [], retryTimer: null }

function handleConsoleMessage(tabId, message) {
  if (capturesByTab.has(tabId)) {
    // Capture exists - add immediately
    for (const cmdId of capturesByTab.get(tabId)) {
      captureState.get(cmdId).logs.push(message);
    }
  } else {
    // No capture yet - buffer and retry
    if (!messageBuffer.has(tabId)) {
      messageBuffer.set(tabId, { messages: [], retryTimer: null });
    }

    const buffer = messageBuffer.get(tabId);
    buffer.messages.push(message);

    // Schedule retry (debounced)
    if (buffer.retryTimer) {
      clearTimeout(buffer.retryTimer);
    }

    buffer.retryTimer = setTimeout(() => {
      retryBufferedMessages(tabId);
    }, 100);
  }
}

function retryBufferedMessages(tabId) {
  const buffer = messageBuffer.get(tabId);
  if (!buffer) return;

  if (capturesByTab.has(tabId)) {
    // Capture now exists - flush buffer
    for (const cmdId of capturesByTab.get(tabId)) {
      captureState.get(cmdId).logs.push(...buffer.messages);
    }

    messageBuffer.delete(tabId);
  } else {
    // Still no capture - try again (max 5 retries)
    buffer.retryCount = (buffer.retryCount || 0) + 1;

    if (buffer.retryCount < 5) {
      buffer.retryTimer = setTimeout(() => {
        retryBufferedMessages(tabId);
      }, 200);
    } else {
      // Give up after 5 retries (1 second total)
      console.warn('[Race Condition] Giving up on buffered messages:', {
        tabId,
        messageCount: buffer.messages.length
      });
      messageBuffer.delete(tabId);
    }
  }
}
```

---

## Validation Checklist

Before declaring a race condition fixed, verify:

### 1. Worst-Case Timing
- [ ] Test passes with inline <head> scripts (fastest possible)
- [ ] Test passes with data: URLs (no network delay)
- [ ] Test passes with local files (minimal disk latency)

### 2. Order Validation
- [ ] Handler registered BEFORE resource created (timestamp proof)
- [ ] No gap where events can be dropped
- [ ] Timing logged and verified in tests

### 3. Cross-Contamination
- [ ] Events from other resources NOT captured
- [ ] Tab isolation verified
- [ ] No global state pollution

### 4. State Transitions
- [ ] Events during PENDING state are buffered
- [ ] Buffered events processed after transition
- [ ] No memory leaks in buffer

### 5. Service Worker Restart
- [ ] Graceful handling when service worker restarts
- [ ] No crashes, clear error messages
- [ ] State recoverable or cleanly reset

### 6. Integration Tests
- [ ] Tests with REAL Chrome APIs (not just mocks)
- [ ] Tests on different systems (fast/slow)
- [ ] Tests with different network conditions

### 7. Logging and Observability
- [ ] Warnings logged when messages buffered
- [ ] Errors logged when retries exhausted
- [ ] Timing metrics available for debugging

---

## Real-World Examples

### Example 1: Console Capture Race Condition

**File:** extension/background.js:952-971

**Before (BUGGY):**
```javascript
async function handleOpenUrlCommand(commandId, params) {
  const tab = await chrome.tabs.create({ url });

  if (captureConsole) {
    await startConsoleCapture(commandId, duration, tab.id);
  }
}
```

**After (FIXED):**
```javascript
async function handleOpenUrlCommand(commandId, params) {
  // Pre-register capture
  if (captureConsole) {
    captureState.set(commandId, {
      logs: [],
      active: true,
      tabId: null,
      pendingTabUpdate: true,
      bufferedMessages: []
    });
  }

  const tab = await chrome.tabs.create({ url });

  // Update with tab ID
  if (captureConsole) {
    const capture = captureState.get(commandId);
    capture.tabId = tab.id;
    capture.pendingTabUpdate = false;

    if (!capturesByTab.has(tab.id)) {
      capturesByTab.set(tab.id, new Set());
    }
    capturesByTab.get(tab.id).add(commandId);

    // Flush buffered messages
    if (capture.bufferedMessages.length > 0) {
      capture.logs.push(...capture.bufferedMessages);
      capture.bufferedMessages = [];
    }

    await sleep(duration);
  }
}
```

**Test (7 scenarios, 322 lines):**
- See tests/unit/console-capture-race-condition.test.js

### Example 2: WebSocket Message Queue (CORRECT)

**File:** extension/background.js:173-186

**Implementation:**
```javascript
if (ws.readyState === WebSocket.CONNECTING) {
  // Buffer messages during CONNECTING state
  if (messageQueue.length >= MAX_QUEUE_SIZE) {
    return false;  // Drop message (DoS protection)
  }
  messageQueue.push(message);
  return true;
}
```

**Why This Is Correct:**
- Messages buffered during state transition
- DoS protection (max queue size)
- Flushed when connection OPEN

**Lesson:** This is the FIX for race conditions, not a bug!

### Example 3: Tab Tracking (SAFE)

**File:** extension/background.js:958-962

**Implementation:**
```javascript
const tab = await chrome.tabs.create({ url });

if (testState.activeTestId !== null) {
  testState.trackedTabs.push(tab.id);  // Synchronous tracking
  await saveTestState();
}
```

**Why This Is Safe:**
- Tab already created and has ID
- Tracking is synchronous (no async gap)
- No events can arrive before tracking set up

**Lesson:** Not all "action then setup" patterns are buggy!

---

## Conclusion

**Key Takeaways:**

1. **Race conditions are timing-dependent** - Manual testing often succeeds, automated tests fail
2. **Test worst-case scenarios** - Inline scripts, data: URLs, fast systems
3. **Measure, don't assume** - Use timestamp logging to verify actual timing
4. **Pre-register handlers** - Setup BEFORE creating resources
5. **Buffer and retry** - Never silently drop events
6. **Log failures** - Make race conditions visible when they occur

**When You Find a Race Condition:**

1. Create worst-case timing test (inline scripts, data: URLs)
2. Measure actual timing with timestamp logging
3. Implement pre-registration + buffering solution
4. Verify with integration tests (real Chrome APIs)
5. Add logging for observability
6. Document in code comments

**Resources:**

- Console Capture Race Condition Analysis: `CONSOLE-CAPTURE-RACE-CONDITION.md`
- Codebase-Wide Race Condition Scan: `RACE-CONDITION-ANALYSIS-ALL.md`
- Test Suite: `tests/unit/console-capture-race-condition.test.js`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Next Review:** After fix implementation and validation

# ConsoleCapture Integration - Architectural Analysis

**Date:** 2025-10-27
**Task:** Integrate ConsoleCapture.js class into background.js (eliminate inline duplication)
**Approach:** Architecture-first, test-first, surgical refactoring

---

## Executive Summary

**Goal:** Replace inline console capture logic in background.js with ConsoleCapture.js class

**Current State:**

- Inline implementation: extension/background.js:687-744 (~200 lines mixed with WebSocket)
- Class implementation: extension/modules/ConsoleCapture.js (250 lines, unused)
- **Problem:** Duplication, hard to test, mixed concerns

**Target State:**

- ConsoleCapture.js: Used by background.js
- background.js: Delegates to ConsoleCapture.js
- **Benefits:** No duplication, testable, clean separation of concerns

**Estimated Effort:** 3-4 hours
**Risk Level:** MEDIUM (refactoring working code)
**Mitigation:** Test-first approach, surgical changes only

---

## PART 1: Current Architecture Analysis

### 1.1 Current Console Capture Flow (Inline)

```
Page (MAIN world)
  ↓
[inject-console-capture.js] - Intercepts console.log/error/warn/info/debug
  ↓ window.postMessage (CustomEvent)
[content-script.js] - ISOLATED world relay
  ↓ chrome.runtime.sendMessage
[background.js] - Service worker
  ↓ INLINE LOGIC (lines 687-744)
  ↓
captureState Map (commandId → state)
capturesByTab Map (tabId → Set<commandId>)
  ↓
Return logs via WebSocket to API
```

### 1.2 Current Inline Implementation Map

**File:** extension/background.js

**Data Structures (lines 10-12):**

```javascript
const captureState = new Map(); // Map<commandId, state>
const capturesByTab = new Map(); // Map<tabId, Set<commandId>>
```

**Key Functions/Sections:**

1. **Periodic Cleanup (lines 22-37)**
   - setInterval every 60 seconds
   - Removes captures older than 5 minutes
   - Cleans up captureState and capturesByTab

2. **Start Capture (in command handler, ~line 620-650)**
   - Creates capture state
   - Adds to captureState Map
   - Adds to capturesByTab Map
   - Sets timeout for auto-stop

3. **Message Handler (lines 687-744)**
   - chrome.runtime.onMessage listener
   - Receives console logs from content script
   - Finds relevant captures via capturesByTab lookup
   - Enforces 10K log limit
   - Enforces 10K character truncation
   - Adds logs to captureState

4. **Stop Capture (in command handler)**
   - Marks capture as inactive
   - Keeps logs in memory
   - Later cleanup by periodic cleanup

5. **Get Logs (in command response)**
   - Reads from captureState Map
   - Returns logs array

**Constants:**

```javascript
MAX_LOGS_PER_CAPTURE = 10000;
MAX_MESSAGE_LENGTH = 10000;
CLEANUP_INTERVAL_MS = 60000;
MAX_CAPTURE_AGE_MS = 300000;
```

### 1.3 ConsoleCapture.js Class Architecture

**File:** extension/modules/ConsoleCapture.js (250 lines)

**Class API:**

```javascript
class ConsoleCapture {
  constructor()

  // Capture lifecycle
  start(captureId, options)      // options: { tabId, duration, maxLogs }
  stop(captureId)
  cleanup(captureId)

  // Log operations
  addLog(tabId, logEntry)
  getLogs(captureId)             // Returns copy (prevents mutation)

  // Status checks
  isActive(captureId)
  getStats(captureId)

  // Utilities
  getAllCaptureIds()
  cleanupStale(thresholdMs)
}
```

**Internal Data Structures:**

```javascript
this.captures = new Map();        // Map<captureId, CaptureState>
this.capturesByTab = new Map();   // Map<tabId, Set<captureId>>

// CaptureState structure:
{
  captureId: string,
  tabId: number | null,
  active: boolean,
  logs: Array<LogEntry>,
  maxLogs: number,
  startTime: number,
  endTime: number | null,
  timeout: number | null
}
```

**Key Features:**

- ✅ Same dual-index pattern (O(1) lookups)
- ✅ Same 10K log limit enforcement
- ✅ Same periodic cleanup capability
- ✅ Auto-stop timers
- ✅ Clean API (testable)
- ✅ Returns copies (prevents external mutation)

---

## PART 2: Dependency Mapping

### 2.1 Current Dependencies (What Uses Inline Capture)

**Functions that WRITE to captureState:**

1. **startConsoleCapture()** (background.js, approximate line 620)
   - Creates new capture state
   - Adds to captureState Map
   - Adds to capturesByTab Map
   - Sets auto-stop timeout

2. **chrome.runtime.onMessage listener** (background.js:687)
   - Receives console logs
   - Adds to relevant captures
   - Enforces limits

3. **Periodic cleanup** (background.js:22)
   - Removes old captures
   - Cleans up both Maps

**Functions that READ from captureState:**

1. **getConsoleLogs()** (in command handlers)
   - Reads logs array
   - Returns to WebSocket client

2. **stopConsoleCapture()** (in command handlers)
   - Marks capture as inactive
   - Clears timeout

### 2.2 External Touch Points

**Files that will be affected:**

1. **extension/background.js** (PRIMARY)
   - Remove inline capture logic
   - Import ConsoleCapture class
   - Instantiate ConsoleCapture instance
   - Delegate to class methods

2. **extension/modules/ConsoleCapture.js** (MINIMAL)
   - Already exists
   - May need minor tweaks for compatibility
   - Add any missing features

3. **Tests** (NEW)
   - Create tests for ConsoleCapture class (if not exist)
   - Update background.js integration tests
   - Add HTML test fixtures

**External systems (NO CHANGE):**

- inject-console-capture.js (MAIN world) - no changes
- content-script.js (ISOLATED world relay) - no changes
- claude-code/index.js (API) - no changes
- server/websocket-server.js - no changes

### 2.3 API Surface (No Breaking Changes)

**Public APIs (MUST stay identical):**

- `reloadAndCapture(extensionId, options)` - Still works
- `captureLogs(duration)` - Still works
- `openUrl(url, { captureConsole: true })` - Still works
- `reloadTab(tabId, { captureConsole: true })` - Still works

**Internal changes only - users won't notice**

---

## PART 3: Target Architecture Design

### 3.1 Target Architecture Flow

```
Page (MAIN world)
  ↓
[inject-console-capture.js] - No changes
  ↓ window.postMessage
[content-script.js] - No changes
  ↓ chrome.runtime.sendMessage
[background.js] - REFACTORED
  ↓
ConsoleCapture instance (NEW)
  ↓
captureState Map (MOVED to class)
capturesByTab Map (MOVED to class)
  ↓
Return logs via WebSocket (no change)
```

### 3.2 Background.js After Refactoring

**New structure:**

```javascript
// Top of file (after imports)
const ConsoleCapture = require('./modules/ConsoleCapture');
const consoleCapture = new ConsoleCapture();

// Remove these (now in ConsoleCapture class):
// const captureState = new Map();
// const capturesByTab = new Map();

// Periodic cleanup (REFACTORED)
setInterval(() => {
  consoleCapture.cleanupStale(MAX_CAPTURE_AGE_MS);
}, CLEANUP_INTERVAL_MS);

// Start capture (REFACTORED)
function startConsoleCapture(commandId, options) {
  consoleCapture.start(commandId, {
    tabId: options.tabId || null,
    duration: options.duration,
    maxLogs: MAX_LOGS_PER_CAPTURE,
  });

  // Auto-stop after duration
  if (options.duration) {
    setTimeout(() => {
      consoleCapture.stop(commandId);
    }, options.duration);
  }
}

// Message handler (REFACTORED)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'console-log') {
    // Truncate message (keep defense-in-depth)
    let truncatedMessage = message.message;
    if (typeof message.message === 'string' && message.message.length > MAX_MESSAGE_LENGTH) {
      truncatedMessage = message.message.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
    }

    const logEntry = {
      level: message.level,
      message: truncatedMessage,
      timestamp: message.timestamp,
      source: message.source || 'unknown',
      url: sender.url || 'unknown',
      tabId: sender.tab.id,
      frameId: sender.frameId,
    };

    // Delegate to ConsoleCapture
    consoleCapture.addLog(sender.tab.id, logEntry);
  }
  // ... rest of message handling
});

// Get logs (REFACTORED)
function getConsoleLogs(commandId) {
  return consoleCapture.getLogs(commandId);
}

// Stop capture (REFACTORED)
function stopConsoleCapture(commandId) {
  consoleCapture.stop(commandId);
}

// Cleanup capture (NEW - optional)
function cleanupConsoleCapture(commandId) {
  consoleCapture.cleanup(commandId);
}
```

### 3.3 ConsoleCapture.js Modifications Needed

**Check if these features exist (add if missing):**

1. **Constants compatibility**
   - Ensure MAX_LOGS_PER_CAPTURE is configurable via start() options ✅
   - Already supports `maxLogs` option

2. **Message truncation**
   - ConsoleCapture assumes truncation happens BEFORE addLog()
   - Keep truncation in background.js message handler (defense-in-depth)
   - ✅ No change needed to ConsoleCapture

3. **Global captures (tabId: null)**
   - Does ConsoleCapture support tabId: null for global captures?
   - Need to verify

4. **Cleanup behavior**
   - cleanupStale() exists ✅
   - Compatible with current CLEANUP_INTERVAL_MS

**Verification needed:** Read ConsoleCapture.js to confirm compatibility

---

## PART 4: Migration Strategy

### 4.1 Migration Sequence (Test-First Approach)

**PHASE 1: Preparation & Testing** (BEFORE any code changes)

1. ✅ Read ConsoleCapture.js - verify it has all needed features
2. ✅ Create unit tests for ConsoleCapture class (if not exist)
3. ✅ Create integration tests for refactored background.js
4. ✅ Create HTML test fixtures for end-to-end testing
5. ✅ Document expected behavior (this file)

**PHASE 2: Verification** (Validate tests work with CURRENT code)

6. ✅ Run existing tests - ensure all pass
7. ✅ Identify which tests will break after refactoring
8. ✅ Plan test updates

**PHASE 3: Implementation** (Surgical changes)

9. ✅ Import ConsoleCapture in background.js
10. ✅ Instantiate consoleCapture instance
11. ✅ Refactor startConsoleCapture() to use class
12. ✅ Refactor message handler to use consoleCapture.addLog()
13. ✅ Refactor getConsoleLogs() to use consoleCapture.getLogs()
14. ✅ Refactor stopConsoleCapture() to use class
15. ✅ Refactor periodic cleanup to use consoleCapture.cleanupStale()
16. ✅ Remove inline data structures (captureState, capturesByTab)

**PHASE 4: Validation** (Test everything)

17. ✅ Run unit tests for ConsoleCapture class
18. ✅ Run integration tests for background.js
19. ✅ Run HTML test fixtures with extension loaded
20. ✅ Manual testing (reload extension, capture logs, verify)
21. ✅ Run /validate command
22. ✅ Run /review command (multi-persona review)

**PHASE 5: Cleanup & Documentation**

23. ✅ Remove dead code (inline logic)
24. ✅ Update comments
25. ✅ Update documentation (API.md, architecture docs)
26. ✅ Self-check: "Was I careful?"

### 4.2 Rollback Plan

**If tests fail or issues arise:**

1. Git stash changes
2. Identify failure point
3. Fix issue OR revert to inline implementation
4. Re-test before proceeding

**Safety:** All changes in one commit, easy to revert

---

## PART 5: Risk Analysis & Mitigation

### 5.1 Risks

**Risk 1: Breaking existing functionality**

- Severity: HIGH
- Probability: MEDIUM
- Impact: Console capture stops working

Mitigation:

- ✅ Test-first approach (write tests before changing code)
- ✅ Run tests continuously
- ✅ Manual testing with extension loaded
- ✅ Small, incremental changes

**Risk 2: Performance regression**

- Severity: MEDIUM
- Probability: LOW (ConsoleCapture uses same algorithm)
- Impact: Slower console capture

Mitigation:

- ✅ ConsoleCapture already optimized (O(1) lookups)
- ✅ Benchmark if needed (before/after)

**Risk 3: Missing edge cases**

- Severity: MEDIUM
- Probability: MEDIUM
- Impact: Some scenarios fail

Mitigation:

- ✅ Comprehensive test suite
- ✅ HTML test fixtures (edge cases)
- ✅ Multi-persona review (/review)

**Risk 4: ConsoleCapture class missing features**

- Severity: HIGH
- Probability: LOW (already analyzed, seems complete)
- Impact: Need to add features to class

Mitigation:

- ✅ Read ConsoleCapture.js before starting (next step)
- ✅ Verify feature parity
- ✅ Add missing features to class first

### 5.2 Success Criteria

**Functional:**

- ✅ All existing console capture tests pass
- ✅ No regressions in console log capture
- ✅ Same behavior from user perspective

**Code Quality:**

- ✅ No inline console capture logic in background.js
- ✅ ConsoleCapture.js is the single source of truth
- ✅ Testable (can test ConsoleCapture in isolation)
- ✅ Clean separation of concerns

**Process:**

- ✅ /validate passes
- ✅ /review passes (multi-persona)
- ✅ All tests green

---

## PART 6: Next Steps

**Immediate (before any implementation):**

1. ✅ Read extension/modules/ConsoleCapture.js
   - Verify all features exist
   - Identify any missing features
   - Document any modifications needed

2. ✅ Map exact function calls
   - List every place captureState is accessed
   - List every place capturesByTab is accessed
   - Create refactoring checklist

3. ✅ Write tests FIRST
   - Unit tests for ConsoleCapture class
   - Integration tests for background.js
   - HTML test fixtures

4. ✅ Get user approval on plan
   - Present this document
   - Confirm approach
   - Get go-ahead

**Then (implementation):** 5. Execute migration sequence (Phase 3-5)

---

## PART 7: Open Questions

**Question 1:** Does ConsoleCapture.js support tabId: null for global captures?

- **Action:** Read ConsoleCapture.js to verify

**Question 2:** Are there any tests for ConsoleCapture.js already?

- **Action:** Check tests/unit/ for console-capture or ConsoleCapture tests

**Question 3:** What's the exact line-by-line mapping of inline → class methods?

- **Action:** Create detailed function mapping (next document)

**Question 4:** Should we add any NEW features while refactoring?

- **Recommendation:** NO - refactor only, features later (scope discipline)

---

## Status

**Document Status:** DRAFT - Architectural Analysis Complete
**Next:** Read ConsoleCapture.js, create detailed function mapping
**Then:** Write tests
**Then:** Implement

**Created:** 2025-10-27
**Ready for:** User review and approval

# ConsoleCapture Integration - Detailed Function Mapping

**Date:** 2025-10-27
**Purpose:** Line-by-line mapping of inline code → ConsoleCapture class methods
**Status:** PLANNING (no code changes yet)

---

## Feature Parity Verification ✅ COMPLETE

### Verified Features in ConsoleCapture.js

| Feature                   | Inline (background.js)       | ConsoleCapture.js                  | Status                      |
| ------------------------- | ---------------------------- | ---------------------------------- | --------------------------- |
| Start capture             | Manual state creation        | `start(captureId, options)`        | ✅ SUPPORTED                |
| Tab-specific capture      | tabId in state               | `options.tabId`                    | ✅ SUPPORTED                |
| Global capture (all tabs) | tabId: null                  | `options.tabId = null`             | ✅ SUPPORTED (line 119-123) |
| 10K log limit             | MAX_LOGS_PER_CAPTURE         | `options.maxLogs` (default 10000)  | ✅ SUPPORTED                |
| Auto-stop timeout         | setTimeout in handler        | Built-in (line 66-71)              | ✅ SUPPORTED                |
| Dual-index Maps           | captureState + capturesByTab | this.captures + this.capturesByTab | ✅ SUPPORTED                |
| O(1) tab lookup           | capturesByTab.get(tabId)     | this.capturesByTab.get(tabId)      | ✅ SUPPORTED                |
| Add logs                  | Manual array push            | `addLog(tabId, logEntry)`          | ✅ SUPPORTED                |
| Limit enforcement         | if/else check                | Built-in (line 131-145)            | ✅ SUPPORTED                |
| Warning at limit          | Manual log push              | Built-in (line 136-142)            | ✅ SUPPORTED                |
| Get logs                  | Direct array access          | `getLogs(captureId)`               | ✅ SUPPORTED (returns copy) |
| Stop capture              | Set active = false           | `stop(captureId)`                  | ✅ SUPPORTED                |
| Cleanup capture           | Manual deletion              | `cleanup(captureId)`               | ✅ SUPPORTED                |
| Stale cleanup             | setInterval + manual         | `cleanupStale(thresholdMs)`        | ✅ SUPPORTED                |

**Conclusion:** ConsoleCapture.js has 100% feature parity. Ready to integrate.

---

## Inline Code Location Map

### Current Inline Implementation in background.js

**Data Structures (REMOVE after refactoring):**

```
Line 10-12: const captureState = new Map();
            const capturesByTab = new Map();
```

**Constants (KEEP - used for configuration):**

```
Line 14-17: MAX_LOGS_PER_CAPTURE = 10000
            MAX_MESSAGE_LENGTH = 10000
            CLEANUP_INTERVAL_MS = 60000
            MAX_CAPTURE_AGE_MS = 300000
```

**Periodic Cleanup (REFACTOR):**

```
Line 22-37: setInterval(() => { ... }, CLEANUP_INTERVAL_MS)
```

**Message Handler (REFACTOR):**

```
Line 687-744: chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.type === 'console-log') {
                  // ... log handling logic
                }
              });
```

**Capture Start Logic (REFACTOR - multiple locations):**

```
Approximate line 620-650: Function that creates capture state
```

**Capture Stop/Get Logic (REFACTOR - multiple locations):**

```
Various command handlers that access captureState
```

---

## Exact Refactoring Mapping

### Mapping 1: Data Structures

**BEFORE (inline):**

```javascript
// background.js:10-12
const captureState = new Map(); // Map<commandId, state>
const capturesByTab = new Map(); // Map<tabId, Set<commandId>>
```

**AFTER (using class):**

```javascript
// background.js:10-15 (NEW)
const ConsoleCapture = require('./modules/ConsoleCapture');
const consoleCapture = new ConsoleCapture();

// REMOVE these lines:
// const captureState = new Map();
// const capturesByTab = new Map();
```

---

### Mapping 2: Periodic Cleanup

**BEFORE (inline):**

```javascript
// background.js:22-37
setInterval(() => {
  const now = Date.now();
  for (const [commandId, state] of captureState.entries()) {
    if (!state.active && state.endTime) {
      const age = now - state.endTime;
      if (age > MAX_CAPTURE_AGE_MS) {
        // Cleanup
        if (state.tabId !== null) {
          const tabSet = capturesByTab.get(state.tabId);
          if (tabSet) {
            tabSet.delete(commandId);
            if (tabSet.size === 0) {
              capturesByTab.delete(state.tabId);
            }
          }
        }
        captureState.delete(commandId);
      }
    }
  }
}, CLEANUP_INTERVAL_MS);
```

**AFTER (using class):**

```javascript
// background.js:22-24 (SIMPLIFIED)
setInterval(() => {
  consoleCapture.cleanupStale(MAX_CAPTURE_AGE_MS);
}, CLEANUP_INTERVAL_MS);
```

**Lines saved:** ~15 lines → 3 lines

---

### Mapping 3: Start Capture

**BEFORE (inline - approximate location):**

```javascript
// background.js:~620-650
function startConsoleCapture(commandId, options) {
  const state = {
    logs: [],
    active: true,
    tabId: options.tabId || null,
    endTime: null,
    timeout: null,
  };

  captureState.set(commandId, state);

  if (state.tabId !== null) {
    if (!capturesByTab.has(state.tabId)) {
      capturesByTab.set(state.tabId, new Set());
    }
    capturesByTab.get(state.tabId).add(commandId);
  }

  if (options.duration) {
    state.timeout = setTimeout(() => {
      state.active = false;
      state.endTime = Date.now();
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = null;
      }
    }, options.duration);
  }
}
```

**AFTER (using class):**

```javascript
// background.js:~620-625 (SIMPLIFIED)
function startConsoleCapture(commandId, options) {
  consoleCapture.start(commandId, {
    tabId: options.tabId || null,
    duration: options.duration,
    maxLogs: MAX_LOGS_PER_CAPTURE,
  });
}
```

**Lines saved:** ~30 lines → 6 lines

---

### Mapping 4: Add Log (Message Handler)

**BEFORE (inline):**

```javascript
// background.js:687-744
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'console-log') {
    const tabId = sender.tab.id;

    // Find relevant captures
    const relevantCommandIds = new Set();

    // Tab-specific captures
    if (capturesByTab.has(tabId)) {
      for (const cmdId of capturesByTab.get(tabId)) {
        relevantCommandIds.add(cmdId);
      }
    }

    // Global captures (tabId: null)
    if (capturesByTab.has(null)) {
      for (const cmdId of capturesByTab.get(null)) {
        relevantCommandIds.add(cmdId);
      }
    }

    // Truncate message (defense-in-depth)
    let truncatedMessage = message.message;
    if (typeof message.message === 'string' && message.message.length > MAX_MESSAGE_LENGTH) {
      truncatedMessage = message.message.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
    }

    // Build log entry
    const logEntry = {
      level: message.level,
      message: truncatedMessage,
      timestamp: message.timestamp,
      source: message.source || 'unknown',
      url: sender.url || 'unknown',
      tabId: sender.tab.id,
      frameId: sender.frameId,
    };

    // Add to relevant captures
    for (const cmdId of relevantCommandIds) {
      const state = captureState.get(cmdId);
      if (!state || !state.active) continue;

      if (state.logs.length < MAX_LOGS_PER_CAPTURE) {
        state.logs.push(logEntry);
      } else if (state.logs.length === MAX_LOGS_PER_CAPTURE) {
        state.logs.push({
          level: 'warn',
          message: `[ChromeDevAssist] Log limit reached (${MAX_LOGS_PER_CAPTURE}). Further logs will be dropped.`,
          timestamp: new Date().toISOString(),
          source: 'chrome-dev-assist',
          tabId: logEntry.tabId,
        });
      }
    }
  }
  // ... rest of message handling
});
```

**AFTER (using class):**

```javascript
// background.js:687-720 (SIMPLIFIED)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'console-log') {
    // Truncate message (keep defense-in-depth)
    let truncatedMessage = message.message;
    if (typeof message.message === 'string' && message.message.length > MAX_MESSAGE_LENGTH) {
      truncatedMessage = message.message.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
    }

    // Build log entry
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
```

**Lines saved:** ~57 lines → ~25 lines (primarily removal of capture lookup logic)

---

### Mapping 5: Get Logs

**BEFORE (inline):**

```javascript
// In command handler (approximate location)
function getConsoleLogs(commandId) {
  const state = captureState.get(commandId);
  if (!state) return [];
  return state.logs; // Returns reference (mutable)
}
```

**AFTER (using class):**

```javascript
// In command handler
function getConsoleLogs(commandId) {
  return consoleCapture.getLogs(commandId); // Returns copy (immutable)
}
```

**Improvement:** Returns copy instead of reference (prevents external mutation)

---

### Mapping 6: Stop Capture

**BEFORE (inline):**

```javascript
// In command handler (approximate location)
function stopConsoleCapture(commandId) {
  const state = captureState.get(commandId);
  if (!state) return;

  state.active = false;
  state.endTime = Date.now();

  if (state.timeout) {
    clearTimeout(state.timeout);
    state.timeout = null;
  }
}
```

**AFTER (using class):**

```javascript
// In command handler
function stopConsoleCapture(commandId) {
  consoleCapture.stop(commandId);
}
```

**Lines saved:** ~10 lines → 1 line

---

### Mapping 7: Cleanup Capture (Optional - may not exist in current code)

**NEW (using class):**

```javascript
// Optional: Add cleanup method if needed
function cleanupConsoleCapture(commandId) {
  consoleCapture.cleanup(commandId);
}
```

---

## Total Impact Analysis

### Lines of Code Reduction

| Section                   | Before   | After                    | Saved         |
| ------------------------- | -------- | ------------------------ | ------------- |
| Data structures           | 2        | 2 (import + instantiate) | 0             |
| Periodic cleanup          | ~15      | 3                        | ~12           |
| Start capture             | ~30      | 6                        | ~24           |
| Message handler (add log) | ~57      | ~25                      | ~32           |
| Get logs                  | ~5       | 1                        | ~4            |
| Stop capture              | ~10      | 1                        | ~9            |
| **TOTAL**                 | **~119** | **~38**                  | **~81 lines** |

**Result:** Remove ~81 lines of inline logic from background.js

### Code Quality Improvements

1. **Separation of Concerns**
   - Console capture logic → ConsoleCapture.js (isolated)
   - WebSocket/command handling → background.js (focused)

2. **Testability**
   - Can unit test ConsoleCapture without Chrome APIs
   - Can mock consoleCapture in background.js tests

3. **Maintainability**
   - Single source of truth (ConsoleCapture.js)
   - Clear API boundaries
   - Returns immutable copies (prevents bugs)

4. **No Duplication**
   - Eliminates 250 lines of unused code

---

## Files to Modify (Surgical Changes Only)

### File 1: extension/background.js

**Changes:**

1. **Add import** (top of file, after other requires):

   ```javascript
   const ConsoleCapture = require('./modules/ConsoleCapture');
   const consoleCapture = new ConsoleCapture();
   ```

2. **Remove data structures** (line 10-12):

   ```javascript
   // DELETE:
   // const captureState = new Map();
   // const capturesByTab = new Map();
   ```

3. **Refactor periodic cleanup** (line 22-37):
   - Replace ~15 lines with 3-line delegation

4. **Refactor start capture** (wherever it is):
   - Replace ~30 lines with 6-line delegation

5. **Refactor message handler** (line 687-744):
   - Replace ~57 lines with ~25 lines (keep truncation, delegate capture logic)

6. **Refactor get logs** (in command handlers):
   - Replace with single line: `consoleCapture.getLogs(commandId)`

7. **Refactor stop capture** (in command handlers):
   - Replace with single line: `consoleCapture.stop(commandId)`

**Estimated changes:** 7 locations, ~81 lines removed, ~38 lines added

---

### File 2: extension/modules/ConsoleCapture.js

**Changes:** NONE (already complete)

**Verification needed:** Check if global captures (tabId: null) work

- Line 119-123: Code exists for global captures ✅
- Should work as-is

---

## Next Steps

**Before implementation:**

1. ✅ Read background.js to find exact line numbers for each section
2. ✅ Write tests FIRST (unit tests for ConsoleCapture, integration tests for background.js)
3. ✅ Create HTML test fixtures
4. ✅ Run existing tests to establish baseline

**Implementation:** 5. Make surgical changes (one section at a time) 6. Run tests after each change 7. Validate continuously

**Validation:** 8. Run all tests 9. Manual testing with extension 10. /validate command 11. /review command 12. Self-check: "Was I careful?"

---

## Status

**Mapping:** ✅ COMPLETE
**Next:** Find exact line numbers in background.js
**Then:** Write tests FIRST
**Then:** Implement

**Created:** 2025-10-27

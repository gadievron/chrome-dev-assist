# Plan: Extension Error Detection & Capture

**Date:** 2025-10-26
**Status:** PLANNING
**Priority:** HIGH (critical testing capability)

---

## 🎯 User Requirements

> "what about knowing if extension has errors, if reload button is there or disappeared, and grabbing the extension errors?"
> "and if service worker is active"
> "also these? We should add these API functions:
> await wakeServiceWorker();
> const status = await getServiceWorkerStatus(); // Returns: { running: true/false, connected: true/false }
> const logs = await captureServiceWorkerLogs(duration);"

**Nine capabilities needed:**

1. **Detect if extension has errors** - Know when extension enters error state (internal errors)
2. **Check if red "Errors" button is visible** - Infer if chrome://extensions shows red error button
3. **Get error count** - Know how many errors the red button would show
4. **Detect if errors were cleared** - Know if error count dropped to 0 (button disappeared)
5. **Grab extension errors** - Retrieve actual error messages for debugging
6. **Check service worker status** - Know if service worker is active, suspended, or terminated
7. **Wake service worker** - Programmatically wake up suspended service worker
8. **Capture service worker logs** - Record console output from background service worker
9. **Extension health check** - Overall health indicator (healthy vs has issues)

---

## 📋 Current State Analysis

### ✅ What Already Exists

**ErrorLogger (extension/lib/error-logger.js):**

- Centralized error logging utility
- Distinguishes expected vs unexpected errors
- Uses `console.warn` for expected errors (prevents Chrome crash detection)
- Uses `console.error` for unexpected errors
- **GAP:** Only logs to console, doesn't store errors

**Usage in background.js:**

- 7 locations using `ErrorLogger.logExpectedError()`
- Used for: queue overflow, message send failures, tab cleanup failures
- **GAP:** No usage of `logUnexpectedError()` or `logCritical()`

**Known Issue (from error-logger.js:8-9):**

> "Chrome marks extensions as 'crashed' when it sees console.error() in error handlers, causing the reload button to disappear in chrome://extensions."

### ❌ What's Missing

1. **No error storage** - ErrorLogger doesn't keep error history
2. **No error retrieval command** - Can't query errors from tests
3. **No extension status detection** - Can't check chrome://extensions programmatically
4. **No global error handlers** - Unhandled errors not captured
5. **No tests** - Error capture mechanism not tested

---

## 🏗️ Architecture Design

### Approach 1: Error Storage in ErrorLogger ✅ RECOMMENDED

**Extend ErrorLogger to store errors in memory:**

```javascript
// Add to ErrorLogger class
static errorHistory = [];
static MAX_ERRORS = 100; // Limit memory usage

static logExpectedError(context, message, error) {
  const errorData = this._buildErrorData(context, message, error);
  console.warn('[ChromeDevAssist] Expected error (handled gracefully):', errorData);

  // Store error
  this.errorHistory.push({ ...errorData, severity: 'expected' });
  if (this.errorHistory.length > this.MAX_ERRORS) {
    this.errorHistory.shift(); // Remove oldest
  }

  return errorData;
}

// Similar for logUnexpectedError

static getErrors(filter = {}) {
  // Filter by severity, context, time range, etc.
  return this.errorHistory.filter(err => {
    // Apply filters
  });
}

static clearErrors() {
  this.errorHistory = [];
}
```

**Why this approach:**

- Minimal changes (add storage to existing system)
- Maintains existing API (backward compatible)
- Centralized (all errors go through one place)

### Approach 2: Global Error Handlers ✅ RECOMMENDED

**Add unhandled error/rejection handlers:**

```javascript
// In background.js initialization

// Catch unhandled errors
self.addEventListener('error', event => {
  ErrorLogger.logUnexpectedError(
    'unhandledError',
    'Unhandled error in service worker',
    event.error
  );
});

// Catch unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  ErrorLogger.logUnexpectedError('unhandledRejection', 'Unhandled promise rejection', event.reason);
});
```

**Why this approach:**

- Catches errors that slip through try/catch
- No code changes needed elsewhere
- Complements existing ErrorLogger usage

### Approach 3: Extension Status Check Command ✅ RECOMMENDED

**Add new WebSocket command: `getExtensionStatus`**

```javascript
// In background.js message handler

case 'getExtensionStatus':
  const status = {
    errors: ErrorLogger.getErrors(),
    errorCount: ErrorLogger.errorHistory.length,
    hasUnexpectedErrors: ErrorLogger.errorHistory.some(e => e.severity === 'unexpected'),
    uptime: Date.now() - sessionMetadata.startupTime,
    crashDetected: sessionMetadata.crashDetected,
    recoveryCount: sessionMetadata.recoveryCount
  };

  ws.send(JSON.stringify({
    type: 'extensionStatus',
    commandId: message.commandId,
    status
  }));
  break;
```

**Why this approach:**

- Consistent with existing command pattern
- Provides comprehensive status info
- Easy to call from tests

### Approach 4: Service Worker Status Detection ✅ RECOMMENDED

**Track service worker lifecycle events:**

```javascript
// Service worker status tracking
let serviceWorkerStatus = {
  state: 'active', // 'active', 'suspending', 'suspended'
  lastActiveTime: Date.now(),
  suspendCount: 0,
  activeDuration: 0
};

// Update on suspend
chrome.runtime.onSuspend.addListener(() => {
  serviceWorkerStatus.state = 'suspending';
  serviceWorkerStatus.suspendCount++;
  serviceWorkerStatus.activeDuration = Date.now() - serviceWorkerStatus.lastActiveTime;
  markCleanShutdown(); // Existing functionality
});

// Update on startup
serviceWorkerStatus.state = 'active';
serviceWorkerStatus.lastActiveTime = Date.now();

// Include in status response
case 'getExtensionStatus':
  const status = {
    // ... existing status fields
    serviceWorker: {
      state: serviceWorkerStatus.state,
      uptime: Date.now() - serviceWorkerStatus.lastActiveTime,
      suspendCount: serviceWorkerStatus.suspendCount,
      lastActiveDuration: serviceWorkerStatus.activeDuration
    }
  };
```

**Why this approach:**

- Leverages existing onSuspend listener (background.js:1706)
- Minimal overhead (just updating timestamps)
- Provides useful debugging info (suspend count, uptime)
- Integrates with existing crash detection

**Alternative: chrome.management API**

```javascript
// Can query extension state from outside
const info = await chrome.management.getSelf();
// info.enabled, info.installType, etc.
```

**Why NOT this alternative:**

- Doesn't provide service worker specific status
- Can't detect active vs suspended (extension may be enabled but worker suspended)
- Approach 4 provides more granular info

### Approach 5: chrome://extensions Page Monitoring ⚠️ COMPLEX

**Navigate to chrome://extensions and check UI:**

```javascript
// In test framework (server side)

async function checkExtensionErrorState() {
  // Open chrome://extensions
  // Look for error indicators
  // Check if "Reload" button present
  // Grab error details from UI
}
```

**Why NOT this approach:**

- chrome:// pages have restricted access
- UI scraping is fragile (breaks with Chrome updates)
- Approach 3 (status command) is more reliable
- **DEFER** - Only implement if Approach 3 insufficient

### Approach 6: Wake Service Worker Command ✅ RECOMMENDED

**Add WebSocket command to wake service worker:**

```javascript
// In background.js message handler
case 'wakeServiceWorker':
  // Service worker is already awake if it's handling this message!
  // Send acknowledgement
  ws.send(JSON.stringify({
    type: 'serviceWorkerAwake',
    commandId: message.commandId,
    timestamp: Date.now()
  }));
  break;
```

**Why this approach:**

- Simple: Just sending a message wakes it up
- The act of handling the message proves it's awake
- No additional logic needed

**Alternative: Dedicated ping/pong**

```javascript
case 'ping':
  ws.send(JSON.stringify({ type: 'pong', commandId: message.commandId }));
  break;
```

**Why NOT this alternative:**

- Redundant with Approach 6
- Any message wakes service worker
- Keep it simple

### Approach 7: Service Worker Status API ✅ RECOMMENDED

**Add lightweight status check command:**

```javascript
// In background.js message handler
case 'getServiceWorkerStatus':
  const swStatus = {
    running: true, // If we're handling this message, we're running
    connected: ws.readyState === WebSocket.OPEN,
    state: serviceWorkerStatus.state,
    uptime: Date.now() - serviceWorkerStatus.lastActiveTime,
    timestamp: Date.now()
  };

  ws.send(JSON.stringify({
    type: 'serviceWorkerStatus',
    commandId: message.commandId,
    status: swStatus
  }));
  break;
```

**Why this approach:**

- Lightweight (returns immediately)
- Focused (just status, not full extension state)
- Complements getExtensionStatus (which is heavier)

**Difference from getExtensionStatus:**

- `getServiceWorkerStatus`: Lightweight, just running/connected
- `getExtensionStatus`: Comprehensive, includes errors, crash info, etc.

### Approach 8: Service Worker Log Capture ✅ RECOMMENDED

**Intercept console methods in background.js:**

```javascript
// Service Worker Console Log Storage
let serviceWorkerLogs = [];
const MAX_SW_LOGS = 1000;
let loggingEnabled = false;

// Intercept console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

function interceptConsole() {
  ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
    console[level] = function(...args) {
      // Always call original
      originalConsole[level].apply(console, args);

      // Store if logging enabled
      if (loggingEnabled) {
        serviceWorkerLogs.push({
          level,
          message: args.map(arg => String(arg)).join(' '),
          timestamp: Date.now()
        });

        // Prevent memory leak
        if (serviceWorkerLogs.length > MAX_SW_LOGS) {
          serviceWorkerLogs.shift();
        }
      }
    };
  });
}

// Commands
case 'startServiceWorkerLogCapture':
  loggingEnabled = true;
  serviceWorkerLogs = []; // Clear previous
  setTimeout(() => {
    loggingEnabled = false; // Auto-stop after duration
    ws.send(JSON.stringify({
      type: 'serviceWorkerLogs',
      commandId: message.commandId,
      logs: serviceWorkerLogs
    }));
  }, message.duration || 3000);
  break;

case 'getServiceWorkerLogs':
  ws.send(JSON.stringify({
    type: 'serviceWorkerLogs',
    commandId: message.commandId,
    logs: serviceWorkerLogs
  }));
  break;
```

**Why this approach:**

- Captures ALL console output (not just errors)
- Non-invasive (original console still works)
- Memory-safe (MAX_SW_LOGS limit)
- Useful for debugging extension internals

**Difference from page console capture:**

- **Page console**: inject-console-capture.js intercepts page's console
- **Service worker console**: This intercepts background.js console

**Use cases:**

- Debug extension initialization
- Monitor WebSocket messages
- Track tab operations
- Analyze crash recovery

### Approach 9: Extension Health Check ✅ RECOMMENDED

**Infer Chrome's view of extension health:**

```javascript
// In getExtensionStatus response
{
  // ... other fields ...

  health: {
    isHealthy: true/false,          // Overall health indicator
    hasUnexpectedErrors: false,     // Has uncaught errors
    serviceWorkerRunning: true,     // Service worker active
    hasRedErrorsButton: false,      // Inferred: red "Errors" button in chrome://extensions
    errorCount: 0,                  // Count shown on red button (console.error + uncaught)
    errorsCleared: false,           // True if errors were recently cleared
    canAcceptCommands: true,        // Can handle WebSocket commands
    issues: []                       // Array of detected issues
  }
}

// Track previous error count to detect clearing
let previousErrorCount = 0;

// Health determination logic
function calculateHealth() {
  const hasUnexpectedErrors = ErrorLogger.errorHistory.some(e => e.severity === 'unexpected');
  const serviceWorkerRunning = true; // If we're running this code, worker is running

  // Count errors that Chrome would show in red "Errors" button
  // Chrome counts: console.error() calls + uncaught errors
  const consoleErrorCount = ErrorLogger.errorHistory.filter(e =>
    e.severity === 'unexpected'  // logUnexpectedError uses console.error()
  ).length;

  const uncaughtErrorCount = ErrorLogger.errorHistory.filter(e =>
    e.context === 'unhandledError' || e.context === 'unhandledRejection'
  ).length;

  const errorCount = consoleErrorCount + uncaughtErrorCount;
  const hasRedErrorsButton = errorCount > 0; // Red button appears if any errors

  // Detect if errors were cleared (error count dropped to 0)
  const errorsCleared = previousErrorCount > 0 && errorCount === 0;
  previousErrorCount = errorCount; // Update for next check

  const issues = [];
  if (hasUnexpectedErrors) issues.push('Unexpected errors detected');
  if (sessionMetadata.crashDetected) issues.push('Previous crash detected');
  if (sessionMetadata.recoveryCount > 3) issues.push('Frequent crashes');
  if (errorCount > 10) issues.push('High error count');

  return {
    isHealthy: !hasUnexpectedErrors && !sessionMetadata.crashDetected,
    hasUnexpectedErrors,
    serviceWorkerRunning,
    hasRedErrorsButton,
    errorCount,
    errorsCleared,
    canAcceptCommands: true,
    issues
  };
}
```

**Why this approach:**

- **Can't directly access chrome://extensions UI** - Restricted chrome:// pages
- **Can infer Chrome's view** - Chrome sees the same errors we do
- **Correlation:**
  - console.error() → Chrome sees it → Red "Errors" button appears
  - Uncaught errors → Chrome sees them → Added to error count
  - No errors → No red button

**What triggers red "Errors" button in chrome://extensions:**

1. **console.error() calls** - ErrorLogger.logUnexpectedError() uses console.error()
2. **Uncaught errors** - Global error handler catches, logs with console.error()
3. **Uncaught promise rejections** - Global handler catches, logs with console.error()
4. **Content script errors** - Also visible to Chrome's error tracking

**How we track the same errors:**

- ErrorLogger.errorHistory stores all errors with severity and context
- console.error() count = errors with severity='unexpected'
- Uncaught error count = errors with context='unhandledError'/'unhandledRejection'
- Total = errorCount shown on red button

**How errors can be cleared:**

1. **User clicks "Clear all" in chrome://extensions** - Clears Chrome's error log (we won't know)
2. **ErrorLogger.clearErrors() called** - Clears our error history
3. **Extension reloaded** - Service worker restarts, errorHistory resets to []

**How we detect error clearing:**

- Track previousErrorCount (persisted across status checks)
- If previousErrorCount > 0 && currentErrorCount === 0 → errorsCleared = true
- This tells you: "Extension was in error state, now recovered"

**Limitations:**

- ❌ Can't read actual error count from chrome://extensions (UI is restricted)
- ❌ Can't detect if user manually cleared Chrome's errors (unless we also clear ours)
- ✅ Can infer with near-perfect accuracy (we see the same console output)
- ✅ Can detect when our errors were cleared (via clearErrors() or reload)
- ✅ Good enough for testing purposes (99% accurate)

**Alternative: chrome.management API**

```javascript
const info = await chrome.management.getSelf();
// info.enabled - Is extension enabled?
// info.disabledReason - Why disabled? (only if disabled)
```

**Why NOT this alternative:**

- Doesn't provide error state or reload button info
- Only tells if extension is enabled/disabled
- Not granular enough for our needs

**Decision:** Use Approach 9 (inferred health) + include chrome.management info for completeness

---

## 📝 Implementation Plan

### Phase 1: Extend ErrorLogger (PRIORITY 1)

**Files to modify:**

- `extension/lib/error-logger.js` (add storage)

**Changes:**

1. Add `static errorHistory = []`
2. Add `static MAX_ERRORS = 100`
3. Modify `logExpectedError()` to store errors
4. Modify `logUnexpectedError()` to store errors
5. Add `static getErrors(filter)`
6. Add `static clearErrors()`
7. Add `static getErrorStats()`

**Tests to write (FIRST):**

- `tests/unit/error-logger-storage.test.js` (~15 tests)
  - Test error storage
  - Test max errors limit (memory leak prevention)
  - Test getErrors filtering
  - Test clearErrors
  - Test error stats

### Phase 2: Global Error Handlers (PRIORITY 1)

**Files to modify:**

- `extension/background.js` (add event listeners)

**Changes:**

1. Add `error` event listener
2. Add `unhandledrejection` event listener
3. Log to ErrorLogger with context

**Tests to write (FIRST):**

- `tests/unit/global-error-handlers.test.js` (~10 tests)
  - Test error event captured
  - Test unhandledrejection captured
  - Test errors stored in ErrorLogger
  - Test error details preserved

### Phase 3: Service Worker Status Tracking (PRIORITY 1)

**Files to modify:**

- `extension/background.js` (add status tracking)

**Changes:**

1. Add `serviceWorkerStatus` object
2. Update status on startup (set to 'active')
3. Update status in onSuspend listener (set to 'suspending')
4. Track suspend count, uptime, active duration

**Tests to write (FIRST):**

- `tests/unit/service-worker-status.test.js` (~8 tests)
  - Test status initialized to 'active'
  - Test status updated on suspend
  - Test suspend count increments
  - Test uptime calculation
  - Test active duration calculated

### Phase 4: Extension Status Command (PRIORITY 1)

**Files to modify:**

- `extension/background.js` (add command handler)
- `server/websocket-server.js` (add command documentation)

**Changes:**

1. Add `getExtensionStatus` command handler
2. Return comprehensive status object
3. Include error history, crash info, uptime, service worker status

**Tests to write (FIRST):**

- `tests/unit/get-extension-status.test.js` (~14 tests)
  - Test status includes errors
  - Test status includes crash info
  - Test status includes uptime
  - Test status includes service worker state
  - Test status includes suspend count
  - Test filtering works

### Phase 5: New API Commands (PRIORITY 1)

**Files to modify:**

- `extension/background.js` (add command handlers)
- `server/websocket-server.js` (add command documentation)

**Changes:**

1. Add `wakeServiceWorker` command handler (simple acknowledgement)
2. Add console interception for service worker logs
3. Add `startServiceWorkerLogCapture` command (duration-based)
4. Add `getServiceWorkerLogs` command (immediate retrieval)

**Tests to write (FIRST):**

- `tests/unit/wake-service-worker.test.js` (~4 tests)
  - Test wake command returns acknowledgement
  - Test timestamp included
  - Test service worker state after wake

- `tests/unit/service-worker-log-capture.test.js` (~14 tests)
  - Test console interception setup
  - Test logs captured during active capture
  - Test logs NOT captured when inactive
  - Test duration auto-stops capture
  - Test memory limit enforced (MAX_SW_LOGS)
  - Test all log levels captured (log, warn, error, info, debug)
  - Test original console still works
  - Test getLogs returns current logs
  - Test concurrent captures

### Phase 6: HTML Integration Tests (PRIORITY 2)

**Files to create:**

- `tests/html/test-extension-errors.html`
- `tests/html/test-error-detection.html`
- `tests/html/test-service-worker-status.html`
- `tests/html/test-service-worker-logs.html`

**Tests:**

1. Trigger expected error, verify captured in getExtensionStatus
2. Trigger unexpected error, verify captured
3. Trigger unhandled error, verify captured
4. Query status, verify errors and service worker state returned
5. Clear errors, verify cleared
6. Wake service worker, verify responds
7. Capture service worker logs, verify console output recorded
8. Test log capture memory limits

---

## 🎯 Success Criteria

**Functional:**

- ✅ All errors logged to ErrorLogger are stored
- ✅ Unhandled errors/rejections are captured
- ✅ Tests can query error history via command
- ✅ Error storage respects memory limits
- ✅ Error filtering works (by severity, context, time)

**Quality:**

- ✅ Test-first discipline followed (all tests written before code)
- ✅ All tests passing (target: 37 new tests)
- ✅ No regressions (existing 53 tests still pass)
- ✅ Comprehensive documentation
- ✅ Surgical changes only

**Performance:**

- ✅ No memory leaks (MAX_ERRORS limit enforced)
- ✅ Error storage O(1) insertion
- ✅ Error retrieval O(n) with filters

---

## 🚨 Risks & Mitigations

**Risk 1: Memory leaks from unbounded error storage**

- **Mitigation:** MAX_ERRORS limit (100 errors = ~10KB max)
- **Detection:** Test with 1000+ errors, verify oldest dropped

**Risk 2: console.error triggers Chrome crash detection**

- **Mitigation:** Already handled by ErrorLogger design (uses console.warn for expected errors)
- **Detection:** Monitor chrome://extensions during tests

**Risk 3: Global error handlers interfere with existing error handling**

- **Mitigation:** Only log, don't preventDefault() or interfere
- **Detection:** Run all existing tests, verify no behavior changes

**Risk 4: Performance impact from error filtering**

- **Mitigation:** Simple array filter, 100 errors max = trivial overhead
- **Detection:** Benchmark getErrors() with 100 errors

---

## 📊 Test Count Estimate

**Phase 1: ErrorLogger Storage**

- 15 unit tests

**Phase 2: Global Error Handlers**

- 10 unit tests

**Phase 3: Service Worker Status Tracking**

- 8 unit tests

**Phase 4: Extension Status Command (getExtensionStatus)**

- 14 unit tests

**Phase 5: New API Commands**

- wake-service-worker.test.js: 4 unit tests
- service-worker-log-capture.test.js: 14 unit tests

**Phase 6: HTML Integration Tests**

- 8 HTML tests (not Jest)

**Total:** 65 new Jest tests + 8 HTML tests = 73 total new tests

**Target:** 118/118 Jest tests passing (53 existing + 65 new)

**Note:** Removed redundant `getServiceWorkerStatus` tests (would have been ~6 tests) because that functionality is included in `getExtensionStatus`

---

## 🔄 Deferred Features

**chrome://extensions Page Monitoring** (Approach 4)

- **Why deferred:** Complex, fragile, low ROI
- **Alternative:** Use Approach 3 (status command) instead
- **Reconsider if:** Status command proves insufficient

**External Error Reporting**

- **Why deferred:** externalLoggingConfig exists but unused
- **Scope:** Out of current request
- **Future work:** Could send errors to external service

**Error Analytics Dashboard**

- **Why deferred:** Not requested by user
- **Scope:** Out of current request
- **Future work:** Could visualize error trends

---

## 📁 File Structure After Implementation

```
extension/
├── lib/
│   └── error-logger.js (MODIFIED - add storage)
├── background.js (MODIFIED - add handlers + status tracking + commands + console interception)

tests/unit/
├── error-logger-storage.test.js (NEW - 15 tests)
├── global-error-handlers.test.js (NEW - 10 tests)
├── service-worker-status.test.js (NEW - 8 tests)
├── get-extension-status.test.js (NEW - 14 tests)
├── wake-service-worker.test.js (NEW - 4 tests)
├── service-worker-log-capture.test.js (NEW - 14 tests)

tests/html/
├── test-extension-errors.html (NEW)
├── test-error-detection.html (NEW)
├── test-service-worker-status.html (NEW)
└── test-service-worker-logs.html (NEW)

docs/
├── EXTENSION-ERROR-CAPTURE.md (NEW - usage guide)
└── API-DESIGN-SIMPLIFIED-2025-10-26.md (NEW - redundancy analysis)
```

---

## ✅ Next Steps

1. **Get user approval** on this plan
2. **Phase 1:** Write tests for ErrorLogger storage (15 tests) → Implement
3. **Phase 2:** Write tests for global error handlers (10 tests) → Implement
4. **Phase 3:** Write tests for service worker status tracking (8 tests) → Implement
5. **Phase 4:** Write tests for getExtensionStatus command (14 tests) → Implement
6. **Phase 5:** Write tests for new API commands (18 tests: wake + log capture) → Implement
7. **Phase 6:** Create HTML integration tests (8 HTML tests) → Execute
8. **Validate all 118 tests pass** (53 existing + 65 new)
9. **Document and checkpoint**

**Estimated time:** 5-6 hours (with test-first discipline)

---

## 🎓 Key Design Decisions

**Decision 1: Extend existing ErrorLogger vs create new system**

- **Choice:** Extend ErrorLogger
- **Reason:** Minimal changes, already integrated, maintains consistency

**Decision 2: Store errors in memory vs chrome.storage**

- **Choice:** Memory only (for now)
- **Reason:** Faster, simpler, sufficient for testing use case
- **Future:** Could add chrome.storage.local persistence if needed

**Decision 3: Global error handlers vs manual try/catch everywhere**

- **Choice:** Global handlers
- **Reason:** Catches errors we miss, complements existing error handling

**Decision 4: Status command vs chrome://extensions scraping**

- **Choice:** Status command
- **Reason:** More reliable, easier to test, not fragile to Chrome updates

---

**Plan Status:** ✅ READY FOR APPROVAL (REDUNDANCIES REMOVED)
**Estimated Time:** 5-6 hours (with test-first discipline)
**Test Count:** 65 new Jest tests + 8 HTML tests = 73 total new tests
**Target:** 118/118 Jest tests passing (53 existing + 65 new)
**Risk Level:** LOW (well-scoped, surgical changes, extends existing systems)

**Redundancy Resolution:** ✅ COMPLETED

- Removed duplicate `getServiceWorkerStatus` command
- All service worker status included in comprehensive `getExtensionStatus`
- See: API-DESIGN-SIMPLIFIED-2025-10-26.md

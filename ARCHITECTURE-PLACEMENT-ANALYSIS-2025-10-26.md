# Architecture Placement Analysis - Extension Error Monitoring

**Date:** 2025-10-26
**Status:** ARCHITECTURE REVIEW
**Purpose:** Verify correct file placement before implementation

---

## 🏗️ Current Architecture

```
extension/
├── background.js (2385 lines)         # Service worker (MAIN execution context)
├── content-script.js (47 lines)       # ISOLATED world (bridge)
├── inject-console-capture.js (96)     # MAIN world (page console)
├── lib/
│   └── error-logger.js (156 lines)    # Centralized error logging
└── modules/
    └── ConsoleCapture.js              # Unused (future refactoring)
```

**Known Issue:** background.js is too large (2385 lines)
**Decision:** Add features to correct locations, defer full refactoring

---

## 📍 Placement Analysis

### Phase 1: ErrorLogger Storage

**Feature:** Add error history storage to ErrorLogger

**Correct location:** `extension/lib/error-logger.js` ✅

**Why:**
- ErrorLogger already exists here
- Centralized error handling
- Used by both background.js and (potentially) content scripts
- Clean separation of concerns

**Changes needed:**
```javascript
// In error-logger.js
class ErrorLogger {
  static errorHistory = [];           // NEW: Storage array
  static MAX_ERRORS = 100;           // NEW: Memory limit

  static logExpectedError(...) {
    // MODIFIED: Store error after logging
  }

  static getErrors(filter) {          // NEW: Retrieval method
  }

  static clearErrors() {              // NEW: Clear method
  }
}
```

**Impact:** ~50 lines added to error-logger.js (156 → ~206 lines)

---

### Phase 2: Global Error Handlers

**Feature:** Catch unhandled errors and rejections

**Correct location:** `extension/background.js` ✅

**Why:**
- Service worker global scope (self.addEventListener)
- Needs to run at startup (before any errors occur)
- Calls ErrorLogger (which is imported)

**Placement within background.js:**
- **After imports** (line ~7, after importScripts)
- **Before any other code** (catch errors from initialization)

**Changes needed:**
```javascript
// In background.js, right after importScripts('/lib/error-logger.js')

// Global error handlers (catch uncaught errors)
self.addEventListener('error', (event) => {
  ErrorLogger.logUnexpectedError(
    'unhandledError',
    'Uncaught error in service worker',
    event.error
  );
});

self.addEventListener('unhandledrejection', (event) => {
  ErrorLogger.logUnexpectedError(
    'unhandledRejection',
    'Uncaught promise rejection',
    event.reason
  );
});
```

**Impact:** ~20 lines added to background.js (2385 → ~2405 lines)

---

### Phase 3: Service Worker Status Tracking

**Feature:** Track service worker lifecycle (active/suspending/suspended)

**Correct location:** `extension/background.js` ✅

**Why:**
- Needs access to chrome.runtime.onSuspend (already has listener at line 1706)
- Tracks service worker's own state
- Used by getExtensionStatus command

**Placement within background.js:**
- **State variable:** Near top, after sessionMetadata (line ~42)
- **onSuspend modification:** Update existing listener (line 1706)
- **Startup initialization:** After state declaration

**Changes needed:**
```javascript
// Near line 42, after sessionMetadata
let serviceWorkerStatus = {
  state: 'active',           // 'active', 'suspending', 'suspended'
  lastActiveTime: Date.now(),
  suspendCount: 0,
  activeDuration: 0
};

// Modify existing onSuspend listener (line 1706)
chrome.runtime.onSuspend.addListener(() => {
  console.log('[ChromeDevAssist] Service worker suspending (clean shutdown)...');

  // NEW: Update service worker status
  serviceWorkerStatus.state = 'suspending';
  serviceWorkerStatus.suspendCount++;
  serviceWorkerStatus.activeDuration = Date.now() - serviceWorkerStatus.lastActiveTime;

  markCleanShutdown(); // Existing call
});

// After state declaration
serviceWorkerStatus.state = 'active';
serviceWorkerStatus.lastActiveTime = Date.now();
```

**Impact:** ~15 lines added/modified in background.js (2405 → ~2420 lines)

---

### Phase 4: getExtensionStatus Command

**Feature:** WebSocket command to retrieve comprehensive extension status

**Correct location:** `extension/background.js` ✅

**Why:**
- WebSocket message handlers are in background.js
- Needs access to: ErrorLogger, sessionMetadata, serviceWorkerStatus, ws object
- Follows existing pattern (see handleOpenUrlCommand at line 908)

**Placement within background.js:**
- **Helper function:** calculateHealth() near sessionMetadata (~line 50)
- **Command handler:** In WebSocket message handler switch statement
- **Location:** After existing commands (search for "case 'openUrl'")

**Changes needed:**
```javascript
// Near line 50, helper function
let previousErrorCount = 0;

function calculateHealth() {
  // ... implementation from plan
}

// In WebSocket message handler (find the switch statement)
case 'getExtensionStatus':
  const status = {
    errors: ErrorLogger.getErrors(),
    errorCount: ErrorLogger.errorHistory.length,
    hasUnexpectedErrors: ErrorLogger.errorHistory.some(e => e.severity === 'unexpected'),

    health: calculateHealth(),

    serviceWorker: {
      running: true,
      connected: ws.readyState === WebSocket.OPEN,
      state: serviceWorkerStatus.state,
      uptime: Date.now() - serviceWorkerStatus.lastActiveTime,
      suspendCount: serviceWorkerStatus.suspendCount,
      lastActiveDuration: serviceWorkerStatus.activeDuration
    },

    crashDetected: sessionMetadata.crashDetected,
    recoveryCount: sessionMetadata.recoveryCount,
    sessionUptime: Date.now() - sessionMetadata.startupTime,
    startupTime: sessionMetadata.startupTime
  };

  ws.send(JSON.stringify({
    type: 'extensionStatus',
    commandId: message.commandId,
    status
  }));
  break;
```

**Impact:** ~50 lines added to background.js (2420 → ~2470 lines)

---

### Phase 5A: wakeServiceWorker Command

**Feature:** Simple ping to wake suspended service worker

**Correct location:** `extension/background.js` ✅

**Why:**
- WebSocket command handler
- Service worker wakes when handling the message

**Placement:** In WebSocket message handler switch statement

**Changes needed:**
```javascript
case 'wakeServiceWorker':
  // Service worker is awake if handling this message
  ws.send(JSON.stringify({
    type: 'serviceWorkerAwake',
    commandId: message.commandId,
    timestamp: Date.now()
  }));
  break;
```

**Impact:** ~10 lines added to background.js (2470 → ~2480 lines)

---

### Phase 5B: Service Worker Log Capture

**Feature:** Intercept console.* calls in background service worker

**Correct location:** `extension/background.js` ✅

**Why:**
- Needs to wrap console.* in service worker global scope
- Must run at startup (before console is used)
- WebSocket commands to control capture

**Placement within background.js:**
- **Storage & config:** Near top, after serviceWorkerStatus (~line 55)
- **Console interception:** Right after global error handlers (~line 30)
- **Command handlers:** In WebSocket message handler switch statement

**Changes needed:**
```javascript
// Near line 55
let serviceWorkerLogs = [];
const MAX_SW_LOGS = 1000;
let loggingEnabled = false;

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Near line 30, right after global error handlers
['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
  console[level] = function(...args) {
    originalConsole[level].apply(console, args);

    if (loggingEnabled) {
      serviceWorkerLogs.push({
        level,
        message: args.map(arg => String(arg)).join(' '),
        timestamp: Date.now()
      });

      if (serviceWorkerLogs.length > MAX_SW_LOGS) {
        serviceWorkerLogs.shift();
      }
    }
  };
});

// In WebSocket message handler
case 'startServiceWorkerLogCapture':
  loggingEnabled = true;
  serviceWorkerLogs = [];
  const duration = message.duration || 3000;

  setTimeout(() => {
    loggingEnabled = false;
    ws.send(JSON.stringify({
      type: 'serviceWorkerLogs',
      commandId: message.commandId,
      logs: serviceWorkerLogs
    }));
  }, duration);
  break;

case 'getServiceWorkerLogs':
  ws.send(JSON.stringify({
    type: 'serviceWorkerLogs',
    commandId: message.commandId,
    logs: serviceWorkerLogs
  }));
  break;
```

**Impact:** ~60 lines added to background.js (2480 → ~2540 lines)

---

## 📊 Final Size Estimate

**extension/lib/error-logger.js:**
- Before: 156 lines
- After: ~206 lines (+50 lines, +32%)
- ✅ ACCEPTABLE - Still well under 300 lines

**extension/background.js:**
- Before: 2385 lines
- After: ~2540 lines (+155 lines, +6.5%)
- ⚠️ WARNING - Already too large, getting worse
- 📋 RECOMMENDATION: This reinforces need for Phase 7 refactoring

**Total code added:** ~205 lines across 2 files

---

## ✅ Architecture Validation

**All placements are correct:**
- ✅ ErrorLogger storage → error-logger.js (existing utility)
- ✅ Global error handlers → background.js (service worker global scope)
- ✅ Service worker status → background.js (tracks own lifecycle)
- ✅ Command handlers → background.js (WebSocket message handlers)
- ✅ Console interception → background.js (service worker console)

**No new files needed** - All features extend existing architecture

**Surgical changes only** - Minimal additions to existing files

---

## 🔄 Deferred Refactoring (Phase 7)

**After this implementation, background.js will be 2540 lines (too large)**

**Recommended refactoring:**
```
extension/
├── background.js (300 lines)          # Main entry point + imports
├── lib/
│   ├── error-logger.js (206 lines)    # ✅ Already good
│   ├── state-manager.js (NEW)         # sessionMetadata, serviceWorkerStatus
│   ├── command-handlers.js (NEW)      # All WebSocket command handlers
│   ├── console-interceptor.js (NEW)   # Service worker log capture
│   └── error-handlers.js (NEW)        # Global error handlers
└── modules/
    └── ConsoleCapture.js              # Activate for page console capture
```

**Decision:** Defer to separate session (would be another 8 hours)

---

## 🎯 Implementation Order (Based on Architecture)

**Phase 1:** error-logger.js changes (isolated, no dependencies)
**Phase 2:** background.js global handlers (early in file, uses ErrorLogger)
**Phase 3:** background.js status tracking (uses existing onSuspend)
**Phase 4:** background.js getExtensionStatus (uses all previous phases)
**Phase 5:** background.js wake + log capture (independent commands)

**This order minimizes risk:**
- Each phase builds on previous
- Each phase is independently testable
- No circular dependencies

---

## ✅ Ready for Implementation

**Architecture validated:** All placements correct
**Impact assessed:** ~205 lines across 2 files
**Order planned:** 5 phases, lowest risk first
**Refactoring deferred:** Background.js modularization (future session)

**Next step:** Plan detailed tests for Phase 1

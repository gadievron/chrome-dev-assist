# Simplified API Design - Extension Monitoring

**Date:** 2025-10-26
**Status:** DESIGN REVIEW
**Issue:** Redundant commands identified

---

## ❌ Problem: Redundancies Detected

**Original plan had overlapping commands:**

1. `getExtensionStatus` - Returns errors, crash info, uptime, service worker status
2. `getServiceWorkerStatus` - Returns running, connected, state, uptime ← **REDUNDANT!**

**Issue:** `getServiceWorkerStatus` is a subset of `getExtensionStatus`

---

## ✅ Simplified API Design

### Three Commands (No Redundancies)

**1. getExtensionStatus** - Comprehensive status

```javascript
// Request
{
  type: 'getExtensionStatus',
  commandId: 'status-123'
}

// Response
{
  type: 'extensionStatus',
  commandId: 'status-123',
  status: {
    // Errors
    errors: ErrorLogger.errorHistory,
    errorCount: 10,
    hasUnexpectedErrors: true,

    // Service Worker
    serviceWorker: {
      running: true,              // If responding, must be running
      connected: true,             // WebSocket connection status
      state: 'active',             // 'active', 'suspending', 'suspended'
      uptime: 45000,               // ms since last wake
      suspendCount: 3,             // Times suspended this session
      lastActiveDuration: 30000    // ms of last active period
    },

    // Crash Detection
    crashDetected: false,
    recoveryCount: 1,

    // Session Info
    sessionUptime: 120000,         // ms since extension started
    startupTime: 1698345600000     // Unix timestamp
  }
}
```

**2. wakeServiceWorker** - Simple ping to wake if suspended

```javascript
// Request
{
  type: 'wakeServiceWorker',
  commandId: 'wake-123'
}

// Response
{
  type: 'serviceWorkerAwake',
  commandId: 'wake-123',
  timestamp: 1698345600000
}

// Note: The act of handling this message wakes the service worker
```

**3. Service Worker Log Capture** - Two commands for log management

```javascript
// Start capture (auto-stops after duration)
{
  type: 'startServiceWorkerLogCapture',
  commandId: 'capture-123',
  duration: 5000  // ms, optional (default 3000)
}

// Response (sent after duration expires)
{
  type: 'serviceWorkerLogs',
  commandId: 'capture-123',
  logs: [
    { level: 'log', message: 'Console message', timestamp: 1698345600000 },
    { level: 'warn', message: 'Warning message', timestamp: 1698345600100 },
    { level: 'error', message: 'Error message', timestamp: 1698345600200 }
  ]
}

// Get current logs (without waiting for duration)
{
  type: 'getServiceWorkerLogs',
  commandId: 'logs-456'
}

// Response
{
  type: 'serviceWorkerLogs',
  commandId: 'logs-456',
  logs: [ /* same format */ ]
}
```

---

## 📊 Why This is Better

**Before (4 commands):**

- `getExtensionStatus` - Comprehensive
- `getServiceWorkerStatus` - Redundant (subset of above)
- `wakeServiceWorker` - Unique
- Service worker log capture - Unique

**After (3 commands):**

- `getExtensionStatus` - Comprehensive (includes service worker status)
- `wakeServiceWorker` - Unique (simple wake)
- Service worker log capture - Unique (console interception)

**Benefits:**

- ✅ No redundancies
- ✅ Clear separation of concerns:
  - `getExtensionStatus`: Read all status
  - `wakeServiceWorker`: Wake if needed
  - Log capture: Record console output
- ✅ Simpler API surface
- ✅ Easier to test
- ✅ Less code to maintain

---

## 🎯 Use Cases

**Use Case 1: Check if extension is healthy**

```javascript
const status = await getExtensionStatus();
if (status.hasUnexpectedErrors) {
  console.error('Extension has errors:', status.errors);
}
if (!status.serviceWorker.running) {
  await wakeServiceWorker();
}
```

**Use Case 2: Debug extension behavior**

```javascript
// Start capturing logs
await startServiceWorkerLogCapture(5000);

// Do something that triggers extension behavior
await openUrl('https://example.com');

// Wait for logs (automatically sent after 5s)
const logs = await waitForServiceWorkerLogs();
console.log('Extension logs:', logs);
```

**Use Case 3: Monitor service worker lifecycle**

```javascript
const status1 = await getExtensionStatus();
console.log('Initial state:', status1.serviceWorker.state);

// Wait for suspension
await sleep(30000);

const status2 = await getExtensionStatus();
console.log('After 30s:', status2.serviceWorker.state);
console.log('Suspend count:', status2.serviceWorker.suspendCount);
```

---

## 🔧 Implementation Simplification

**Removed:**

- ❌ `getServiceWorkerStatus` command handler
- ❌ Tests for redundant command (~6 tests saved)

**Kept:**

- ✅ `getExtensionStatus` (comprehensive)
- ✅ `wakeServiceWorker` (simple)
- ✅ Service worker log capture (unique capability)

**Test count adjustment:**

- Before: 47 new Jest tests
- After: 41 new Jest tests (removed 6 redundant tests)
- **Target: 94/94 tests passing (53 existing + 41 new)**

---

## ✅ Decision

**Remove `getServiceWorkerStatus`** - It's redundant with `getExtensionStatus`

**Rationale:**

- User is right: "everything should be in the API"
- One comprehensive command is better than multiple overlapping commands
- Simpler to use, test, and maintain
- No loss of functionality (all data available in `getExtensionStatus`)

---

**Status:** ✅ DESIGN SIMPLIFIED
**Next:** Update implementation plan with 3 commands (not 4)

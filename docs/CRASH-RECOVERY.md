# Crash Recovery System

Chrome Dev Assist includes a comprehensive crash recovery system that gracefully handles service worker restarts, server crashes, and unexpected disconnections.

---

## Overview

**Problem:** Chrome service workers can restart unexpectedly, causing loss of in-flight operations and test context.

**Solution:** Automatic state persistence and recovery with zero manual intervention required.

---

## Features

✅ **Automatic Crash Detection** - Detects unexpected service worker restarts
✅ **State Persistence** - Saves state every 30 seconds and after critical operations
✅ **Test State Recovery** - Restores active tests with tracked tabs
✅ **Capture State Recovery** - Restores in-flight console captures
✅ **Orphan Cleanup** - Removes tabs that no longer exist
✅ **Server Notification** - Alerts server about recovery status
✅ **User Feedback** - Clear console messages about recovered state

---

## How It Works

### 1. State Persistence

State is persisted to `chrome.storage.session` in multiple scenarios:

**Periodic Persistence:**
- Every 30 seconds automatically
- Ensures minimal data loss

**Event-Driven Persistence:**
- After starting a console capture
- After completing a console capture
- After test start/end operations
- After tab tracking changes

**Persisted Data:**
```javascript
{
  testState: {
    activeTestId: string | null,
    trackedTabs: number[],
    startTime: number,
    autoCleanup: boolean
  },
  captureState: Array<[commandId, CaptureInfo]>,
  sessionMetadata: {
    startupTime: number,
    lastShutdown: number | null,
    recoveryCount: number,
    crashDetected: boolean
  }
}
```

---

### 2. Crash Detection

On service worker startup:

1. **Load Previous Session Data**
   - Reads `sessionMetadata` from chrome.storage.session
   - Checks if previous session had clean shutdown

2. **Detect Crash**
   - If `lastShutdown === null` → **CRASH DETECTED**
   - If `lastShutdown !== null` → Clean restart

3. **Log Detection Result**
   ```
   ⚠️ CRASH DETECTED - Service worker restarted unexpectedly
   Previous session started: 2025-10-25T10:30:00.000Z
   ```

---

### 3. State Recovery

After crash detection, recovery process begins:

**Test State Recovery:**
1. Load `testState` from storage
2. Validate tracked tabs still exist
3. Remove orphaned tabs (closed during crash)
4. Restore test context

**Capture State Recovery:**
1. Load `captureState` array from storage
2. Filter expired captures (endTime < now)
3. Recreate setTimeout for remaining duration
4. Restore tab-specific capture index
5. Resume console log collection

**Recovery Output:**
```
✅ Restored active test: test-email-validation
✅ Tracked tabs: 3
✅ Restored 2 active capture(s)
🔄 RECOVERY COMPLETE
Recovered items:
  - Active test: test-email-validation
  - Capture: cmd-abc123... (3500ms remaining)
  - Capture: cmd-def456... (2100ms remaining)
```

---

### 4. Server Notification

On WebSocket reconnection, extension sends recovery metadata:

```javascript
{
  type: 'register',
  client: 'extension',
  extensionId: 'abcd...',
  recovery: {
    crashDetected: true,
    recoveryCount: 2,
    sessionStartTime: 1729850400000,
    hasActiveTest: true,
    activeTestId: 'test-123',
    trackedTabs: [100, 101],
    activeCapturesCount: 2
  }
}
```

Server logs recovery status:
```
[Server] 🔄 CRASH RECOVERY DETECTED for Chrome Dev Assist
[Server]   Recovery count: 2
[Server]   Session start: 2025-10-25T10:30:00.000Z
[Server]   Active test recovered: test-123
[Server]   Tracked tabs: 2
[Server]   Active captures recovered: 2
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Service Worker Startup                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Load Previous Session Metadata               │
│         (from chrome.storage.session)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
                   ┌───────────────┐
                   │ lastShutdown? │
                   └───────────────┘
                    ↓            ↓
              null (CRASH)     timestamp (CLEAN)
                    ↓            ↓
        ┌───────────────────────────────────┐
        │      Crash Recovery Mode          │
        │  - Log crash detection            │
        │  - Increment recovery count       │
        │  - Set crashDetected flag         │
        └───────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────┐
        │       Restore State               │
        │  1. Load testState                │
        │  2. Validate tracked tabs         │
        │  3. Load captureState             │
        │  4. Recreate timeouts             │
        │  5. Restore indexes               │
        └───────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────┐
        │   Reconnect to WebSocket Server   │
        │  - Send recovery metadata         │
        │  - Server logs recovery status    │
        └───────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────┐
        │    Resume Normal Operation        │
        │  - Tests continue from recovery   │
        │  - Captures continue collecting   │
        │  - Periodic state persistence     │
        └───────────────────────────────────┘
```

---

## State Lifecycle

### Normal Operation

```
1. Operation Start (e.g., start capture)
   ↓
2. Persist State
   ↓
3. Operation In Progress
   ↓
4. Periodic Persist (every 30s)
   ↓
5. Operation Complete
   ↓
6. Persist State
   ↓
7. Mark Clean Shutdown (on suspension)
```

### After Crash

```
1. Service Worker Restarts
   ↓
2. Detect Crash (lastShutdown === null)
   ↓
3. Load Persisted State
   ↓
4. Validate State (remove orphans)
   ↓
5. Restore Active Operations
   ↓
6. Notify Server (recovery metadata)
   ↓
7. Resume Normal Operation
```

---

## Recovery Scenarios

### Scenario 1: Service Worker Crash During Test

**Before Crash:**
- Active test: `test-login`
- Tracked tabs: [100, 101, 102]
- Console capture: `cmd-123` (3s remaining)

**After Crash:**
- ✅ Test state restored
- ✅ Tabs validated (102 closed → removed)
- ✅ Capture resumed with 3s remaining
- ✅ Server notified of recovery

**Result:** Test continues without manual intervention

---

### Scenario 2: Service Worker Crash with Expired Captures

**Before Crash:**
- Capture: `cmd-456` (5s duration, started 10s ago)

**After Crash:**
- ⚠️ Capture expired (5s ago)
- ✅ Capture NOT restored
- ✅ Cleanup occurs automatically

**Result:** Only valid state is restored

---

### Scenario 3: Clean Restart (No Crash)

**Before Restart:**
- Clean shutdown marked: `lastShutdown = 1729850400000`

**After Restart:**
- ✅ No crash detected
- ✅ State still loaded (if any)
- ✅ Normal startup message

**Result:** No recovery warnings, clean session start

---

## Data Retention

**Session Storage Duration:**
- Data persists until browser/tab closes
- Service worker restarts do NOT clear session storage
- Perfect for crash recovery

**Cleanup Policy:**
- Expired captures: Not restored
- Orphaned tabs: Removed from tracking
- Stale tests: No automatic cleanup (manual abort required)

---

## Performance Impact

**Storage Operations:**
- Persist state: ~10-50ms (async, non-blocking)
- Restore state: ~50-200ms (on startup only)
- Periodic persist: Every 30s (minimal impact)

**Memory Usage:**
- Test state: ~1KB
- Capture state: ~1KB per capture + logs
- Session metadata: <1KB
- Total: Typically <100KB

---

## Testing Crash Recovery

### Manual Test

1. **Start a test with tracked tabs:**
   ```javascript
   await chromeDevAssist.startTest('test-crash-recovery');
   const result = await chromeDevAssist.openUrl('https://example.com', {
     captureConsole: true,
     duration: 10000
   });
   ```

2. **Force service worker restart:**
   - Open `chrome://extensions`
   - Find "Chrome Dev Assist"
   - Click "service worker" link
   - Click "Terminate" button

3. **Verify recovery:**
   - Service worker auto-restarts
   - Check console for recovery messages
   - Verify test state restored
   - Verify captures resume

### Automated Tests

Run crash recovery test suite:
```bash
npm test -- tests/crash-recovery.test.js
```

---

## Debugging

### Enable Debug Logging

**Extension:**
```javascript
// Open extension service worker console
// All recovery messages logged by default
```

**Server:**
```bash
DEBUG=true node server/websocket-server.js
```

### Recovery Logs

**Extension Console:**
```
⚠️ CRASH DETECTED - Service worker restarted unexpectedly
Previous session started: 2025-10-25T10:30:00.000Z
✅ Restored active test: test-123
✅ Tracked tabs: 2
✅ Restored 1 active capture(s)
🔄 RECOVERY COMPLETE
🔄 Reconnected after crash recovery
Active test: test-123
Tracked tabs: 2
Active captures: 1
```

**Server Console:**
```
[Server] 🔄 CRASH RECOVERY DETECTED for Chrome Dev Assist
[Server]   Recovery count: 1
[Server]   Session start: 2025-10-25T10:30:00.000Z
[Server]   Active test recovered: test-123
[Server]   Tracked tabs: 2
[Server]   Active captures recovered: 1
```

---

## Limitations

1. **Session Storage Lifetime**
   - Cleared when browser/tab closes
   - NOT persisted across browser restarts

2. **Capture Duration**
   - Only unexpired captures restored
   - If capture duration passed during crash, capture is lost

3. **External Tab Closure**
   - Tabs closed by user during crash are removed
   - No way to restore closed tabs

4. **Server Restart**
   - Server state NOT persisted
   - Extension reconnects automatically
   - Tests may need manual restart if server crashed

---

## Best Practices

### For Test Authors

1. **Use Test Orchestration API**
   ```javascript
   await chromeDevAssist.startTest('test-id');
   // ... operations ...
   await chromeDevAssist.endTest('test-id');
   ```
   Enables automatic recovery tracking.

2. **Set Reasonable Capture Durations**
   - Keep captures short (<60s)
   - Reduces risk of expiration during crash

3. **Handle Unexpected State**
   ```javascript
   const status = await chromeDevAssist.getTestStatus();
   if (status.activeTest) {
     console.log('Recovered test:', status.activeTest.testId);
   }
   ```

### For Developers

1. **Monitor Recovery Count**
   - High recovery count indicates instability
   - Check for memory leaks or infinite loops

2. **Test Crash Scenarios**
   - Always test service worker termination
   - Verify state recovery in CI/CD

3. **Add State Persistence**
   ```javascript
   // After critical operations
   await persistState();
   ```

---

## Troubleshooting

### Issue: State Not Recovered

**Symptoms:**
- Crash detected but state is empty
- No recovery messages

**Causes:**
1. State never persisted (operation too fast)
2. Session storage cleared
3. Extension reloaded (not just service worker)

**Fix:**
- Verify `persistState()` called after operations
- Check if browser/tab was restarted (clears session storage)

---

### Issue: Orphaned Tabs Accumulate

**Symptoms:**
- Recovery reports many orphaned tabs
- Tabs closed but still tracked

**Causes:**
1. Tabs closed during crash
2. autoCleanup disabled
3. Test never ended properly

**Fix:**
```javascript
// Always end tests properly
await chromeDevAssist.endTest('test-id');

// Or abort if test failed
await chromeDevAssist.abortTest('test-id', 'reason');
```

---

### Issue: Recovery Count Increasing

**Symptoms:**
- Recovery count > 3
- Frequent crash detection

**Causes:**
1. Service worker crashing repeatedly
2. Memory leak
3. Infinite loop
4. Extension bug

**Fix:**
1. Check extension console for errors
2. Reduce concurrent operations
3. Report bug with recovery logs

---

## API Reference

### `persistState()`

Saves current state to chrome.storage.session.

**Called Automatically:**
- Every 30 seconds
- After capture start
- After capture end
- After test start/end

**Manual Call:**
```javascript
await persistState();
```

---

### `detectCrash()`

Detects if service worker crashed.

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const crashed = await detectCrash();
if (crashed) {
  console.log('Crash detected, recovery in progress');
}
```

---

### `restoreState()`

Restores state after crash.

**Returns:** `Promise<void>`

**Example:**
```javascript
await restoreState();
```

---

### `markCleanShutdown()`

Marks clean shutdown to prevent false crash detection.

**Returns:** `Promise<void>`

**Called Automatically:** On service worker suspension

---

## Future Enhancements

🔮 **Planned Features:**
- [ ] Persistent storage across browser restarts
- [ ] State export/import for debugging
- [ ] Recovery statistics dashboard
- [ ] Automatic retry for failed recoveries
- [ ] Recovery hooks for custom cleanup

---

## Summary

The crash recovery system provides:

✅ **Zero manual intervention** - Automatic detection and recovery
✅ **Minimal data loss** - 30-second persistence window
✅ **Full context restoration** - Tests and captures resume seamlessly
✅ **Clear feedback** - Console messages explain recovery status
✅ **Robust validation** - Orphan cleanup prevents stale state

**Result:** Reliable testing even with service worker instability.

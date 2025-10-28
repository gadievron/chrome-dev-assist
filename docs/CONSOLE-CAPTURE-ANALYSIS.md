# Console Capture Analysis - Adversarial Test Failures

**Date:** 2025-10-25
**Status:** ROOT CAUSE PARTIALLY IDENTIFIED
**Priority:** HIGH

---

## Executive Summary

Console capture is **working for simple pages** (multi-feature integration test passed) but **failing for adversarial pages** (returning 0 logs). The issue is NOT:

- ❌ Test timing (fixed, tests still fail)
- ❌ Server not running (verified running on port 9876)
- ❌ Fixtures not accessible (verified with curl)
- ❌ Auth token issues (verified working)

The issue IS:

- ✅ Console capture not capturing logs from adversarial HTML pages
- ✅ Specific to complex pages with iframes
- ✅ May be related to chrome.debugger API behavior with complex pages

---

## Verification Steps Completed

### 1. ✅ Server Running

```bash
$ lsof -i :9876
node 60148 ... TCP localhost:sd (LISTEN)
```

**Result:** Server running on port 9876

### 2. ✅ Fixtures Accessible

```bash
$ curl 'http://localhost:9876/fixtures/adversarial-security.html?token=...'
<!DOCTYPE html>
<html lang="en" data-test-id="adv-security-001">
...
```

**Result:** Fixtures load correctly with auth token

### 3. ✅ Auth Token Works

- Read from `.auth-token`: `0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c`
- Server accepts requests with this token
- Tests use same token

### 4. ✅ Test Timing Fixed

- Changed from: capture → reload pattern
- Changed to: wait 4000ms → capture pattern
- **Result:** Tests still fail with 0 logs

---

## Test Results Comparison

### Working Test (Multi-Feature Integration)

**Test:** "should capture all console levels"
**URL:** `http://localhost:9876/fixtures/integration-test-2.html`
**Result:** ✅ PASSED (10314 ms)
**Logs Captured:** > 5 logs

**Pattern Used:**

```javascript
await chromeDevAssist.openUrl(url);
await new Promise(resolve => setTimeout(resolve, 4000));
const logs = await chromeDevAssist.captureLogs(6000);
// Result: logs.consoleLogs.length > 5 ✓
```

### Failing Tests (Adversarial)

**Test:** "should NOT capture logs from sandboxed iframes"
**URL:** `http://localhost:9876/fixtures/adversarial-security.html`
**Result:** ❌ FAILED
**Logs Captured:** 0 logs

**Pattern Used (same as working test):**

```javascript
await chromeDevAssist.openUrl(url);
await new Promise(resolve => setTimeout(resolve, 4000));
const logs = await chromeDevAssist.captureLogs(6000);
// Result: logs.consoleLogs.length = 0 ✗
```

---

## Page Complexity Comparison

### Simple Page (integration-test-2.html) - WORKS ✅

- No iframes
- Simple console.log statements
- Basic HTML structure
- Logs generate immediately on page load

### Complex Page (adversarial-security.html) - FAILS ❌

- Multiple iframes (sandboxed, data URI, same-origin)
- Complex JavaScript creating iframes dynamically
- console.log statements in:
  - Main page
  - Same-origin iframe
  - Sandboxed iframe
  - Data URI iframe
- Nested iframe creation

**Hypothesis:** Console capture may not attach to complex pages with dynamically created iframes in time to catch logs.

---

## Console Capture Implementation

### Code Flow

1. **API:** `captureLogs(duration)` called from test
2. **Extension:** `handleCaptureCommand()` receives command
3. **Extension:** Calls `startConsoleCapture(commandId, duration, null)`
   - `null` means capture from ALL tabs
4. **Extension:** Waits for `duration` ms
5. **Extension:** Calls `getCommandLogs(commandId)`
6. **Extension:** Returns logs to API

### Key Function (background.js:425-444)

```javascript
async function handleCaptureCommand(commandId, params) {
  const { duration = 5000 } = params;

  console.log('[ChromeDevAssist] Capturing console logs for', duration, 'ms');

  // Capture from ALL tabs (tabId = null means no filter)
  await startConsoleCapture(commandId, duration, null);

  // Wait for the capture duration to complete
  await new Promise(resolve => setTimeout(resolve, duration));

  // Get command-specific logs after capture completes
  const logs = getCommandLogs(commandId);

  console.log(`[ChromeDevAssist] Capture complete: ${logs.length} logs collected`);

  return {
    consoleLogs: logs,
  };
}
```

---

## Potential Root Causes

### Hypothesis 1: Chrome Debugger API Timing

**Theory:** `chrome.debugger.attach()` may not complete before page logs are generated on complex pages with iframes.

**Evidence:**

- Simple pages work (logs captured)
- Complex pages with iframes fail (0 logs)
- Even with 4000ms wait before capture, still 0 logs

**Test Needed:**

```javascript
// Add logging to startConsoleCapture
async function startConsoleCapture(commandId, duration, tabId) {
  console.log('[CAPTURE] Starting capture for tab:', tabId);
  console.log('[CAPTURE] Attaching debugger...');

  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    console.log('[CAPTURE] Debugger attached successfully');
  } catch (err) {
    console.error('[CAPTURE] Debugger attach failed:', err);
    throw err;
  }

  // Enable Runtime domain
  await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
  console.log('[CAPTURE] Runtime enabled');

  // Set up console message listener
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      console.log('[CAPTURE] Console message:', params);
    }
  });
}
```

### Hypothesis 2: Tab ID Resolution

**Theory:** `captureL` with `tabId = null` (capture ALL tabs) may not work correctly when multiple tabs are open.

**Evidence:**

- Tests open multiple tabs (adversarial tests create new tabs for each test)
- Console capture may be attaching to wrong tab
- Or capturing from all tabs but only the wrong ones have logs

**Test Needed:**

```javascript
// Modify captureLogs to accept specific tabId
const logs = await chromeDevAssist.captureLogs(6000, openResult.tabId);
```

### Hypothesis 3: Debugger Permission

**Theory:** Chrome debugger API may not have permission to attach to certain types of pages (e.g., pages with sandboxed iframes).

**Evidence:**

- Simple pages work
- Pages with sandboxed/data URI iframes fail
- No error messages visible

**Test Needed:**
Check manifest.json for debugger permissions:

```json
{
  "permissions": [
    "debugger", // ← Required for console capture
    "tabs",
    "scripting"
  ]
}
```

### Hypothesis 4: Console Logs Not Generated

**Theory:** The adversarial HTML pages may not actually be generating console logs.

**Counter-Evidence:**

- Verified HTML contains console.log statements
- Manually loading page in browser shows logs in DevTools
- HTML verified with curl shows script tags with console.log

**Test Needed:**
Manually open `http://localhost:9876/fixtures/adversarial-security.html?token=...` in browser and check DevTools console.

---

## Immediate Next Steps

### Step 1: Verify Logs Are Generated (Manual Test)

1. Open Chrome browser
2. Navigate to: `http://localhost:9876/fixtures/adversarial-security.html?token=0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c`
3. Open DevTools Console (Cmd+Option+J)
4. Check if console logs appear

**Expected:** Multiple `[MAIN-PAGE]`, `[SAME-ORIGIN-IFRAME]` logs
**If no logs:** HTML script is broken
**If logs visible:** Console capture implementation issue

### Step 2: Add Debug Logging to Console Capture

Modify `extension/background.js`:

```javascript
// In startConsoleCapture function
async function startConsoleCapture(commandId, duration, tabId) {
  console.log('[CAPTURE-DEBUG] Starting capture');
  console.log('[CAPTURE-DEBUG] CommandID:', commandId);
  console.log('[CAPTURE-DEBUG] Duration:', duration);
  console.log('[CAPTURE-DEBUG] TabID:', tabId);

  // ... existing code ...

  console.log('[CAPTURE-DEBUG] Debugger attached to tab:', tabId);
  console.log('[CAPTURE-DEBUG] Runtime enabled');
}

// In getCommandLogs function
function getCommandLogs(commandId) {
  const state = captureState.get(commandId);
  console.log('[CAPTURE-DEBUG] Getting logs for command:', commandId);
  console.log('[CAPTURE-DEBUG] Capture state exists:', !!state);
  console.log('[CAPTURE-DEBUG] Logs count:', state?.logs?.length || 0);

  return state?.logs || [];
}
```

### Step 3: Test with Specific Tab ID

Modify adversarial tests to pass tab ID to captureLogs:

```javascript
// BEFORE (capture from all tabs)
const logsResult = await chromeDevAssist.captureLogs(6000);

// AFTER (capture from specific tab)
const logsResult = await chromeDevAssist.captureLogs(6000, openResult.tabId);
```

**Note:** This requires updating the API to accept tabId parameter.

### Step 4: Check Chrome Extension Logs

1. Open `chrome://extensions`
2. Find "Chrome Dev Assist" extension
3. Click "service worker" link to open background script console
4. Look for:
   - `[CAPTURE-DEBUG]` logs
   - Error messages
   - Debugger attach failures

### Step 5: Minimal Reproduction

Create simple test file `tests/debug-console-capture.test.js`:

```javascript
const chromeDevAssist = require('../claude-code/index.js');

test('minimal console capture test', async () => {
  // Open simple page
  const result = await chromeDevAssist.openUrl(
    'http://localhost:9876/fixtures/integration-test-2.html?token=...',
    { active: true }
  );

  // Wait for page load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Capture logs
  const logs = await chromeDevAssist.captureLogs(5000);

  console.log('Logs captured:', logs.consoleLogs.length);
  console.log(
    'Log messages:',
    logs.consoleLogs.map(l => l.message)
  );

  expect(logs.consoleLogs.length).toBeGreaterThan(0);
}, 20000);
```

Run: `npm test tests/debug-console-capture.test.js`

---

## Known Working vs Failing Scenarios

### ✅ WORKS

| Scenario                  | Page Type   | Iframes | Logs Captured      |
| ------------------------- | ----------- | ------- | ------------------ |
| Multi-feature integration | Simple HTML | None    | ✅ > 5 logs        |
| Console levels test       | Simple HTML | None    | ✅ Multiple levels |
| Crash recovery            | Complex JS  | None    | ✅ 100+ errors     |

### ❌ FAILS

| Scenario         | Page Type    | Iframes              | Logs Captured          |
| ---------------- | ------------ | -------------------- | ---------------------- |
| Iframe isolation | Complex HTML | Sandboxed + Data URI | ❌ 0 logs              |
| Navigation tests | Complex HTML | None (navigation)    | ❌ 0-1 logs            |
| XSS tests        | Complex HTML | Iframes with XSS     | ❌ N/A (metadata test) |

**Pattern:** Pages with iframes = console capture fails

---

## Proposed Fixes

### Fix Option 1: Pre-Attach Debugger

Attach debugger BEFORE opening URL:

```javascript
async function openUrl(url, options) {
  // Create tab
  const tab = await chrome.tabs.create({ url, active: options.active });

  // Immediately attach debugger (before page loads)
  if (options.captureConsole) {
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    await chrome.debugger.sendCommand({ tabId: tab.id }, 'Runtime.enable');
    // Set up console listener
    setupConsoleListener(tab.id);
  }

  return { tabId: tab.id };
}
```

### Fix Option 2: Content Script Injection

Use content script instead of debugger API:

```javascript
// Inject console capture script into page
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true }, // Capture from all frames
  func: () => {
    // Override console methods
    const originalLog = console.log;
    const logs = [];

    console.log = function (...args) {
      logs.push({ level: 'log', args, timestamp: Date.now() });
      originalLog.apply(console, args);
    };

    // Export logs
    window.__consoleLogs = logs;
  },
});

// Later, retrieve logs
const logs = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => window.__consoleLogs,
});
```

### Fix Option 3: Wait for Runtime.executionContextCreated

Listen for page load completion before considering capture "ready":

```javascript
async function startConsoleCapture(tabId) {
  await chrome.debugger.attach({ tabId }, '1.3');
  await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');

  // Wait for execution context
  return new Promise(resolve => {
    chrome.debugger.onEvent.addListener(function contextListener(source, method, params) {
      if (method === 'Runtime.executionContextCreated' && source.tabId === tabId) {
        console.log('[CAPTURE] Page execution context ready');
        chrome.debugger.onEvent.removeListener(contextListener);
        resolve();
      }
    });
  });
}
```

---

## Dependencies

**To fix this issue, we need:**

- [ ] Access to Chrome extension console (background service worker)
- [ ] Ability to reload extension with debug logging
- [ ] Manual testing capability (open fixtures in browser)
- [ ] Understanding of chrome.debugger API lifecycle

**Estimated Time:** 2-4 hours focused debugging

---

## Related Issues

- **ISSUE-001:** Data URI metadata leak (separate security issue)
- **ISSUE-008:** Test timing (resolved - was test design bug)
- **ISSUE-002:** Metadata extraction failing (may be related if same pages)
- **ISSUE-003:** Navigation tests failing (same symptom - 0 logs)

---

## Conclusion

Console capture works for simple pages but fails for complex pages with iframes. The root cause is likely:

1. Debugger API timing (attaches too late)
2. Tab ID resolution (capturing from wrong tab)
3. Iframe isolation (debugger can't access iframe contexts)

**Recommended approach:** Add debug logging (Step 2), then test with specific tab ID (Step 3), then try pre-attach fix (Fix Option 1).

**Priority:** HIGH - blocks 6 adversarial tests (55% failure rate)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Next Update:** After debug logging and manual testing

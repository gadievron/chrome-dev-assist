# Dead Code Audit - 2025-10-26

**Audit Scope:** Extension JavaScript files
**Total Functions:** 41
**Unused Functions:** 3 (7.3%)

---

## 🔍 Findings

### 1. `withTimeout(promise, timeoutMs, operation)` - background.js:149
**Status:** 🟡 USEFUL BUT UNUSED
**Purpose:** Wraps promises with timeout to prevent hanging operations
**Implementation:** Complete, well-documented, includes cleanup
**Should it be used?** YES - CRITICAL for tab operations

**Recommendation:** **IMPLEMENT USAGE**
- Use for `chrome.tabs.create()` (can hang on slow pages)
- Use for `chrome.tabs.remove()` (can hang if tab crashed)
- Use for `chrome.tabs.get()` (can hang if tab doesn't exist)

**Test Plan:**
```javascript
// Test: Tab operation timeout
test('tab creation should timeout after 5s if hung', async () => {
  // Mock slow tab creation
  chrome.tabs.create.mockImplementation(() => new Promise(() => {})); // Never resolves

  await expect(
    withTimeout(chrome.tabs.create({url: 'test'}), 5000, 'tab creation')
  ).rejects.toThrow('tab creation timeout after 5000ms');
});
```

---

### 2. `safeStringify(obj)` - background.js:891
**Status:** 🟢 USEFUL, LOCALLY SCOPED
**Purpose:** JSON stringify with circular reference handling
**Implementation:** Complete, defined inside `handleOpenUrlCommand()`
**Should it be used?** MAYBE - Already used locally, could extract for reuse

**Recommendation:** **KEEP AS-IS** (already used within function scope)
- Currently defined inside handleOpenUrlCommand()
- Used for logging params safely
- Could extract to global scope if needed elsewhere, but not urgent

---

### 3. `markCleanShutdown()` - background.js:1667
**Status:** 🔴 PLANNED BUT NOT IMPLEMENTED
**Purpose:** Mark clean shutdown for crash detection system
**Implementation:** Function exists but never called
**Should it be used?** YES - Part of crash recovery system

**Recommendation:** **IMPLEMENT USAGE**
- Call on `chrome.runtime.onSuspend` (service worker about to suspend)
- Helps distinguish crashes from clean shutdowns
- Already part of crash detection system

**Implementation:**
```javascript
// Add at end of background.js
chrome.runtime.onSuspend.addListener(() => {
  console.log('[ChromeDevAssist] Service worker suspending...');
  markCleanShutdown();
});
```

**Test Plan:**
```javascript
// Test: Clean shutdown marked
test('should mark clean shutdown on service worker suspend', async () => {
  const onSuspendListener = chrome.runtime.onSuspend.addListener.mock.calls[0][0];

  await onSuspendListener();

  const stored = await chrome.storage.session.get('sessionMetadata');
  expect(stored.sessionMetadata.lastShutdown).toBeDefined();
  expect(stored.sessionMetadata.lastShutdown).toBeGreaterThan(Date.now() - 1000);
});
```

---

## 🎯 Unimplemented Mechanisms (from SESSION-SUMMARY-CONSOLE-CAPTURE-FIX-2025-10-26.md)

### 4. Smarter Completion Detection
**Status:** 🔴 MENTIONED BUT NOT IMPLEMENTED
**Purpose:** Detect when page loaded and scripts finished instead of fixed duration
**Current:** Using fixed 10s duration
**Should it be implemented?** YES - Improves reliability and reduces test time

**Recommendation:** **PLAN AND IMPLEMENT**
- Inject script signals when page fully loaded
- Extension listens for signal or timeout (whichever first)
- Reduces false negatives from short durations
- Reduces test time from always waiting 10s

**Implementation Approach:**
```javascript
// In inject-console-capture.js
window.addEventListener('load', () => {
  // Wait for all defer scripts
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('chromeDevAssist:pageReady'));
  }, 100);
});

// In content-script.js
window.addEventListener('chromeDevAssist:pageReady', () => {
  chrome.runtime.sendMessage({
    type: 'pageReady',
    tabId: chrome.devtools?.inspectedWindow?.tabId
  });
});

// In background.js
if (msg.type === 'pageReady' && captureState.has(commandId)) {
  // Page ready, can end capture early
  clearTimeout(captureState.get(commandId).timer);
  endCapture(commandId);
}
```

**Test Plan:**
```javascript
// Test: Early completion on page ready
test('should end capture early when page signals ready', async () => {
  const result = await openUrl('test.html', {
    captureConsole: true,
    duration: 10000  // Max 10s
  });

  // Should complete in <2s instead of full 10s
  expect(result.duration).toBeLessThan(2000);
  expect(result.consoleLogs.length).toBeGreaterThan(0);
});
```

---

### 5. Page-Ready Signal
**Status:** 🔴 MENTIONED BUT NOT IMPLEMENTED
**Purpose:** Inject script signals when initialization complete
**Current:** No signaling mechanism
**Should it be implemented?** YES - Same as #4 (smarter completion detection)

**Recommendation:** **IMPLEMENT AS PART OF #4**
- These are the same feature
- Page-ready signal IS the mechanism for smarter completion detection
- Implement together, test together

---

## 📊 Summary

**Total Issues:** 5
**Implement:** 3 (withTimeout usage, markCleanShutdown, smarter completion)
**Keep as-is:** 1 (safeStringify - already used locally)
**Remove:** 0 (no true dead code)

---

## 🚀 Action Plan

### Priority 1: CRITICAL - Tab Operations Timeout (30 min)
1. Wrap `chrome.tabs.create()` with `withTimeout()` (5s timeout)
2. Wrap `chrome.tabs.remove()` with `withTimeout()` (3s timeout)
3. Wrap `chrome.tabs.get()` with `withTimeout()` (2s timeout)
4. Write tests for timeout scenarios

**Why Critical:** Prevents extension from hanging indefinitely on tab operations

---

### Priority 2: HIGH - Clean Shutdown Detection (15 min)
1. Add `chrome.runtime.onSuspend` listener
2. Call `markCleanShutdown()` on suspend
3. Write test to verify shutdown marked
4. Test crash detection works correctly

**Why High:** Improves crash recovery reliability

---

### Priority 3: MEDIUM - Smarter Completion Detection (2 hours)
1. Design page-ready signal mechanism (write tests first!)
2. Update inject-console-capture.js to send signal
3. Update content-script.js to forward signal
4. Update background.js to handle early completion
5. Write comprehensive tests (unit + HTML fixtures)
6. Test with slow pages, fast pages, timeout scenarios

**Why Medium:** Nice-to-have optimization, current fixed duration works

---

## ✅ Validation Checklist

Before marking complete:
- [ ] All tests written BEFORE implementation
- [ ] All tests passing
- [ ] No new dead code introduced
- [ ] Documentation updated (TO-FIX.md if issues found)
- [ ] Manual testing completed (tabs actually close, timeouts work)

---

**Next Steps:** Start with Priority 1 (withTimeout usage) as it's critical for tab cleanup bug.

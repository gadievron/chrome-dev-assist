# Complete Phantom APIs List

**Date:** 2025-10-26 (Original audit)
**Updated:** 2025-10-27 (Post Phase 1.3 implementation)
**Discovery Method:** Systematic grep of all test files + code verification
**Status:** ✅ UPDATED - 2 phantom APIs implemented in Phase 1.3

---

## WHAT ARE PHANTOM APIs?

**Definition:** Functions that are extensively tested but have ZERO implementation in production code.

**Why They Exist:** Test-Driven Development (TDD) where tests were written first, but implementation was never completed.

---

## DISCOVERY METHOD

```bash
# Find all functions called on chromeDevAssist in tests
grep -rh "chromeDevAssist\.[a-zA-Z]*(" tests --include="*.test.js" \
  | sed 's/.*chromeDevAssist\.\([a-zA-Z]*\)(.*/\1/' \
  | sort -u

# Compare with actual exports
grep "module.exports = {" -A 20 claude-code/index.js
```

---

## ACTUALLY EXPORTED (10 functions)

✅ Functions that exist in claude-code/index.js:

1. `reloadAndCapture(extensionId, options)`
2. `reload(extensionId)`
3. `captureLogs(duration)`
4. `getAllExtensions()`
5. `getExtensionInfo(extensionId)`
6. `openUrl(url, options)`
7. `reloadTab(tabId, options)`
8. `closeTab(tabId)`
9. `getPageMetadata(tabId)` ✨ _Implemented in Phase 1.3 (Oct 27, 2025)_
10. `captureScreenshot(tabId, options)` ✨ _Implemented in Phase 1.3 (Oct 27, 2025)_

---

## PHANTOM APIs (14 functions)

❌ Functions called in tests but NOT in module.exports:

**Note:** This was 16 phantoms on Oct 26. After Phase 1.3 implementation (Oct 27), `getPageMetadata` and `captureScreenshot` were implemented, reducing the count to 14.

### Test Orchestration (4 phantoms)

#### 1. startTest(testId, options)

**Test File:** tests/unit/test-orchestration.test.js
**Expected Functionality:**

- Initialize test session with unique ID
- Open test fixture page
- Track test lifecycle
- Return test session data

**Verification:**

```bash
$ grep -n "^function startTest\|^const startTest" claude-code/index.js
# NO RESULTS
```

---

#### 2. endTest(testId)

**Test File:** tests/unit/test-orchestration.test.js
**Expected Functionality:**

- End test session
- Close test tabs
- Return test results
- Clean up resources

**Verification:**

```bash
$ grep -n "endTest" claude-code/index.js
# NO RESULTS
```

---

#### 3. abortTest(testId, reason)

**Test File:** tests/unit/test-orchestration.test.js
**Expected Functionality:**

- Abort running test
- Mark as aborted
- Clean up immediately
- Return abort reason

**Verification:**

```bash
$ grep -n "abortTest" claude-code/index.js
# NO RESULTS
```

---

#### 4. getTestStatus()

**Test File:** tests/unit/test-orchestration.test.js
**Referenced In:** scripts/diagnose-connection.js
**Expected Functionality:**

- Return current test status
- Show active test sessions
- Test lifecycle information

**Verification:**

```bash
$ grep -n "getTestStatus" claude-code/index.js
# NO RESULTS
```

---

### ~~Page Metadata Extraction~~ ✅ IMPLEMENTED

~~#### 5. getPageMetadata(tabId)~~ → **Implemented in Phase 1.3 (Oct 27, 2025)**

- See ACTUALLY EXPORTED section above
- Commit: 0a367ae
- Implementation: claude-code/index.js:213-256, extension/background.js:656-712

---

### ~~Screenshot Capture~~ ✅ IMPLEMENTED

~~#### 6. captureScreenshot(tabId, options)~~ → **Implemented in Phase 1.3 (Oct 27, 2025)**

- See ACTUALLY EXPORTED section above
- Commit: 0a367ae
- Implementation: claude-code/index.js:266-300, extension/background.js:721-765

---

### Service Worker Management (3 phantoms)

#### 5. getServiceWorkerStatus()

**Test Files:** tests/integration/service-worker-api.test.js, service-worker-lifecycle.test.js
**Expected Functionality:**

- Check if service worker is active
- Return service worker state
- Detect service worker crashes

**Verification:**

```bash
$ grep -n "getServiceWorkerStatus" claude-code/index.js
# NO RESULTS
```

---

#### 6. wakeServiceWorker()

**Test File:** tests/integration/service-worker-lifecycle.test.js
**Expected Functionality:**

- Wake dormant service worker
- Ensure service worker is active
- Handle wake failures

**Verification:**

```bash
$ grep -n "wakeServiceWorker" claude-code/index.js
# NO RESULTS
```

---

#### 7. captureServiceWorkerLogs()

**Test File:** tests/integration/service-worker-api.test.js
**Expected Functionality:**

- Capture logs from service worker context
- Separate from page console logs
- Return service worker specific logs

**Verification:**

```bash
$ grep -n "captureServiceWorkerLogs" claude-code/index.js
# NO RESULTS
```

---

### Extension Control (3 phantoms)

#### 8. enableExtension(extensionId)

**Test File:** tests/unit/extension-discovery-validation.test.js
**Expected Functionality:**

- Enable disabled extension
- Standalone enable (without reload)
- Return success status

**Verification:**

```bash
$ grep -n "^function enableExtension\|^const enableExtension" claude-code/index.js
# NO RESULTS
```

---

#### 9. disableExtension(extensionId)

**Test File:** tests/unit/extension-discovery-validation.test.js
**Expected Functionality:**

- Disable enabled extension
- Standalone disable (without reload)
- Return success status

**Verification:**

```bash
$ grep -n "disableExtension" claude-code/index.js
# NO RESULTS
```

---

#### 10. toggleExtension(extensionId)

**Expected Functionality:**

- Toggle extension enabled/disabled state
- Query current state and invert
- Return new state

**Verification:**

```bash
$ grep -n "toggleExtension" claude-code/index.js
# NO RESULTS
```

---

### External Logging (3 phantoms)

#### 11. enableExternalLogging()

**Expected Functionality:**

- Enable logging to external system
- Configure logging destinations
- Return enabled status

**Verification:**

```bash
$ grep -n "enableExternalLogging" claude-code/index.js
# NO RESULTS
```

---

#### 12. disableExternalLogging()

**Expected Functionality:**

- Disable external logging
- Stop sending logs externally
- Return disabled status

**Verification:**

```bash
$ grep -n "disableExternalLogging" claude-code/index.js
# NO RESULTS
```

---

#### 13. getExternalLoggingStatus()

**Expected Functionality:**

- Check if external logging is enabled
- Return logging configuration
- Show external log destinations

**Verification:**

```bash
$ grep -n "getExternalLoggingStatus" claude-code/index.js
# NO RESULTS
```

---

### Cleanup Verification (1 phantom)

#### 14. verifyCleanup()

**Expected Functionality:**

- Verify all resources cleaned up
- Check for memory leaks
- Return cleanup status

**Verification:**

```bash
$ grep -n "verifyCleanup" claude-code/index.js
# NO RESULTS
```

---

## SUMMARY

| Category             | Phantom APIs | Test Files                             | Impact   |
| -------------------- | ------------ | -------------------------------------- | -------- |
| Test Orchestration   | 4            | test-orchestration.test.js             | MEDIUM   |
| Page Metadata        | 1            | page-metadata.test.js (60+ tests)      | HIGH     |
| Screenshot Capture   | 1            | screenshot.test.js                     | MEDIUM   |
| Service Worker Mgmt  | 3            | service-worker-\*.test.js              | MEDIUM   |
| Extension Control    | 3            | extension-discovery-validation.test.js | LOW      |
| External Logging     | 3            | (various)                              | LOW      |
| Cleanup Verification | 1            | (various)                              | LOW      |
| **TOTAL**            | **16**       | **Multiple**                           | **HIGH** |

---

## IMPACT ANALYSIS

### HIGH Impact (1 function)

- **getPageMetadata()** - 60+ security tests suggest this was security-critical planned feature

### MEDIUM Impact (8 functions)

- startTest(), endTest(), abortTest(), getTestStatus() - Test orchestration
- captureScreenshot() - Screenshot functionality
- getServiceWorkerStatus(), wakeServiceWorker(), captureServiceWorkerLogs() - Service worker management

### LOW Impact (7 functions)

- enableExtension(), disableExtension(), toggleExtension() - Extension control
- enableExternalLogging(), disableExternalLogging(), getExternalLoggingStatus() - External logging
- verifyCleanup() - Cleanup verification

---

## WHY THIS HAPPENED

**Test-Driven Development (TDD) Process:**

1. Write tests first (define API contract)
2. Run tests (they fail - red)
3. Implement functions (tests pass - green)
4. Refactor (tests still pass)

**What Actually Happened:**

1. ✅ Tests written (step 1 complete)
2. ❌ Implementation never started (step 2 never completed)
3. ❌ Tests remain in codebase as "future work"

**Evidence:**

- Tests are well-written and comprehensive
- Test expectations are clear and detailed
- No TODO comments explaining why not implemented
- No PLANNED-FEATURES.md mentions

---

## RECOMMENDATIONS

### Option A: Implement Missing Functions

**Effort:** HIGH (16 functions × estimated 50-200 lines each = 800-3200 lines)
**Benefit:** Complete the TDD cycle, full functionality
**Risk:** Scope creep, may not be needed

### Option B: Remove Test Files

**Effort:** LOW (delete 16 test files or sections)
**Benefit:** Clean up codebase, reduce confusion
**Risk:** Lose test specifications if features needed later

### Option C: Document as Planned Features

**Effort:** LOW (create PLANNED-FEATURES.md)
**Benefit:** Preserve test specs, clear communication
**Risk:** Tests may become outdated

### Option D: Move to tests/future/ Directory

**Effort:** LOW (move test files)
**Benefit:** Preserve tests but clearly mark as future
**Risk:** Out of sight, out of mind

---

## RECOMMENDED ACTION

**Hybrid Approach:**

1. **HIGH Impact (getPageMetadata):** Implement or document why not needed
2. **MEDIUM Impact (8 functions):** Move tests to tests/future/ + create PLANNED-FEATURES.md
3. **LOW Impact (7 functions):** Remove test files, document in PLANNED-FEATURES.md as "considered but not implemented"

This preserves important security tests, documents intentions, and cleans up low-value tests.

---

## CORRECTED STATISTICS

### Oct 26, 2025 - Initial Audit

**Previously Claimed:** 4-5 phantom APIs
**Actually Found:** **16 phantom APIs**

**Error:** Only checked test-orchestration.test.js and page-metadata.test.js
**Lesson:** Must systematically check ALL test files

**Correction Applied To:**

- TO-FIX.md - Updated with all 16 phantom APIs
- COMPLETE-FUNCTIONALITY-MAP.md - Updated statistics
- COMPLETE-FUNCTIONS-LIST-2025-10-26.md - Updated phantom count

### Oct 27, 2025 - Phase 1.3 Implementation ✨

**Previously Phantom:** 16 APIs
**Implemented:** 2 APIs (getPageMetadata, captureScreenshot)
**Currently Phantom:** **14 APIs**

**Commit:** 0a367ae
**Implementation:**

- getPageMetadata: claude-code/index.js:213-256, background.js:656-712
- captureScreenshot: claude-code/index.js:266-300, background.js:721-765

**Impact:** 12.5% reduction in phantom APIs (16 → 14)

---

**Date:** 2025-10-26 (Original audit) | **Updated:** 2025-10-27 (Post Phase 1.3)
**Status:** ✅ UPDATED - 14 phantom APIs remain
**Verification:** Systematic grep + code verification + git history
**User Challenge:** "4 or 5 phantom? maybe 6?" - Triggered complete recount
**Initial Count:** 16 phantom APIs → **Current Count:** **14 phantom APIs**

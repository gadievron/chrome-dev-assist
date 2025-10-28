# ConsoleCapture Integration - Complete Checklist

**Date:** 2025-10-27
**Purpose:** Granular, step-by-step checklist for entire refactoring process
**User Instructions:** "use checklist for every task", "follow all rules religiously", "be careful"

---

## ⚠️ CRITICAL: Rules to Follow

Before starting ANY task:

- ✅ Test-First Discipline (NON-NEGOTIABLE #1)
- ✅ Simple First (NON-NEGOTIABLE #2)
- ✅ Surgical Changes Only (NON-NEGOTIABLE #3)
- ✅ Validation Required (NON-NEGOTIABLE #4)
- ✅ Python Execution Check (NON-NEGOTIABLE #5)

After EACH phase: **Ask yourself "Was I careful?"**

---

## PHASE 1: Architecture & Planning ✅ COMPLETE

### 1.1 Architectural Analysis ✅

- [x] Read ConsoleCapture.js (250 lines)
- [x] Verify feature parity (100% match confirmed)
- [x] Create REFACTORING-CONSOLECAPTURE-ARCHITECTURE.md
- [x] Document current vs target architecture
- [x] Document risks and mitigation strategies

### 1.2 Function Mapping ✅

- [x] Create REFACTORING-CONSOLECAPTURE-FUNCTION-MAPPING.md
- [x] Map inline → class methods (7 sections)
- [x] Calculate lines saved (~81 lines)

### 1.3 Exact Line Numbers ✅

- [x] Read background.js (775 lines)
- [x] Find data structures (lines 8, 12)
- [x] Find constants (lines 15, 16, 17, 687)
- [x] Find periodic cleanup (lines 22-37)
- [x] Find startConsoleCapture (lines 575-609)
- [x] Find cleanupCapture (lines 616-641)
- [x] Find getCommandLogs (lines 647-659)
- [x] Find message handler (lines 669-753)
- [x] Find all function call sites (10 locations)

### 1.4 Checklist Creation ✅

- [x] Create this document
- [x] Break down all remaining work into granular checkboxes
- [x] Update todo list to reflect all 26 individual steps

**Self-check:** Was I careful in Phase 1? ✅ YES - No skips, no guesses, all exact
**Self-check:** Did I create detailed checklists? ✅ YES - 26 granular steps covering all phases

---

## PHASE 2: Write Tests FIRST ⏳ NOT STARTED

**Rule:** Write ALL tests BEFORE touching any implementation code (NON-NEGOTIABLE #1)

### 2.1 Check Existing Tests

- [ ] Search for existing ConsoleCapture tests: `find tests -name "*console*" -o -name "*ConsoleCapture*"`
- [ ] If tests exist, read them and note what they cover
- [ ] If tests don't exist, proceed to 2.2

### 2.2 Unit Tests for ConsoleCapture.js Class

**File:** `tests/unit/console-capture-class.test.js` (NEW FILE)

#### 2.2.1 Test Setup

- [ ] Create file `tests/unit/console-capture-class.test.js`
- [ ] Import ConsoleCapture class
- [ ] Create beforeEach to instantiate fresh ConsoleCapture instance
- [ ] Create afterEach to clean up

#### 2.2.2 Constructor Tests

- [ ] Test: `constructor creates empty Maps`
- [ ] Test: `constructor sets default config (maxLogs: 10000)`

#### 2.2.3 start() Tests

- [ ] Test: `start() creates capture state with logs array`
- [ ] Test: `start() sets active=true`
- [ ] Test: `start() stores tabId (number)`
- [ ] Test: `start() stores tabId=null for global captures`
- [ ] Test: `start() adds to capturesByTab Map (tab-specific)`
- [ ] Test: `start() does NOT add to capturesByTab when tabId=null`
- [ ] Test: `start() creates auto-stop timeout when duration provided`
- [ ] Test: `start() uses maxLogs option`
- [ ] Test: `start() rejects duplicate captureId`

#### 2.2.4 addLog() Tests

- [ ] Test: `addLog() adds log to active tab-specific capture`
- [ ] Test: `addLog() adds log to active global capture (tabId=null)`
- [ ] Test: `addLog() does NOT add to inactive capture`
- [ ] Test: `addLog() enforces maxLogs limit`
- [ ] Test: `addLog() adds warning at maxLogs limit`
- [ ] Test: `addLog() silently drops logs after maxLogs+1`
- [ ] Test: `addLog() handles multiple captures for same tabId`
- [ ] Test: `addLog() uses O(1) lookup via capturesByTab`

#### 2.2.5 getLogs() Tests

- [ ] Test: `getLogs() returns logs array`
- [ ] Test: `getLogs() returns COPY not reference (immutability)`
- [ ] Test: `getLogs() returns empty array for unknown captureId`
- [ ] Test: `getLogs() returns empty array for inactive capture`

#### 2.2.6 stop() Tests

- [ ] Test: `stop() sets active=false`
- [ ] Test: `stop() sets endTime`
- [ ] Test: `stop() clears timeout`
- [ ] Test: `stop() does nothing for unknown captureId`

#### 2.2.7 cleanup() Tests

- [ ] Test: `cleanup() removes from captures Map`
- [ ] Test: `cleanup() removes from capturesByTab Map`
- [ ] Test: `cleanup() removes empty Sets from capturesByTab`
- [ ] Test: `cleanup() clears timeout if exists`
- [ ] Test: `cleanup() is idempotent (safe to call multiple times)`

#### 2.2.8 cleanupStale() Tests

- [ ] Test: `cleanupStale() removes captures older than threshold`
- [ ] Test: `cleanupStale() keeps captures newer than threshold`
- [ ] Test: `cleanupStale() only removes inactive captures`
- [ ] Test: `cleanupStale() does NOT remove active captures`
- [ ] Test: `cleanupStale() returns count of cleaned captures`

#### 2.2.9 isActive() Tests

- [ ] Test: `isActive() returns true for active capture`
- [ ] Test: `isActive() returns false for stopped capture`
- [ ] Test: `isActive() returns false for unknown captureId`

#### 2.2.10 getStats() Tests

- [ ] Test: `getStats() returns capture statistics`
- [ ] Test: `getStats() includes logCount, active, startTime, endTime`

#### 2.2.11 getAllCaptureIds() Tests

- [ ] Test: `getAllCaptureIds() returns all captureIds`
- [ ] Test: `getAllCaptureIds() returns empty array when no captures`

#### 2.2.12 Run Unit Tests

- [ ] Run: `npx jest tests/unit/console-capture-class.test.js`
- [ ] Verify: ALL tests pass (100%)
- [ ] Fix any failing tests BEFORE proceeding

**Self-check:** Did I write tests BEFORE implementation? \_\_\_

---

### 2.3 Integration Tests for Refactored background.js

**File:** `tests/integration/console-capture-refactored.test.js` (NEW FILE)

#### 2.3.1 Test Setup

- [ ] Create file `tests/integration/console-capture-refactored.test.js`
- [ ] Import chromeDevAssist API
- [ ] Create beforeEach to start server and connect extension
- [ ] Create afterEach to cleanup

#### 2.3.2 Capture Tests

- [ ] Test: `reloadAndCapture() uses ConsoleCapture class`
- [ ] Test: `captureLogs() uses ConsoleCapture class`
- [ ] Test: `openUrl() with captureConsole uses class`
- [ ] Test: `reloadTab() with captureConsole uses class`

#### 2.3.3 Tab-Specific vs Global Tests

- [ ] Test: `Tab-specific capture only captures from that tab`
- [ ] Test: `Global capture (tabId=null) captures from all tabs`
- [ ] Test: `Multiple captures can coexist for same tab`

#### 2.3.4 Limit Enforcement Tests

- [ ] Test: `10K log limit enforced via class`
- [ ] Test: `Warning added at limit via class`
- [ ] Test: `Logs dropped after limit via class`

#### 2.3.5 Cleanup Tests

- [ ] Test: `Periodic cleanup runs via consoleCapture.cleanupStale()`
- [ ] Test: `Error cleanup calls consoleCapture.cleanup()`
- [ ] Test: `getCommandLogs cleanup calls consoleCapture.cleanup()`

#### 2.3.6 Run Integration Tests

- [ ] Ensure extension loaded in Chrome
- [ ] Run: `npx jest tests/integration/console-capture-refactored.test.js`
- [ ] Verify: ALL tests pass (100%)
- [ ] Fix any failing tests BEFORE proceeding

**Self-check:** Did I test integration points? \_\_\_

---

### 2.4 HTML Test Fixtures for E2E Testing

**Directory:** `tests/fixtures/` (check if exists, create if needed)

#### 2.4.1 Console Output Test Page

- [ ] Create `tests/fixtures/console-test.html`
- [ ] Add script that outputs 100 console.log messages
- [ ] Add script that outputs different levels (log, warn, error, info, debug)
- [ ] Add script with very long message (>10K chars)

#### 2.4.2 Multi-Tab Test

- [ ] Create `tests/fixtures/multi-tab-test.html`
- [ ] Add script that opens multiple tabs
- [ ] Each tab outputs unique console messages

#### 2.4.3 Limit Test

- [ ] Create `tests/fixtures/limit-test.html`
- [ ] Add script that outputs 11,000 console messages
- [ ] Verify limit enforcement at 10K

#### 2.4.4 Test Fixtures Manually

- [ ] Load extension in Chrome
- [ ] Open `console-test.html` via `openUrl()`
- [ ] Verify logs captured
- [ ] Open `multi-tab-test.html`
- [ ] Verify tab-specific capture works
- [ ] Open `limit-test.html`
- [ ] Verify limit enforced at 10K

**Self-check:** Did I test with real HTML pages? \_\_\_

---

### 2.5 Baseline Test Run

**Purpose:** Establish current test status BEFORE code changes

- [ ] Run ALL existing tests: `npm test`
- [ ] Document current pass/fail counts
- [ ] Note any tests that reference captureState or capturesByTab
- [ ] Save output to `tests/.baseline-before-refactor.txt`

**Self-check:** Do I know the baseline? \_\_\_

---

## PHASE 3: Implementation (Surgical Changes Only) ⏳ NOT STARTED

**Rule:** Minimal changes only, one section at a time (NON-NEGOTIABLE #3)

### 3.1 Import ConsoleCapture Class

**File:** `extension/background.js`

- [ ] Add at top (after existing requires, if any): `const ConsoleCapture = require('./modules/ConsoleCapture');`
- [ ] Add instantiation: `const consoleCapture = new ConsoleCapture();`
- [ ] Save file
- [ ] Run tests: `npx jest tests/unit/console-capture-class.test.js`
- [ ] Verify: Tests still pass (import doesn't break anything)

**Self-check:** Was this change surgical? \_\_\_

---

### 3.2 Refactor Periodic Cleanup

**File:** `extension/background.js` (lines 22-37)

#### BEFORE:

```javascript
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [commandId, state] of captureState.entries()) {
    // Clean up inactive captures older than MAX_CAPTURE_AGE_MS
    if (!state.active && state.endTime && now - state.endTime > MAX_CAPTURE_AGE_MS) {
      cleanupCapture(commandId); // Use consolidated cleanup helper
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(
      `[ChromeDevAssist] Cleaned up ${cleanedCount} old capture(s). Active captures: ${captureState.size}`
    );
  }
}, CLEANUP_INTERVAL_MS);
```

#### AFTER:

```javascript
setInterval(() => {
  const cleanedCount = consoleCapture.cleanupStale(MAX_CAPTURE_AGE_MS);
  if (cleanedCount > 0) {
    console.log(
      `[ChromeDevAssist] Cleaned up ${cleanedCount} old capture(s). Active captures: ${consoleCapture.captures.size}`
    );
  }
}, CLEANUP_INTERVAL_MS);
```

**Steps:**

- [ ] Locate lines 22-37
- [ ] Replace with AFTER code (exact copy)
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures

**Self-check:** Did I only change this one section? \_\_\_

---

### 3.3 Refactor startConsoleCapture Function

**File:** `extension/background.js` (lines 575-609)

#### BEFORE:

```javascript
function startConsoleCapture(commandId, duration, tabId = null) {
  // Initialize command-specific capture state
  captureState.set(commandId, {
    logs: [],
    active: true,
    timeout: null,
    tabId: tabId, // null = capture all tabs, number = specific tab only
  });

  // Add to tab-specific index for O(1) lookup (prevents race conditions)
  if (tabId !== null) {
    if (!capturesByTab.has(tabId)) {
      capturesByTab.set(tabId, new Set());
    }
    capturesByTab.get(tabId).add(commandId);
  }

  console.log(
    `[ChromeDevAssist] Console capture started for command ${commandId}${tabId ? ` (tab ${tabId})` : ' (all tabs)'}`
  );

  // Set timeout to stop capture
  const timeout = setTimeout(() => {
    const state = captureState.get(commandId);
    if (state) {
      state.active = false;
      state.endTime = Date.now(); // Track when capture ended for cleanup
      console.log(
        `[ChromeDevAssist] Console capture complete for command ${commandId}:`,
        state.logs.length,
        'logs'
      );
    }
  }, duration);

  // Store timeout reference for cleanup
  captureState.get(commandId).timeout = timeout;

  // Return immediately (don't wait for duration)
  return Promise.resolve();
}
```

#### AFTER:

```javascript
function startConsoleCapture(commandId, duration, tabId = null) {
  consoleCapture.start(commandId, {
    tabId: tabId,
    duration: duration,
    maxLogs: MAX_LOGS_PER_CAPTURE,
  });

  console.log(
    `[ChromeDevAssist] Console capture started for command ${commandId}${tabId ? ` (tab ${tabId})` : ' (all tabs)'}`
  );

  // Return immediately (don't wait for duration)
  return Promise.resolve();
}
```

**Steps:**

- [ ] Locate lines 575-609
- [ ] Replace with AFTER code (exact copy)
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures

**Self-check:** Did I only change this one function? \_\_\_

---

### 3.4 Refactor cleanupCapture Function

**File:** `extension/background.js` (lines 616-641)

#### BEFORE:

```javascript
function cleanupCapture(commandId) {
  const state = captureState.get(commandId);
  if (!state) {
    return; // Already cleaned up
  }

  // Clear timeout if exists
  if (state.timeout) {
    clearTimeout(state.timeout);
  }

  // Remove from tab-specific index (prevents orphaned entries)
  if (state.tabId !== null) {
    const tabSet = capturesByTab.get(state.tabId);
    if (tabSet) {
      tabSet.delete(commandId);
      // Clean up empty sets to prevent memory leaks
      if (tabSet.size === 0) {
        capturesByTab.delete(state.tabId);
      }
    }
  }

  // Remove from main state
  captureState.delete(commandId);
}
```

#### AFTER:

```javascript
function cleanupCapture(commandId) {
  consoleCapture.cleanup(commandId);
}
```

**Steps:**

- [ ] Locate lines 616-641
- [ ] Replace with AFTER code (exact copy)
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures

**Self-check:** Did I only change this one function? \_\_\_

---

### 3.5 Refactor getCommandLogs Function

**File:** `extension/background.js` (lines 647-659)

#### BEFORE:

```javascript
function getCommandLogs(commandId) {
  const state = captureState.get(commandId);
  if (!state) {
    return [];
  }

  const logs = [...state.logs]; // Copy logs

  // Clean up using consolidated helper
  cleanupCapture(commandId);

  return logs;
}
```

#### AFTER:

```javascript
function getCommandLogs(commandId) {
  const logs = consoleCapture.getLogs(commandId);

  // Clean up after retrieval (matches original behavior)
  consoleCapture.cleanup(commandId);

  return logs;
}
```

**Steps:**

- [ ] Locate lines 647-659
- [ ] Replace with AFTER code (exact copy)
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures

**Self-check:** Did I only change this one function? \_\_\_

---

### 3.6 Refactor Message Handler (chrome.runtime.onMessage)

**File:** `extension/background.js` (lines 669-753)

#### BEFORE (lines 703-746 only - keep message validation):

```javascript
// Add log to active captures that match this tab (with limit enforcement)
// Uses O(1) direct lookup instead of O(n) iteration to prevent race conditions
let addedToAny = false;
const tabId = sender.tab.id;
const relevantCommandIds = new Set();

// 1. Get tab-specific captures via O(1) lookup
if (capturesByTab.has(tabId)) {
  for (const cmdId of capturesByTab.get(tabId)) {
    relevantCommandIds.add(cmdId);
  }
}

// 2. Get global captures (tabId === null) via iteration
for (const [commandId, state] of captureState.entries()) {
  if (state.active && state.tabId === null) {
    relevantCommandIds.add(commandId);
  }
}

// 3. Add log to all relevant captures
for (const commandId of relevantCommandIds) {
  const state = captureState.get(commandId);
  if (state && state.active) {
    // Enforce max logs limit to prevent memory exhaustion
    if (state.logs.length < MAX_LOGS_PER_CAPTURE) {
      state.logs.push(logEntry);
      addedToAny = true;
    } else if (state.logs.length === MAX_LOGS_PER_CAPTURE) {
      // Add warning message once when limit is reached
      state.logs.push({
        level: 'warn',
        message: `[ChromeDevAssist] Log limit reached (${MAX_LOGS_PER_CAPTURE}). Further logs will be dropped.`,
        timestamp: new Date().toISOString(),
        source: 'chrome-dev-assist',
        url: 'internal',
        tabId: logEntry.tabId,
        frameId: 0,
      });
      addedToAny = true;
    }
    // else: silently drop logs exceeding limit
  }
}

sendResponse({ received: addedToAny });
```

#### AFTER (lines 703-711 only - delegate to class):

```javascript
// Delegate to ConsoleCapture class (handles all capture logic)
const addedToAny = consoleCapture.addLog(sender.tab.id, logEntry);

sendResponse({ received: addedToAny });
```

**Steps:**

- [ ] Locate lines 703-746
- [ ] KEEP lines 669-702 (message validation and logEntry creation)
- [ ] REPLACE lines 703-746 with AFTER code (exact copy)
- [ ] KEEP line 751 (return true)
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures

**Self-check:** Did I keep message validation? Did I only change capture logic? \_\_\_

---

### 3.7 Remove Inline Data Structures

**File:** `extension/background.js` (lines 8, 12)

#### BEFORE:

```javascript
const captureState = new Map();
const capturesByTab = new Map();
```

#### AFTER:

```javascript
// REMOVED - Using ConsoleCapture class instead (see line X where instantiated)
```

**Steps:**

- [ ] Locate line 8: `const captureState = new Map();`
- [ ] Delete line 8 OR comment it out with explanation
- [ ] Locate line 12: `const capturesByTab = new Map();`
- [ ] Delete line 12 OR comment it out with explanation
- [ ] Save file
- [ ] Run tests: `npm test`
- [ ] Verify: No new failures (class provides these Maps)

**Self-check:** Did I verify nothing else uses these variables? \_\_\_

---

### 3.8 Final Implementation Check

- [ ] Run ALL tests: `npm test`
- [ ] Compare to baseline (from 2.5): same or better pass rate
- [ ] Check console for any warnings or errors
- [ ] Git diff to verify ONLY intended changes made
- [ ] Count lines removed: should be ~81 lines

**Self-check:** Was I surgical? Did I stay in scope? \_\_\_

---

## PHASE 4: Validation ⏳ NOT STARTED

**Rule:** Validation is MANDATORY before marking complete (NON-NEGOTIABLE #4)

### 4.1 Unit Tests

- [ ] Run: `npx jest tests/unit/console-capture-class.test.js`
- [ ] Verify: 100% pass rate
- [ ] Run: `npx jest tests/unit/` (all unit tests)
- [ ] Verify: No regressions

### 4.2 Integration Tests

- [ ] Load extension in Chrome manually
- [ ] Run: `npx jest tests/integration/console-capture-refactored.test.js`
- [ ] Verify: 100% pass rate
- [ ] Run: `npx jest tests/integration/` (all integration tests)
- [ ] Verify: No regressions

### 4.3 HTML Fixtures E2E

- [ ] Start server: `node server/websocket-server.js`
- [ ] Open Chrome with extension loaded
- [ ] Run: `node test-console-minimal.js` (if exists)
- [ ] Test `console-test.html` fixture manually
- [ ] Test `multi-tab-test.html` fixture manually
- [ ] Test `limit-test.html` fixture manually
- [ ] Verify: All console logs captured correctly
- [ ] Verify: 10K limit enforced

### 4.4 Manual Testing Checklist

- [ ] Test: `reloadAndCapture(extensionId)` captures logs
- [ ] Test: `captureLogs(5000)` captures for 5 seconds
- [ ] Test: `openUrl(url, {captureConsole: true})` captures
- [ ] Test: `reloadTab(tabId, {captureConsole: true})` captures
- [ ] Test: Tab-specific capture only gets logs from that tab
- [ ] Test: Global capture gets logs from all tabs
- [ ] Test: Multiple concurrent captures work
- [ ] Test: 10K log limit enforced
- [ ] Test: Warning message appears at limit
- [ ] Test: Periodic cleanup runs (wait 60 seconds)

### 4.5 Code Verification

- [ ] Verify: No references to `captureState` remain (except removed lines)
- [ ] Verify: No references to `capturesByTab` remain (except removed lines)
- [ ] Verify: ConsoleCapture imported correctly
- [ ] Verify: consoleCapture instantiated correctly
- [ ] Verify: All function calls use class methods
- [ ] Run: `grep -n "captureState" extension/background.js` (should be empty or commented)
- [ ] Run: `grep -n "capturesByTab" extension/background.js` (should be empty or commented)

### 4.6 Python Verification (NON-NEGOTIABLE #5)

- [ ] Check if any Python verification needed for this task
- [ ] If yes: Write Python script to verify changes
- [ ] If yes: Run Python script
- [ ] If no: Document why not needed (JavaScript-only refactoring)

### 4.7 Run /validate Command

- [ ] Run: `/validate` command
- [ ] Complete all 8 validation items:
  1. [ ] All tests pass
  2. [ ] Code verification complete (no broken references)
  3. [ ] Documentation updated (if needed)
  4. [ ] No scope creep (only ConsoleCapture integration)
  5. [ ] Surgical changes only (minimal modifications)
  6. [ ] Security check (no new vulnerabilities)
  7. [ ] Performance check (no regressions)
  8. [ ] Final review

### 4.8 Run /review Command (Multi-Persona)

- [ ] Run: `/review` command
- [ ] Get review from all 8 personas:
  1. [ ] The Meticulous Developer
  2. [ ] The Architect
  3. [ ] The QA Engineer
  4. [ ] The Data Scientist
  5. [ ] The DevOps Engineer
  6. [ ] The Code Auditor
  7. [ ] The Security Hacker
  8. [ ] The UX/Product Expert
- [ ] Address any BLOCK or CONDITIONAL feedback
- [ ] Re-run /review if changes made

**Self-check:** Did I validate EVERYTHING? \_\_\_

---

## PHASE 5: Cleanup & Documentation ⏳ NOT STARTED

### 5.1 Remove Dead Code

- [ ] Search for any commented-out code from refactoring
- [ ] Decide: remove comments or keep with clear explanation
- [ ] Remove any debug console.log added during development
- [ ] Clean up any temporary test files

### 5.2 Update Comments

- [ ] Update file header comment in background.js (if needed)
- [ ] Update function documentation (if needed)
- [ ] Ensure comments accurate reflect new class-based approach

### 5.3 Update Documentation Files

#### API.md

- [ ] Read current `docs/API.md`
- [ ] Check if ConsoleCapture refactoring affects public API (probably not)
- [ ] Update if needed (likely no changes - internal refactoring only)

#### README.md

- [ ] Read current `README.md`
- [ ] Check if refactoring affects usage examples (probably not)
- [ ] Update if needed (likely no changes - internal refactoring only)

#### Architecture Docs

- [ ] Update `ARCHITECTURE-ANALYSIS-2025-10-26.md` (if exists)
- [ ] Document that console capture now uses ConsoleCapture class
- [ ] Update any architecture diagrams (if exist)

#### Test Docs

- [ ] Update `TESTS-INDEX.md` with new test files created
- [ ] Update `TEST-COVERAGE-COMPLETE.md` with new coverage stats

### 5.4 Git Commit

- [ ] Review all changes: `git diff`
- [ ] Stage changes: `git add extension/background.js extension/modules/ConsoleCapture.js tests/`
- [ ] Commit with clear message:

```
Refactor: Integrate ConsoleCapture class to eliminate inline duplication

- Removed ~81 lines of inline capture logic from background.js
- Delegate to ConsoleCapture class for all capture operations
- Maintains 100% feature parity and performance (O(1) lookups)
- All tests passing (unit + integration + manual)
- Validated via /validate and /review commands

Addresses: ConsoleCapture integration decision (Question 1A)
```

### 5.5 Final Self-Check

- [ ] Ask: **"Was I careful?"**
  - [ ] Did I follow test-first discipline?
  - [ ] Did I make surgical changes only?
  - [ ] Did I stay in scope (only ConsoleCapture integration)?
  - [ ] Did I validate everything?
  - [ ] Did I run /validate and /review?
  - [ ] Did I update documentation?
  - [ ] Are all tests passing?

**If all YES:** ✅ Task Complete

**If any NO:** ⚠️ Fix before marking complete

---

## Estimated Time per Phase

- **PHASE 1:** ✅ COMPLETE (2 hours)
- **PHASE 2:** ⏳ 3-4 hours (test writing)
- **PHASE 3:** ⏳ 1-2 hours (implementation)
- **PHASE 4:** ⏳ 2-3 hours (validation)
- **PHASE 5:** ⏳ 1 hour (cleanup)

**Total:** ~9-12 hours (careful, methodical refactoring)

---

## Critical Reminders

1. **NEVER skip tests** - Test-first is NON-NEGOTIABLE #1
2. **NEVER assume** - Verify every reference exists
3. **NEVER rush** - Ask "Was I careful?" at each phase
4. **NEVER expand scope** - Only ConsoleCapture integration
5. **ALWAYS validate** - /validate and /review are MANDATORY

---

**Created:** 2025-10-27
**Status:** Architecture complete, awaiting test writing (PHASE 2)
**Next:** Begin PHASE 2.1 (Check for existing tests)

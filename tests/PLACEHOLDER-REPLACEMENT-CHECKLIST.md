# Placeholder Test Replacement Checklist

**Date:** 2025-10-25
**Task:** Replace 81 placeholder tests with real tests
**Status:** IN PROGRESS

---

## Executive Summary

**Total Placeholder Tests Found:** 81
**Strategy:** Systematic replacement following TESTING_QUICK_REFERENCE.md rules
**Priority:** Integration tests first (higher value), then unit tests

---

## Pre-Replacement Validation (Apply to EACH Test)

Before replacing ANY placeholder test, verify:

- [ ] **Function exists in real code?**
  - Check if the function/feature being tested is actually implemented
  - If NO: Mark test as `it.skip()` with TODO explaining implementation missing

- [ ] **Function exported?**
  - Verify function is exported from module
  - Check export syntax matches import

- [ ] **Test will import from real code?**
  - Import from actual implementation file (not mocks)
  - Example: `require('../../claude-code/index.js')`

- [ ] **Test will call real function?**
  - Call the actual function with real parameters
  - No mocks unless testing error handling

- [ ] **Can verify real behavior?**
  - Test checks actual output/behavior
  - Not just `expect(true).toBe(true)`

- [ ] **Reality check planned?**
  - Plan how to break implementation to verify test fails
  - Document what should make test fail

---

## Placeholder Test Categories

### Category A: Integration Tests (Priority 1 - Highest Value)

**Total:** ~10 tests
**Files:**

- tests/integration/api-client.test.js (5 placeholders)
- tests/integration/native-messaging.test.js (3 placeholders)
- tests/integration/level4-reload.test.js (1 placeholder)

**Why prioritize:**

- Higher value (test real system integration)
- More likely to catch real bugs
- Closer to user-facing behavior

**Replacement approach:**

1. Check if API/feature is implemented
2. If YES: Write real test calling actual API
3. If NO: Mark as skip with TODO

---

### Category B: Unit Tests - Level 4 Reload (Priority 2)

**Total:** ~60 tests
**Files:**

- tests/unit/level4-reload-auto-detect.test.js (24 placeholders)
- tests/unit/level4-reload-cdp.test.js (~30 placeholders)

**Why second priority:**

- Large cluster of related tests
- Testing specific feature (Level 4 reload)
- Can be done systematically

**Replacement approach:**

1. Check if Level 4 reload is implemented
2. Read implementation to understand behavior
3. Replace placeholders with real tests of actual behavior
4. If not implemented: Mark all as skip

---

### Category C: Unit Tests - Other Features (Priority 3)

**Total:** ~11 tests
**Files:**

- tests/unit/extension-discovery-validation.test.js
- tests/unit/hard-reload.test.js

**Replacement approach:**

- Case-by-case based on implementation status

---

## Detailed Test Inventory

### Integration Tests (Category A)

#### tests/integration/api-client.test.js

```
Line 89: should initialize client with valid extension ID
Line 121: should handle connection errors gracefully
Line 145: should retry failed requests with backoff
Line 178: should validate responses from extension
Line 201: should timeout long-running requests
```

**Implementation check needed:**

- [ ] Check if `api-client.js` exists
- [ ] Check if connection logic exists
- [ ] Check if retry/timeout logic exists

#### tests/integration/native-messaging.test.js

```
Line 67: should establish native messaging connection
Line 98: should send messages to native host
Line 134: should receive messages from native host
```

**Implementation check needed:**

- [ ] Check if native messaging is implemented
- [ ] Check if `native-host/` directory exists

#### tests/integration/level4-reload.test.js

```
Line 156: should perform Level 4 reload via CDP when available
```

**Implementation check needed:**

- [ ] Check if Level 4 reload is implemented in `claude-code/index.js`

---

### Unit Tests - Level 4 Reload (Category B)

#### tests/unit/level4-reload-auto-detect.test.js (24 placeholders)

```
Line 45: should try CDP method first by default
Line 67: should detect CDP availability via chrome.debugger
Line 89: should fallback to hard reload if CDP unavailable
Line 112: should prefer CDP for Chrome Canary
Line 134: should prefer CDP for Chrome Dev
Line 156: should prefer CDP for Chromium
Line 178: should fallback to hard reload for stable Chrome
Line 201: should use hard reload when CDP explicitly disabled
Line 223: should auto-detect based on browser version
Line 245: should cache detection result
Line 267: should invalidate cache on browser update
Line 289: should respect user preference over auto-detection
Line 312: should log detection decision
Line 334: should handle detection errors gracefully
Line 356: should timeout detection after reasonable period
Line 378: should return detection status
Line 401: should detect CDP on Linux
Line 423: should detect CDP on macOS
Line 445: should detect CDP on Windows
Line 467: should handle permission denied gracefully
Line 489: should warn when CDP requires permissions
Line 512: should provide fallback when detection fails
Line 534: should work in headless mode
Line 556: should work in incognito mode
```

**Implementation check needed:**

- [ ] Check if auto-detection logic exists
- [ ] Check if CDP availability detection exists
- [ ] Check if browser version detection exists

#### tests/unit/level4-reload-cdp.test.js (~30 placeholders - need full count)

**Need to read file to get exact count and lines**

---

### Unit Tests - Other (Category C)

#### tests/unit/extension-discovery-validation.test.js

**Need to read file to find placeholder tests**

#### tests/unit/hard-reload.test.js

**Need to read file to find placeholder tests**

---

## Replacement Workflow (For Each Test)

### Step 1: Pre-Replacement Check

```
✓ Read test description
✓ Identify what it's supposed to test
✓ Check if implementation exists
✓ Decide: REPLACE or SKIP
```

### Step 2A: If Implementation Exists → REPLACE

```
✓ Read implementation code
✓ Understand actual behavior
✓ Write real test that:
  - Imports real code
  - Calls real function
  - Checks real output
  - Would fail if implementation breaks
```

### Step 2B: If Implementation Missing → SKIP

```
✓ Replace placeholder with:
  it.skip('description', () => {
    // TODO: Implementation not yet available
    // Need to implement [feature] first
    // Expected behavior: [describe]
  });
```

### Step 3: Reality Check

```
✓ Break implementation
✓ Run test
✓ Verify test fails
✓ Fix implementation
✓ Verify test passes
```

### Step 4: Document

```
✓ Add test to "Replaced" list
✓ Note any issues found
✓ Update progress
```

---

## Progress Tracking

### Category A: Integration Tests (10 tests)

- [ ] api-client.test.js:89 - initialize client with valid extension ID
- [ ] api-client.test.js:121 - handle connection errors gracefully
- [ ] api-client.test.js:145 - retry failed requests with backoff
- [ ] api-client.test.js:178 - validate responses from extension
- [ ] api-client.test.js:201 - timeout long-running requests
- [ ] native-messaging.test.js:67 - establish native messaging connection
- [ ] native-messaging.test.js:98 - send messages to native host
- [ ] native-messaging.test.js:134 - receive messages from native host
- [ ] level4-reload.test.js:156 - perform Level 4 reload via CDP

### Category B: Unit Tests - Level 4 Reload (~60 tests)

**Status:** Pending full inventory

### Category C: Unit Tests - Other (~11 tests)

**Status:** Pending full inventory

---

## Implementation Status Check

Before starting replacements, check these files exist:

### Core Implementation Files:

- [ ] `claude-code/index.js` - Main API
- [ ] `extension/background.js` - Extension logic
- [ ] `api-client.js` - API client (if exists)
- [ ] `level4-reload.js` - Level 4 reload logic (if exists)
- [ ] `native-host/` - Native messaging (if exists)

### Check for Level 4 Reload:

```bash
grep -r "level.*4.*reload" claude-code/
grep -r "CDP" claude-code/
grep -r "chrome.debugger" claude-code/
```

### Check for Native Messaging:

```bash
ls -la native-host/
grep -r "nativeMessaging" extension/
```

---

## Reality Check Plan

For each replaced test, document:

### Test: [Description]

**File:** [path:line]
**Implementation:** [function/file]
**Break method:** [how to break it]
**Expected failure:** [what error/failure expected]
**Status:** [PASS/FAIL]

---

## Risks and Mitigations

### Risk 1: Implementation doesn't exist

**Impact:** Can't write real test
**Mitigation:** Mark as skip with TODO

### Risk 2: Test too complex to implement quickly

**Impact:** Delays overall progress
**Mitigation:** Mark as skip, create issue for future

### Risk 3: Breaking implementation causes other tests to fail

**Impact:** Reality check unclear
**Mitigation:** Run full suite before/after, isolate changes

### Risk 4: 81 tests is too many for one session

**Impact:** Incomplete work
**Mitigation:** Prioritize integration tests, checkpoint frequently

---

## Success Criteria

### Minimum (Must Have):

- ✅ All Category A (integration) tests replaced or skipped
- ✅ Reality check performed on replaced tests
- ✅ 0 placeholder tests passing (all either real or skipped)

### Target (Should Have):

- ✅ All Category A + Category B tests replaced or skipped
- ✅ Reality check on 100% of replaced tests
- ✅ Documentation of implementation gaps found

### Stretch (Nice to Have):

- ✅ All 81 tests replaced or skipped
- ✅ Implementation gaps filled
- ✅ All tests passing with real implementations

---

## Next Actions

1. ✅ Read implementation files to check what exists
2. ✅ Start with Category A (integration tests)
3. ✅ For each test: check implementation → replace or skip
4. ✅ Reality check each replacement
5. ✅ Document progress
6. ✅ Move to Category B when Category A done

---

**Status:** Checklist created, ready to start implementation check
**Next:** Check which implementations exist before starting replacements

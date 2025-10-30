# Chrome Dev Assist - Known Issues & Warnings

Complete documentation of known issues, limitations, and warnings for chrome-dev-assist.

**For quick reference, see:** [CLAUDE.md](../CLAUDE.md) | [TO-FIX.md](../TO-FIX.md)

---

## CRITICAL: Phantom APIs

### Overview

During comprehensive audit (Oct 26), **16 functions were discovered with extensive test suites but ZERO implementation** in production code. Phase 1.3 (Oct 27) implemented 2, leaving **14 phantom APIs**.

**Impact**: ❌ CRITICAL - These functions will fail at runtime despite having passing tests.

### Discovery Method

```bash
# Grep all test files for function calls
grep -rh "chromeDevAssist\.[a-zA-Z]*(" tests --include="*.test.js" \
  | sed 's/.*chromeDevAssist\.\([a-zA-Z]*\)(.*/\1/' | sort -u

# Result: 24 functions called in tests
# Cross-reference with module.exports in claude-code/index.js
# Oct 26: 8 implemented, 16 phantom
# Oct 27: 10 implemented, 14 phantom (Phase 1.3)
```

### 14 Remaining Phantom APIs

❌ **DO NOT USE** - These will fail at runtime:

1. **`abortTest(testId)`** - Test orchestration (never implemented)
2. **`captureServiceWorkerLogs(extensionId, duration)`** - Service worker logging (never implemented)
3. **`disableExtension(extensionId)`** - Extension disable (never implemented)
4. **`disableExternalLogging()`** - External logging toggle (never implemented)
5. **`enableExtension(extensionId)`** - Extension enable (never implemented)
6. **`enableExternalLogging()`** - External logging toggle (never implemented)
7. **`endTest(testId)`** - Test orchestration (never implemented)
8. **`getExternalLoggingStatus()`** - External logging status (never implemented)
9. **`getServiceWorkerStatus(extensionId)`** - Service worker status (never implemented)
10. **`getTestStatus(testId)`** - Test orchestration status (never implemented)
11. **`startTest(testId, options)`** - Test orchestration (never implemented)
12. **`toggleExtension(extensionId)`** - Extension toggle (never implemented)
13. **`verifyCleanup()`** - Cleanup verification (never implemented)
14. **`wakeServiceWorker(extensionId)`** - Service worker wake (never implemented)

### ✅ Implemented in Phase 1.3 (Oct 27)

- **`getPageMetadata(tabId)`** - ✅ IMPLEMENTED (commit 0a367ae)
- **`captureScreenshot(tabId, options)`** - ✅ IMPLEMENTED + P0 bug fix (commit 197fd79)

### Why This Happened

**Root Cause**: Tests written before implementation (TDD approach), but implementation never completed.

**How Tests Pass**: Tests mock or stub the functions, so they pass even though the actual implementation doesn't exist.

### Recommendations

For each phantom API, choose one:

1. **Option A (Implement)**: Write the implementation to match test expectations
2. **Option B (Remove Tests)**: Delete test files for unimplemented features
3. **Option C (Document as Planned)**: Move to `PLANNED-FEATURES.md` with clear "not implemented" notice

**See:** `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` for detailed analysis of each phantom API.

---

## Test Suite Status

### Current Status

- **28/106 tests passing** (26% pass rate)
- **73 tests failing** (69% fail rate)
- **5 tests skipped** (5% skipped)
- **Test suites**: 3 passed, 7 failed

### Root Causes

| Cause                   | Percentage | Count     |
| ----------------------- | ---------- | --------- |
| Extension not loaded    | 60%        | ~44 tests |
| Phantom APIs referenced | 30%        | ~22 tests |
| Test interdependencies  | 10%        | ~7 tests  |

### Prerequisites for 100% Pass Rate

1. **Chrome extension MUST be loaded manually**
   - Open chrome://extensions
   - Enable "Developer mode"
   - Click "Load unpacked" → Select extension/ folder
   - Note extension ID

2. **WebSocket server MUST be running**
   - `node server/websocket-server.js`

3. **Extension MUST be connected to server**
   - Check extension service worker console for "Connected to server" message

### Planned Improvements

- **Puppeteer automation**: Launch Chrome with extension loaded automatically
- **Better test isolation**: Remove test interdependencies
- **Phantom API cleanup**: Remove or implement phantom function tests

**See:** [TESTING-GUIDE.md](../TESTING-GUIDE.md) for complete testing documentation.

---

## Placeholder Tests

### Overview

**24 tests** contain `expect(true).toBe(true)` - These provide no actual validation.

### Affected Files

1. `tests/unit/test-orchestration.test.js` - 8 placeholder tests
2. `tests/integration/edge-cases-memory.test.js` - 3 placeholder tests
3. `tests/integration/edge-cases-concurrency.test.js` - 4 placeholder tests
4. `tests/integration/edge-cases-special-data.test.js` - 3 placeholder tests
5. `tests/integration/dogfooding.test.js` - 2 placeholder tests
6. `tests/security/client-security.test.js` - 2 placeholder tests
7. `tests/chaos/adversarial.test.js` - 1 placeholder test
8. `tests/integration/complete-system.test.js` - 1 placeholder test

### Example

```javascript
test('should handle memory pressure', () => {
  expect(true).toBe(true); // ❌ Placeholder - no actual test
});
```

### Recommendation

Replace all placeholder tests with:

1. **Real assertions** testing actual functionality
2. **Skip directive** if feature not implemented: `test.skip('...')`
3. **Delete test** if not applicable

**See:** `PLACEHOLDER-TESTS-INDEX-2025-10-26.md` for complete list.

---

## Unused Modules

### 1. HealthManager Module

**Status**: ✅ ACTIVE (4 usages in websocket-server.js)

**Initial Assessment**: Incorrectly marked as "unused" during audit.

**Actual Usage**:

- Line 66: `const healthManager = new HealthManager();`
- Line 162: `healthManager.recordRequest();`
- Line 237: `healthManager.recordRequest();`
- Line 244: Health endpoint using `healthManager.getStatus()`

**Verdict**: NOT UNUSED - Active and integrated.

### 2. ConsoleCapture Module

**Status**: ✅ FULLY INTEGRATED (Phase 3, Oct 27)

**Initial Assessment**: Marked as "POC only" during initial audit.

**Integration (Phase 3)**:

- Replaced 96 lines of inline console capture logic
- 43/43 unit tests passing (100%)
- Complete feature parity with previous implementation
- Single source of truth for console capture logic

**Verdict**: NOT UNUSED - Fully integrated and production-ready.

### 3. Level4 CDP Module

**Status**: ⚠️ IMPLEMENTED BUT NOT EXPOSED

**File**: `claude-code/level4-reload-cdp.js` (198 lines)

**What It Does**:

- Reloads extension code from disk using Chrome DevTools Protocol (CDP)
- True Level 4 reload (disk-level, not just service worker restart)

**Functions Available**:

1. `getCDPWebSocketURL(port)` - Get CDP WebSocket endpoint
2. `evaluateExpression(ws, expression)` - Execute JS via CDP
3. `level4ReloadCDP(extensionId, options)` - Reload extension via CDP

**Why Not Exposed**:

- Requires Chrome to be started with special flag (`--remote-debugging-port=9222`)
- More complex than standard reload
- Not needed for most use cases
- Standard `reload()` works fine

**Recommendation**:

1. **Option A (Expose)**: Export from `claude-code/index.js` as advanced API
2. **Option B (Document)**: Add README.md explaining advanced usage
3. **Option C (Keep as-is)**: Internal-only, available via direct require

**Verdict**: Keep as internal-only feature. Document in advanced usage guide if needed.

---

## P0 Bug Fix History

### captureScreenshot() Validation Bug (Oct 27)

**Severity**: P0 (Critical security/correctness issue)

**Discovered By**: 5-persona code review (The QA Engineer persona)

**Bug**: `captureScreenshot()` accepted invalid inputs:

- NaN, Infinity, -Infinity
- Floating-point numbers (when integers required)
- Extremely large values (> 4096px)

**Impact**: Could cause Chrome crashes, memory exhaustion, or undefined behavior.

**Fix (commit 197fd79)**:

Added 5 missing validation checks:

```javascript
// Quality validation
if (!Number.isFinite(quality) || quality < 0 || quality > 100) {
  throw new TypeError('quality must be 0-100');
}

// Width/height validation
if (!Number.isInteger(width) || width <= 0 || width > 4096) {
  throw new TypeError('width must be integer 1-4096');
}
```

**Tests**: 7 new edge case tests added (25 total, 100% pass rate)

**Approval**: Unanimous approval from all 5 expert reviewers

**See**: `.SESSION-SUMMARY-P0-FIXES-2025-10-27.md` for complete details (5,595 lines of review documentation).

---

## Known Limitations

### Extension Behavior

1. **Cannot reload itself**: Chrome Dev Assist prevents self-destruction
   - Attempting `reload('chrome-dev-assist-id')` returns error
   - Rationale: Prevents test suite from breaking itself

2. **One extension connection**: Per server instance
   - Only one extension can connect to WebSocket server at a time
   - Subsequent connections rejected

3. **Service worker lifecycle**: May disconnect during Chrome updates
   - Service worker suspended after 30 seconds inactivity
   - Auto-reconnects on wake

### Test Infrastructure

1. **Manual extension loading**: Tests require manual setup
   - No Puppeteer automation yet
   - Developer must load extension before running tests

2. **file:// URLs**: Require special permission
   - "Allow access to file URLs" must be enabled in chrome://extensions

3. **Test interdependencies**: Some tests depend on execution order
   - Can cause flaky test failures
   - Planned fix: Better test isolation

### Performance

1. **Max logs per capture**: 10,000 logs
   - Memory protection limit
   - Additional logs discarded silently

2. **Capture age limit**: 5 minutes after completion
   - Automatic cleanup prevents memory leaks
   - Older captures automatically deleted

3. **Command timeout**: 30 seconds
   - Commands taking longer than 30 seconds fail
   - Not configurable (hardcoded)

---

## Future Plans

### Planned Features (Not Yet Implemented)

#### Test Orchestration

- `startTest(testId, options)` - Initialize test session
- `endTest(testId)` - Finalize test session
- `abortTest(testId)` - Cancel running test
- `getTestStatus(testId)` - Query test state

**Status**: Design docs exist, implementation pending

**See**: `docs/TEST-ORCHESTRATION-PROTOCOL.md`

#### Service Worker Management

- `captureServiceWorkerLogs(extensionId, duration)` - Capture service worker console
- `getServiceWorkerStatus(extensionId)` - Query service worker state
- `wakeServiceWorker(extensionId)` - Force service worker wake

**Status**: Phantom APIs, implementation needed

**Challenge**: Service worker console not accessible via standard Chrome APIs

#### Extension Control

- `enableExtension(extensionId)` - Enable extension
- `disableExtension(extensionId)` - Disable extension
- `toggleExtension(extensionId)` - Toggle extension state

**Status**: Partially implemented via `chrome.management` API

**Note**: Current `reload()` uses enable/disable internally

#### External Logging

- `enableExternalLogging()` - Enable external log forwarding
- `disableExternalLogging()` - Disable external log forwarding
- `getExternalLoggingStatus()` - Query logging state

**Status**: Design concept only, no implementation

**Use Case**: Forward logs to external monitoring system

#### Cleanup Verification

- `verifyCleanup()` - Verify all resources cleaned up

**Status**: Concept only, implementation strategy unclear

**Use Case**: End-of-test suite verification

### Infrastructure Improvements

#### Puppeteer Automation

**Goal**: Launch Chrome with extension loaded automatically

**Benefits**:

- No manual extension loading
- Tests pass in CI/CD
- Better test isolation

**Status**: Planned, not started

#### Better Test Isolation

**Goal**: Remove test interdependencies

**Changes Needed**:

- Each test suite starts fresh
- No shared state between tests
- Cleanup after each test

**Status**: Planned, not started

#### Placeholder Test Cleanup

**Goal**: 24 tests need real assertions

**Action Items**:

- Review each placeholder test
- Implement real assertions
- Or delete/skip if not applicable

**Status**: Documented, not started

### OAuth2 Integration (When Needed)

**Trigger**: Cloud sync, user data, external APIs

**Plan**: See `docs/decisions/003-future-oauth2-strategy.md`

**Components**:

- OAuth2 + PKCE
- `chrome.identity.launchWebAuthFlow()`
- Tokens in `chrome.storage.session`

**Status**: Design complete, implementation when needed

---

## CI/CD Issues (Current)

### Issue #2: Token Budget - CLAUDE.md Too Large

**Status**: ❌ BLOCKING CI/CD

**Current Size**: 602 lines
**Maximum Allowed**: 250 lines
**Overage**: 352 lines (241% over limit)

**Impact**: Blocks all CI/CD workflows from passing

**Solution**: Split CLAUDE.md into multiple focused files (IN PROGRESS)

### Issue #3: ShellCheck Linting Failures

**Status**: ❌ BLOCKING CI/CD

**Impact**: Blocks Critical Checks workflow

**Solution**: Address shell script linting issues (PENDING)

**See**: [TO-FIX.md](../TO-FIX.md) for complete issue tracking.

---

## Security Warnings

### CVE-2025-53773 Mitigations Applied

**Date**: Oct 28, 2025

**Fixes**:

- 50+ `echo` → `printf` conversions (prevents command injection)
- `grep -E` → `grep -F` (literal matching only)
- Shell script security audit workflow added

**See**: [SECURITY.md](SECURITY.md) for complete security documentation.

### Input Validation Requirements

All inputs MUST be validated:

| Input           | Validation       | Why               |
| --------------- | ---------------- | ----------------- |
| Extension ID    | `/^[a-p]{32}$/`  | Chrome ID format  |
| URL             | Full parsing     | Prevent injection |
| Tab ID          | Positive integer | Chrome tab IDs    |
| Duration        | 1-60000ms        | Prevent abuse     |
| Screenshot opts | Type + range     | P0 fix (Oct 27)   |

---

## Documentation Gaps

### Updated (Oct 26)

- ✅ `COMPLETE-FUNCTIONALITY-MAP.md` - Now includes phantom APIs and unused modules
- ✅ `CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md` - Complete code verification

### Still Needed

- ⏳ README.md - Add phantom API warning section
- ⏳ docs/API.md - Add phantom API warnings per function
- ⏳ TESTING-GUIDE.md - Add phantom API test cleanup guide

---

**Last Updated:** 2025-10-30
**Related:** [CLAUDE.md](../CLAUDE.md) | [TO-FIX.md](../TO-FIX.md) | [PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md](../PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md)

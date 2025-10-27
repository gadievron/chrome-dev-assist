# Testing Guidelines for Testers - Chrome Dev Assist

**Date:** 2025-10-25
**Purpose:** Guide testers on common issues, correct testing patterns, and what to look for
**Audience:** QA testers, integration test writers, security testers

---

## Table of Contents

1. [Common Test Design Issues](#common-test-design-issues)
2. [Console Capture Testing - Correct Patterns](#console-capture-testing-correct-patterns)
3. [Metadata Extraction Testing](#metadata-extraction-testing)
4. [Security Testing Checklist](#security-testing-checklist)
5. [Known Issues to Verify](#known-issues-to-verify)
6. [Test Infrastructure Requirements](#test-infrastructure-requirements)

---

## Common Test Design Issues

### Issue 1: Console Capture Timing Errors ⚠️ CRITICAL

**Discovered:** 2025-10-25 (Adversarial Test Suite)
**Impact:** 4 tests failing due to incorrect timing assumptions

#### ❌ INCORRECT Pattern (Don't Do This):
```javascript
// WRONG - Logs happen BEFORE capture starts
const openResult = await chromeDevAssist.openUrl(url, { active: true });
await new Promise(resolve => setTimeout(resolve, 2000));

// Start capture AFTER page has already loaded
const capturePromise = chromeDevAssist.captureLogs(8000);
await new Promise(resolve => setTimeout(resolve, 100));

// Reload hoping to capture reload logs (doesn't work reliably)
await chromeDevAssist.reloadTab(openResult.tabId);

const logsResult = await capturePromise;
```

**Why this fails:**
- Initial page load logs happen BEFORE `captureLogs()` is called
- These logs are NOT captured
- Page reload may not re-trigger synchronous initialization logs
- Console capture missed the actual logs you wanted to test

#### ✅ CORRECT Pattern (Do This):
```javascript
// Open URL and wait for page to fully load
const openResult = await chromeDevAssist.openUrl(url, { active: true });

// Wait for page to load and generate logs
// Logs are automatically STORED by the extension during page load
await new Promise(resolve => setTimeout(resolve, 4000));

// Capture logs - retrieves STORED logs from the page load
const logsResult = await chromeDevAssist.captureLogs(6000);
```

**Why this works:**
- Extension automatically captures and stores console logs during page load
- `captureLogs()` retrieves the stored logs
- No reload needed - logs already captured
- Timing is predictable and reliable

#### Key Timing Guidelines:

| Page Type | Recommended Wait Time | Reason |
|-----------|----------------------|---------|
| Simple HTML | 2000ms | Basic DOM + scripts |
| Complex with iframes | 4000ms | Iframe loading takes time |
| Continuous logging | 5000ms+ | Allow logs to accumulate |
| Heavy JavaScript | 3000-5000ms | Script execution time |

---

## Console Capture Testing - Correct Patterns

### Pattern 1: Basic Page Load Capture ✅

**Use case:** Capture console logs from a page that logs during initialization

```javascript
test('should capture logs from page load', async () => {
  // 1. Open page
  const openResult = await chromeDevAssist.openUrl(url, { active: true });

  // 2. Wait for page to fully load and logs to generate
  await new Promise(resolve => setTimeout(resolve, 4000));

  // 3. Capture stored logs
  const logsResult = await chromeDevAssist.captureLogs(6000);

  // 4. Verify logs
  expect(logsResult.consoleLogs.length).toBeGreaterThan(0);
});
```

### Pattern 2: Continuous Logging Capture ✅

**Use case:** Page that generates logs continuously (e.g., 1 log per second)

```javascript
test('should capture continuous logs', async () => {
  // 1. Open page that logs continuously
  const openResult = await chromeDevAssist.openUrl(url, { active: true });

  // 2. Wait for logs to accumulate
  // Example: If page logs 1/second, wait 10 seconds to get ~10 logs
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 3. Capture accumulated logs
  const logsResult = await chromeDevAssist.captureLogs(6000);

  // 4. Verify expected log count
  expect(logsResult.consoleLogs.length).toBeGreaterThanOrEqual(8);
});
```

### Pattern 3: Multiple Console Levels ✅

**Use case:** Verify different console methods (log, info, warn, error)

```javascript
test('should capture all console levels', async () => {
  const openResult = await chromeDevAssist.openUrl(url, { active: true });

  // Wait for page to log at different levels
  await new Promise(resolve => setTimeout(resolve, 4000));

  const logsResult = await chromeDevAssist.captureLogs(6000);

  // Count logs by level
  const levelCounts = {};
  logsResult.consoleLogs.forEach(log => {
    levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
  });

  // Verify multiple levels captured
  expect(Object.keys(levelCounts).length).toBeGreaterThanOrEqual(3);
  expect(levelCounts['log']).toBeGreaterThan(0);
  expect(levelCounts['error']).toBeGreaterThan(0);
});
```

---

## Metadata Extraction Testing

### Known Issue: Protocol Blocking ⚠️

**Issue:** Metadata extraction from adversarial pages may be blocked by security protocols

**Affected pages:**
- Pages with `data:` URIs
- Pages with `about:` protocol
- Pages with `javascript:` protocol
- Pages with `blob:` URLs

**Current behavior:**
- Protocol blocking returns error instead of metadata
- This is INTENTIONAL for security
- XSS test fixtures may fail due to this

### Correct Metadata Testing Pattern ✅

```javascript
test('should extract metadata from page', async () => {
  // 1. Open page (use http://, https://, or file:// protocol)
  const openResult = await chromeDevAssist.openUrl(url, { active: true });

  // 2. Wait for page to fully load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Extract metadata
  const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

  // 4. Verify metadata structure
  expect(metadata).toBeDefined();
  expect(metadata.metadata).toBeDefined();

  // 5. Verify specific data-* attributes
  expect(metadata.metadata.testId).toBe('expected-value');
});
```

### Metadata Isolation Testing (Iframes) ✅

**Critical security test:** Ensure iframe metadata does NOT leak to main page

```javascript
test('should NOT extract iframe metadata', async () => {
  // Page with data-* on main page AND in iframes
  const openResult = await chromeDevAssist.openUrl(url, { active: true });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

  // Should get main page metadata
  expect(metadata.metadata.mainPageAttr).toBeDefined();

  // Should NOT get iframe metadata (CRITICAL SECURITY CHECK)
  expect(metadata.metadata.iframeSecret).toBeUndefined();
  expect(metadata.metadata.sandboxedData).toBeUndefined();
});
```

**⚠️ KNOWN ISSUE:** Data URI iframe metadata currently LEAKS to main page (ISSUE-001)
- This is a CRITICAL security vulnerability
- Tests will FAIL until fixed
- Do NOT disable this test - it catches real security issues

---

## Security Testing Checklist

### Cross-Origin Iframe Isolation

**What to test:**
- [ ] Main page logs ARE captured
- [ ] Same-origin iframe logs ARE captured
- [ ] Sandboxed iframe logs are NOT captured
- [ ] Data URI iframe logs are NOT captured
- [ ] Nested sandboxed iframe logs are NOT captured

**How to test:**
```javascript
// Filter logs by source marker
const mainPageLogs = logs.filter(m => m.includes('[MAIN-PAGE]'));
const iframeLogs = logs.filter(m => m.includes('[IFRAME]'));
const sandboxedLogs = logs.filter(m => m.includes('[SANDBOXED]'));

// Verify isolation
expect(mainPageLogs.length).toBeGreaterThan(0); // ✓ Should capture
expect(sandboxedLogs.length).toBe(0); // ✓ Must NOT capture
```

### XSS Prevention in Metadata

**What to test:**
- [ ] Script tags in data-* attributes are escaped
- [ ] HTML entities in data-* attributes are escaped
- [ ] JavaScript protocol URLs are escaped
- [ ] SQL injection attempts are escaped
- [ ] Command injection attempts are escaped
- [ ] No eval() or Function() in extracted metadata

**How to test:**
```javascript
const metadata = await chromeDevAssist.getPageMetadata(tabId);

// Verify XSS payloads are escaped (returned as safe strings)
expect(metadata.metadata.xssAttempt).toBeDefined();
expect(typeof metadata.metadata.xssAttempt).toBe('string');

// Verify no executable code
const metadataStr = JSON.stringify(metadata.metadata);
expect(metadataStr).not.toMatch(/eval\(/);
expect(metadataStr).not.toMatch(/Function\(/);
expect(metadataStr).not.toMatch(/<script>/);
```

### Crash Recovery and Robustness

**What to test:**
- [ ] Extension doesn't crash on pages with 100+ rapid errors
- [ ] Extension handles extreme memory usage pages gracefully
- [ ] Console capture continues after crash simulation
- [ ] No data loss during error cascades
- [ ] Metadata extraction works on crash pages

**Verified working** (3 tests passed):
- ✅ Crash simulation without extension crash
- ✅ Error cascade (100 rapid errors) without data loss
- ✅ Extreme memory usage handled gracefully

---

## Known Issues to Verify

### CRITICAL Issues

#### ISSUE-001: Data URI Iframe Metadata Leakage 🚨

**Status:** VERIFIED FAILING (3 fix attempts unsuccessful)

**What to look for:**
```javascript
// Main page: <html data-test-id="main-001">
// Data URI iframe: <body data-secret="IFRAME-SECRET">

const metadata = await chromeDevAssist.getPageMetadata(tabId);

// EXPECTED: metadata.metadata.secret = undefined
// ACTUAL BUG: metadata.metadata.secret = "IFRAME-SECRET" ❌
```

**Security impact:** CRITICAL
- Cross-origin isolation violated
- Sandboxed iframe data leaks to main page
- Potential sensitive data exposure

**Test to run:** `tests/integration/adversarial-tests.test.js` - "should isolate metadata from cross-origin iframes"

**When testing:**
- Verify main page metadata is extracted correctly ✓
- Verify iframe metadata does NOT appear in result ✗ (currently fails)
- Check both sandboxed and data URI iframes

---

### HIGH Priority Issues

#### ISSUE-008: Test Timing Patterns ✅ RESOLVED

**Status:** ROOT CAUSE IDENTIFIED - Test bug, not production bug

**What was wrong:**
- Tests used incorrect console capture timing pattern
- Started capture AFTER page loaded, then reloaded
- Missed initial page load logs

**How it was fixed:**
- Updated tests to use correct pattern: wait for logs, then capture
- Removed unnecessary page reloads
- Increased wait times for complex pages

**When writing new tests:**
- ✅ DO: Wait 4000ms after openUrl(), then captureLogs()
- ❌ DON'T: Start captureLogs(), then reloadTab(), then await

---

## Test Infrastructure Requirements

### Cannot Be Tested Without Infrastructure

**81 tests are currently skipped** because they require infrastructure that doesn't exist yet:

#### Chrome Debug Mode Required (60+ tests)
```bash
# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222

# Required for:
- Level 4 reload tests (CDP control)
- Hard reload tests (chrome.management API)
- Extension discovery validation
```

#### Native Messaging Required (9 tests)
```javascript
// Requires native host binary/script
// Required for:
- Native messaging communication tests
- Command routing through native host
```

#### Mocking Framework Required (12+ tests)
```javascript
// Requires jest mocking or sinon.js
// Required for:
- Server state manipulation tests
- Extension discovery cleanup tests
- API socket tests
```

**DO NOT WRITE FAKE TESTS:**
- If infrastructure doesn't exist, SKIP the test with clear TODO
- Explain what infrastructure is needed
- Never use `expect(true).toBe(true)` placeholders

**Example of properly skipped test:**
```javascript
// TODO: REQUIRES - Chrome with --remote-debugging-port=9222
// This test requires CDP (Chrome DevTools Protocol) access to control
// extension reloading. Set up debug mode Chrome to enable this test.
test.skip('should reload extension via CDP', async () => {
  // Real test code here (for future when infrastructure exists)
});
```

---

## Summary: Key Takeaways for Testers

### ✅ DO

1. **Console Capture:** Wait 4000ms after `openUrl()`, THEN call `captureLogs()`
2. **Metadata Extraction:** Use `http://`, `https://`, or `file://` protocols
3. **Security Tests:** Always verify iframe isolation (logs AND metadata)
4. **Timing:** Increase wait times for complex pages (iframes, heavy JS)
5. **Skip Tests:** Use `test.skip()` with clear TODOs when infrastructure missing
6. **Document Issues:** Add failing tests to TO-FIX.md with root cause analysis

### ❌ DON'T

1. **Console Capture:** DON'T start capture, THEN reload, THEN await
2. **Fake Tests:** DON'T use `expect(true).toBe(true)` placeholders
3. **Ignore Failures:** DON'T skip security tests just because they're failing
4. **Short Waits:** DON'T use < 2000ms wait times for complex pages
5. **Protocol Mix:** DON'T test with `data:`, `about:`, `blob:` URLs (blocked for security)
6. **Assume Working:** DON'T assume iframe isolation works (ISSUE-001 still broken)

---

## Verification Checklist

Before marking tests as passing:

- [ ] Console logs captured from page load (not from reload)
- [ ] Wait time sufficient for page complexity (4000ms+ for iframes)
- [ ] Iframe isolation verified (sandboxed logs NOT captured)
- [ ] Metadata isolation verified (iframe data-* NOT extracted)
- [ ] XSS payloads escaped (no executable code in metadata)
- [ ] All console levels captured (log, info, warn, error)
- [ ] No fake tests (no `expect(true).toBe(true)`)
- [ ] Skipped tests have clear TODO comments
- [ ] Security tests run and results documented

---

## Getting Help

**Test failing unexpectedly?**

1. Check TO-FIX.md for known issues
2. Verify you're using correct timing pattern (see above)
3. Run `npm test -- <test-file>` to isolate the issue
4. Check server logs for connection issues
5. Verify extension is loaded and connected

**Documentation:**
- `TO-FIX.md` - All known issues and their status
- `tests/PLACEHOLDER-TESTS-RESOLVED.md` - Why 81 tests are skipped
- `tests/METADATA-LEAK-INVESTIGATION.md` - Deep dive on ISSUE-001
- `docs/VULNERABILITY-BLOG-METADATA-LEAK.md` - Security analysis

**Questions?**
- Review test patterns in `tests/integration/multi-feature-integration.test.js` (working tests)
- Compare with `tests/integration/adversarial-tests.test.js` (now fixed)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Maintainer:** Chrome Dev Assist Team
**Status:** Active - Use for all new test development

# Chrome Dev Assist - Complete Testing Guide

This guide covers all tests for the Chrome Dev Assist system, from basic functionality to comprehensive integration tests.

---

## Prerequisites

Before running tests, ensure:

1. **Chrome Extension Loaded**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder
   - Note the extension ID (32 characters)

2. **Extension ID Configured**
   - Default: `gnojocphflllgichkehjhkojkihcihfn`
   - Set custom ID: `export EXTENSION_ID=your-extension-id`

3. **Dependencies Installed**
   ```bash
   npm install
   ```

---

## Quick Start

### 1. Basic Functionality Test (Start Here!)

Tests basic extension connectivity and core features.

```bash
npm run test:basic
```

**What it tests:**

- Extension info retrieval
- URL opening with console capture
- Test orchestration
- Auto-cleanup

**Expected result:**

```
✅ ALL TESTS PASSED
The extension is working properly!
```

**Time:** ~10 seconds

---

### 2. Complete Integration Test Suite

Comprehensive end-to-end tests of ALL functionality.

```bash
npm run test:complete
```

**What it tests:**

- Extension discovery (getAllExtensions, getExtensionInfo)
- Extension reload (with and without console capture)
- Console log capture (standalone)
- Tab management (open, reload, close)
- Page metadata extraction
- Test orchestration (start, status, end, abort)
- Cleanup verification
- Full integration workflows
- Error handling

**Expected result:**

```
Test Suites: 1 passed, 1 total
Tests:       40+ passed, 40+ total
```

**Time:** ~2-3 minutes

---

### 3. Crash Recovery Test (Manual)

Tests automatic crash detection and state recovery.

```bash
npm run test:crash-recovery
```

**What it tests:**

- Crash detection
- Test state recovery
- Console capture recovery
- Tab tracking recovery
- Server notification

**Process:**

1. Script starts test with tracked resources
2. You manually terminate service worker
3. Script verifies automatic recovery

**Time:** ~2 minutes

---

## All Available Test Commands

```bash
# Basic functionality check
npm run test:basic

# Complete integration suite
npm run test:complete

# Integration tests with setup wizard
npm run test:integration

# Manual crash recovery test
npm run test:crash-recovery

# All Jest tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Start WebSocket server manually
npm run server

# Start server with debug logging
npm run server:debug
```

---

## Test Suite Breakdown

### Extension Discovery Tests

```bash
jest tests/integration/complete-system.test.js -t "Extension Discovery"
```

**Tests:**

- `getAllExtensions()` - List all installed extensions
- `getExtensionInfo()` - Get detailed extension info
- Invalid extension ID handling

**Example:**

```javascript
const result = await chromeDevAssist.getAllExtensions();
// Returns: { extensions: [...], count: N }
```

---

### Extension Reload Tests

```bash
jest tests/integration/complete-system.test.js -t "Extension Reload"
```

**Tests:**

- `reload()` - Reload without console capture
- `reloadAndCapture()` - Reload WITH console capture
- Capture duration timing
- Console log structure validation

**Example:**

```javascript
const result = await chromeDevAssist.reloadAndCapture(extensionId, {
  duration: 3000,
});
// Reloads extension and captures console for 3 seconds
```

---

### Console Capture Tests

```bash
jest tests/integration/complete-system.test.js -t "Console Log Capture"
```

**Tests:**

- `captureLogs()` - Capture logs without reload
- Duration validation
- Log level filtering

**Example:**

```javascript
const result = await chromeDevAssist.captureLogs(2000);
// Captures all console logs for 2 seconds
```

---

### Tab Management Tests

```bash
jest tests/integration/complete-system.test.js -t "Tab Management"
```

**Tests:**

- `openUrl()` - Open URL in new tab
- `openUrl()` with console capture
- `openUrl()` with autoClose
- `reloadTab()` - Reload specific tab
- `closeTab()` - Close specific tab
- Invalid tab ID handling

**Example:**

```javascript
// Open URL with auto-close (no tab leaks!)
const result = await chromeDevAssist.openUrl('https://example.com', {
  active: false,
  captureConsole: true,
  duration: 2000,
  autoClose: true,
});
// Tab opens, logs captured, tab closes automatically
```

---

### Page Metadata Tests

```bash
jest tests/integration/complete-system.test.js -t "Page Metadata"
```

**Tests:**

- `getPageMetadata()` - Extract page metadata
- Data attributes parsing
- window.testMetadata extraction
- Missing metadata handling

**Example:**

```javascript
const result = await chromeDevAssist.getPageMetadata(tabId);
// Returns: { tabId, url, metadata: { title, readyState, ... } }
```

---

### Test Orchestration Tests

```bash
jest tests/integration/complete-system.test.js -t "Test Orchestration"
```

**Tests:**

- `startTest()` - Start test with tracking
- `getTestStatus()` - Check active test
- `endTest()` - End test with cleanup
- `abortTest()` - Emergency abort
- `verifyCleanup()` - Orphan detection
- Tab tracking
- Auto-cleanup

**Example:**

```javascript
await chromeDevAssist.startTest('my-test');

// Open tabs (automatically tracked)
const tab1 = await chromeDevAssist.openUrl('https://example.com');
const tab2 = await chromeDevAssist.openUrl('https://example.org');

// End test (auto-closes tracked tabs)
await chromeDevAssist.endTest('my-test', 'passed');
// Both tabs closed automatically!
```

---

### Integration Workflow Tests

```bash
jest tests/integration/complete-system.test.js -t "Full Integration"
```

**Real-world scenarios:**

1. **Developer Workflow:** Reload extension + analyze logs

   ```javascript
   const result = await chromeDevAssist.reloadAndCapture(extensionId);
   const errors = result.consoleLogs.filter(log => log.level === 'error');
   // Check for errors after reload
   ```

2. **Automated Testing:** Load fixture + validate metadata

   ```javascript
   await chromeDevAssist.startTest('test-id');
   const tab = await chromeDevAssist.openUrl(fixtureUrl);
   const metadata = await chromeDevAssist.getPageMetadata(tab.tabId);
   await chromeDevAssist.endTest('test-id', 'passed');
   ```

3. **Multi-Tab Testing:** Orchestrated testing with cleanup
   ```javascript
   await chromeDevAssist.startTest('multi-tab-test');
   // Open multiple tabs, verify each, auto-cleanup
   ```

---

## Test Fixtures

Located in `tests/fixtures/`:

### Console Logging Fixtures

- `console-logs-comprehensive.html` - All log types and data types
- `console-errors-test.html` - Error logging scenarios
- `console-mixed-test.html` - Mixed log levels
- `extension-test.html` - Extension reload testing

### Metadata Fixtures

- `metadata-test.html` - Full metadata attributes
- `metadata-minimal.html` - Minimal metadata
- `metadata-window-only.html` - window.testMetadata only

### Edge Case Fixtures

- `edge-circular-ref.html` - Circular reference handling
- `edge-deep-object.html` - Deep object nesting
- `edge-long-message.html` - Long console messages
- `edge-massive-logs.html` - High-volume logging
- `edge-rapid-logs.html` - Rapid sequential logs
- `edge-special-chars.html` - Special character handling

### Accessing Fixtures

Fixtures are served via HTTP server:

```
http://localhost:9876/fixtures/[filename].html
```

**Example:**

```javascript
const result = await chromeDevAssist.openUrl(
  'http://localhost:9876/fixtures/console-logs-comprehensive.html',
  { captureConsole: true, duration: 3000 }
);
```

---

## Debugging Failed Tests

### Test Fails: "Extension not found"

**Cause:** Extension not loaded or wrong ID

**Fix:**

1. Open `chrome://extensions`
2. Verify "Chrome Dev Assist" is loaded and enabled
3. Copy extension ID (32 characters)
4. Run: `export EXTENSION_ID=your-id-here`
5. Retry test

---

### Test Fails: "Connection refused"

**Cause:** WebSocket server not running

**Fix:**

- Server should auto-start
- Manual start: `npm run server`
- Check for port conflicts: `lsof -i :9876`

---

### Test Fails: "Command timeout"

**Cause:** Extension not responding

**Fix:**

1. Open service worker console: `chrome://extensions` → "service worker"
2. Check for errors in console
3. Reload extension manually
4. Check connection status: Should see "Connected to server"

---

### Test Fails: Tab not closing

**Cause:** autoClose not working or tab already closed

**Fix:**

- Check extension console for tab cleanup errors
- Verify Chrome permissions
- Run cleanup manually: `npm run test:basic`

---

### All Tests Timeout

**Cause:** Service worker suspended

**Fix:**

1. Open service worker console (keeps it active)
2. Or disable service worker inactivity:
   - Open DevTools for service worker
   - Keep it open during tests

---

## Writing New Tests

### Template for Integration Test

```javascript
describe('My Feature Tests', () => {
  jest.setTimeout(30000); // Increase for browser operations

  let testId;
  let tabIds = [];

  beforeEach(async () => {
    testId = 'test-' + Date.now();
    tabIds = [];
  });

  afterEach(async () => {
    // Cleanup tabs
    for (const tabId of tabIds) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (err) {
        // Ignore if already closed
      }
    }

    // End test if active
    if (testId) {
      try {
        await chromeDevAssist.endTest(testId, 'aborted');
      } catch (err) {
        // Ignore if not active
      }
    }
  });

  test('should do something', async () => {
    await chromeDevAssist.startTest(testId);

    const result = await chromeDevAssist.openUrl('https://example.com');
    tabIds.push(result.tabId);

    expect(result.tabId).toBeGreaterThan(0);

    await chromeDevAssist.endTest(testId, 'passed');
  });
});
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      # Install Chrome
      - uses: browser-actions/setup-chrome@latest

      # Load extension and run tests
      - run: npm run test:complete
        env:
          EXTENSION_ID: ${{ secrets.EXTENSION_ID }}
```

---

## Performance Benchmarks

**Expected test durations:**

| Test Suite           | Duration | Tests |
| -------------------- | -------- | ----- |
| Basic Functionality  | ~10s     | 4     |
| Complete Integration | ~2-3min  | 40+   |
| Extension Discovery  | ~5s      | 3     |
| Extension Reload     | ~15s     | 3     |
| Tab Management       | ~30s     | 6     |
| Test Orchestration   | ~45s     | 6     |
| Full Workflows       | ~60s     | 3     |

**Total:** ~3-4 minutes for complete test suite

---

## Coverage Goals

Current coverage targets:

- **API Functions:** 100% (all 14 functions tested)
- **Extension Handlers:** 90%+
- **Server Routes:** 85%+
- **Error Paths:** 80%+

Run coverage report:

```bash
npm run test:coverage
```

---

## Troubleshooting Checklist

Before reporting issues, verify:

- [ ] Extension loaded at `chrome://extensions`
- [ ] Extension ID matches (check with `getAllExtensions()`)
- [ ] Extension enabled (not disabled)
- [ ] Service worker running (click "service worker" link)
- [ ] WebSocket server responding (check port 9876)
- [ ] No firewall blocking localhost:9876
- [ ] Chrome version supported (v88+)
- [ ] Dependencies installed (`npm install`)

---

## Next Steps

After all tests pass:

1. **Run in watch mode** for development:

   ```bash
   npm run test:watch
   ```

2. **Generate coverage report**:

   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

3. **Test crash recovery**:

   ```bash
   npm run test:crash-recovery
   ```

4. **Write your own tests** using the templates above

---

## Summary

✅ **40+ integration tests** covering all functionality
✅ **Full end-to-end workflows** with real browser operations
✅ **Test fixtures** for comprehensive console log testing
✅ **Easy commands** for quick validation
✅ **Crash recovery** verification
✅ **CI/CD ready** with automated setup

**Quick validation:**

```bash
npm run test:basic        # 10 seconds - verify it works
npm run test:complete     # 3 minutes - full validation
npm run test:crash-recovery  # 2 minutes - recovery test
```

All tests use the **real Chrome extension** - no mocks, no simulations!

# Manual Testing Guide - Chrome Dev Assist

**Purpose:** Test extension functionality to verify behavior and debug issues

**Prerequisites:**

1. ✅ Chrome running with extension loaded
2. ✅ WebSocket server running (localhost:9876)
3. ✅ Extension connected to server

---

## Quick Connectivity Test

### Test 1: Open a Simple URL

**Expected Behavior:**

- Tab opens in Chrome
- Returns tab ID (positive integer)
- Tab URL matches requested URL

**Test Code:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist && node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';
    const result = await chromeDevAssist.openUrl(
      \`http://localhost:9876/fixtures/integration-test-1.html?token=\${AUTH_TOKEN}\`,
      { active: true }
    );
    console.log('✅ SUCCESS');
    console.log('Tab ID:', result.tabId);
    console.log('URL:', result.url);
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
"
```

**If this fails with "No extensions connected":**

- Extension isn't connected to server
- Check extension console: `chrome://extensions/` → "Inspect views: service worker"
- Look for connection errors

---

## Test 2: Capture Console Logs (Simple Page)

**Expected Behavior:**

- Returns array of console logs
- Should capture logs from integration-test-2.html (generates logs every 1.5s)

**Test Code:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist && node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';

    // Open page
    const openResult = await chromeDevAssist.openUrl(
      \`http://localhost:9876/fixtures/integration-test-2.html?token=\${AUTH_TOKEN}\`,
      { active: true }
    );
    console.log('✅ Page opened, tab ID:', openResult.tabId);

    // Wait for logs to generate
    await new Promise(r => setTimeout(r, 3000));

    // Capture logs (6 second capture window)
    const logsResult = await chromeDevAssist.captureLogs(6000);
    console.log('✅ Logs captured:', logsResult.consoleLogs.length);

    if (logsResult.consoleLogs.length > 0) {
      console.log('First 3 logs:');
      logsResult.consoleLogs.slice(0, 3).forEach(log => {
        console.log(\`  [\${log.level}] \${log.message.substring(0, 60)}...\`);
      });
    }

    // Cleanup
    await chromeDevAssist.closeTab(openResult.tabId);
    console.log('✅ Tab closed');
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
"
```

**Expected Output:**

```
✅ Page opened, tab ID: 12345
✅ Logs captured: 8
First 3 logs:
  [log] 🚀 Integration Test 2 - Console Levels Test Started
  [log] [LOG 1] Standard log message
  [info] [INFO 1] Information message
✅ Tab closed
```

**If logs count is 0:**

- Console capture may not be working
- Check ISSUE-009 in TO-FIX.md
- Try with different fixture (integration-test-1.html)

---

## Test 3: Get Page Metadata (ISSUE-001 Debug)

**Expected Behavior:**

- Returns metadata from main page
- Should NOT include iframe metadata

**Test Code:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist && node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';

    // Open adversarial page with iframes
    const openResult = await chromeDevAssist.openUrl(
      \`http://localhost:9876/fixtures/adversarial-security.html?token=\${AUTH_TOKEN}\`,
      { active: true }
    );
    console.log('✅ Page opened, tab ID:', openResult.tabId);

    // Wait for iframes to load
    await new Promise(r => setTimeout(r, 3000));

    // Get metadata
    const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

    console.log('');
    console.log('=== METADATA RESULT ===');
    console.log('Main page metadata:');
    console.log('  testId:', metadata.metadata.testId);
    console.log('  securityLevel:', metadata.metadata.securityLevel);
    console.log('  secret:', metadata.metadata.secret, metadata.metadata.secret ? '❌ LEAKED!' : '✅ NOT LEAKED');
    console.log('  sandboxed:', metadata.metadata.sandboxed, metadata.metadata.sandboxed ? '❌ LEAKED!' : '✅ NOT LEAKED');

    // Cleanup
    await chromeDevAssist.closeTab(openResult.tabId);
    console.log('✅ Tab closed');

    // Summary
    console.log('');
    if (metadata.metadata.secret || metadata.metadata.sandboxed) {
      console.log('❌ ISSUE-001 CONFIRMED: Iframe metadata leaked!');
      process.exit(1);
    } else {
      console.log('✅ ISSUE-001 FIXED: No iframe metadata leak!');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
"
```

**Expected Output (BUG PRESENT):**

```
✅ Page opened, tab ID: 12345

=== METADATA RESULT ===
Main page metadata:
  testId: adv-security-001
  securityLevel: high
  secret: DATA-URI-SECRET ❌ LEAKED!
  sandboxed: undefined ✅ NOT LEAKED
✅ Tab closed

❌ ISSUE-001 CONFIRMED: Iframe metadata leaked!
```

**Expected Output (BUG FIXED):**

```
✅ Page opened, tab ID: 12345

=== METADATA RESULT ===
Main page metadata:
  testId: adv-security-001
  securityLevel: high
  secret: undefined ✅ NOT LEAKED
  sandboxed: undefined ✅ NOT LEAKED
✅ Tab closed

✅ ISSUE-001 FIXED: No iframe metadata leak!
```

**Debug Logs to Check:**

1. Open Chrome extension console: `chrome://extensions/` → "Inspect views: service worker"
2. Look for lines starting with `[DEBUG METADATA]`
3. Check:
   - How many results returned from executeScript?
   - What frameId for each result?
   - What's the execution context (URL, protocol, isTopFrame)?

---

## Test 4: Adversarial Navigation (ISSUE-009 Debug)

**Expected Behavior:**

- Should capture continuous logs from setInterval

**Test Code:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist && node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';

    // Open adversarial navigation page
    const openResult = await chromeDevAssist.openUrl(
      \`http://localhost:9876/fixtures/adversarial-navigation.html?page=1&token=\${AUTH_TOKEN}\`,
      { active: true }
    );
    console.log('✅ Page opened, tab ID:', openResult.tabId);

    // Wait for page to fully load
    await new Promise(r => setTimeout(r, 4000));

    // Capture logs (8 second capture window)
    const logsResult = await chromeDevAssist.captureLogs(8000);
    console.log('✅ Logs captured:', logsResult.consoleLogs.length);

    // Filter navigation logs
    const navLogs = logsResult.consoleLogs.filter(log =>
      log.message.includes('[NAV-TEST-PAGE-')
    );
    console.log('Navigation logs:', navLogs.length);

    if (navLogs.length > 0) {
      console.log('First 3 navigation logs:');
      navLogs.slice(0, 3).forEach(log => {
        console.log(\`  \${log.message.substring(0, 80)}...\`);
      });
    }

    // Cleanup
    await chromeDevAssist.closeTab(openResult.tabId);
    console.log('✅ Tab closed');

    // Summary
    console.log('');
    if (navLogs.length > 5) {
      console.log('✅ ISSUE-009 FIXED: Captured navigation logs!');
    } else {
      console.log(\`❌ ISSUE-009 PRESENT: Only \${navLogs.length} navigation logs (expected >5)\`);
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
"
```

**Expected Output (BUG PRESENT):**

```
✅ Page opened, tab ID: 12345
✅ Logs captured: 0
Navigation logs: 0
✅ Tab closed

❌ ISSUE-009 PRESENT: Only 0 navigation logs (expected >5)
```

**Expected Output (BUG FIXED):**

```
✅ Page opened, tab ID: 12345
✅ Logs captured: 12
Navigation logs: 10
First 3 navigation logs:
  [NAV-TEST-PAGE-1] Initial log 0: Page 1 initialization...
  [NAV-TEST-PAGE-1] Initial log 1: Page 1 initialization...
  [NAV-TEST-PAGE-1] Continuous log #1: 2025-10-25T16:20:00.000Z...
✅ Tab closed

✅ ISSUE-009 FIXED: Captured navigation logs!
```

---

## Test 5: Screenshot Capture

**Expected Behavior:**

- Captures screenshot as data URL
- File size > 1000 bytes

**Test Code:**

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist && node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';

    // Open page
    const openResult = await chromeDevAssist.openUrl(
      \`http://localhost:9876/fixtures/integration-test-1.html?token=\${AUTH_TOKEN}\`,
      { active: true }
    );
    console.log('✅ Page opened, tab ID:', openResult.tabId);

    // Wait for page to render
    await new Promise(r => setTimeout(r, 2000));

    // Capture screenshot
    const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
      format: 'png'
    });

    console.log('✅ Screenshot captured');
    console.log('  Format:', screenshot.dataUrl.substring(0, 30));
    console.log('  Size:', screenshot.dataUrl.length, 'bytes');

    if (screenshot.dataUrl.length > 1000) {
      console.log('✅ Screenshot size OK');
    } else {
      console.log('❌ Screenshot too small');
    }

    // Cleanup
    await chromeDevAssist.closeTab(openResult.tabId);
    console.log('✅ Tab closed');
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
"
```

---

## Summary of Expected Behaviors

| Test                                 | Expected Behavior                          | If It Fails               |
| ------------------------------------ | ------------------------------------------ | ------------------------- |
| Test 1: Open URL                     | Tab opens, returns tab ID                  | Extension not connected   |
| Test 2: Capture Logs (Simple)        | Gets 6-8 logs from integration-test-2.html | Console capture broken    |
| Test 3: Metadata (ISSUE-001)         | NO leak (secret = undefined)               | ISSUE-001 still present   |
| Test 4: Adversarial Logs (ISSUE-009) | Gets 10+ navigation logs                   | ISSUE-009 still present   |
| Test 5: Screenshot                   | Data URL > 1000 bytes                      | Screenshot capture broken |

---

## Next Steps Based on Results

**If Test 1 fails:**

1. Check if extension is loaded in Chrome
2. Check extension console for errors
3. Restart server and extension

**If Test 2 works but Test 4 fails:**

- ISSUE-009 is real (complex pages fail, simple pages work)
- Check hypothesis: Page complexity vs console capture

**If Test 3 shows leak:**

- ISSUE-001 confirmed
- Check extension console for `[DEBUG METADATA]` logs
- Analyze which context is leaking

**If all tests pass:**

- Extension is working correctly!
- Tests might be the problem, not the extension

---

**Created:** 2025-10-25
**Purpose:** Debug ISSUE-009 and ISSUE-001 with real extension behavior

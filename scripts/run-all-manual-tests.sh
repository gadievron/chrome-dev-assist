#!/bin/bash
# Run all manual tests from MANUAL-TESTING-GUIDE.md
# Prerequisites: Chrome with extension loaded and connected to server

set -e

cd "$(dirname "$0")/.."

AUTH_TOKEN="0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c"

echo "================================="
echo "Chrome Dev Assist - Manual Tests"
echo "================================="
echo ""

# Test 1: Basic Connectivity
echo "TEST 1: Basic Connectivity"
echo "---"
node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const result = await chromeDevAssist.openUrl(
      'http://localhost:9876/fixtures/integration-test-1.html?token=${AUTH_TOKEN}',
      { active: true }
    );
    console.log('✅ SUCCESS - Extension connected!');
    console.log('   Tab ID:', result.tabId);
    await chromeDevAssist.closeTab(result.tabId);
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    if (err.message.includes('No extensions connected')) {
      console.log('');
      console.log('⚠️  Extension not connected to server!');
      console.log('   1. Check if Chrome is running with extension loaded');
      console.log('   2. Check extension console: chrome://extensions/ → Inspect service worker');
      console.log('   3. Look for connection errors');
    }
    process.exit(1);
  }
})();
" || exit 1

echo ""
echo ""

# Test 2: Console Logs (Simple Page)
echo "TEST 2: Console Logs (Simple Page)"
echo "---"
node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const openResult = await chromeDevAssist.openUrl(
      'http://localhost:9876/fixtures/integration-test-2.html?token=${AUTH_TOKEN}',
      { active: true }
    );
    console.log('✅ Page opened');

    await new Promise(r => setTimeout(r, 3000));
    const logsResult = await chromeDevAssist.captureLogs(6000);

    console.log('✅ Logs captured:', logsResult.consoleLogs.length);

    if (logsResult.consoleLogs.length > 0) {
      console.log('   First 3 logs:');
      logsResult.consoleLogs.slice(0, 3).forEach(log => {
        const msg = log.message.substring(0, 60);
        console.log(\`   [\${log.level}] \${msg}...\`);
      });
    } else {
      console.log('⚠️  WARNING: No logs captured (expected 6-8 logs)');
    }

    await chromeDevAssist.closeTab(openResult.tabId);
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
" || exit 1

echo ""
echo ""

# Test 3: Metadata Leak (ISSUE-001)
echo "TEST 3: Metadata Leak (ISSUE-001)"
echo "---"
node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const openResult = await chromeDevAssist.openUrl(
      'http://localhost:9876/fixtures/adversarial-security.html?token=${AUTH_TOKEN}',
      { active: true }
    );
    console.log('✅ Page opened');

    await new Promise(r => setTimeout(r, 3000));
    const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

    console.log('');
    console.log('Main page metadata:');
    console.log('  testId:', metadata.metadata.testId);
    console.log('  securityLevel:', metadata.metadata.securityLevel);
    console.log('  secret:', metadata.metadata.secret, metadata.metadata.secret ? '❌ LEAKED!' : '✅ NOT LEAKED');
    console.log('  sandboxed:', metadata.metadata.sandboxed, metadata.metadata.sandboxed ? '❌ LEAKED!' : '✅ NOT LEAKED');

    await chromeDevAssist.closeTab(openResult.tabId);

    console.log('');
    if (metadata.metadata.secret || metadata.metadata.sandboxed) {
      console.log('❌ ISSUE-001 CONFIRMED: Iframe metadata leaked!');
      console.log('   Check extension console for [DEBUG METADATA] logs');
      process.exit(1);
    } else {
      console.log('✅ ISSUE-001 FIXED: No iframe metadata leak!');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
" || exit 1

echo ""
echo ""

# Test 4: Adversarial Navigation (ISSUE-009)
echo "TEST 4: Adversarial Navigation (ISSUE-009)"
echo "---"
node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const openResult = await chromeDevAssist.openUrl(
      'http://localhost:9876/fixtures/adversarial-navigation.html?page=1&token=${AUTH_TOKEN}',
      { active: true }
    );
    console.log('✅ Page opened');

    await new Promise(r => setTimeout(r, 4000));
    const logsResult = await chromeDevAssist.captureLogs(8000);

    const navLogs = logsResult.consoleLogs.filter(log =>
      log.message.includes('[NAV-TEST-PAGE-')
    );

    console.log('✅ Logs captured:', logsResult.consoleLogs.length);
    console.log('   Navigation logs:', navLogs.length);

    if (navLogs.length > 0) {
      console.log('   First 3 navigation logs:');
      navLogs.slice(0, 3).forEach(log => {
        console.log(\`   \${log.message.substring(0, 70)}...\`);
      });
    }

    await chromeDevAssist.closeTab(openResult.tabId);

    console.log('');
    if (navLogs.length > 5) {
      console.log('✅ ISSUE-009 FIXED: Captured navigation logs!');
    } else {
      console.log(\`❌ ISSUE-009 PRESENT: Only \${navLogs.length} navigation logs (expected >5)\`);
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
" || exit 1

echo ""
echo ""

# Test 5: Screenshot
echo "TEST 5: Screenshot Capture"
echo "---"
node -e "
const chromeDevAssist = require('./claude-code/index.js');

(async () => {
  try {
    const openResult = await chromeDevAssist.openUrl(
      'http://localhost:9876/fixtures/integration-test-1.html?token=${AUTH_TOKEN}',
      { active: true }
    );
    console.log('✅ Page opened');

    await new Promise(r => setTimeout(r, 2000));
    const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
      format: 'png'
    });

    console.log('✅ Screenshot captured');
    console.log('   Size:', screenshot.dataUrl.length, 'bytes');

    if (screenshot.dataUrl.length > 1000) {
      console.log('   ✅ Screenshot size OK');
    } else {
      console.log('   ❌ Screenshot too small');
    }

    await chromeDevAssist.closeTab(openResult.tabId);
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exit(1);
  }
})();
" || exit 1

echo ""
echo ""
echo "================================="
echo "All tests completed!"
echo "================================="

/**
 * Debug Test for ISSUE-001: Data URI Iframe Metadata Leak
 *
 * This test helps debug why iframe metadata leaks to main page despite:
 * 1. allFrames: false
 * 2. Protocol blocking
 * 3. frameId filtering
 *
 * Approach: Test with Chrome extension running, log all execution contexts
 */

const chromeDevAssist = require('../../claude-code/index.js');

describe('ISSUE-001 Debug: Metadata Leak Investigation', () => {
  const AUTH_TOKEN = '0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c';
  const TEST_SERVER = 'http://localhost:9876';
  let openTabs = [];

  afterEach(async () => {
    // Clean up tabs
    for (const tabId of openTabs) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (err) {
        // Tab may already be closed
      }
    }
    openTabs = [];
  });

  it.skip('should log all execution contexts when extracting metadata', async () => {
    // BLOCKED: Requires Chrome extension running
    // This test needs manual execution to see console logs

    const url = `${TEST_SERVER}/fixtures/adversarial-security.html?token=${AUTH_TOKEN}`;
    const openResult = await chromeDevAssist.openUrl(url, { active: true });
    openTabs.push(openResult.tabId);

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for iframes to load

    // Extract metadata - check extension console for debug logs
    const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

    console.log('=== METADATA RESULT ===');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('');
    console.log('Main page should have:');
    console.log('  - testId: adv-security-001');
    console.log('  - securityLevel: high');
    console.log('  - secret: undefined (NO LEAK)');
    console.log('');
    console.log('Actual:');
    console.log('  - testId:', metadata.metadata.testId);
    console.log('  - securityLevel:', metadata.metadata.securityLevel);
    console.log(
      '  - secret:',
      metadata.metadata.secret,
      metadata.metadata.secret === undefined ? '✅ PASS' : '❌ FAIL - LEAKED!'
    );
  });

  it('TODO: Create minimal reproduction without extension', () => {
    // This test would create the simplest possible case to reproduce the bug
    // Main page with single data-test="main"
    // Data URI iframe with data-test="iframe"
    // If metadata extraction returns "iframe", bug is reproduced

    expect(true).toBe(true); // Placeholder
  });

  it('TODO: Test if Chrome executeScript allFrames:false actually works', () => {
    // Research: Does allFrames:false prevent execution in dynamically created data: URI iframes?
    // Or is there a Chrome bug?

    expect(true).toBe(true); // Placeholder
  });
});

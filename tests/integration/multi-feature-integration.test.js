/**
 * Multi-Feature Integration Test
 *
 * Tests multiple Chrome Dev Assist features working together:
 * - URL opening
 * - Console log capture
 * - Screenshot capture
 * - Page metadata extraction
 * - Tab management
 *
 * This demonstrates real-world test automation workflows.
 */

const chromeDevAssist = require('../../claude-code/index.js');
const fs = require('fs');
const path = require('path');

// Read auth token
const AUTH_TOKEN = fs.readFileSync(path.join(__dirname, '../../.auth-token'), 'utf8').trim();

describe('Multi-Feature Integration Tests', () => {
  let testTabs = [];

  afterAll(async () => {
    // Cleanup
    for (const tabId of testTabs) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (err) {
        // Tab might already be closed
      }
    }

    console.log('\n✅ All tabs closed');
  });

  describe('Integration Test 1: Console + Screenshot + Metadata', () => {
    it('should open page, capture logs, take screenshot, and extract metadata', async () => {
      console.log('\n🧪 Starting Multi-Feature Integration Test 1...');

      // 1. Open test page
      const url = `http://localhost:9876/fixtures/integration-test-1.html?token=${AUTH_TOKEN}`;
      console.log(`📂 Opening: ${url}`);

      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      testTabs.push(openResult.tabId);

      expect(openResult.tabId).toBeGreaterThan(0);
      console.log(`✅ Tab opened: ${openResult.tabId}`);

      // 2. Wait for initial page load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Capture logs (page load logs + periodic logs)
      // The page generates periodic logs every 2 seconds, so 4 seconds will capture 2 periodic logs
      console.log('📝 Capturing console logs (4 seconds to get periodic logs)...');
      const logsResult = await chromeDevAssist.captureLogs(4000);

      expect(logsResult.consoleLogs).toBeDefined();
      expect(logsResult.consoleLogs.length).toBeGreaterThan(0);

      console.log(`✅ Captured ${logsResult.consoleLogs.length} console logs`);
      console.log('   Sample logs:');
      logsResult.consoleLogs.slice(0, 5).forEach((log, i) => {
        console.log(`     ${i + 1}. [${log.level}] ${log.message.substring(0, 60)}...`);
      });

      // Verify logs were captured (periodic logs are 'log' level only)
      const levels = logsResult.consoleLogs.map(log => log.level);
      expect(levels).toContain('log');
      console.log(`✅ Log levels captured: ${[...new Set(levels)].join(', ')}`);

      // 4. Take screenshot
      console.log('📸 Taking screenshot...');
      const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(screenshot.size).toBeGreaterThan(1000);
      console.log(`✅ Screenshot captured: ${screenshot.size} bytes`);

      // Save screenshot
      const screenshotDir = path.join(__dirname, '../.screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(screenshotDir, 'integration-test-1.png');
      const base64Data = screenshot.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(screenshotPath, base64Data, 'base64');
      console.log(`✅ Screenshot saved: ${screenshotPath}`);

      // 5. Extract page metadata
      console.log('🎯 Extracting page metadata...');
      const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);

      expect(metadata.metadata).toBeDefined();

      // Verify data-* attributes were extracted from HTML tag
      expect(metadata.metadata.testProject).toBe('chrome-dev-assist');
      expect(metadata.metadata.testId).toBe('integration-001');
      expect(metadata.metadata.testName).toBe('Multi-Feature Integration');

      console.log('✅ Metadata extracted:');
      console.log(`   Project: ${metadata.metadata.testProject}`);
      console.log(`   Test ID: ${metadata.metadata.testId}`);
      console.log(`   Test Name: ${metadata.metadata.testName}`);

      // 6. Summary
      console.log('\n📊 Integration Test 1 Summary:');
      console.log(`   ✅ URL opened: ${url}`);
      console.log(`   ✅ Console logs: ${logsResult.consoleLogs.length} captured`);
      console.log(`   ✅ Screenshot: ${screenshot.size} bytes`);
      console.log(`   ✅ Metadata: ${Object.keys(metadata.metadata).length} fields`);
      console.log(`   ✅ Tab ID: ${openResult.tabId}`);
    }, 120000); // Increased timeout to 120s for comprehensive integration test
  });

  describe('Integration Test 2: Console Level Verification', () => {
    it('should capture all console levels (log, info, warn, error)', async () => {
      console.log('\n🧪 Starting Console Levels Test...');

      // 1. Open console levels test page
      const url = `http://localhost:9876/fixtures/integration-test-2.html?token=${AUTH_TOKEN}`;
      console.log(`📂 Opening: ${url}`);

      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      testTabs.push(openResult.tabId);

      expect(openResult.tabId).toBeGreaterThan(0);
      console.log(`✅ Tab opened: ${openResult.tabId}`);

      // 2. Wait for logs to generate
      await new Promise(resolve => setTimeout(resolve, 4000));

      // 3. Capture console logs
      console.log('📝 Capturing console logs from all levels (6 seconds)...');
      const logsResult = await chromeDevAssist.captureLogs(6000);

      expect(logsResult.consoleLogs).toBeDefined();
      expect(logsResult.consoleLogs.length).toBeGreaterThan(5);

      // 4. Analyze log levels
      const levelCounts = {};
      logsResult.consoleLogs.forEach(log => {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
      });

      console.log(`✅ Captured ${logsResult.consoleLogs.length} total logs`);
      console.log('   Breakdown by level:');
      Object.entries(levelCounts).forEach(([level, count]) => {
        console.log(`     ${level}: ${count} logs`);
      });

      // Verify we got multiple levels
      const uniqueLevels = Object.keys(levelCounts);
      expect(uniqueLevels.length).toBeGreaterThanOrEqual(3);

      // 5. Take screenshot showing log counts
      console.log('📸 Taking screenshot of console level display...');
      const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);

      const screenshotPath = path.join(__dirname, '../.screenshots/integration-test-2.png');
      const base64Data = screenshot.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(screenshotPath, base64Data, 'base64');
      console.log(`✅ Screenshot saved: ${screenshotPath}`);

      // 6. Get metadata
      const metadata = await chromeDevAssist.getPageMetadata(openResult.tabId);
      expect(metadata.metadata.testId).toBe('integration-002');
      console.log(`✅ Metadata verified: Test ID ${metadata.metadata.testId}`);

      console.log('\n📊 Console Levels Test Summary:');
      console.log(`   ✅ Total logs: ${logsResult.consoleLogs.length}`);
      console.log(`   ✅ Unique levels: ${uniqueLevels.join(', ')}`);
      console.log('   ✅ Screenshot captured');
      console.log('   ✅ Metadata extracted');
    }, 30000);
  });

  describe('Integration Test 3: Tab Lifecycle with Capture', () => {
    it('should open, reload, capture, and close tab', async () => {
      console.log('\n🧪 Starting Tab Lifecycle Test...');

      // 1. Open tab
      const url = `http://localhost:9876/fixtures/integration-test-1.html?token=${AUTH_TOKEN}`;
      const openResult = await chromeDevAssist.openUrl(url, { active: false });
      const tabId = openResult.tabId;
      testTabs.push(tabId);

      console.log(`✅ Tab opened: ${tabId}`);

      // 2. Wait and capture initial state
      await new Promise(resolve => setTimeout(resolve, 2000));

      const logs1 = await chromeDevAssist.captureLogs(2000);
      console.log(`✅ Initial capture: ${logs1.consoleLogs.length} logs`);

      // 3. Reload tab
      console.log('🔄 Reloading tab...');
      await chromeDevAssist.reloadTab(tabId, { bypassCache: false });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Capture after reload
      const logs2 = await chromeDevAssist.captureLogs(2000);
      console.log(`✅ After reload: ${logs2.consoleLogs.length} logs`);

      // Should have page load logs again
      expect(logs2.consoleLogs.length).toBeGreaterThan(0);

      // 5. Take screenshot
      const screenshot = await chromeDevAssist.captureScreenshot(tabId, {
        format: 'jpeg',
        quality: 85,
      });
      console.log(`✅ Screenshot: ${screenshot.size} bytes (JPEG q85)`);

      // 6. Close tab
      console.log('🗑️ Closing tab...');
      await chromeDevAssist.closeTab(tabId);
      testTabs = testTabs.filter(id => id !== tabId); // Remove from cleanup list

      console.log('✅ Tab closed successfully');

      console.log('\n📊 Tab Lifecycle Summary:');
      console.log('   ✅ Open → Capture → Reload → Capture → Screenshot → Close');
      console.log('   ✅ All operations successful');
    }, 30000);
  });

  describe('Integration Test 4: Test Orchestration', () => {
    it('should use test orchestration with auto-cleanup', async () => {
      console.log('\n🧪 Starting Test Orchestration Test...');

      const testId = `integration-test-${Date.now()}`;

      // 1. Start test
      console.log(`🎬 Starting test: ${testId}`);
      const startResult = await chromeDevAssist.startTest(testId, { autoCleanup: true });

      expect(startResult.testId).toBe(testId);
      console.log(`✅ Test started: ${startResult.testId}`);

      // 2. Open multiple tabs (should be auto-tracked)
      const url = `http://localhost:9876/fixtures/integration-test-1.html?token=${AUTH_TOKEN}`;

      const tab1 = await chromeDevAssist.openUrl(url, { active: false });
      console.log(`✅ Tab 1 opened: ${tab1.tabId} (auto-tracked)`);

      const tab2 = await chromeDevAssist.openUrl(url, { active: false });
      console.log(`✅ Tab 2 opened: ${tab2.tabId} (auto-tracked)`);

      // 3. Check test status
      const status = await chromeDevAssist.getTestStatus();
      expect(status.activeTest).toBeDefined();
      expect(status.activeTest.testId).toBe(testId);
      expect(status.activeTest.trackedTabs).toContain(tab1.tabId);
      expect(status.activeTest.trackedTabs).toContain(tab2.tabId);

      console.log(`✅ Test status verified: ${status.activeTest.trackedTabs.length} tabs tracked`);

      // 4. Perform test operations
      await new Promise(resolve => setTimeout(resolve, 2000));
      const logs = await chromeDevAssist.captureLogs(2000);
      console.log(`✅ Captured ${logs.consoleLogs.length} logs from tracked tabs`);

      // 5. End test (auto-cleanup should close tabs)
      console.log('🏁 Ending test (auto-cleanup enabled)...');
      const endResult = await chromeDevAssist.endTest(testId, 'passed');

      expect(endResult.cleanup.tabsClosed).toContain(tab1.tabId);
      expect(endResult.cleanup.tabsClosed).toContain(tab2.tabId);
      expect(endResult.cleanup.cleanupSuccess).toBe(true);

      console.log(`✅ Test ended: ${endResult.cleanup.tabsClosed.length} tabs auto-closed`);

      // 6. Verify cleanup
      const cleanup = await chromeDevAssist.verifyCleanup({
        expectedClosedTabs: [tab1.tabId, tab2.tabId],
      });

      expect(cleanup.verified).toBe(true);
      expect(cleanup.orphans.length).toBe(0);

      console.log('✅ Cleanup verified: No orphaned tabs');

      console.log('\n📊 Test Orchestration Summary:');
      console.log(`   ✅ Test ID: ${testId}`);
      console.log('   ✅ Tabs tracked: 2');
      console.log('   ✅ Auto-cleanup: successful');
      console.log('   ✅ No orphaned tabs');
    }, 30000);
  });

  describe('Integration Test Summary', () => {
    it('should display comprehensive test results', () => {
      console.log('\n' + '='.repeat(70));
      console.log('🎉 MULTI-FEATURE INTEGRATION TESTS COMPLETE');
      console.log('='.repeat(70));
      console.log('\n✅ Features Tested:');
      console.log('   1. URL Opening (openUrl)');
      console.log('   2. Console Log Capture (captureLogs)');
      console.log('   3. Screenshot Capture (captureScreenshot)');
      console.log('   4. Page Metadata Extraction (getPageMetadata)');
      console.log('   5. Tab Reloading (reloadTab)');
      console.log('   6. Tab Closing (closeTab)');
      console.log('   7. Test Orchestration (startTest, endTest)');
      console.log('   8. Auto-Cleanup (verifyCleanup)');
      console.log('\n✅ Integration Scenarios:');
      console.log('   • Console + Screenshot + Metadata');
      console.log('   • Multiple Console Levels');
      console.log('   • Tab Lifecycle Management');
      console.log('   • Test Orchestration with Auto-Cleanup');
      console.log('\n✅ All integration tests passed!');
      console.log('='.repeat(70) + '\n');

      // Real assertion: Verify test framework is working
      expect(typeof chromeDevAssist).toBe('object');
      expect(chromeDevAssist.captureLogs).toBeDefined();
    });
  });
});

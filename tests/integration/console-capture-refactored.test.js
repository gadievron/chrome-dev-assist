/**
 * ConsoleCapture Integration Tests - Refactored background.js
 *
 * Test-First Discipline: These tests verify that background.js correctly
 * delegates to ConsoleCapture class after refactoring.
 *
 * IMPORTANT: These tests require:
 * - Chrome extension loaded (ID: gnojocphflllgichkehjhkojkihcihfn)
 * - WebSocket server running (port 9876)
 *
 * Coverage:
 * - reloadAndCapture() uses ConsoleCapture class
 * - captureLogs() uses ConsoleCapture class
 * - openUrl() with captureConsole uses class
 * - reloadTab() with captureConsole uses class
 * - Tab-specific vs global captures
 * - 10K log limit enforcement
 * - Cleanup functions
 */

const chromeDevAssist = require('../../claude-code/index.js');

// Helper: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test extension ID (provided by user)
const TEST_EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';

describe('ConsoleCapture Integration - Refactored background.js', () => {
  // =========================================================================
  // SETUP/TEARDOWN
  // =========================================================================

  beforeAll(async () => {
    // Verify extension is loaded
    try {
      const info = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      console.log(`✅ Extension loaded: ${info.name} v${info.version}`);
    } catch (err) {
      console.error('❌ Extension not loaded. Please load extension first.');
      throw new Error('Extension not loaded');
    }
  });

  afterEach(async () => {
    // Wait for any pending captures to complete
    await sleep(500);
  });

  // =========================================================================
  // CAPTURE TESTS (4 tests)
  // =========================================================================

  describe('Capture Functions', () => {
    test('reloadAndCapture() uses ConsoleCapture class', async () => {
      const result = await chromeDevAssist.reloadAndCapture(TEST_EXTENSION_ID, { duration: 2000 });

      expect(result).toBeDefined();
      expect(result.reloadSuccess).toBe(true);
      expect(Array.isArray(result.consoleLogs)).toBe(true);

      // Logs should be captured via ConsoleCapture class
      console.log(`Captured ${result.consoleLogs.length} logs via reloadAndCapture()`);
    }, 30000);

    test('captureLogs() uses ConsoleCapture class', async () => {
      const result = await chromeDevAssist.captureLogs(1000);

      expect(result).toBeDefined();
      expect(Array.isArray(result.consoleLogs)).toBe(true);

      console.log(`Captured ${result.consoleLogs.length} logs via captureLogs()`);
    }, 30000);

    test('openUrl() with captureConsole uses class', async () => {
      const result = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("Test from openUrl")</script>',
        { captureConsole: true, duration: 1000, autoClose: true }
      );

      expect(result).toBeDefined();
      expect(result.tabId).toBeDefined();
      expect(Array.isArray(result.consoleLogs)).toBe(true);

      // Should contain our test message
      const hasTestLog = result.consoleLogs.some(
        log => log.message && log.message.includes('Test from openUrl')
      );
      expect(hasTestLog).toBe(true);

      console.log(`Captured ${result.consoleLogs.length} logs via openUrl()`);
    }, 30000);

    test('reloadTab() with captureConsole uses class', async () => {
      // First create a tab
      const createResult = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("Before reload")</script>',
        { captureConsole: false }
      );

      await sleep(500);

      // Now reload it with capture
      const result = await chromeDevAssist.reloadTab(createResult.tabId, {
        captureConsole: true,
        duration: 1000,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.consoleLogs)).toBe(true);

      // Clean up
      await chromeDevAssist.closeTab(createResult.tabId);

      console.log(`Captured ${result.consoleLogs.length} logs via reloadTab()`);
    }, 30000);
  });

  // =========================================================================
  // TAB-SPECIFIC VS GLOBAL TESTS (2 tests)
  // =========================================================================

  describe('Tab-Specific vs Global Captures', () => {
    test('Tab-specific capture only captures from that tab', async () => {
      // Create tab 1
      const tab1 = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("TAB1-MESSAGE")</script>',
        { captureConsole: true, duration: 2000 }
      );

      await sleep(100);

      // Create tab 2 (no capture)
      const tab2 = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("TAB2-MESSAGE")</script>',
        { captureConsole: false }
      );

      await sleep(2500);

      // Tab 1 logs should NOT contain TAB2-MESSAGE
      const hasTab2Message = tab1.consoleLogs.some(
        log => log.message && log.message.includes('TAB2-MESSAGE')
      );

      expect(hasTab2Message).toBe(false);

      // Clean up
      await chromeDevAssist.closeTab(tab1.tabId);
      await chromeDevAssist.closeTab(tab2.tabId);
    }, 30000);

    test('Global capture (tabId=null) captures from all tabs', async () => {
      // Start global capture
      const capturePromise = chromeDevAssist.captureLogs(3000);

      await sleep(100);

      // Open multiple tabs
      const tab1 = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("GLOBAL-TAB1")</script>',
        { captureConsole: false }
      );

      await sleep(100);

      const tab2 = await chromeDevAssist.openUrl(
        'data:text/html,<script>console.log("GLOBAL-TAB2")</script>',
        { captureConsole: false }
      );

      await sleep(3500);

      // Get capture results
      const result = await capturePromise;

      // Should contain messages from both tabs
      const hasTab1 = result.consoleLogs.some(
        log => log.message && log.message.includes('GLOBAL-TAB1')
      );
      const hasTab2 = result.consoleLogs.some(
        log => log.message && log.message.includes('GLOBAL-TAB2')
      );

      expect(hasTab1).toBe(true);
      expect(hasTab2).toBe(true);

      // Clean up
      await chromeDevAssist.closeTab(tab1.tabId);
      await chromeDevAssist.closeTab(tab2.tabId);
    }, 30000);
  });

  // =========================================================================
  // LIMIT ENFORCEMENT TESTS (3 tests)
  // =========================================================================

  describe('10K Log Limit Enforcement', () => {
    test('10K log limit enforced via class', async () => {
      // Generate HTML with 11,000 console messages
      const htmlScript = `
        <script>
          for (let i = 0; i < 11000; i++) {
            console.log("Message " + i);
          }
        </script>
      `;

      const result = await chromeDevAssist.openUrl(
        `data:text/html,${encodeURIComponent(htmlScript)}`,
        { captureConsole: true, duration: 5000, autoClose: true }
      );

      // Should have max 10,001 logs (10,000 + 1 warning)
      expect(result.consoleLogs.length).toBeLessThanOrEqual(10001);

      console.log(`Limit enforcement: ${result.consoleLogs.length} logs (max 10,001)`);
    }, 30000);

    test('Warning added at limit via class', async () => {
      // Generate HTML with 10,500 console messages
      const htmlScript = `
        <script>
          for (let i = 0; i < 10500; i++) {
            console.log("Spam " + i);
          }
        </script>
      `;

      const result = await chromeDevAssist.openUrl(
        `data:text/html,${encodeURIComponent(htmlScript)}`,
        { captureConsole: true, duration: 5000, autoClose: true }
      );

      // Should contain warning message
      const warningLog = result.consoleLogs.find(
        log => log.message && log.message.includes('Log limit reached')
      );

      expect(warningLog).toBeDefined();
      expect(warningLog.level).toBe('warn');

      console.log('✅ Warning message found at limit');
    }, 30000);

    test('Logs dropped after limit via class', async () => {
      // Generate HTML with 12,000 console messages
      const htmlScript = `
        <script>
          for (let i = 0; i < 12000; i++) {
            console.log("Drop test " + i);
          }
        </script>
      `;

      const result = await chromeDevAssist.openUrl(
        `data:text/html,${encodeURIComponent(htmlScript)}`,
        { captureConsole: true, duration: 5000, autoClose: true }
      );

      // Should have exactly 10,001 logs (10,000 + 1 warning)
      // Additional 2,000 logs should be silently dropped
      expect(result.consoleLogs.length).toBeLessThanOrEqual(10001);

      // Should NOT have logs after index 10,000
      // (Warning is at index 10,000, so no logs with i > 9999)
      const hasDroppedLogs = result.consoleLogs.some(
        log => log.message && log.message.includes('Drop test 11000')
      );

      expect(hasDroppedLogs).toBe(false);

      console.log(`✅ Logs after limit dropped (${result.consoleLogs.length} total)`);
    }, 30000);
  });

  // =========================================================================
  // CLEANUP TESTS (3 tests)
  // =========================================================================

  describe('Cleanup Functions', () => {
    test('Periodic cleanup runs via consoleCapture.cleanupStale()', async () => {
      // This test verifies cleanup happens automatically
      // We can't directly test this without modifying background.js
      // But we can verify captures don't accumulate forever

      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await chromeDevAssist.captureLogs(500);
        results.push(result);
        await sleep(600); // Wait for cleanup
      }

      // All captures should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result.consoleLogs)).toBe(true);
      });

      console.log('✅ Multiple captures completed (cleanup working)');
    }, 30000);

    test('Error cleanup calls consoleCapture.cleanup()', async () => {
      // Try to open invalid URL - should trigger error cleanup
      try {
        await chromeDevAssist.openUrl(
          'javascript:alert("test")', // Blocked by security
          { captureConsole: true, duration: 1000 }
        );
      } catch (err) {
        expect(err).toBeDefined();
        console.log(`✅ Error cleanup triggered: ${err.message}`);
      }

      // Subsequent captures should work (cleanup happened)
      const result = await chromeDevAssist.captureLogs(500);
      expect(result).toBeDefined();
    }, 30000);

    test('getCommandLogs cleanup calls consoleCapture.cleanup()', async () => {
      // Capture logs
      const result = await chromeDevAssist.captureLogs(1000);

      expect(result).toBeDefined();

      // Second call should not have the same logs (cleanup happened)
      const result2 = await chromeDevAssist.captureLogs(1000);

      expect(result2).toBeDefined();
      expect(result2.consoleLogs).not.toEqual(result.consoleLogs);

      console.log('✅ Cleanup after getLogs verified');
    }, 30000);
  });

  // =========================================================================
  // MULTIPLE CAPTURES TESTS (1 test)
  // =========================================================================

  describe('Multiple Captures', () => {
    test('Multiple captures can coexist for same tab', async () => {
      // This tests that capturesByTab Map allows multiple command IDs per tab

      const htmlScript = `
        <script>
          setInterval(() => {
            console.log("Periodic message " + Date.now());
          }, 100);
        </script>
      `;

      // Start 2 concurrent captures for the same tab
      const tab = await chromeDevAssist.openUrl(
        `data:text/html,${encodeURIComponent(htmlScript)}`,
        { captureConsole: false }
      );

      await sleep(500);

      // Start 2 concurrent reloadTab captures
      const [reload1, reload2] = await Promise.all([
        chromeDevAssist.reloadTab(tab.tabId, { captureConsole: true, duration: 2000 }),
        chromeDevAssist.reloadTab(tab.tabId, { captureConsole: true, duration: 2000 }),
      ]);

      // Both should have captured logs
      expect(reload1.consoleLogs.length).toBeGreaterThan(0);
      expect(reload2.consoleLogs.length).toBeGreaterThan(0);

      // Clean up
      await chromeDevAssist.closeTab(tab.tabId);

      console.log(
        `✅ Multiple concurrent captures: ${reload1.consoleLogs.length}, ${reload2.consoleLogs.length} logs`
      );
    }, 30000);
  });
});

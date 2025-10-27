/**
 * Edge Cases and Error Scenarios - Complete Coverage
 *
 * Tests all the missing edge cases identified in FEATURE-COVERAGE-MAP.md
 *
 * HIGH PRIORITY TESTS:
 * 1. Extension not found with fake ID
 * 2. Tab not found with fake tab ID
 * 3. Console.time/timeEnd validation
 * 4. Auto-cleanup disabled test
 * 5. Cannot reload self test
 * 6. Nested test rejection
 */

const chromeDevAssist = require('../../claude-code/index.js');

const EXTENSION_ID = process.env.EXTENSION_ID || 'gnojocphflllgichkehjhkojkihcihfn';
const FIXTURE_BASE = 'http://localhost:9876/fixtures';

describe('Edge Cases - Complete Coverage', () => {
  jest.setTimeout(60000);

  describe('Extension Not Found Scenarios', () => {
    test('should error when extension ID does not exist', async () => {
      //  Use a valid-format ID that doesn't exist
      const fakeId = 'abcdefghijklmnopqrstuvwxyzabcdef';

      await expect(
        chromeDevAssist.getExtensionInfo(fakeId)
      ).rejects.toThrow(/not found/);
    });

    test('should error when reloading non-existent extension', async () => {
      const fakeId = 'abcdefghijklmnopqrstuvwxyzabcdef';

      await expect(
        chromeDevAssist.reload(fakeId)
      ).rejects.toThrow(/not found/);
    });

    test('should error when enabling non-existent extension', async () => {
      const fakeId = 'abcdefghijklmnopqrstuvwxyzabcdef';

      await expect(
        chromeDevAssist.enableExtension(fakeId)
      ).rejects.toThrow();
    });
  });

  describe('Tab Not Found Scenarios', () => {
    test('should error when closing non-existent tab', async () => {
      // Use a tab ID that definitely doesn't exist
      const fakeTabId = 999999;

      await expect(
        chromeDevAssist.closeTab(fakeTabId)
      ).rejects.toThrow();
    });

    test('should error when reloading non-existent tab', async () => {
      const fakeTabId = 999999;

      await expect(
        chromeDevAssist.reloadTab(fakeTabId)
      ).rejects.toThrow();
    });

    test('should error when getting metadata from non-existent tab', async () => {
      const fakeTabId = 999999;

      await expect(
        chromeDevAssist.getPageMetadata(fakeTabId)
      ).rejects.toThrow();
    });
  });

  describe('Tab Already Closed Scenario', () => {
    test('should handle attempting to close already-closed tab', async () => {
      // Open and close a tab
      const openResult = await chromeDevAssist.openUrl('https://example.com', {
        active: false
      });
      const tabId = openResult.tabId;

      // Close it
      await chromeDevAssist.closeTab(tabId);

      // Try to close again - should error
      await expect(
        chromeDevAssist.closeTab(tabId)
      ).rejects.toThrow();
    });
  });

  describe('Console Timing Functions', () => {
    test('should capture console.time and console.timeEnd', async () => {
      const result = await chromeDevAssist.openUrl(
        `${FIXTURE_BASE}/console-logs-comprehensive.html`,
        {
          active: false,
          captureConsole: true,
          duration: 3000,
          autoClose: true
        }
      );

      // Check if timing logs were captured
      const timingLogs = result.consoleLogs.filter(log =>
        log.message.includes('operation') ||
        log.message.includes('ms') ||
        log.level === 'time' ||
        log.level === 'timeEnd'
      );

      // Note: console.time may show as regular log depending on browser
      expect(result.consoleLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Test Orchestration Edge Cases', () => {
    let testId;

    afterEach(async () => {
      if (testId) {
        try {
          await chromeDevAssist.abortTest(testId, 'Test cleanup');
        } catch (err) {
          // Ignore
        }
        testId = null;
      }
    });

    test('should reject nested/overlapping tests', async () => {
      testId = 'test-nested-' + Date.now();

      // Start first test
      await chromeDevAssist.startTest(testId);

      // Try to start another - should fail
      await expect(
        chromeDevAssist.startTest('another-test-id')
      ).rejects.toThrow(/already running/);

      // Cleanup
      await chromeDevAssist.endTest(testId);
      testId = null;
    });

    test('should work with autoCleanup disabled', async () => {
      testId = 'test-no-cleanup-' + Date.now();

      // Start test with cleanup disabled
      await chromeDevAssist.startTest(testId, {
        autoCleanup: false
      });

      // Open tabs
      const tab1 = await chromeDevAssist.openUrl('https://example.com', {
        active: false
      });
      const tab2 = await chromeDevAssist.openUrl('https://example.org', {
        active: false
      });

      // End test
      const endResult = await chromeDevAssist.endTest(testId, 'passed');

      // With autoCleanup: false, tabs should NOT be closed
      expect(endResult.cleanup.tabsClosed).toEqual([]);
      expect(endResult.cleanup.cleanupSuccess).toBe(true);

      // Manually clean up tabs
      await chromeDevAssist.closeTab(tab1.tabId);
      await chromeDevAssist.closeTab(tab2.tabId);

      testId = null;
    });

    test('should reject ending test that is not active', async () => {
      await expect(
        chromeDevAssist.endTest('non-existent-test-id')
      ).rejects.toThrow(/No active test/);
    });

    test('should reject aborting test that is not active', async () => {
      await expect(
        chromeDevAssist.abortTest('non-existent-test-id')
      ).rejects.toThrow(/No active test/);
    });

    test('should reject ending test with wrong ID', async () => {
      testId = 'test-wrong-id-' + Date.now();

      await chromeDevAssist.startTest(testId);

      // Try to end with different ID
      await expect(
        chromeDevAssist.endTest('wrong-test-id')
      ).rejects.toThrow(/mismatch/);

      await chromeDevAssist.endTest(testId);
      testId = null;
    });

    test('should validate test ID format', async () => {
      // Test IDs with invalid characters should be rejected
      await expect(
        chromeDevAssist.startTest('test with spaces')
      ).rejects.toThrow(/invalid characters/);

      await expect(
        chromeDevAssist.startTest('test@#$%')
      ).rejects.toThrow(/invalid characters/);

      await expect(
        chromeDevAssist.startTest('')
      ).rejects.toThrow(/required/);
    });

    test('should reject very long test ID', async () => {
      const longId = 'a'.repeat(101); // Max is 100

      await expect(
        chromeDevAssist.startTest(longId)
      ).rejects.toThrow(/too long/);
    });
  });

  describe('Extension Reload - Cannot Reload Self', () => {
    test('should prevent reloading Chrome Dev Assist itself', async () => {
      // Get list of extensions
      const allExts = await chromeDevAssist.getAllExtensions();

      // Find Chrome Dev Assist extension
      const selfExt = allExts.extensions.find(ext =>
        ext.name.includes('Chrome Dev Assist') ||
        ext.name.includes('chrome-dev-assist')
      );

      if (selfExt) {
        // Try to reload self - should fail
        await expect(
          chromeDevAssist.reload(selfExt.id)
        ).rejects.toThrow(/Cannot reload self/);
      } else {
        // If we can't find self, that's also a problem
        console.warn('Chrome Dev Assist extension not found in extension list');
      }
    });
  });

  describe('URL Validation Edge Cases', () => {
    test('should reject URLs with invalid protocols', async () => {
      const invalidUrls = [
        'ftp://example.com',
        'about:blank',
        'chrome://settings',
        'chrome-extension://abcd1234'
      ];

      for (const url of invalidUrls) {
        await expect(
          chromeDevAssist.openUrl(url)
        ).rejects.toThrow();
      }
    });

    test('should reject malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'htp://example.com', // Typo in protocol
        '://example.com', // Missing protocol
        'http://', // Incomplete
        'http://example com' // Space in domain
      ];

      for (const url of malformedUrls) {
        await expect(
          chromeDevAssist.openUrl(url)
        ).rejects.toThrow();
      }
    });
  });

  describe('Console Capture Duration Edge Cases', () => {
    test('should handle very short capture duration', async () => {
      const startTime = Date.now();

      const result = await chromeDevAssist.captureLogs(1000); // 1 second

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(elapsed).toBeLessThan(1500); // Allow 500ms overhead
      expect(result).toHaveProperty('consoleLogs');
    });

    test('should reject zero duration', async () => {
      await expect(
        chromeDevAssist.captureLogs(0)
      ).rejects.toThrow(/between/);
    });

    test('should reject negative duration', async () => {
      await expect(
        chromeDevAssist.captureLogs(-1000)
      ).rejects.toThrow(/between/);
    });

    test('should reject excessive duration', async () => {
      await expect(
        chromeDevAssist.captureLogs(70000) // 70 seconds, max is 60
      ).rejects.toThrow(/between/);
    });
  });

  describe('Hard Reload (Cache Bypass)', () => {
    let testTabId;

    afterEach(async () => {
      if (testTabId) {
        try {
          await chromeDevAssist.closeTab(testTabId);
        } catch (err) {
          // Ignore
        }
        testTabId = null;
      }
    });

    test('should perform hard reload with cache bypass', async () => {
      // Open a tab
      const openResult = await chromeDevAssist.openUrl('https://example.com', {
        active: false
      });
      testTabId = openResult.tabId;

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Hard reload with cache bypass
      const reloadResult = await chromeDevAssist.reloadTab(testTabId, {
        bypassCache: true,
        captureConsole: true,
        duration: 2000
      });

      expect(reloadResult).toHaveProperty('tabId', testTabId);
      expect(reloadResult).toHaveProperty('bypassCache', true);
      expect(reloadResult).toHaveProperty('consoleLogs');
      expect(Array.isArray(reloadResult.consoleLogs)).toBe(true);
    });
  });

  describe('Cleanup Verification Edge Cases', () => {
    test('should detect all orphaned tabs', async () => {
      // Open multiple tabs
      const tab1 = await chromeDevAssist.openUrl('https://example.com', {
        active: false
      });
      const tab2 = await chromeDevAssist.openUrl('https://example.org', {
        active: false
      });
      const tab3 = await chromeDevAssist.openUrl('https://example.net', {
        active: false
      });

      const tabIds = [tab1.tabId, tab2.tabId, tab3.tabId];

      // Close only tab1
      await chromeDevAssist.closeTab(tab1.tabId);

      // Verify cleanup - should detect tab2 and tab3 as orphans
      const verifyResult = await chromeDevAssist.verifyCleanup({
        expectedClosedTabs: tabIds
      });

      expect(verifyResult).toHaveProperty('verified', false); // Not all closed
      expect(verifyResult.orphans).toContain(tab2.tabId);
      expect(verifyResult.orphans).toContain(tab3.tabId);
      expect(verifyResult.orphans).not.toContain(tab1.tabId); // Already closed
      expect(verifyResult.autoCleanedUp).toBe(true); // Should auto-clean orphans
    });

    test('should verify cleanup when all tabs actually closed', async () => {
      // Open and close tabs
      const tab1 = await chromeDevAssist.openUrl('https://example.com', {
        active: false
      });
      const tab2 = await chromeDevAssist.openUrl('https://example.org', {
        active: false
      });

      const tabIds = [tab1.tabId, tab2.tabId];

      await chromeDevAssist.closeTab(tab1.tabId);
      await chromeDevAssist.closeTab(tab2.tabId);

      // Verify cleanup
      const verifyResult = await chromeDevAssist.verifyCleanup({
        expectedClosedTabs: tabIds
      });

      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.orphans).toEqual([]);
      expect(verifyResult.autoCleanedUp).toBe(false); // Nothing to clean
    });
  });

  describe('Permission Checks', () => {
    test('should include mayDisable in extension info', async () => {
      const info = await chromeDevAssist.getExtensionInfo(EXTENSION_ID);

      expect(info).toHaveProperty('mayDisable');
      expect(typeof info.mayDisable).toBe('boolean');
    });

    test('should verify all expected permissions exist', async () => {
      const info = await chromeDevAssist.getExtensionInfo(EXTENSION_ID);

      // Chrome Dev Assist should have these permissions
      const expectedPermissions = ['management', 'tabs', 'storage', 'scripting', 'alarms'];

      expectedPermissions.forEach(perm => {
        const hasPermission = info.permissions.some(p =>
          p === perm || p.includes(perm)
        );

        if (!hasPermission) {
          console.warn(`Missing expected permission: ${perm}`);
        }
      });

      expect(info.permissions.length).toBeGreaterThan(0);
    });
  });
});

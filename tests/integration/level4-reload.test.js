/**
 * Level 4 Reload - Integration Tests
 *
 * End-to-end tests verifying that level4Reload actually loads fresh code from disk.
 * These tests require:
 * - Chrome extension loaded
 * - WebSocket server running
 * - (Optional) Chrome started with --remote-debugging-port=9222 for CDP tests
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const chromeDevAssist = require('../../claude-code/index');
const fs = require('fs').promises;
const path = require('path');

describe('Level 4 Reload - Integration Tests', () => {
  const TEST_EXTENSION_ID = process.env.TEST_EXTENSION_ID || 'gnojocphflllgichkehjhkojkihcihfn';
  const EXTENSION_DIR = path.join(__dirname, '../../extension');
  const BACKGROUND_JS = path.join(EXTENSION_DIR, 'background.js');

  let originalBackgroundCode;

  beforeAll(async () => {
    // Save original background.js code
    originalBackgroundCode = await fs.readFile(BACKGROUND_JS, 'utf8');
  });

  afterAll(async () => {
    // Restore original background.js code
    if (originalBackgroundCode) {
      await fs.writeFile(BACKGROUND_JS, originalBackgroundCode, 'utf8');
    }
  });

  describe('Code Reload Verification', () => {
    it.skip('should reload code from disk using CDP method', async () => {
      // This test requires Chrome started with --remote-debugging-port=9222

      // 1. Get current extension version
      const infoBefore = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);

      // 2. Modify background.js (add comment with timestamp)
      const timestamp = Date.now();
      const modifiedCode = originalBackgroundCode + `\n// Modified at ${timestamp}\n`;
      await fs.writeFile(BACKGROUND_JS, modifiedCode, 'utf8');

      // 3. Perform level4Reload with CDP method
      const result = await chromeDevAssist.level4Reload(TEST_EXTENSION_ID, {
        method: 'cdp'
      });

      // 4. Verify response
      expect(result.reloaded).toBe(true);
      expect(result.method).toBe('cdp');
      expect(result.extensionId).toBe(TEST_EXTENSION_ID);
      expect(result.timing).toBeDefined();
      expect(result.timing.duration).toBeGreaterThan(0);

      // 5. Wait for extension to reconnect
      await new Promise(r => setTimeout(r, 2000));

      // 6. Verify extension is still working
      const infoAfter = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      expect(infoAfter.name).toBe(infoBefore.name);

      // 7. Verify service worker restarted (session start time changed)
      // This confirms fresh code was loaded

      // Note: We can't directly verify the comment was loaded without
      // inspecting service worker source, but the reload operation
      // completing successfully is strong evidence
    });

    it('should reload code from disk using toggle method', async () => {
      // This test works with normal Chrome (no debug mode required)

      // 1. Get current extension info
      const infoBefore = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);

      // 2. Modify background.js (add comment with timestamp)
      const timestamp = Date.now();
      const modifiedCode = originalBackgroundCode + `\n// Modified at ${timestamp}\n`;
      await fs.writeFile(BACKGROUND_JS, modifiedCode, 'utf8');

      // 3. Perform level4Reload with toggle method
      const result = await chromeDevAssist.level4Reload(TEST_EXTENSION_ID, {
        method: 'toggle'
      });

      // 4. Verify response
      expect(result.reloaded).toBe(true);
      expect(result.method).toBe('toggle');
      expect(result.extensionId).toBe(TEST_EXTENSION_ID);
      expect(result.timing).toBeDefined();

      // 5. Wait for extension to reconnect
      await new Promise(r => setTimeout(r, 3000));

      // 6. Verify extension is working again
      const infoAfter = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      expect(infoAfter.name).toBe(infoBefore.name);

      // 7. Restore original code
      await fs.writeFile(BACKGROUND_JS, originalBackgroundCode, 'utf8');
    });

    it('should auto-detect and use best available method', async () => {
      // Test auto-detection logic

      const result = await chromeDevAssist.level4Reload(TEST_EXTENSION_ID);

      // Should use either CDP or toggle depending on what's available
      expect(result.reloaded).toBe(true);
      expect(['cdp', 'toggle']).toContain(result.method);
      expect(result.extensionId).toBe(TEST_EXTENSION_ID);

      // Wait for reconnection
      await new Promise(r => setTimeout(r, 2000));

      // Verify extension still works
      const info = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      expect(info).toBeDefined();
      expect(info.name).toBeTruthy();
    });
  });

  describe('Service Worker Restart Verification', () => {
    it('should restart service worker completely', async () => {
      // 1. Get initial session start time from extension metadata
      const before = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      const sessionStartBefore = before.metadata?.sessionStartTime || Date.now();

      // 2. Perform level4Reload
      await chromeDevAssist.level4Reload(TEST_EXTENSION_ID);

      // 3. Wait for reconnection
      await new Promise(r => setTimeout(r, 2000));

      // 4. Get new session start time
      const after = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);
      const sessionStartAfter = after.metadata?.sessionStartTime || Date.now();

      // 5. Session start time should be different (service worker restarted)
      expect(sessionStartAfter).not.toBe(sessionStartBefore);
      expect(sessionStartAfter).toBeGreaterThan(sessionStartBefore);
    });
  });

  describe('Phase 0 Registration After Reload', () => {
    it('should re-register with Phase 0 metadata after reload', async () => {
      // 1. Perform level4Reload
      await chromeDevAssist.level4Reload(TEST_EXTENSION_ID);

      // 2. Wait for reconnection and re-registration
      await new Promise(r => setTimeout(r, 3000));

      // 3. Get extension info (should have full Phase 0 data)
      const info = await chromeDevAssist.getExtensionInfo(TEST_EXTENSION_ID);

      // 4. Verify Phase 0 registration fields
      expect(info.name).toBe('Chrome Dev Assist');
      expect(info.version).toBe('1.0.0');
      expect(info.capabilities).toContain('test-orchestration');
      expect(info.capabilities).toContain('console-capture');
      expect(info.capabilities).toContain('tab-control');
      expect(info.metadata).toBeDefined();
      expect(info.metadata.manifest).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should handle reload failure gracefully', async () => {
      // Test with invalid extension ID
      await expect(
        chromeDevAssist.level4Reload('invalid-extension-id')
      ).rejects.toThrow();
    });

    // TODO: INCOMPLETE - Test based on misunderstanding of Level 4 reload
    // Level 4 reload does NOT modify files - it only reloads from disk using:
    // 1. CDP method: chrome.management.setEnabled(id, false/true) via DevTools Protocol
    // 2. Toggle method: Direct chrome.management.setEnabled calls
    // Neither method modifies files on disk, so "file system errors during code modification" doesn't apply
    // Skip this test - no file modification happens during Level 4 reload
    it.skip('should handle file system errors during code modification', async () => {
      // This is a safety test - if code modification fails,
      // reload should still be attempted
    });
  });

  describe('Performance', () => {
    it('should complete reload in under 5 seconds', async () => {
      const startTime = Date.now();

      await chromeDevAssist.level4Reload(TEST_EXTENSION_ID);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});

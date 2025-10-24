/**
 * Tests for Claude Code API (Native Messaging version)
 * Tests the main user-facing API
 */

const chromeDevAssist = require('../../claude-code/index.js');

describe('Chrome Dev Assist API', () => {

  describe('reloadAndCapture()', () => {
    test('should return console logs after reload', async () => {
      // Mock: In real test, would use actual extension
      // For now, test that API is callable and returns expected structure

      const extensionId = 'a'.repeat(32);

      // This will fail until implemented, which is correct for test-first
      const result = await chromeDevAssist.reloadAndCapture(extensionId);

      expect(result).toBeDefined();
      expect(result.consoleLogs).toBeInstanceOf(Array);
      expect(result.reloadSuccess).toBe(true);
    }, 10000); // 10 second timeout

    test('should accept options for duration', async () => {
      const extensionId = 'b'.repeat(32);

      const result = await chromeDevAssist.reloadAndCapture(extensionId, {
        duration: 3000
      });

      expect(result).toBeDefined();
      expect(result.consoleLogs).toBeInstanceOf(Array);
    }, 10000);

    test('should throw error for invalid extension ID', async () => {
      await expect(
        chromeDevAssist.reloadAndCapture('invalid-id')
      ).rejects.toThrow();
    });
  });

  describe('reload()', () => {
    test('should reload extension without capturing logs', async () => {
      const extensionId = 'c'.repeat(32);

      const result = await chromeDevAssist.reload(extensionId);

      expect(result).toBeDefined();
      expect(result.reloadSuccess).toBe(true);
    }, 10000);
  });

  describe('captureLogs()', () => {
    test('should capture console logs for specified duration', async () => {
      const result = await chromeDevAssist.captureLogs(2000);

      expect(result).toBeDefined();
      expect(result.consoleLogs).toBeInstanceOf(Array);
    }, 10000);

    test('should default to 5000ms if no duration specified', async () => {
      const result = await chromeDevAssist.captureLogs();

      expect(result.consoleLogs).toBeInstanceOf(Array);
    }, 10000);
  });
});

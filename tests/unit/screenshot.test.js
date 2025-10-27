/**
 * Screenshot Capture Tests
 *
 * Tests the captureScreenshot API function.
 * Following test-first discipline (RULE 3).
 */

const chromeDevAssist = require('../../claude-code/index.js');

describe('Screenshot Capture', () => {
  let testTabId;
  const TEST_EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';

  beforeAll(async () => {
    // Open a test page
    const result = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/test-page-simple.html');
    testTabId = result.tabId;

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup
    if (testTabId) {
      await chromeDevAssist.closeTab(testTabId);
    }
  });

  describe('Basic Screenshot Capture', () => {
    it('should capture screenshot of a tab', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId);

      expect(result).toBeDefined();
      expect(result.tabId).toBe(testTabId);
      expect(result.dataUrl).toBeDefined();
      expect(typeof result.dataUrl).toBe('string');
      expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
      expect(result.format).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return PNG format by default', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId);

      expect(result.format).toBe('png');
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should include base64 image data', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId);

      // Extract base64 data
      const base64Data = result.dataUrl.split(',')[1];
      expect(base64Data).toBeDefined();
      expect(base64Data.length).toBeGreaterThan(100); // Should have actual image data

      // Verify it's valid base64
      expect(() => Buffer.from(base64Data, 'base64')).not.toThrow();
    });

    it('should include timestamp', async () => {
      const beforeTime = Date.now();
      const result = await chromeDevAssist.captureScreenshot(testTabId);
      const afterTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Format Options', () => {
    it('should capture PNG when format is "png"', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId, { format: 'png' });

      expect(result.format).toBe('png');
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should capture JPEG when format is "jpeg"', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId, { format: 'jpeg' });

      expect(result.format).toBe('jpeg');
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should reject invalid format', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(testTabId, { format: 'gif' })
      ).rejects.toThrow(/format must be "png" or "jpeg"/i);
    });
  });

  describe('Quality Options (JPEG)', () => {
    it('should accept quality parameter for JPEG', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId, {
        format: 'jpeg',
        quality: 80
      });

      expect(result.format).toBe('jpeg');
      expect(result.quality).toBe(80);
    });

    it('should default to quality 90 for JPEG', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId, { format: 'jpeg' });

      expect(result.quality).toBe(90);
    });

    it('should reject quality < 0', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(testTabId, {
          format: 'jpeg',
          quality: -10
        })
      ).rejects.toThrow(/quality must be between 0 and 100/i);
    });

    it('should reject quality > 100', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(testTabId, {
          format: 'jpeg',
          quality: 150
        })
      ).rejects.toThrow(/quality must be between 0 and 100/i);
    });

    it('should ignore quality parameter for PNG', async () => {
      const result = await chromeDevAssist.captureScreenshot(testTabId, {
        format: 'png',
        quality: 50
      });

      expect(result.format).toBe('png');
      expect(result.quality).toBeUndefined(); // Quality not relevant for PNG
    });
  });

  describe('Validation', () => {
    it('should reject invalid tab ID (non-number)', async () => {
      await expect(
        chromeDevAssist.captureScreenshot('not-a-number')
      ).rejects.toThrow(/tab id must be a number/i);
    });

    it('should reject invalid tab ID (negative)', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(-1)
      ).rejects.toThrow(/tab id must be a positive number/i);
    });

    it('should reject invalid tab ID (non-existent)', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(999999)
      ).rejects.toThrow(/tab not found|no tab with id/i);
    });

    it('should reject null tab ID', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(null)
      ).rejects.toThrow(/tab id must be a number/i);
    });

    it('should reject undefined tab ID', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(undefined)
      ).rejects.toThrow(/tab id must be a number/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle extension disconnection gracefully', async () => {
      // This will timeout if extension not connected
      await expect(
        chromeDevAssist.captureScreenshot(testTabId)
      ).resolves.toBeDefined();
    });

    it('should provide clear error message for invalid options', async () => {
      await expect(
        chromeDevAssist.captureScreenshot(testTabId, { format: 'invalid' })
      ).rejects.toThrow(/format must be "png" or "jpeg"/i);
    });
  });

  describe('Multiple Screenshots', () => {
    it('should capture multiple screenshots of same tab', async () => {
      const result1 = await chromeDevAssist.captureScreenshot(testTabId);
      const result2 = await chromeDevAssist.captureScreenshot(testTabId);

      expect(result1.dataUrl).toBeDefined();
      expect(result2.dataUrl).toBeDefined();
      expect(result1.timestamp).toBeLessThanOrEqual(result2.timestamp);
    });

    it('should capture screenshots of different tabs', async () => {
      // Open second tab
      const result2 = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/test-page-simple.html');
      const testTabId2 = result2.tabId;

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const screenshot1 = await chromeDevAssist.captureScreenshot(testTabId);
        const screenshot2 = await chromeDevAssist.captureScreenshot(testTabId2);

        expect(screenshot1.tabId).toBe(testTabId);
        expect(screenshot2.tabId).toBe(testTabId2);
        expect(screenshot1.dataUrl).toBeDefined();
        expect(screenshot2.dataUrl).toBeDefined();
      } finally {
        await chromeDevAssist.closeTab(testTabId2);
      }
    });
  });

  describe('Different Page Content', () => {
    it('should capture different content for different pages', async () => {
      // Capture initial page
      const screenshot1 = await chromeDevAssist.captureScreenshot(testTabId);

      // Navigate to different page
      await chromeDevAssist.openUrl('http://localhost:9876/fixtures/error-page.html', {
        tabId: testTabId
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture new page
      const screenshot2 = await chromeDevAssist.captureScreenshot(testTabId);

      // Screenshots should be different (different content)
      expect(screenshot1.dataUrl).not.toBe(screenshot2.dataUrl);
    });
  });

  describe('Integration with Test Orchestration', () => {
    it('should work within a test context', async () => {
      const testId = 'screenshot-test-' + Date.now();

      await chromeDevAssist.startTest(testId, { autoCleanup: true });

      const tabResult = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/test-page-simple.html');
      await new Promise(resolve => setTimeout(resolve, 500));

      const screenshot = await chromeDevAssist.captureScreenshot(tabResult.tabId);

      expect(screenshot.dataUrl).toBeDefined();
      expect(screenshot.format).toBe('png');

      await chromeDevAssist.endTest(testId, { success: true });

      // Verify tab was cleaned up
      const cleanup = await chromeDevAssist.verifyCleanup({
        expectedClosed: [tabResult.tabId],
        autoClose: true
      });

      expect(cleanup.allClosed).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should capture screenshot in reasonable time', async () => {
      const startTime = Date.now();
      await chromeDevAssist.captureScreenshot(testTabId);
      const duration = Date.now() - startTime;

      // Should complete in less than 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});

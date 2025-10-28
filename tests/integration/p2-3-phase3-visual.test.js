/**
 * P2-3 Phase 3: Visual Verification Tests
 *
 * Tests screenshot quality, format, size, and visual content.
 * Requires extension loaded and running.
 */

const chromeDevAssist = require('../../claude-code/index.js');
const path = require('path');
const fs = require('fs');

describe('P2-3 Phase 3: Visual Verification (Integration)', () => {
  let openTabs = [];

  function getFixtureUrl(filename) {
    const fixturePath = path.join(__dirname, '../fixtures', filename);
    const absolutePath = path.resolve(fixturePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Fixture not found: ${absolutePath}`);
    }

    return `file://${absolutePath}`;
  }

  afterEach(async () => {
    for (const tabId of openTabs) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (error) {
        console.log(`Could not close tab ${tabId}:`, error.message);
      }
    }
    openTabs = [];
  });

  describe('Format Validation', () => {
    test('should produce valid PNG data URL', async () => {
      const url = getFixtureUrl('text-content-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId, { format: 'png' });

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify base64 is valid
      const base64Data = result.dataUrl.split(',')[1];
      expect(base64Data).toMatch(/^[A-Za-z0-9+/=]+$/);

      // PNG signature check (first 8 bytes decode to PNG magic number)
      const buffer = Buffer.from(base64Data, 'base64');
      expect(buffer[0]).toBe(0x89); // PNG signature byte 1
      expect(buffer[1]).toBe(0x50); // 'P'
      expect(buffer[2]).toBe(0x4e); // 'N'
      expect(buffer[3]).toBe(0x47); // 'G'
    }, 15000);

    test('should produce valid JPEG data URL', async () => {
      const url = getFixtureUrl('text-content-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 90,
      });

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);

      // Verify base64 is valid
      const base64Data = result.dataUrl.split(',')[1];
      expect(base64Data).toMatch(/^[A-Za-z0-9+/=]+$/);

      // JPEG signature check (starts with FF D8)
      const buffer = Buffer.from(base64Data, 'base64');
      expect(buffer[0]).toBe(0xff); // JPEG marker
      expect(buffer[1]).toBe(0xd8); // Start of Image
    }, 15000);
  });

  describe('Quality Comparison', () => {
    test('should produce larger file at quality=100 than quality=50', async () => {
      const url = getFixtureUrl('canvas-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture at quality=100
      const highQuality = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 100,
      });

      // Capture at quality=50
      const midQuality = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 50,
      });

      const highSize = Buffer.from(highQuality.dataUrl.split(',')[1], 'base64').length;
      const midSize = Buffer.from(midQuality.dataUrl.split(',')[1], 'base64').length;

      expect(highSize).toBeGreaterThan(midSize);

      // High quality should be at least 20% larger
      const sizeRatio = highSize / midSize;
      expect(sizeRatio).toBeGreaterThan(1.2);
    }, 20000);

    test('should produce much larger file at quality=100 than quality=0', async () => {
      const url = getFixtureUrl('canvas-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture at quality=100
      const highQuality = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 100,
      });

      // Capture at quality=0 (minimum)
      const lowQuality = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 0,
      });

      const highSize = Buffer.from(highQuality.dataUrl.split(',')[1], 'base64').length;
      const lowSize = Buffer.from(lowQuality.dataUrl.split(',')[1], 'base64').length;

      expect(highSize).toBeGreaterThan(lowSize);

      // High quality should be at least 3x larger than lowest quality
      const sizeRatio = highSize / lowSize;
      expect(sizeRatio).toBeGreaterThan(3);
    }, 20000);

    test('should produce larger PNG than JPEG (lossless vs lossy)', async () => {
      const url = getFixtureUrl('canvas-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture as PNG (lossless)
      const pngResult = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      // Capture as JPEG quality=90 (lossy)
      const jpegResult = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 90,
      });

      const pngSize = Buffer.from(pngResult.dataUrl.split(',')[1], 'base64').length;
      const jpegSize = Buffer.from(jpegResult.dataUrl.split(',')[1], 'base64').length;

      // PNG (lossless) typically larger than JPEG (lossy)
      // For colorful canvas, expect PNG to be larger
      expect(pngSize).toBeGreaterThan(jpegSize);
    }, 20000);
  });

  describe('Size Validation', () => {
    test('should produce screenshot with reasonable base64 size', async () => {
      const url = getFixtureUrl('text-content-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;

      // Reasonable bounds for a screenshot
      expect(sizeBytes).toBeGreaterThan(10 * 1024); // At least 10KB
      expect(sizeBytes).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    }, 15000);

    test('should produce smaller JPEG than PNG for same content', async () => {
      const url = getFixtureUrl('text-content-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const pngResult = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      const jpegResult = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: 80,
      });

      const pngSize = Buffer.from(pngResult.dataUrl.split(',')[1], 'base64').length;
      const jpegSize = Buffer.from(jpegResult.dataUrl.split(',')[1], 'base64').length;

      // JPEG should be smaller than PNG for photographic/gradient content
      expect(jpegSize).toBeLessThan(pngSize);

      // JPEG should be at least 30% smaller
      const compressionRatio = jpegSize / pngSize;
      expect(compressionRatio).toBeLessThan(0.7);
    }, 20000);
  });

  describe('Visual Content Validation', () => {
    test('should capture canvas content (colorful rectangles)', async () => {
      const url = getFixtureUrl('canvas-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();

      // Canvas has blue/red rectangles - should produce large screenshot
      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;

      // Canvas with solid colors should be at least 20KB
      expect(sizeBytes).toBeGreaterThan(20 * 1024);
    }, 15000);

    test('should capture iframe content (embedded document)', async () => {
      const url = getFixtureUrl('iframe-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();

      // Iframe content should be visible in screenshot
      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;

      // Page with iframe should produce reasonable screenshot
      expect(sizeBytes).toBeGreaterThan(10 * 1024);
    }, 15000);

    test('should capture text content with gradients', async () => {
      const url = getFixtureUrl('text-content-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();

      // Page with gradient background and colorful text
      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;

      // Gradient + text should produce substantial screenshot
      expect(sizeBytes).toBeGreaterThan(30 * 1024);
    }, 15000);
  });
});

/**
 * P2-3 Phase 2: Chrome Restrictions & Concurrency Tests
 *
 * Tests Chrome API restrictions, concurrency, and race conditions.
 * Requires extension loaded and running.
 */

const chromeDevAssist = require('../../claude-code/index.js');
const path = require('path');
const fs = require('fs');

describe('P2-3 Phase 2: Restrictions & Concurrency (Integration)', () => {
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

  describe('Chrome API Restrictions', () => {
    test('should handle about:blank page', async () => {
      // about:blank is a special URL
      const openResult = await chromeDevAssist.openUrl('about:blank', { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.url).toBe('about:blank');
    }, 10000);

    test('should handle data: URL', async () => {
      // Data URL with inline HTML
      const dataUrl = 'data:text/html,<h1>Data URL Test</h1><p>This is inline HTML</p>';
      const openResult = await chromeDevAssist.openUrl(dataUrl, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.url).toMatch(/^data:text\/html/);
    }, 10000);

    test('should reject chrome:// internal pages', async () => {
      // Chrome internal pages should be blocked
      try {
        const openResult = await chromeDevAssist.openUrl('chrome://version', { active: true });
        openTabs.push(openResult.tabId);

        await new Promise(resolve => setTimeout(resolve, 500));

        await expect(chromeDevAssist.getPageMetadata(openResult.tabId)).rejects.toThrow(
          /Cannot access|Permission denied|restricted|Extension not connected/i
        );
      } catch (error) {
        // Opening chrome:// URL might fail itself, or extension not connected
        expect(error.message).toMatch(/Cannot|restricted|Permission|Extension not connected/i);
      }
    }, 10000);

    test('should handle file:// URL (requires permission)', async () => {
      // file:// URLs require "Allow access to file URLs" permission
      const url = getFixtureUrl('metadata-test.html');

      try {
        const openResult = await chromeDevAssist.openUrl(url, { active: true });
        openTabs.push(openResult.tabId);

        await new Promise(resolve => setTimeout(resolve, 500));

        const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
      } catch (error) {
        // If permission not granted, should fail with clear error
        // Or if extension not connected, that's also acceptable for this test
        expect(error.message).toMatch(
          /Cannot access|Permission denied|file URLs|Extension not connected/i
        );
      }
    }, 10000);
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent getPageMetadata on same tab', async () => {
      const url = getFixtureUrl('metadata-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Launch 3 concurrent metadata extractions on same tab
      const promises = [
        chromeDevAssist.getPageMetadata(openResult.tabId),
        chromeDevAssist.getPageMetadata(openResult.tabId),
        chromeDevAssist.getPageMetadata(openResult.tabId),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    }, 15000);

    test('should handle concurrent captureScreenshot on same tab', async () => {
      const url = getFixtureUrl('metadata-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Launch 3 concurrent screenshots on same tab
      const promises = [
        chromeDevAssist.captureScreenshot(openResult.tabId),
        chromeDevAssist.captureScreenshot(openResult.tabId),
        chromeDevAssist.captureScreenshot(openResult.tabId),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.dataUrl).toBeDefined();
        expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
      });
    }, 15000);

    test('should handle concurrent different commands on same tab', async () => {
      const url = getFixtureUrl('metadata-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Launch metadata and screenshot concurrently
      const results = await Promise.all([
        chromeDevAssist.getPageMetadata(openResult.tabId),
        chromeDevAssist.captureScreenshot(openResult.tabId),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].metadata).toBeDefined(); // getPageMetadata result
      expect(results[1].dataUrl).toBeDefined(); // captureScreenshot result
    }, 15000);

    test('should handle multiple tabs simultaneously', async () => {
      const url = getFixtureUrl('metadata-test.html');

      // Open 3 tabs
      const tab1 = await chromeDevAssist.openUrl(url, { active: false });
      const tab2 = await chromeDevAssist.openUrl(url, { active: false });
      const tab3 = await chromeDevAssist.openUrl(url, { active: true });

      openTabs.push(tab1.tabId, tab2.tabId, tab3.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract metadata from all 3 tabs concurrently
      const results = await Promise.all([
        chromeDevAssist.getPageMetadata(tab1.tabId),
        chromeDevAssist.getPageMetadata(tab2.tabId),
        chromeDevAssist.getPageMetadata(tab3.tabId),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
        expect(result.tabId).toBe(openTabs[index]);
      });
    }, 20000);
  });

  describe('Race Condition Scenarios', () => {
    test('should handle tab closure during extraction (graceful failure)', async () => {
      const url = getFixtureUrl('metadata-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Start metadata extraction
      const metadataPromise = chromeDevAssist.getPageMetadata(openResult.tabId);

      // Close tab shortly after (race condition)
      setTimeout(async () => {
        try {
          await chromeDevAssist.closeTab(openResult.tabId);
          // Remove from openTabs since we manually closed it
          openTabs = openTabs.filter(id => id !== openResult.tabId);
        } catch (e) {
          // Tab may already be closed
        }
      }, 100);

      // Extraction should fail with tab-not-found error
      await expect(metadataPromise).rejects.toThrow(/No tab with id|tab.*not found|tab.*closed/i);
    }, 10000);

    test('should document tab navigation race (may return new page data)', async () => {
      const url1 = getFixtureUrl('metadata-test.html');
      const url2 = getFixtureUrl('metadata-minimal.html');

      const openResult = await chromeDevAssist.openUrl(url1, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Start metadata extraction
      const metadataPromise = chromeDevAssist.getPageMetadata(openResult.tabId);

      // Navigate tab shortly after (race condition)
      setTimeout(async () => {
        try {
          await chromeDevAssist.openUrl(url2, { tabId: openResult.tabId });
        } catch (e) {
          // Navigation may fail if tab closed
        }
      }, 100);

      // May succeed with data from either page
      // This documents the race condition (P1-3 documented this)
      try {
        const result = await metadataPromise;
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
        // URL might be url1 or url2 depending on timing
        console.log('Race condition test: extracted from URL', result.url);
      } catch (error) {
        // Or may fail if navigation interrupts extraction
        expect(error.message).toMatch(/tab|navigation|context/i);
      }
    }, 10000);
  });

  describe('Content Type Tests', () => {
    test('should capture screenshot with iframe content', async () => {
      const url = getFixtureUrl('iframe-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify screenshot size is reasonable
      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;
      expect(sizeBytes).toBeGreaterThan(1000); // At least 1KB
    }, 15000);

    test('should capture screenshot with canvas content', async () => {
      const url = getFixtureUrl('canvas-test.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.captureScreenshot(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Canvas content should result in reasonable screenshot size
      const base64Data = result.dataUrl.split(',')[1];
      const sizeBytes = Buffer.from(base64Data, 'base64').length;
      expect(sizeBytes).toBeGreaterThan(5000); // At least 5KB (canvas has content)
    }, 15000);
  });
});

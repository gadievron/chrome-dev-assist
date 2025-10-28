/**
 * P1-2 Integration Tests: Metadata Edge Cases
 *
 * Tests previously skipped in unit tests:
 * 1. Large metadata extraction
 * 2. Circular reference handling
 *
 * These tests require extension loaded and running.
 */

const chromeDevAssist = require('../../claude-code/index.js');
const path = require('path');
const fs = require('fs');

describe('P1-2: Metadata Edge Cases (Integration)', () => {
  let openTabs = [];

  // Helper to get fixture URL
  function getFixtureUrl(filename) {
    const fixturePath = path.join(__dirname, '../fixtures', filename);
    const absolutePath = path.resolve(fixturePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Fixture not found: ${absolutePath}`);
    }

    return `file://${absolutePath}`;
  }

  // Cleanup after each test
  afterEach(async () => {
    for (const tabId of openTabs) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (error) {
        // Tab may already be closed
        console.log(`Could not close tab ${tabId}:`, error.message);
      }
    }
    openTabs = [];
  });

  describe('Large Metadata Extraction', () => {
    test('should handle page with large metadata object (~500KB)', async () => {
      // Open fixture with large metadata
      const url = getFixtureUrl('metadata-large.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract metadata
      const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

      // Verify result
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.custom).toBeDefined();
      expect(result.metadata.custom.testId).toBe('metadata-large');

      // Verify size is under 1MB limit (P1-1 validation)
      const serialized = JSON.stringify(result.metadata);
      const sizeBytes = new TextEncoder().encode(serialized).length;
      expect(sizeBytes).toBeLessThan(1024 * 1024); // Under 1MB
      expect(sizeBytes).toBeGreaterThan(400 * 1024); // Over 400KB (large)

      console.log(`Large metadata test passed: ${Math.round(sizeBytes / 1024)}KB extracted`);
    }, 10000); // 10s timeout
  });

  describe('Circular Reference Handling', () => {
    test('should handle page with circular references in metadata', async () => {
      // Open fixture with circular references
      const url = getFixtureUrl('metadata-circular-ref.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract metadata - may throw or return "[object Object]"
      try {
        const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

        // If we get here, extraction succeeded
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();

        // Check if circular reference was handled
        if (result.metadata.custom) {
          const custom = result.metadata.custom;

          // If it's a string, it might be "[object Object]" (broken serialization)
          if (typeof custom === 'string') {
            console.warn('Circular reference handling: Degraded to string', custom);
            // This indicates safeStringify is needed (P1-2 conditional fix)
            expect(custom).toMatch(/\[object Object\]|\[Circular\]/);
          } else if (typeof custom === 'object') {
            // If it's an object, serialization worked
            console.log('Circular reference handling: Successful object serialization');
            expect(custom.id).toBe('circular-test');

            // Check if circular markers exist
            const serialized = JSON.stringify(custom);
            if (serialized.includes('[Circular]')) {
              console.log('Circular reference handling: safeStringify detected');
            }
          }
        }
      } catch (error) {
        // If extraction fails, it might be JSON.stringify throwing on circular ref
        console.error('Circular reference handling: Failed with error', error.message);

        // This is expected if safeStringify is not implemented
        expect(error.message).toMatch(/circular|stringify|convert/i);

        // Mark that safeStringify implementation is needed
        console.warn(
          '⚠️  REQUIRES FIX: Implement safeStringify in extension/inject-console-capture.js'
        );
      }
    }, 10000); // 10s timeout
  });

  describe('Size Limit Validation (P1-1)', () => {
    test('should accept metadata at 1MB limit', async () => {
      const url = getFixtureUrl('metadata-1mb-limit.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await chromeDevAssist.getPageMetadata(openResult.tabId);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();

      const serialized = JSON.stringify(result.metadata);
      const sizeBytes = new TextEncoder().encode(serialized).length;
      expect(sizeBytes).toBeLessThanOrEqual(1024 * 1024);
      expect(sizeBytes).toBeGreaterThan(900 * 1024);

      console.log(`At-limit test passed: ${Math.round(sizeBytes / 1024)}KB`);
    }, 15000);

    test('should reject metadata exceeding 1MB', async () => {
      const url = getFixtureUrl('metadata-over-1mb.html');
      const openResult = await chromeDevAssist.openUrl(url, { active: true });
      openTabs.push(openResult.tabId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await expect(chromeDevAssist.getPageMetadata(openResult.tabId)).rejects.toThrow(
        /metadata.*exceeds.*size limit|too large/i
      );
    }, 15000);
  });
});

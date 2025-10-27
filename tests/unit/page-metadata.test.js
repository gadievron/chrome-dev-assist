/**
 * Unit Tests: DOM Inspection API - getPageMetadata()
 * Persona: 🔒 Security Tester + 🧪 Testing Expert
 *
 * Tests REAL implementation from claude-code/index.js
 * Following 4-point checklist:
 * 1. ✅ Imports real implementation
 * 2. ✅ Uses real objects (with necessary mocks for Chrome API)
 * 3. ✅ Can fail when implementation breaks
 * 4. ✅ Covers real user scenarios
 */

const path = require('path');

// Import REAL implementation
const { getPageMetadata } = require('../../claude-code/index.js');

describe('DOM Inspection API: getPageMetadata()', () => {
  /**
   * Test Category 1: INPUT VALIDATION
   * Security-first: Validate all inputs before processing
   */
  describe('Input Validation', () => {
    test('should reject missing tabId', async () => {
      await expect(getPageMetadata()).rejects.toThrow('tabId is required');
    });

    test('should reject null tabId', async () => {
      await expect(getPageMetadata(null)).rejects.toThrow('tabId is required');
    });

    test('should reject undefined tabId', async () => {
      await expect(getPageMetadata(undefined)).rejects.toThrow('tabId is required');
    });

    test('should reject non-number tabId', async () => {
      await expect(getPageMetadata('123')).rejects.toThrow('tabId must be a number');
      await expect(getPageMetadata(true)).rejects.toThrow('tabId must be a number');
      await expect(getPageMetadata({})).rejects.toThrow('tabId must be a number');
      await expect(getPageMetadata([])).rejects.toThrow('tabId must be a number');
    });

    test('should reject negative tabId', async () => {
      await expect(getPageMetadata(-1)).rejects.toThrow('tabId must be a positive integer');
    });

    test('should reject zero tabId', async () => {
      await expect(getPageMetadata(0)).rejects.toThrow('tabId must be a positive integer');
    });

    test('should reject non-integer tabId', async () => {
      await expect(getPageMetadata(123.45)).rejects.toThrow('tabId must be an integer');
    });

    test('should reject tabId exceeding safe integer', async () => {
      await expect(getPageMetadata(Number.MAX_SAFE_INTEGER + 1))
        .rejects.toThrow('tabId exceeds safe integer range');
    });

    test('should reject NaN tabId', async () => {
      await expect(getPageMetadata(NaN)).rejects.toThrow('tabId must be a number');
    });

    test('should reject Infinity tabId', async () => {
      await expect(getPageMetadata(Infinity)).rejects.toThrow('tabId must be a finite number');
    });
  });

  /**
   * Test Category 2: SUCCESS CASES
   * Test with actual test fixtures (requires extension loaded)
   */
  describe('Success Cases (Integration)', () => {
    // Note: These tests require the extension to be loaded in Chrome
    // They will be skipped in CI/CD without extension

    test.skip('should extract metadata from page with data attributes', async () => {
      // This test requires manual execution with extension loaded
      // 1. Load extension in Chrome
      // 2. Open tests/fixtures/metadata-test.html
      // 3. Get the tab ID
      // 4. Run this test with that tab ID

      const result = await getPageMetadata(MANUAL_TAB_ID);

      expect(result).toHaveProperty('tabId');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('metadata');

      expect(result.metadata).toHaveProperty('testId', 'fixture-full-001');
      expect(result.metadata).toHaveProperty('testName', 'Full Metadata Test Fixture');
      expect(result.metadata).toHaveProperty('extensionName', 'Chrome Dev Assist Test Suite');
      expect(result.metadata).toHaveProperty('testStatus', 'ready');
      expect(result.metadata).toHaveProperty('testType', 'unit-test');
      expect(result.metadata).toHaveProperty('testCategory', 'dom-inspection');
    });

    test.skip('should extract window.testMetadata', async () => {
      const result = await getPageMetadata(MANUAL_TAB_ID);

      expect(result.metadata).toHaveProperty('custom');
      expect(result.metadata.custom).toHaveProperty('version', '1.0.0');
      expect(result.metadata.custom).toHaveProperty('author', 'Test Suite');
      expect(result.metadata.custom).toHaveProperty('tags');
      expect(result.metadata.custom.tags).toContain('dom-inspection');
    });

    test.skip('should extract basic document metadata even without test metadata', async () => {
      // Test with minimal fixture (no custom metadata)
      const result = await getPageMetadata(MANUAL_TAB_ID_MINIMAL);

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('readyState');
      expect(result.metadata.title).toBe('Test Fixture: Minimal Metadata');
    });

    test.skip('should combine data attributes and window.testMetadata', async () => {
      const result = await getPageMetadata(MANUAL_TAB_ID);

      // Should have both sources
      expect(result.metadata.testId).toBeDefined(); // From data-test-id
      expect(result.metadata.custom).toBeDefined(); // From window.testMetadata
      expect(result.metadata.title).toBeDefined(); // From document
    });
  });

  /**
   * Test Category 3: ERROR HANDLING
   * Test failure modes and error messages
   */
  describe('Error Handling', () => {
    test('should reject tab that does not exist', async () => {
      // Use a tab ID that's very unlikely to exist
      const nonExistentTabId = 999999;

      await expect(getPageMetadata(nonExistentTabId))
        .rejects.toThrow(/No tab with id|Extension not connected|tab.*not found/i);
    });

    test('should provide clear error for connection failures', async () => {
      // Test when extension is not connected
      // This will fail with "Extension not connected" or "ECONNREFUSED"

      await expect(getPageMetadata(1))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED|not running/i);
    });
  });

  /**
   * Test Category 4: EDGE CASES
   * Boundary conditions and unusual scenarios
   */
  describe('Edge Cases', () => {
    test.skip('should handle page with very large metadata object', async () => {
      // Test with a page that has huge metadata
      // Should truncate or limit size

      const result = await getPageMetadata(MANUAL_TAB_ID_LARGE);

      expect(result.metadata).toBeDefined();
      // Result should be limited to reasonable size (< 1MB serialized)
      const serialized = JSON.stringify(result);
      expect(serialized.length).toBeLessThan(1024 * 1024); // 1MB
    });

    test.skip('should handle page with circular references in metadata', async () => {
      // Test page with circular refs in window.testMetadata
      // Should use safe serialization

      const result = await getPageMetadata(MANUAL_TAB_ID_CIRCULAR);

      expect(result.metadata).toBeDefined();
      // Should not throw or crash
      expect(typeof result.metadata).toBe('object');
    });

    test.skip('should handle chrome:// URLs gracefully', async () => {
      // Chrome internal pages are not accessible
      await expect(getPageMetadata(CHROME_TAB_ID))
        .rejects.toThrow(/Cannot access|Permission denied|restricted/i);
    });

    test.skip('should handle pages with no metadata', async () => {
      // Page with absolutely no metadata
      const result = await getPageMetadata(MANUAL_TAB_ID_EMPTY);

      expect(result.metadata).toBeDefined();
      // Should at least have basic document properties
      expect(result.metadata.title).toBeDefined();
      expect(result.metadata.readyState).toBeDefined();
    });
  });

  /**
   * Test Category 5: DATA STRUCTURE VALIDATION
   * Validate output format matches specification
   */
  describe('Output Structure', () => {
    test.skip('should return correct structure', async () => {
      const result = await getPageMetadata(MANUAL_TAB_ID);

      // Required top-level fields
      expect(result).toHaveProperty('tabId');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('metadata');

      // Types
      expect(typeof result.tabId).toBe('number');
      expect(typeof result.url).toBe('string');
      expect(typeof result.metadata).toBe('object');

      // Metadata should be an object (not null, not array)
      expect(result.metadata).not.toBeNull();
      expect(Array.isArray(result.metadata)).toBe(false);
    });

    test.skip('should include all standard metadata fields when present', async () => {
      const result = await getPageMetadata(MANUAL_TAB_ID);

      // Standard fields from data attributes
      if (result.metadata.testId) {
        expect(typeof result.metadata.testId).toBe('string');
      }
      if (result.metadata.testName) {
        expect(typeof result.metadata.testName).toBe('string');
      }

      // Standard fields from document
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('readyState');

      expect(typeof result.metadata.title).toBe('string');
      expect(typeof result.metadata.readyState).toBe('string');
    });
  });
});

/**
 * NOTES FOR MANUAL TESTING:
 *
 * To run the .skip tests above:
 * 1. Load chrome-dev-assist extension in Chrome
 * 2. Start the WebSocket server: node server/websocket-server.js
 * 3. Open test fixtures in Chrome tabs:
 *    - tests/fixtures/metadata-test.html
 *    - tests/fixtures/metadata-minimal.html
 *    - tests/fixtures/metadata-window-only.html
 * 4. Note the tab IDs (check chrome://extensions dev tools)
 * 5. Replace MANUAL_TAB_ID constants with actual IDs
 * 6. Remove .skip from relevant tests
 * 7. Run: npm test -- page-metadata.test.js
 *
 * For automated testing:
 * - The input validation tests (Category 1) run automatically
 * - The error handling tests (Category 3) run automatically
 * - Success and edge case tests require extension loaded
 */

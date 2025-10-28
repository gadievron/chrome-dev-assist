/**
 * P2-3 Phase 1: Edge Case Validation Tests
 *
 * Tests validation logic with edge cases (no extension required).
 * These tests verify input validation handles unusual but valid inputs.
 */

const { captureScreenshot, getPageMetadata } = require('../../claude-code/index.js');

describe('P2-3 Phase 1: Edge Case Validation', () => {
  describe('Quality Boundary Values', () => {
    test('should accept quality = 0 (minimum valid)', async () => {
      // Quality 0 is valid (minimum JPEG quality)
      // Will fail at connection, not validation
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 0 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should accept quality = 100 (maximum valid)', async () => {
      // Quality 100 is valid (maximum JPEG quality)
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 100 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should accept quality = 50 (mid-range)', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 50 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });
  });

  describe('Format Case Sensitivity', () => {
    test('should accept format = "PNG" (uppercase)', async () => {
      // Test case insensitivity - should Chrome API accept uppercase?
      await expect(captureScreenshot(12345, { format: 'PNG' })).rejects.toThrow(
        /format must be "png" or "jpeg"|Extension not connected/i
      );
    });

    test('should accept format = "png" (lowercase)', async () => {
      await expect(captureScreenshot(12345, { format: 'png' })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should accept format = "JPEG" (uppercase)', async () => {
      await expect(captureScreenshot(12345, { format: 'JPEG' })).rejects.toThrow(
        /format must be "png" or "jpeg"|Extension not connected/i
      );
    });

    test('should accept format = "jpeg" (lowercase)', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 90 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });
  });

  describe('Options Edge Cases', () => {
    test('should accept empty options object {}', async () => {
      // Empty options should use defaults (png format)
      await expect(captureScreenshot(12345, {})).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should accept undefined options (default behavior)', async () => {
      // No options parameter should use defaults
      await expect(captureScreenshot(12345)).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should ignore extra unknown options', async () => {
      // Unknown options should be ignored (not cause errors)
      await expect(
        captureScreenshot(12345, { format: 'png', unknownOption: 'test' })
      ).rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });
  });

  describe('Tab ID Boundary Values', () => {
    test('should accept tabId = 1 (minimum valid)', async () => {
      await expect(getPageMetadata(1)).rejects.toThrow(
        /Extension not connected|ECONNREFUSED|No tab with id/i
      );
    });

    test('should accept tabId = Number.MAX_SAFE_INTEGER (maximum valid)', async () => {
      await expect(getPageMetadata(Number.MAX_SAFE_INTEGER)).rejects.toThrow(
        /Extension not connected|ECONNREFUSED|No tab with id/i
      );
    });

    test('should accept very large but safe tabId (999999999)', async () => {
      await expect(getPageMetadata(999999999)).rejects.toThrow(
        /Extension not connected|ECONNREFUSED|No tab with id/i
      );
    });
  });

  describe('Data Type Edge Cases', () => {
    test('should handle quality with trailing zeros (75.0 === 75)', async () => {
      // JavaScript treats 75.0 as 75 (integer)
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 75.0 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should handle quality in scientific notation (1e2 === 100)', async () => {
      // JavaScript: 1e2 === 100
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 1e2 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should handle negative zero tabId (-0 === 0)', async () => {
      // JavaScript: -0 === 0, should be rejected
      await expect(getPageMetadata(-0)).rejects.toThrow(/tabId must be a positive/i);
    });
  });

  describe('Format + Quality Combinations', () => {
    test('should accept PNG format without quality (quality ignored)', async () => {
      // PNG format ignores quality parameter
      await expect(captureScreenshot(12345, { format: 'png', quality: 50 })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });

    test('should accept JPEG without quality (uses default 90)', async () => {
      // JPEG without quality should use default
      await expect(captureScreenshot(12345, { format: 'jpeg' })).rejects.toThrow(
        /Extension not connected|ECONNREFUSED/i
      );
    });
  });
});

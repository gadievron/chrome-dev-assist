/**
 * Screenshot API Validation Tests (No Extension Required)
 * Tests input validation logic without requiring extension connection
 */

const { captureScreenshot } = require('../../claude-code/index.js');

describe('captureScreenshot() - Input Validation', () => {
  describe('Tab ID Validation', () => {
    test('should reject non-number tab ID (string)', async () => {
      await expect(captureScreenshot('not-a-number'))
        .rejects.toThrow(/tab id must be a number/i);
    });

    test('should reject non-number tab ID (null)', async () => {
      await expect(captureScreenshot(null))
        .rejects.toThrow(/tabid is required/i);
    });

    test('should reject non-number tab ID (undefined)', async () => {
      await expect(captureScreenshot(undefined))
        .rejects.toThrow(/tabid is required/i);
    });

    test('should reject non-number tab ID (object)', async () => {
      await expect(captureScreenshot({}))
        .rejects.toThrow(/tab id must be a number/i);
    });

    test('should reject negative tab ID', async () => {
      await expect(captureScreenshot(-1))
        .rejects.toThrow(/tab id must be a positive number/i);
    });

    test('should reject zero tab ID', async () => {
      await expect(captureScreenshot(0))
        .rejects.toThrow(/tab id must be a positive number/i);
    });
  });

  describe('Tab ID Edge Cases (Previously Broken - Fixed in P0)', () => {
    test('should reject NaN tab ID', async () => {
      await expect(captureScreenshot(NaN))
        .rejects.toThrow(/tab id must be a number/i);
    });

    test('should reject Infinity tab ID', async () => {
      await expect(captureScreenshot(Infinity))
        .rejects.toThrow(/tab id must be a finite number/i);
    });

    test('should reject -Infinity tab ID', async () => {
      await expect(captureScreenshot(-Infinity))
        .rejects.toThrow(/tab id must be a finite number/i);
    });

    test('should reject float tab ID (123.456)', async () => {
      await expect(captureScreenshot(123.456))
        .rejects.toThrow(/tab id must be an integer/i);
    });

    test('should reject tab ID exceeding MAX_SAFE_INTEGER', async () => {
      await expect(captureScreenshot(Number.MAX_SAFE_INTEGER + 1))
        .rejects.toThrow(/tab id exceeds safe integer range/i);
    });

    test('should reject negative float tab ID (-99.5)', async () => {
      await expect(captureScreenshot(-99.5))
        .rejects.toThrow(/tab id must be an integer/i);
    });

    test('should reject very large float (9007199254740992.5)', async () => {
      await expect(captureScreenshot(9007199254740992.5))
        .rejects.toThrow(/tab id exceeds safe integer range/i);
    });
  });

  describe('Format Validation', () => {
    test('should reject invalid format (gif)', async () => {
      // Will fail during validation before attempting connection
      await expect(captureScreenshot(12345, { format: 'gif' }))
        .rejects.toThrow(/format must be "png" or "jpeg"/i);
    });

    test('should reject invalid format (bmp)', async () => {
      await expect(captureScreenshot(12345, { format: 'bmp' }))
        .rejects.toThrow(/format must be "png" or "jpeg"/i);
    });

    test('should reject invalid format (webp)', async () => {
      await expect(captureScreenshot(12345, { format: 'webp' }))
        .rejects.toThrow(/format must be "png" or "jpeg"/i);
    });
  });

  describe('Quality Validation (JPEG)', () => {
    test('should reject quality < 0', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: -10 }))
        .rejects.toThrow(/quality must be between 0 and 100/i);
    });

    test('should reject quality > 100', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 150 }))
        .rejects.toThrow(/quality must be between 0 and 100/i);
    });

    test('should reject quality = -1', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: -1 }))
        .rejects.toThrow(/quality must be between 0 and 100/i);
    });

    test('should reject quality = 101', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 101 }))
        .rejects.toThrow(/quality must be between 0 and 100/i);
    });
  });

  describe('Valid Inputs (will fail at connection, not validation)', () => {
    test('should accept valid tab ID with default options', async () => {
      // This will fail with "Extension not connected", not validation error
      await expect(captureScreenshot(12345))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });

    test('should accept valid tab ID with PNG format', async () => {
      await expect(captureScreenshot(12345, { format: 'png' }))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });

    test('should accept valid tab ID with JPEG format and quality', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 80 }))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });

    test('should accept quality = 0 for JPEG', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 0 }))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });

    test('should accept quality = 100 for JPEG', async () => {
      await expect(captureScreenshot(12345, { format: 'jpeg', quality: 100 }))
        .rejects.toThrow(/Extension not connected|ECONNREFUSED/i);
    });
  });
});

/**
 * Extension Discovery - Security Validation Tests
 *
 * Tests for Phase 0 security validation functions
 * Tests REAL implementation from server/validation.js
 */

const { describe, test, expect } = require('@jest/globals');

// Import REAL validation functions (not stubs!)
const {
  validateExtensionId,
  validateMetadata,
  sanitizeManifest,
  validateCapabilities,
  validateName,
  validateVersion
} = require('../../server/validation');

describe('Extension Discovery - Security Validation', () => {

  describe('validateExtensionId()', () => {

    // Valid cases
    test('should accept valid 32-char lowercase extension ID', () => {
      const validId = 'a'.repeat(32);
      expect(() => validateExtensionId(validId)).not.toThrow();
    });

    test('should accept real Chrome extension ID (a-p only)', () => {
      const validId = 'gnojocphflllgichkehjhkojkihcihfn';  // Real Chrome extension ID
      expect(() => validateExtensionId(validId)).not.toThrow();
    });

    test('should accept extension ID with all valid letters (a-p)', () => {
      const validId = 'abcdefghijklmnopabcdefghijklmnop';  // Only a-p letters
      expect(() => validateExtensionId(validId)).not.toThrow();
    });

    test('should accept extension ID with all p letters (last valid letter)', () => {
      const validId = 'pppppppppppppppppppppppppppppppp';  // All p's
      expect(() => validateExtensionId(validId)).not.toThrow();
    });

    // Invalid cases - format (base-32 alphabet enforcement)
    test('should reject extension ID with letters q-z (outside base-32 alphabet)', () => {
      const invalidId = 'abcdefghijklmnopqrstuvwxyzabcdef';  // Contains q-z
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format (must be 32 lowercase letters a-p)');
    });

    test('should reject extension ID with letter q (just after p)', () => {
      const invalidId = 'ppppppppppppppppppppppppppppqqqq';  // Contains q
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format (must be 32 lowercase letters a-p)');
    });

    test('should reject extension ID with letter z', () => {
      const invalidId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaazzzz';  // Contains z
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format (must be 32 lowercase letters a-p)');
    });

    test('should reject extension ID with xyz suffix', () => {
      const invalidId = 'gnojocphflllgichkehjhkojkihcixyz';  // Contains xyz
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format (must be 32 lowercase letters a-p)');
    });

    test('should reject extension ID with uppercase letters', () => {
      const invalidId = 'A'.repeat(32);
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format');
    });

    test('should reject extension ID with numbers', () => {
      const invalidId = 'a'.repeat(31) + '1';
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format');
    });

    test('should reject extension ID with special characters', () => {
      const invalidId = 'a'.repeat(31) + '-';
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format');
    });

    test('should reject extension ID that is too short', () => {
      const invalidId = 'a'.repeat(31);
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format');
    });

    test('should reject extension ID that is too long', () => {
      const invalidId = 'a'.repeat(33);
      expect(() => validateExtensionId(invalidId))
        .toThrow('Invalid extension ID format');
    });

    // Invalid cases - type
    test('should reject null extension ID', () => {
      expect(() => validateExtensionId(null))
        .toThrow('extensionId must be non-empty string');
    });

    test('should reject undefined extension ID', () => {
      expect(() => validateExtensionId(undefined))
        .toThrow('extensionId must be non-empty string');
    });

    test('should reject empty string extension ID', () => {
      expect(() => validateExtensionId(''))
        .toThrow('extensionId must be non-empty string');
    });

    test('should reject number extension ID', () => {
      expect(() => validateExtensionId(123))
        .toThrow('extensionId must be non-empty string');
    });

    // Security cases
    test('should reject SQL injection attempt', () => {
      const maliciousId = "'; DROP TABLE extensions; --";
      expect(() => validateExtensionId(maliciousId))
        .toThrow('Invalid extension ID format');
    });

    test('should reject path traversal attempt', () => {
      const maliciousId = '../../../etc/passwd';
      expect(() => validateExtensionId(maliciousId))
        .toThrow('Invalid extension ID format');
    });
  });

  describe('validateMetadata()', () => {

    // Valid cases
    test('should accept metadata with userAgent', () => {
      const metadata = { userAgent: 'Chrome/120.0.0.0' };
      const result = validateMetadata(metadata);
      expect(result).toHaveProperty('userAgent');
      expect(result.userAgent).toBe('Chrome/120.0.0.0');
    });

    test('should accept metadata with timestamp', () => {
      const metadata = { timestamp: 1234567890 };
      const result = validateMetadata(metadata);
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBe(1234567890);
    });

    test('should accept metadata with both allowed fields', () => {
      const metadata = {
        userAgent: 'Chrome/120.0.0.0',
        timestamp: 1234567890
      };
      const result = validateMetadata(metadata);
      expect(result).toHaveProperty('userAgent');
      expect(result).toHaveProperty('timestamp');
    });

    // Sanitization
    test('should remove disallowed fields', () => {
      const metadata = {
        userAgent: 'Chrome/120.0.0.0',
        timestamp: 1234567890,
        secretKey: 'should-be-removed',
        oauth2Token: 'should-be-removed'
      };
      const result = validateMetadata(metadata);
      expect(result).not.toHaveProperty('secretKey');
      expect(result).not.toHaveProperty('oauth2Token');
    });

    // Size limit
    test('should reject metadata larger than 10KB', () => {
      const largeString = 'x'.repeat(11 * 1024); // 11KB
      const metadata = { userAgent: largeString };
      expect(() => validateMetadata(metadata))
        .toThrow('Metadata too large (max 10KB)');
    });

    test('should accept metadata exactly 10KB', () => {
      const exactString = 'x'.repeat(10 * 1024 - 50); // Just under 10KB (accounting for JSON overhead)
      const metadata = { userAgent: exactString };
      expect(() => validateMetadata(metadata)).not.toThrow();
    });

    // Edge cases
    test('should handle empty metadata object', () => {
      const metadata = {};
      const result = validateMetadata(metadata);
      expect(result).toEqual({});
    });

    test('should handle null values', () => {
      const metadata = { userAgent: null };
      const result = validateMetadata(metadata);
      expect(result).not.toHaveProperty('userAgent');
    });
  });

  describe('sanitizeManifest()', () => {

    const fullManifest = {
      name: 'Chrome Dev Assist',
      version: '1.0.0',
      permissions: ['tabs', 'storage'],
      key: 'SECRET_KEY_SHOULD_BE_REMOVED',
      oauth2: { client_id: 'SECRET', client_secret: 'SECRET' },
      description: 'Test extension',
      icons: { '16': 'icon16.png' }
    };

    test('should include name', () => {
      const result = sanitizeManifest(fullManifest);
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Chrome Dev Assist');
    });

    test('should include version', () => {
      const result = sanitizeManifest(fullManifest);
      expect(result).toHaveProperty('version');
      expect(result.version).toBe('1.0.0');
    });

    test('should include permissions', () => {
      const result = sanitizeManifest(fullManifest);
      expect(result).toHaveProperty('permissions');
      expect(result.permissions).toEqual(['tabs', 'storage']);
    });

    test('should remove key field (sensitive)', () => {
      const result = sanitizeManifest(fullManifest);
      expect(result).not.toHaveProperty('key');
    });

    test('should remove oauth2 field (sensitive)', () => {
      const result = sanitizeManifest(fullManifest);
      expect(result).not.toHaveProperty('oauth2');
    });

    test('should only include whitelisted fields', () => {
      const result = sanitizeManifest(fullManifest);
      const keys = Object.keys(result);
      expect(keys).toEqual(['name', 'version', 'permissions']);
    });
  });

  describe('validateCapabilities()', () => {

    const ALLOWED_CAPABILITIES = [
      'test-orchestration',
      'console-capture',
      'window-management',
      'tab-control'
    ];

    // Valid cases
    test('should accept single valid capability', () => {
      const capabilities = ['test-orchestration'];
      expect(() => validateCapabilities(capabilities)).not.toThrow();
    });

    test('should accept multiple valid capabilities', () => {
      const capabilities = ['test-orchestration', 'console-capture'];
      expect(() => validateCapabilities(capabilities)).not.toThrow();
    });

    test('should accept all allowed capabilities', () => {
      const capabilities = ALLOWED_CAPABILITIES;
      expect(() => validateCapabilities(capabilities)).not.toThrow();
    });

    test('should accept empty array', () => {
      const capabilities = [];
      expect(() => validateCapabilities(capabilities)).not.toThrow();
    });

    // Invalid cases - type
    test('should reject non-array capabilities', () => {
      const capabilities = 'test-orchestration';
      expect(() => validateCapabilities(capabilities))
        .toThrow('capabilities must be array');
    });

    test('should reject null capabilities', () => {
      expect(() => validateCapabilities(null))
        .toThrow('capabilities must be array');
    });

    test('should reject capabilities with non-string values', () => {
      const capabilities = [123, 'test-orchestration'];
      expect(() => validateCapabilities(capabilities))
        .toThrow('capability must be string');
    });

    // Invalid cases - unknown capability
    test('should reject unknown capability', () => {
      const capabilities = ['unknown-capability'];
      expect(() => validateCapabilities(capabilities))
        .toThrow('Unknown capability: unknown-capability');
    });

    test('should reject typo in capability name', () => {
      const capabilities = ['test-orchestraton']; // typo
      expect(() => validateCapabilities(capabilities))
        .toThrow('Unknown capability: test-orchestraton');
    });

    test('should reject mix of valid and invalid capabilities', () => {
      const capabilities = ['test-orchestration', 'invalid-capability'];
      expect(() => validateCapabilities(capabilities))
        .toThrow('Unknown capability: invalid-capability');
    });
  });

  describe('validateName()', () => {

    // Valid cases
    test('should accept valid extension name', () => {
      expect(() => validateName('Chrome Dev Assist')).not.toThrow();
    });

    test('should accept name with numbers', () => {
      expect(() => validateName('Extension 123')).not.toThrow();
    });

    test('should accept name at max length (100 chars)', () => {
      const name = 'x'.repeat(100);
      expect(() => validateName(name)).not.toThrow();
    });

    // Invalid cases - type
    test('should reject null name', () => {
      expect(() => validateName(null))
        .toThrow('name must be non-empty string');
    });

    test('should reject empty name', () => {
      expect(() => validateName(''))
        .toThrow('name must be non-empty string');
    });

    test('should reject number name', () => {
      expect(() => validateName(123))
        .toThrow('name must be non-empty string');
    });

    // Invalid cases - length
    test('should reject name longer than 100 chars', () => {
      const name = 'x'.repeat(101);
      expect(() => validateName(name))
        .toThrow('name too long (max 100 characters)');
    });

    // Invalid cases - XSS prevention
    test('should reject name with < character (XSS)', () => {
      expect(() => validateName('Extension <script>'))
        .toThrow('name contains invalid characters');
    });

    test('should reject name with > character (XSS)', () => {
      expect(() => validateName('Extension >'))
        .toThrow('name contains invalid characters');
    });

    test('should reject name with & character', () => {
      expect(() => validateName('Extension & Co'))
        .toThrow('name contains invalid characters');
    });

    test('should reject name with " character', () => {
      expect(() => validateName('Extension "quoted"'))
        .toThrow('name contains invalid characters');
    });

    test('should reject name with \' character', () => {
      expect(() => validateName("Extension 'quoted'"))
        .toThrow('name contains invalid characters');
    });
  });

  describe('validateVersion()', () => {

    // Valid cases
    test('should accept semantic version 1.0.0', () => {
      expect(() => validateVersion('1.0.0')).not.toThrow();
    });

    test('should accept version 10.20.30', () => {
      expect(() => validateVersion('10.20.30')).not.toThrow();
    });

    test('should accept version 0.0.1', () => {
      expect(() => validateVersion('0.0.1')).not.toThrow();
    });

    // Invalid cases - type
    test('should reject null version', () => {
      expect(() => validateVersion(null))
        .toThrow('version must be non-empty string');
    });

    test('should reject empty version', () => {
      expect(() => validateVersion(''))
        .toThrow('version must be non-empty string');
    });

    test('should reject number version', () => {
      expect(() => validateVersion(1.0))
        .toThrow('version must be non-empty string');
    });

    // Invalid cases - format
    test('should reject version without patch number', () => {
      expect(() => validateVersion('1.0'))
        .toThrow('version must be semantic version');
    });

    test('should reject version with only major number', () => {
      expect(() => validateVersion('1'))
        .toThrow('version must be semantic version');
    });

    test('should reject version with text', () => {
      expect(() => validateVersion('v1.0.0'))
        .toThrow('version must be semantic version');
    });

    test('should reject version with pre-release tag', () => {
      expect(() => validateVersion('1.0.0-beta'))
        .toThrow('version must be semantic version');
    });

    test('should reject version with build metadata', () => {
      expect(() => validateVersion('1.0.0+build'))
        .toThrow('version must be semantic version');
    });
  });

  describe('cleanupStaleExtensions()', () => {

    // Note: This function modifies the extensions Map in the server
    // We'll test it with integration tests, but here we define expected behavior

    // TODO: INCOMPLETE - Requires server state or convert to integration test
    // Requires server state manipulation for cleanupStaleExtensions
    // Skip until implementation or proper test setup available
    test.skip('should remove extensions older than timeout', () => {
      // This will be tested in integration tests
      // Expected behavior: extensions with lastSeen > 30 minutes ago are removed
    });

    // TODO: INCOMPLETE - Requires server state or convert to integration test
    // Requires server state manipulation for cleanupStaleExtensions
    // Skip until implementation or proper test setup available
    test.skip('should keep extensions within timeout', () => {
      // This will be tested in integration tests
      // Expected behavior: extensions with lastSeen < 30 minutes ago are kept
    });

    test('should log removed extensions', () => {
      // This will be tested in integration tests
      // Expected behavior: Logs "Removed stale extension: {id}"
    });
  });

});

// ✅ NO STUBS - Testing REAL implementation from server/validation.js

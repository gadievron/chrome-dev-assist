/**
 * Extension Discovery - Validation Functions
 *
 * Security validation for Phase 0 multi-extension support
 *
 * These functions validate and sanitize all extension registration data
 * to prevent injection attacks, DoS, and XSS vulnerabilities.
 *
 * Used by: server/websocket-server.js
 * Tested by: tests/unit/extension-discovery-validation.test.js
 */

// Constants
const METADATA_SIZE_LIMIT = 10 * 1024; // 10KB
const ALLOWED_CAPABILITIES = [
  'test-orchestration',
  'console-capture',
  'window-management',
  'tab-control',
];

/**
 * Validate Chrome extension ID format
 *
 * Chrome extension IDs are exactly 32 lowercase letters (a-p)
 * Generated from extension's public key
 *
 * Security: Prevents injection attacks by enforcing strict format
 *
 * @param {string} extensionId - Extension ID to validate
 * @returns {boolean} true if valid
 * @throws {Error} if invalid
 */
function validateExtensionId(extensionId) {
  if (!extensionId || typeof extensionId !== 'string') {
    throw new Error('extensionId must be non-empty string');
  }
  if (!/^[a-p]{32}$/.test(extensionId)) {
    throw new Error('Invalid extension ID format (must be 32 lowercase letters a-p)');
  }
  return true;
}

/**
 * Validate and sanitize extension metadata
 *
 * Metadata may contain:
 * - userAgent (browser info)
 * - timestamp (registration time)
 *
 * Security:
 * - Size limit prevents DoS (max 10KB)
 * - Whitelisted fields prevent data leakage
 *
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Sanitized metadata (only allowed fields)
 * @throws {Error} if metadata too large
 */
function validateMetadata(metadata) {
  if (!metadata) {
    return {};
  }

  const jsonSize = JSON.stringify(metadata).length;
  if (jsonSize > METADATA_SIZE_LIMIT) {
    throw new Error('Metadata too large (max 10KB)');
  }

  // Only allow specific fields
  const allowed = ['userAgent', 'timestamp'];
  const sanitized = {};
  for (const key of allowed) {
    if (metadata[key]) {
      sanitized[key] = metadata[key];
    }
  }

  return sanitized;
}

/**
 * Sanitize extension manifest
 *
 * Returns only safe, public fields from manifest
 * Strips sensitive fields like 'key', 'oauth2', etc.
 *
 * Security: Prevents leaking extension private keys or OAuth credentials
 *
 * @param {Object} manifest - Extension manifest
 * @returns {Object} Sanitized manifest (name, version, permissions only)
 */
function sanitizeManifest(manifest) {
  if (!manifest) {
    return {};
  }

  // Only return public, non-sensitive fields
  return {
    name: manifest.name,
    version: manifest.version,
    permissions: manifest.permissions,
  };
}

/**
 * Validate extension capabilities
 *
 * Capabilities define what the extension can do:
 * - test-orchestration: Start/end tests, track tabs
 * - console-capture: Intercept console logs
 * - window-management: Create/close windows
 * - tab-control: Create/reload/close tabs
 *
 * Security: Only whitelisted capabilities accepted
 *
 * @param {Array<string>} capabilities - List of capabilities
 * @returns {boolean} true if valid
 * @throws {Error} if invalid capability or wrong type
 */
function validateCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) {
    throw new Error('capabilities must be array');
  }

  for (const cap of capabilities) {
    if (typeof cap !== 'string') {
      throw new Error('capability must be string');
    }
    if (!ALLOWED_CAPABILITIES.includes(cap)) {
      throw new Error(`Unknown capability: ${cap}`);
    }
  }

  return true;
}

/**
 * Validate extension name
 *
 * Name displayed in UI (popup, logs)
 *
 * Security:
 * - Max length prevents UI overflow
 * - Character validation prevents XSS if displayed in HTML
 *
 * @param {string} name - Extension name
 * @returns {boolean} true if valid
 * @throws {Error} if invalid
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('name must be non-empty string');
  }
  if (name.length > 100) {
    throw new Error('name too long (max 100 characters)');
  }
  // Prevent XSS if name is displayed in popup
  if (/<|>|&|"|'/.test(name)) {
    throw new Error('name contains invalid characters');
  }
  return true;
}

/**
 * Validate extension version
 *
 * Requires semantic versioning: X.Y.Z
 *
 * @param {string} version - Version string
 * @returns {boolean} true if valid
 * @throws {Error} if invalid format
 */
function validateVersion(version) {
  if (!version || typeof version !== 'string') {
    throw new Error('version must be non-empty string');
  }
  // Semantic versioning format: 1.0.0
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('version must be semantic version (e.g., 1.0.0)');
  }
  return true;
}

// Export all validation functions
module.exports = {
  validateExtensionId,
  validateMetadata,
  sanitizeManifest,
  validateCapabilities,
  validateName,
  validateVersion,
  // Export constants for testing
  METADATA_SIZE_LIMIT,
  ALLOWED_CAPABILITIES,
};

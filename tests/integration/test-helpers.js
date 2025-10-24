/**
 * Test Helpers - URL Mode Selection
 *
 * Provides utilities for integration tests with support for both:
 * - HTTP URLs (default, recommended) - http://localhost:9876/fixtures/
 * - file:// URLs (fallback) - file:///path/to/tests/fixtures/
 *
 * Environment Variables:
 * - USE_FILE_URLS=true - Use file:// URLs instead of HTTP
 * - HTTP_SERVER_PORT=9876 - Override default port (default: 9876)
 *
 * Examples:
 * ```javascript
 * const { getFixtureUrl } = require('./test-helpers');
 *
 * // Default: HTTP URL
 * const url = getFixtureUrl('basic-test.html');
 * // Returns: http://localhost:9876/fixtures/basic-test.html
 *
 * // With USE_FILE_URLS=true
 * const url = getFixtureUrl('basic-test.html');
 * // Returns: file:///absolute/path/to/tests/fixtures/basic-test.html
 * ```
 */

const path = require('path');
const fs = require('fs');

// Configuration from environment variables
const USE_FILE_URLS = process.env.USE_FILE_URLS === 'true';
const HTTP_SERVER_PORT = process.env.HTTP_SERVER_PORT || '9876';
const HTTP_SERVER_HOST = 'localhost'; // Always localhost for security

// Absolute path to fixtures directory
const FIXTURES_PATH = path.join(__dirname, '../fixtures');

// Read auth token from server (for HTTP mode)
let AUTH_TOKEN = null;
if (!USE_FILE_URLS) {
  const TOKEN_FILE = path.join(__dirname, '../../.auth-token');
  try {
    AUTH_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  } catch (err) {
    console.warn(`[Test Helper] Warning: Could not read auth token from ${TOKEN_FILE}`);
    console.warn(`[Test Helper] HTTP requests may fail. Ensure server is running.`);
  }
}

/**
 * Get URL for a test fixture file
 *
 * @param {string} filename - Fixture filename (e.g., 'basic-test.html')
 * @returns {string} Complete URL (HTTP or file://)
 *
 * @example
 * getFixtureUrl('basic-test.html')
 * // HTTP mode: 'http://localhost:9876/fixtures/basic-test.html'
 * // File mode: 'file:///Users/.../tests/fixtures/basic-test.html'
 */
function getFixtureUrl(filename) {
  if (USE_FILE_URLS) {
    // Fallback: file:// URLs (requires "Allow access to file URLs" in chrome://extensions)
    return `file://${FIXTURES_PATH}/${filename}`;
  } else {
    // Primary: HTTP server URLs with auth token (works by default with <all_urls> permission)
    const baseUrl = `http://${HTTP_SERVER_HOST}:${HTTP_SERVER_PORT}/fixtures/${filename}`;

    // Append auth token as query parameter (required for server authentication)
    if (AUTH_TOKEN) {
      return `${baseUrl}?token=${AUTH_TOKEN}`;
    } else {
      // No token available - request will likely fail with 401 Unauthorized
      return baseUrl;
    }
  }
}

/**
 * Get current URL mode for logging/debugging
 *
 * @returns {Object} URL mode configuration
 */
function getUrlMode() {
  return {
    mode: USE_FILE_URLS ? 'file://' : 'http',
    fixturesPath: FIXTURES_PATH,
    serverUrl: `http://${HTTP_SERVER_HOST}:${HTTP_SERVER_PORT}/fixtures/`,
    currentMode: USE_FILE_URLS ? 'file://' : 'http',
    requiresManualSetup: USE_FILE_URLS // file:// requires manual permission
  };
}

/**
 * Sleep utility for tests
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getFixtureUrl,
  getUrlMode,
  sleep,

  // Export constants for direct access if needed
  USE_FILE_URLS,
  HTTP_SERVER_PORT,
  HTTP_SERVER_HOST,
  FIXTURES_PATH
};

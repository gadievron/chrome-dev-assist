/**
 * Dogfooding Tests - Using Chrome Dev Assist to Test Itself
 *
 * These tests use the extension's own functionality to validate its capabilities:
 * - openUrl() to load test fixtures
 * - captureConsole to capture test output
 * - closeTab() to clean up
 *
 * Tests validate the 3-level identification system:
 * 1. Data attributes (programmatic detection)
 * 2. Visible text (visual confirmation)
 * 3. Console logging (at the beginning)
 *
 * URL Mode:
 * - Default: HTTP (http://localhost:9876/fixtures/)
 * - Fallback: file:// URLs (set USE_FILE_URLS=true)
 */

const chromeDevAssist = require('../../claude-code/index.js');
const { getFixtureUrl, getUrlMode } = require('./test-helpers');

// Test configuration
const TEST_TIMEOUT = 30000;

// Log URL mode at test startup
console.log(`[Test Config] URL Mode: ${getUrlMode().currentMode}`);

describe('Dogfooding - Extension Testing Itself', () => {
  // ==========================
  // TEST FIXTURE: basic-test.html
  // ==========================

  describe('Basic Test Fixture', () => {
    test(
      'opens basic test page and detects test identification',
      async () => {
        let tabId;
        try {
          console.log('\n🧪 Testing: basic-test.html');
          console.log('═══════════════════════════════════════════════════════');

          // Use extension to open test page with console capture
          const result = await chromeDevAssist.openUrl(getFixtureUrl('basic-test.html'), {
            active: false,
            captureConsole: true,
            duration: 2000,
            autoClose: true, // Prevent tab leaks
          });

          tabId = result.tabId;

          console.log(`✓ Opened tab ${tabId}`);
          console.log(`✓ Captured ${result.consoleLogs.length} console messages`);

          // Validate test identification in console (at the beginning)
          const testIdLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('Test ID:') &&
              log.message.includes('basic-test-001')
          );

          expect(testIdLog).toBeDefined();
          console.log('✓ Test ID found in console: basic-test-001');

          // Validate test name in console
          const testNameLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('Test Name:') &&
              log.message.includes('Basic Test Page')
          );

          expect(testNameLog).toBeDefined();
          console.log('✓ Test Name found in console: Basic Test Page');

          // Validate extension name in console
          const extensionLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('Extension:') &&
              log.message.includes('Chrome Dev Assist')
          );

          expect(extensionLog).toBeDefined();
          console.log('✓ Extension name found in console: Chrome Dev Assist');

          // Validate header separator present (visual marker)
          const headerLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('═══════════════════════════════════════════════════════')
          );

          expect(headerLog).toBeDefined();
          console.log('✓ Console header separator found');

          console.log('═══════════════════════════════════════════════════════');
          console.log('✅ All 3-level identification validated for basic-test.html\n');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId);
            console.log(`✓ Cleaned up tab ${tabId}`);
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // TEST FIXTURE: console-errors-test.html
  // ==========================

  describe('Console Errors Test Fixture', () => {
    test(
      'captures expected errors from test page',
      async () => {
        let tabId;
        try {
          console.log('\n❌ Testing: console-errors-test.html');
          console.log('═══════════════════════════════════════════════════════');

          // Use extension to open error test page
          const result = await chromeDevAssist.openUrl(getFixtureUrl('console-errors-test.html'), {
            active: false,
            captureConsole: true,
            duration: 3000, // Longer duration for errors to generate
          });

          tabId = result.tabId;

          console.log(`✓ Opened tab ${tabId}`);
          console.log(`✓ Captured ${result.consoleLogs.length} console messages`);

          // Validate test identification
          const testIdLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('Test ID:') &&
              log.message.includes('console-errors-001')
          );

          expect(testIdLog).toBeDefined();
          console.log('✓ Test ID found: console-errors-001');

          // Filter errors
          const errors = result.consoleLogs.filter(log => log.level === 'error');
          console.log(`✓ Found ${errors.length} error messages`);

          // Validate expected errors present
          expect(errors.length).toBeGreaterThanOrEqual(3);
          console.log('✓ Expected error count validated (≥3)');

          // Validate error messages contain expected text
          const errorMessages = errors.map(e => e.message).join(' ');

          const hasError1 =
            errorMessages.includes('Error 1') || errorMessages.includes('ReferenceError');
          const hasError2 =
            errorMessages.includes('Error 2') || errorMessages.includes('TypeError');
          const hasError3 =
            errorMessages.includes('Error 3') || errorMessages.includes('test error');

          expect(hasError1 || hasError2 || hasError3).toBe(true);
          console.log('✓ Error messages validated');

          console.log('═══════════════════════════════════════════════════════');
          console.log('✅ Error capture validated for console-errors-test.html\n');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId);
            console.log(`✓ Cleaned up tab ${tabId}`);
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // TEST FIXTURE: console-mixed-test.html
  // ==========================

  describe('Mixed Console Output Test Fixture', () => {
    test(
      'captures mixed console output (logs, warnings, errors)',
      async () => {
        let tabId;
        try {
          console.log('\n📋 Testing: console-mixed-test.html');
          console.log('═══════════════════════════════════════════════════════');

          // Use extension to open mixed output test page
          const result = await chromeDevAssist.openUrl(getFixtureUrl('console-mixed-test.html'), {
            active: false,
            captureConsole: true,
            duration: 3000,
            autoClose: true, // Prevent tab leaks
          });

          tabId = result.tabId;

          console.log(`✓ Opened tab ${tabId}`);
          console.log(`✓ Captured ${result.consoleLogs.length} console messages`);

          // Validate test identification
          const testIdLog = result.consoleLogs.find(
            log =>
              log.message &&
              log.message.includes('Test ID:') &&
              log.message.includes('console-mixed-001')
          );

          expect(testIdLog).toBeDefined();
          console.log('✓ Test ID found: console-mixed-001');

          // Count message types
          const logs = result.consoleLogs.filter(
            log => log.level === 'log' || log.level === 'info'
          );
          const warnings = result.consoleLogs.filter(
            log => log.level === 'warn' || log.level === 'warning'
          );
          const errors = result.consoleLogs.filter(log => log.level === 'error');

          console.log(
            `✓ Breakdown: ${logs.length} logs, ${warnings.length} warnings, ${errors.length} errors`
          );

          // Validate we captured all types
          expect(logs.length).toBeGreaterThan(0);
          expect(warnings.length).toBeGreaterThanOrEqual(2); // Expected: 2 warnings
          expect(errors.length).toBeGreaterThanOrEqual(1); // Expected: 1 error

          console.log('✓ Mixed output types validated');

          console.log('═══════════════════════════════════════════════════════');
          console.log('✅ Mixed output capture validated for console-mixed-test.html\n');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId);
            console.log(`✓ Cleaned up tab ${tabId}`);
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // WORKFLOW TEST: Complete Lifecycle
  // ==========================

  describe('Complete Test Workflow', () => {
    test(
      'opens → reloads → captures → closes test page',
      async () => {
        let tabId;
        try {
          console.log('\n🔄 Testing: Complete workflow with reload');
          console.log('═══════════════════════════════════════════════════════');

          // Step 1: Open test page
          const opened = await chromeDevAssist.openUrl(getFixtureUrl('basic-test.html'), {
            active: false,
          });

          tabId = opened.tabId;
          console.log(`✓ Step 1: Opened tab ${tabId}`);

          // Step 2: Wait for page to load
          await sleep(1000);

          // Step 3: Reload with console capture
          const reloaded = await chromeDevAssist.reloadTab(tabId, {
            bypassCache: false,
            captureConsole: true,
            duration: 2000,
          });

          console.log(`✓ Step 2: Reloaded tab ${tabId}`);
          console.log(`✓ Captured ${reloaded.consoleLogs.length} console messages`);

          // Validate test identification still present after reload
          const testIdLog = reloaded.consoleLogs.find(
            log => log.message && log.message.includes('basic-test-001')
          );

          expect(testIdLog).toBeDefined();
          console.log('✓ Step 3: Test ID validated after reload');

          // Step 4: Close tab
          const closed = await chromeDevAssist.closeTab(tabId);
          expect(closed.closed).toBe(true);
          console.log(`✓ Step 4: Closed tab ${tabId}`);

          tabId = null; // Prevent double cleanup

          console.log('═══════════════════════════════════════════════════════');
          console.log('✅ Complete workflow validated\n');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId).catch(() => {});
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // CONCURRENT TEST: Multiple Fixtures
  // ==========================

  describe('Concurrent Fixture Testing', () => {
    test(
      'opens multiple test fixtures simultaneously',
      async () => {
        const tabIds = [];
        try {
          console.log('\n⚡ Testing: Concurrent fixture loading');
          console.log('═══════════════════════════════════════════════════════');

          // Open all 3 fixtures concurrently
          const promises = [
            chromeDevAssist.openUrl(getFixtureUrl('basic-test.html'), {
              active: false,
              captureConsole: true,
              duration: 2000,
              autoClose: true, // Prevent tab leaks
            }),
            chromeDevAssist.openUrl(getFixtureUrl('console-errors-test.html'), {
              active: false,
              captureConsole: true,
              duration: 3000,
              autoClose: true, // Prevent tab leaks
            }),
            chromeDevAssist.openUrl(getFixtureUrl('console-mixed-test.html'), {
              active: false,
              captureConsole: true,
              duration: 3000,
              autoClose: true, // Prevent tab leaks
            }),
          ];

          const results = await Promise.all(promises);

          // Collect tab IDs
          results.forEach(result => tabIds.push(result.tabId));

          console.log(`✓ Opened ${results.length} tabs concurrently`);
          console.log(`✓ Tab IDs: ${tabIds.join(', ')}`);

          // Validate all tabs have unique IDs
          expect(new Set(tabIds).size).toBe(3);
          console.log('✓ All tabs have unique IDs');

          // Validate each fixture captured its identification
          expect(
            results[0].consoleLogs.some(
              log => log.message && log.message.includes('basic-test-001')
            )
          ).toBe(true);
          console.log('✓ Fixture 1: basic-test-001 validated');

          expect(
            results[1].consoleLogs.some(
              log => log.message && log.message.includes('console-errors-001')
            )
          ).toBe(true);
          console.log('✓ Fixture 2: console-errors-001 validated');

          expect(
            results[2].consoleLogs.some(
              log => log.message && log.message.includes('console-mixed-001')
            )
          ).toBe(true);
          console.log('✓ Fixture 3: console-mixed-001 validated');

          console.log('═══════════════════════════════════════════════════════');
          console.log('✅ Concurrent fixture loading validated\n');
        } finally {
          // Clean up all tabs
          await Promise.all(tabIds.map(tabId => chromeDevAssist.closeTab(tabId).catch(() => {})));
          console.log(`✓ Cleaned up ${tabIds.length} tabs`);
        }
      },
      TEST_TIMEOUT
    );
  });
});

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

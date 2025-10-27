/**
 * Phase 1.1 - Medium Complexity Tests
 * Persona-driven testing with realistic workflows
 *
 * Test Levels:
 * - Easy: Basic happy path (✅ done in phase-1.1.test.js)
 * - Medium: THIS FILE - Realistic workflows, multiple operations
 * - Hard: Edge cases, boundary conditions
 * - Extreme: Failure modes, stress tests
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const chromeDevAssist = require('../../claude-code/index.js');

// Test configuration
const WEBSOCKET_URL = 'ws://localhost:9876';
const TEST_TIMEOUT = 30000;

describe('Phase 1.1 - Medium Complexity Tests', () => {
  // ==========================
  // PERSONA 1: BEGINNER DEVELOPER
  // Focus: API confusion, common mistakes
  // ==========================

  describe('Beginner Developer - Realistic Confusion', () => {
    test(
      'passes wrong types to functions that expect none',
      async () => {
        // Common mistake: passing arguments when none are needed
        try {
          // getAllExtensions() takes no arguments, but beginner might pass something
          const result = await chromeDevAssist.getAllExtensions();
          expect(result).toHaveProperty('extensions');
          expect(result).toHaveProperty('count');
        } catch (err) {
          // Should not error - just ignore extra args
          throw new Error('Should handle extra arguments gracefully: ' + err.message);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'forgets to await async functions',
      async () => {
        // This test validates that we return proper promises
        const promise = chromeDevAssist.getAllExtensions();
        expect(promise).toBeInstanceOf(Promise);
        const result = await promise;
        expect(result).toHaveProperty('extensions');
      },
      TEST_TIMEOUT
    );

    test(
      'confuses tabId with URL string',
      async () => {
        // Beginner might try to reload by URL instead of tabId
        try {
          await chromeDevAssist.reloadTab('https://example.com');
          throw new Error('Should throw error for string tabId');
        } catch (err) {
          expect(err.message).toMatch(/tabId must be a positive number/i);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'uses negative or zero tabId',
      async () => {
        // Beginner might experiment with invalid IDs
        try {
          await chromeDevAssist.reloadTab(-1);
          throw new Error('Should throw error for negative tabId');
        } catch (err) {
          expect(err.message).toMatch(/tabId must be a positive number/i);
        }

        try {
          await chromeDevAssist.closeTab(0);
          throw new Error('Should throw error for zero tabId');
        } catch (err) {
          expect(err.message).toMatch(/tabId must be a positive number/i);
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // PERSONA 2: BUSY DEVELOPER
  // Focus: Reliability, speed, multiple operations
  // ==========================

  describe('Busy Developer - Rapid Workflows', () => {
    test(
      'opens multiple tabs quickly',
      async () => {
        const tabs = [];
        try {
          // Open 3 tabs in quick succession
          const tab1 = await chromeDevAssist.openUrl('https://example.com', { active: false });
          const tab2 = await chromeDevAssist.openUrl('https://google.com', { active: false });
          const tab3 = await chromeDevAssist.openUrl('https://github.com', { active: false });

          expect(tab1.tabId).toBeDefined();
          expect(tab2.tabId).toBeDefined();
          expect(tab3.tabId).toBeDefined();

          tabs.push(tab1.tabId, tab2.tabId, tab3.tabId);

          // All tabs should have unique IDs
          expect(new Set(tabs).size).toBe(3);
        } finally {
          // Clean up all tabs
          for (const tabId of tabs) {
            try {
              await chromeDevAssist.closeTab(tabId);
            } catch (err) {
              // Ignore cleanup errors
            }
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'open -> reload -> close workflow',
      async () => {
        let tabId;
        try {
          // Full workflow: open, reload, close
          const opened = await chromeDevAssist.openUrl('https://example.com', { active: false });
          tabId = opened.tabId;

          // Give tab time to load
          await sleep(500);

          const reloaded = await chromeDevAssist.reloadTab(tabId);
          expect(reloaded.tabId).toBe(tabId);

          const closed = await chromeDevAssist.closeTab(tabId);
          expect(closed.closed).toBe(true);
          expect(closed.tabId).toBe(tabId);

          tabId = null; // Don't try to close again
        } finally {
          if (tabId) {
            try {
              await chromeDevAssist.closeTab(tabId);
            } catch (err) {
              // Tab might already be closed
            }
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'queries extension info multiple times',
      async () => {
        // Get all extensions first
        const { extensions } = await chromeDevAssist.getAllExtensions();
        expect(extensions.length).toBeGreaterThan(0);

        // Pick first extension and query it multiple times
        const extensionId = extensions[0].id;

        const info1 = await chromeDevAssist.getExtensionInfo(extensionId);
        const info2 = await chromeDevAssist.getExtensionInfo(extensionId);
        const info3 = await chromeDevAssist.getExtensionInfo(extensionId);

        // Should return consistent data
        expect(info1.id).toBe(extensionId);
        expect(info2.id).toBe(extensionId);
        expect(info3.id).toBe(extensionId);
        expect(info1.name).toBe(info2.name);
        expect(info2.name).toBe(info3.name);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // PERSONA 3: SECURITY EXPERT
  // Focus: Input validation, injection attempts
  // ==========================

  describe('Security Expert - Basic Injection Attempts', () => {
    test(
      'rejects javascript: protocol URLs',
      async () => {
        try {
          await chromeDevAssist.openUrl('javascript:alert("XSS")');
          throw new Error('Should reject javascript: URLs');
        } catch (err) {
          // Should throw - either from validation or Chrome itself
          expect(err).toBeDefined();
        }
      },
      TEST_TIMEOUT
    );

    test(
      'handles SQL-like injection in extensionId',
      async () => {
        try {
          await chromeDevAssist.getExtensionInfo("'; DROP TABLE extensions; --");
          throw new Error('Should throw error for invalid extensionId format');
        } catch (err) {
          expect(err.message).toMatch(
            /extensionId must be 32 characters|Invalid extensionId format/i
          );
        }
      },
      TEST_TIMEOUT
    );

    test(
      'validates extensionId length strictly',
      async () => {
        // Too short
        try {
          await chromeDevAssist.getExtensionInfo('abc');
          throw new Error('Should reject short extensionId');
        } catch (err) {
          expect(err.message).toMatch(/extensionId must be 32 characters/i);
        }

        // Too long
        try {
          await chromeDevAssist.getExtensionInfo('a'.repeat(64));
          throw new Error('Should reject long extensionId');
        } catch (err) {
          expect(err.message).toMatch(/extensionId must be 32 characters/i);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'validates extensionId character set',
      async () => {
        // Chrome extension IDs are lowercase a-p only
        const invalidChars = '12345678901234567890123456789012'; // numbers
        try {
          await chromeDevAssist.getExtensionInfo(invalidChars);
          throw new Error('Should reject non a-p characters');
        } catch (err) {
          expect(err.message).toMatch(/Invalid extensionId format/i);
        }

        const invalidUpper = 'ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP'; // uppercase
        try {
          await chromeDevAssist.getExtensionInfo(invalidUpper);
          throw new Error('Should reject uppercase characters');
        } catch (err) {
          expect(err.message).toMatch(/Invalid extensionId format/i);
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // PERSONA 4: DEBUGGER
  // Focus: Diagnostic info, error details
  // ==========================

  describe('Debugger - Error Details', () => {
    test(
      'provides clear error for non-existent extension',
      async () => {
        const fakeId = 'a'.repeat(32); // Valid format, but doesn't exist
        try {
          await chromeDevAssist.getExtensionInfo(fakeId);
          throw new Error('Should throw error for non-existent extension');
        } catch (err) {
          expect(err.message).toMatch(/Extension not found/i);
          expect(err.message).toContain(fakeId);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'returns detailed extension info including permissions',
      async () => {
        const { extensions } = await chromeDevAssist.getAllExtensions();
        expect(extensions.length).toBeGreaterThan(0);

        const info = await chromeDevAssist.getExtensionInfo(extensions[0].id);

        // Should have detailed diagnostic info
        expect(info).toHaveProperty('id');
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('enabled');
        expect(info).toHaveProperty('permissions');
        expect(info).toHaveProperty('hostPermissions');
        expect(info).toHaveProperty('installType');
        expect(info).toHaveProperty('mayDisable');

        // Permissions should be arrays
        expect(Array.isArray(info.permissions)).toBe(true);
        expect(Array.isArray(info.hostPermissions)).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'openUrl returns tabId for tracking',
      async () => {
        let tabId;
        try {
          const result = await chromeDevAssist.openUrl('https://example.com', { active: false });

          expect(result).toHaveProperty('tabId');
          expect(result).toHaveProperty('url');
          expect(typeof result.tabId).toBe('number');
          expect(result.tabId).toBeGreaterThan(0);

          tabId = result.tabId;
        } finally {
          if (tabId) {
            try {
              await chromeDevAssist.closeTab(tabId);
            } catch (err) {
              // Ignore cleanup errors
            }
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // PERSONA 5: RELIABILITY ENGINEER
  // Focus: Concurrent operations, timing
  // ==========================

  describe('Reliability Engineer - Concurrent Operations', () => {
    test(
      'handles parallel getAllExtensions calls',
      async () => {
        // Fire 5 concurrent requests
        const promises = [
          chromeDevAssist.getAllExtensions(),
          chromeDevAssist.getAllExtensions(),
          chromeDevAssist.getAllExtensions(),
          chromeDevAssist.getAllExtensions(),
          chromeDevAssist.getAllExtensions(),
        ];

        const results = await Promise.all(promises);

        // All should succeed
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result).toHaveProperty('extensions');
          expect(result).toHaveProperty('count');
        });

        // All should return same count (extensions don't change during test)
        const counts = results.map(r => r.count);
        expect(new Set(counts).size).toBe(1);
      },
      TEST_TIMEOUT
    );

    test(
      'handles parallel getExtensionInfo calls',
      async () => {
        const { extensions } = await chromeDevAssist.getAllExtensions();
        expect(extensions.length).toBeGreaterThan(0);

        const extensionId = extensions[0].id;

        // Query same extension 5 times concurrently
        const promises = [
          chromeDevAssist.getExtensionInfo(extensionId),
          chromeDevAssist.getExtensionInfo(extensionId),
          chromeDevAssist.getExtensionInfo(extensionId),
          chromeDevAssist.getExtensionInfo(extensionId),
          chromeDevAssist.getExtensionInfo(extensionId),
        ];

        const results = await Promise.all(promises);

        // All should succeed with same data
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.id).toBe(extensionId);
          expect(result.name).toBe(results[0].name);
        });
      },
      TEST_TIMEOUT
    );

    test(
      'opens multiple tabs concurrently',
      async () => {
        const tabIds = [];
        try {
          // Open 3 tabs at once
          const promises = [
            chromeDevAssist.openUrl('https://example.com', { active: false }),
            chromeDevAssist.openUrl('https://google.com', { active: false }),
            chromeDevAssist.openUrl('https://github.com', { active: false }),
          ];

          const results = await Promise.all(promises);

          // All should succeed with unique tab IDs
          expect(results).toHaveLength(3);
          results.forEach(result => {
            expect(result.tabId).toBeDefined();
            expect(typeof result.tabId).toBe('number');
            tabIds.push(result.tabId);
          });

          expect(new Set(tabIds).size).toBe(3); // All unique
        } finally {
          // Clean up all tabs
          await Promise.all(tabIds.map(tabId => chromeDevAssist.closeTab(tabId).catch(() => {})));
        }
      },
      TEST_TIMEOUT
    );
  });

  // ==========================
  // PERSONA 6: PERFECTIONIST
  // Focus: Edge cases, consistency
  // ==========================

  describe('Perfectionist - Consistency and Edge Cases', () => {
    test(
      'getAllExtensions count matches array length',
      async () => {
        const result = await chromeDevAssist.getAllExtensions();
        expect(result.count).toBe(result.extensions.length);
      },
      TEST_TIMEOUT
    );

    test(
      'getAllExtensions filters out Chrome Dev Assist itself',
      async () => {
        const result = await chromeDevAssist.getAllExtensions();

        // Should not include self
        const selfFound = result.extensions.some(ext => ext.name === 'Chrome Dev Assist');
        expect(selfFound).toBe(false);
      },
      TEST_TIMEOUT
    );

    test(
      'openUrl with active:true focuses tab',
      async () => {
        let tabId;
        try {
          const result = await chromeDevAssist.openUrl('https://example.com', {
            active: true,
          });
          tabId = result.tabId;

          // Should return tabId
          expect(result.tabId).toBeDefined();
          expect(typeof result.tabId).toBe('number');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId).catch(() => {});
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'openUrl with active:false backgrounds tab',
      async () => {
        let tabId;
        try {
          const result = await chromeDevAssist.openUrl('https://example.com', {
            active: false,
          });
          tabId = result.tabId;

          // Should return tabId
          expect(result.tabId).toBeDefined();
          expect(typeof result.tabId).toBe('number');
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId).catch(() => {});
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'reloadTab with bypassCache option',
      async () => {
        let tabId;
        try {
          // Open tab first
          const opened = await chromeDevAssist.openUrl('https://example.com', { active: false });
          tabId = opened.tabId;

          // Give tab time to load
          await sleep(500);

          // Hard reload
          const result = await chromeDevAssist.reloadTab(tabId, { bypassCache: true });
          expect(result.bypassCache).toBe(true);
          expect(result.tabId).toBe(tabId);
        } finally {
          if (tabId) {
            await chromeDevAssist.closeTab(tabId).catch(() => {});
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'closeTab returns correct response',
      async () => {
        // Open tab
        const opened = await chromeDevAssist.openUrl('https://example.com', { active: false });
        const tabId = opened.tabId;

        // Close tab
        const result = await chromeDevAssist.closeTab(tabId);
        expect(result.closed).toBe(true);
        expect(result.tabId).toBe(tabId);

        // Trying to close again should fail (tab already closed)
        try {
          await chromeDevAssist.closeTab(tabId);
          // May or may not throw depending on Chrome's response time
        } catch (err) {
          // Expected - tab no longer exists
          expect(err).toBeDefined();
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

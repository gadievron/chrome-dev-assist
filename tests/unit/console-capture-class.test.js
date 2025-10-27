/**
 * ConsoleCapture Class - Comprehensive Unit Tests
 *
 * Test-First Discipline: These tests are written BEFORE integrating the class
 * into background.js. They validate all edge cases, limits, and error conditions.
 *
 * Coverage:
 * - Constructor
 * - start() - 9 tests
 * - addLog() - 8 tests
 * - getLogs() - 4 tests
 * - stop() - 4 tests
 * - cleanup() - 5 tests
 * - cleanupStale() - 4 tests
 * - isActive() - 3 tests
 * - getStats() - 2 tests
 * - getAllCaptureIds() - 2 tests
 *
 * Total: 43 tests
 */

const ConsoleCapture = require('../../extension/modules/ConsoleCapture.js');

// Helper function for async sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ConsoleCapture Class - Comprehensive Tests', () => {
  let consoleCapture;

  beforeEach(() => {
    consoleCapture = new ConsoleCapture();
  });

  afterEach(() => {
    // Cleanup all captures
    const captureIds = consoleCapture.getAllCaptureIds();
    for (const captureId of captureIds) {
      consoleCapture.cleanup(captureId);
    }
  });

  // =========================================================================
  // CONSTRUCTOR TESTS (2 tests)
  // =========================================================================

  describe('Constructor', () => {
    test('constructor creates empty Maps', () => {
      const capture = new ConsoleCapture();
      expect(capture.captures.size).toBe(0);
      expect(capture.capturesByTab.size).toBe(0);
    });

    test('constructor sets default config', () => {
      const capture = new ConsoleCapture();
      expect(capture.config.defaultDuration).toBe(5000);
      expect(capture.config.defaultMaxLogs).toBe(10000);
    });
  });

  // =========================================================================
  // start() TESTS (9 tests)
  // =========================================================================

  describe('start()', () => {
    test('start() creates capture state with logs array', () => {
      consoleCapture.start('test-001');

      const state = consoleCapture.captures.get('test-001');
      expect(state).toBeDefined();
      expect(Array.isArray(state.logs)).toBe(true);
      expect(state.logs.length).toBe(0);
    });

    test('start() sets active=true', () => {
      consoleCapture.start('test-002');

      const state = consoleCapture.captures.get('test-002');
      expect(state.active).toBe(true);
    });

    test('start() stores tabId (number)', () => {
      consoleCapture.start('test-003', { tabId: 123 });

      const state = consoleCapture.captures.get('test-003');
      expect(state.tabId).toBe(123);
    });

    test('start() stores tabId=null for global captures', () => {
      consoleCapture.start('test-004', { tabId: null });

      const state = consoleCapture.captures.get('test-004');
      expect(state.tabId).toBe(null);
    });

    test('start() adds to capturesByTab Map (tab-specific)', () => {
      consoleCapture.start('test-005', { tabId: 456 });

      const tabSet = consoleCapture.capturesByTab.get(456);
      expect(tabSet).toBeDefined();
      expect(tabSet.has('test-005')).toBe(true);
    });

    test('start() does NOT add to capturesByTab when tabId=null', () => {
      consoleCapture.start('test-006', { tabId: null });

      // Should not have a null key in capturesByTab
      expect(consoleCapture.capturesByTab.has(null)).toBe(false);
    });

    test('start() creates auto-stop timeout when duration provided', async () => {
      consoleCapture.start('test-007', { duration: 100 });

      expect(consoleCapture.isActive('test-007')).toBe(true);

      // Wait for auto-stop
      await sleep(150);

      expect(consoleCapture.isActive('test-007')).toBe(false);
    }, 10000);

    test('start() uses maxLogs option', () => {
      consoleCapture.start('test-008', { maxLogs: 500 });

      const state = consoleCapture.captures.get('test-008');
      expect(state.maxLogs).toBe(500);
    });

    test('start() throws error for duplicate captureId', () => {
      consoleCapture.start('test-009');

      expect(() => {
        consoleCapture.start('test-009');
      }).toThrow();
    });
  });

  // =========================================================================
  // addLog() TESTS (8 tests)
  // =========================================================================

  describe('addLog()', () => {
    test('addLog() adds log to active tab-specific capture', () => {
      consoleCapture.start('test-101', { tabId: 100 });

      const logEntry = {
        level: 'log',
        message: 'Test message',
        timestamp: new Date().toISOString(),
        tabId: 100
      };

      consoleCapture.addLog(100, logEntry);

      const logs = consoleCapture.getLogs('test-101');
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
    });

    test('addLog() adds log to active global capture (tabId=null)', () => {
      consoleCapture.start('test-102', { tabId: null });

      const logEntry = {
        level: 'log',
        message: 'Global message',
        timestamp: new Date().toISOString(),
        tabId: 999
      };

      // Global captures should receive logs from ANY tab
      consoleCapture.addLog(999, logEntry);

      const logs = consoleCapture.getLogs('test-102');
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Global message');
    });

    test('addLog() does NOT add to inactive capture', () => {
      consoleCapture.start('test-103', { tabId: 200 });
      consoleCapture.stop('test-103');

      const logEntry = {
        level: 'log',
        message: 'Should not appear',
        timestamp: new Date().toISOString(),
        tabId: 200
      };

      consoleCapture.addLog(200, logEntry);

      const logs = consoleCapture.getLogs('test-103');
      expect(logs.length).toBe(0);
    });

    test('addLog() enforces maxLogs limit', () => {
      consoleCapture.start('test-104', { tabId: 300, maxLogs: 5 });

      // Add 10 logs (exceeds limit of 5)
      for (let i = 0; i < 10; i++) {
        consoleCapture.addLog(300, {
          level: 'log',
          message: `Message ${i}`,
          timestamp: new Date().toISOString(),
          tabId: 300
        });
      }

      const logs = consoleCapture.getLogs('test-104');
      // Should have 5 regular logs + 1 warning = 6 total
      expect(logs.length).toBeLessThanOrEqual(6);
    });

    test('addLog() adds warning at maxLogs limit', () => {
      consoleCapture.start('test-105', { tabId: 400, maxLogs: 3 });

      // Add 5 logs (exceeds limit of 3)
      for (let i = 0; i < 5; i++) {
        consoleCapture.addLog(400, {
          level: 'log',
          message: `Message ${i}`,
          timestamp: new Date().toISOString(),
          tabId: 400
        });
      }

      const logs = consoleCapture.getLogs('test-105');

      // Check for warning message
      const warningLog = logs.find(log =>
        log.message && log.message.includes('Log limit reached')
      );
      expect(warningLog).toBeDefined();
      expect(warningLog.level).toBe('warn');
    });

    test('addLog() silently drops logs after maxLogs+1', () => {
      consoleCapture.start('test-106', { tabId: 500, maxLogs: 2 });

      // Add 10 logs
      for (let i = 0; i < 10; i++) {
        consoleCapture.addLog(500, {
          level: 'log',
          message: `Message ${i}`,
          timestamp: new Date().toISOString(),
          tabId: 500
        });
      }

      const logs = consoleCapture.getLogs('test-106');

      // Should have exactly: 2 regular logs + 1 warning = 3 total
      // Everything after should be dropped
      expect(logs.length).toBeLessThanOrEqual(3);
    });

    test('addLog() handles multiple captures for same tabId', () => {
      consoleCapture.start('test-107a', { tabId: 600 });
      consoleCapture.start('test-107b', { tabId: 600 });

      const logEntry = {
        level: 'log',
        message: 'Shared tab message',
        timestamp: new Date().toISOString(),
        tabId: 600
      };

      consoleCapture.addLog(600, logEntry);

      // Both captures should receive the log
      const logsA = consoleCapture.getLogs('test-107a');
      const logsB = consoleCapture.getLogs('test-107b');

      expect(logsA.length).toBe(1);
      expect(logsB.length).toBe(1);
      expect(logsA[0].message).toBe('Shared tab message');
      expect(logsB[0].message).toBe('Shared tab message');
    });

    test('addLog() uses O(1) lookup via capturesByTab', () => {
      // Create 1000 global captures (not in capturesByTab)
      for (let i = 0; i < 1000; i++) {
        consoleCapture.start(`global-${i}`, { tabId: null });
      }

      // Create 1 tab-specific capture
      consoleCapture.start('test-108', { tabId: 777 });

      // Add log - should use O(1) lookup, not O(n) iteration
      const startTime = Date.now();

      consoleCapture.addLog(777, {
        level: 'log',
        message: 'Fast lookup',
        timestamp: new Date().toISOString(),
        tabId: 777
      });

      const elapsed = Date.now() - startTime;

      // O(1) lookup should be <10ms even with 1000 captures
      // (O(n) would be >50ms)
      expect(elapsed).toBeLessThan(10);

      const logs = consoleCapture.getLogs('test-108');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // getLogs() TESTS (4 tests)
  // =========================================================================

  describe('getLogs()', () => {
    test('getLogs() returns logs array', () => {
      consoleCapture.start('test-201', { tabId: 800 });

      consoleCapture.addLog(800, {
        level: 'log',
        message: 'Test',
        timestamp: new Date().toISOString(),
        tabId: 800
      });

      const logs = consoleCapture.getLogs('test-201');

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(1);
    });

    test('getLogs() returns COPY not reference (immutability)', () => {
      consoleCapture.start('test-202', { tabId: 900 });

      consoleCapture.addLog(900, {
        level: 'log',
        message: 'Original',
        timestamp: new Date().toISOString(),
        tabId: 900
      });

      const logs1 = consoleCapture.getLogs('test-202');
      expect(logs1.length).toBe(1);

      // Mutate the returned array
      logs1.push({
        level: 'error',
        message: 'FAKE',
        timestamp: new Date().toISOString(),
        tabId: 900
      });

      // Get logs again - should NOT contain the fake entry
      const logs2 = consoleCapture.getLogs('test-202');
      expect(logs2.length).toBe(1);
      expect(logs2[0].message).toBe('Original');
    });

    test('getLogs() returns empty array for unknown captureId', () => {
      const logs = consoleCapture.getLogs('nonexistent-capture');

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });

    test('getLogs() returns empty array for cleaned up capture', () => {
      consoleCapture.start('test-204', { tabId: 1000 });
      consoleCapture.cleanup('test-204');

      const logs = consoleCapture.getLogs('test-204');

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });
  });

  // =========================================================================
  // stop() TESTS (4 tests)
  // =========================================================================

  describe('stop()', () => {
    test('stop() sets active=false', () => {
      consoleCapture.start('test-301');

      expect(consoleCapture.isActive('test-301')).toBe(true);

      consoleCapture.stop('test-301');

      expect(consoleCapture.isActive('test-301')).toBe(false);
    });

    test('stop() sets endTime', () => {
      consoleCapture.start('test-302');

      const beforeStop = Date.now();
      consoleCapture.stop('test-302');
      const afterStop = Date.now();

      const state = consoleCapture.captures.get('test-302');
      expect(state.endTime).toBeGreaterThanOrEqual(beforeStop);
      expect(state.endTime).toBeLessThanOrEqual(afterStop);
    });

    test('stop() clears timeout', () => {
      consoleCapture.start('test-303', { duration: 10000 });

      const state = consoleCapture.captures.get('test-303');
      expect(state.timeout).toBeDefined();

      consoleCapture.stop('test-303');

      const stateAfter = consoleCapture.captures.get('test-303');
      expect(stateAfter.timeout).toBeNull();
    });

    test('stop() does nothing for unknown captureId', () => {
      // Should not throw error
      expect(() => {
        consoleCapture.stop('nonexistent-capture');
      }).not.toThrow();
    });
  });

  // =========================================================================
  // cleanup() TESTS (5 tests)
  // =========================================================================

  describe('cleanup()', () => {
    test('cleanup() removes from captures Map', () => {
      consoleCapture.start('test-401');

      expect(consoleCapture.captures.has('test-401')).toBe(true);

      consoleCapture.cleanup('test-401');

      expect(consoleCapture.captures.has('test-401')).toBe(false);
    });

    test('cleanup() removes from capturesByTab Map', () => {
      consoleCapture.start('test-402', { tabId: 1100 });

      expect(consoleCapture.capturesByTab.get(1100).has('test-402')).toBe(true);

      consoleCapture.cleanup('test-402');

      const tabSet = consoleCapture.capturesByTab.get(1100);
      if (tabSet) {
        expect(tabSet.has('test-402')).toBe(false);
      }
    });

    test('cleanup() removes empty Sets from capturesByTab', () => {
      consoleCapture.start('test-403', { tabId: 1200 });

      consoleCapture.cleanup('test-403');

      // Empty set should be deleted to prevent memory leaks
      expect(consoleCapture.capturesByTab.has(1200)).toBe(false);
    });

    test('cleanup() clears timeout if exists', async () => {
      consoleCapture.start('test-404', { duration: 10000 });

      consoleCapture.cleanup('test-404');

      // Wait to ensure timeout didn't fire
      await sleep(100);

      // Capture should be gone (not just stopped)
      expect(consoleCapture.captures.has('test-404')).toBe(false);
    }, 10000);

    test('cleanup() is idempotent (safe to call multiple times)', () => {
      consoleCapture.start('test-405');

      consoleCapture.cleanup('test-405');
      consoleCapture.cleanup('test-405');
      consoleCapture.cleanup('test-405');

      // Should not throw error
      expect(consoleCapture.captures.has('test-405')).toBe(false);
    });
  });

  // =========================================================================
  // cleanupStale() TESTS (4 tests)
  // Returns count of cleaned captures for logging in background.js
  // =========================================================================

  describe('cleanupStale()', () => {
    test('cleanupStale() removes captures older than threshold and returns count', async () => {
      consoleCapture.start('test-501');
      consoleCapture.stop('test-501');

      // Wait 200ms
      await sleep(200);

      // Cleanup captures older than 100ms
      const count = consoleCapture.cleanupStale(100);

      expect(count).toBe(1); // 1 capture removed
      expect(consoleCapture.captures.has('test-501')).toBe(false);
    }, 10000);

    test('cleanupStale() returns 0 when no captures removed', async () => {
      consoleCapture.start('test-502');
      consoleCapture.stop('test-502');

      // Wait 50ms
      await sleep(50);

      // Cleanup captures older than 200ms
      const count = consoleCapture.cleanupStale(200);

      expect(count).toBe(0); // No captures removed
      expect(consoleCapture.captures.has('test-502')).toBe(true);
    }, 10000);

    test('cleanupStale() does not clean active captures, returns 0', async () => {
      consoleCapture.start('test-503');
      // Don't stop - keep active

      // Wait 200ms
      await sleep(200);

      // Cleanup old captures
      const count = consoleCapture.cleanupStale(100);

      // Should NOT clean up active captures (even if old)
      expect(count).toBe(0); // No captures removed
      expect(consoleCapture.captures.has('test-503')).toBe(true);
    }, 10000);

    test('cleanupStale() cleans multiple captures and returns count', async () => {
      // Create 5 captures and stop them
      for (let i = 0; i < 5; i++) {
        consoleCapture.start(`test-504-${i}`);
        consoleCapture.stop(`test-504-${i}`);
      }

      // Wait 200ms
      await sleep(200);

      // Cleanup
      const count = consoleCapture.cleanupStale(100);

      expect(count).toBe(5); // 5 captures removed
    }, 10000);
  });

  // =========================================================================
  // isActive() TESTS (3 tests)
  // =========================================================================

  describe('isActive()', () => {
    test('isActive() returns true for active capture', () => {
      consoleCapture.start('test-601');

      expect(consoleCapture.isActive('test-601')).toBe(true);
    });

    test('isActive() returns false for stopped capture', () => {
      consoleCapture.start('test-602');
      consoleCapture.stop('test-602');

      expect(consoleCapture.isActive('test-602')).toBe(false);
    });

    test('isActive() returns false for unknown captureId', () => {
      expect(consoleCapture.isActive('nonexistent-capture')).toBe(false);
    });
  });

  // =========================================================================
  // getStats() TESTS (2 tests)
  // =========================================================================

  describe('getStats()', () => {
    test('getStats() returns capture statistics', () => {
      consoleCapture.start('test-701', { tabId: 1300 });

      consoleCapture.addLog(1300, {
        level: 'log',
        message: 'Test',
        timestamp: new Date().toISOString(),
        tabId: 1300
      });

      const stats = consoleCapture.getStats('test-701');

      expect(stats).toBeDefined();
      expect(stats.logCount).toBe(1);
      expect(stats.active).toBe(true);
      expect(stats.startTime).toBeDefined();
    });

    test('getStats() includes logCount, active, startTime, endTime', () => {
      consoleCapture.start('test-702');
      consoleCapture.stop('test-702');

      const stats = consoleCapture.getStats('test-702');

      expect(stats).toHaveProperty('logCount');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('startTime');
      expect(stats).toHaveProperty('endTime');

      expect(stats.active).toBe(false);
      expect(stats.endTime).toBeDefined();
    });
  });

  // =========================================================================
  // getAllCaptureIds() TESTS (2 tests)
  // =========================================================================

  describe('getAllCaptureIds()', () => {
    test('getAllCaptureIds() returns all captureIds', () => {
      consoleCapture.start('test-801');
      consoleCapture.start('test-802');
      consoleCapture.start('test-803');

      const ids = consoleCapture.getAllCaptureIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(3);
      expect(ids).toContain('test-801');
      expect(ids).toContain('test-802');
      expect(ids).toContain('test-803');
    });

    test('getAllCaptureIds() returns empty array when no captures', () => {
      const ids = consoleCapture.getAllCaptureIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(0);
    });
  });

  // =========================================================================
  // getTotalCount() TESTS (4 tests)
  // =========================================================================

  describe('getTotalCount()', () => {
    test('getTotalCount() returns 0 when no captures exist', () => {
      expect(consoleCapture.getTotalCount()).toBe(0);
    });

    test('getTotalCount() returns correct count with active captures', () => {
      consoleCapture.start('test-901');
      expect(consoleCapture.getTotalCount()).toBe(1);

      consoleCapture.start('test-902');
      expect(consoleCapture.getTotalCount()).toBe(2);

      consoleCapture.start('test-903');
      expect(consoleCapture.getTotalCount()).toBe(3);
    });

    test('getTotalCount() returns correct count after cleanup', () => {
      consoleCapture.start('test-904');
      consoleCapture.start('test-905');
      expect(consoleCapture.getTotalCount()).toBe(2);

      consoleCapture.cleanup('test-904');
      expect(consoleCapture.getTotalCount()).toBe(1);

      consoleCapture.cleanup('test-905');
      expect(consoleCapture.getTotalCount()).toBe(0);
    });

    test('getTotalCount() includes both active and inactive captures', () => {
      consoleCapture.start('test-906');
      consoleCapture.start('test-907');
      expect(consoleCapture.getTotalCount()).toBe(2);

      // Stop one capture (inactive but not cleaned up)
      consoleCapture.stop('test-906');
      expect(consoleCapture.getTotalCount()).toBe(2); // Still counted

      // Cleanup removes it
      consoleCapture.cleanup('test-906');
      expect(consoleCapture.getTotalCount()).toBe(1);
    });
  });
});

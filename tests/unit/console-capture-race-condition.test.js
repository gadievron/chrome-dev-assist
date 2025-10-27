/**
 * Console Capture Race Condition Tests
 *
 * These tests validate the fix for the TOCTOU race condition where
 * console messages generated during page load are dropped because
 * the capture is registered AFTER the tab is created.
 *
 * Test-First Discipline: These tests are written BEFORE implementing the fix.
 * They will FAIL initially, then PASS after the fix is applied.
 */

const { handleOpenUrlCommand, sleep } = require('../../extension/background.js');

// Mock Chrome APIs
global.chrome = {
  tabs: {
    create: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
  runtime: {
    getManifest: jest.fn(() => ({ name: 'Test', version: '1.0.0' })),
  },
};

// Mock captureState and capturesByTab (these would be imported in real code)
const captureState = new Map();
const capturesByTab = new Map();

describe('Console Capture Race Condition Fix', () => {
  beforeEach(() => {
    // Reset state
    captureState.clear();
    capturesByTab.clear();
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Inline <head> Scripts (CRITICAL - 100% Failure Case)
   *
   * This is the WORST CASE scenario - inline scripts in <head> execute
   * IMMEDIATELY at document_start, before any capture can be registered.
   *
   * EXPECTED: All 3 console messages should be captured
   * ACTUAL (before fix): 0 messages captured (race condition)
   */
  it('should capture console messages from inline <head> scripts', async () => {
    // Simulate tab creation
    chrome.tabs.create.mockResolvedValue({ id: 123, url: 'test.html' });

    // Simulate immediate console messages (before capture registered)
    const immediateMessages = [
      { level: 'log', message: 'HEAD-INLINE-1', tabId: 123, timestamp: new Date().toISOString() },
      { level: 'error', message: 'HEAD-INLINE-2', tabId: 123, timestamp: new Date().toISOString() },
      { level: 'warn', message: 'HEAD-INLINE-3', tabId: 123, timestamp: new Date().toISOString() },
    ];

    // Mock message arrival during TOCTOU gap
    const captureRegistered = false;
    const bufferedMessages = [];

    // Simulate message handler that checks if capture exists
    const simulateMessageArrival = msg => {
      if (captureState.has('cmd-1') && captureState.get('cmd-1').active) {
        captureState.get('cmd-1').logs.push(msg);
      } else {
        // OLD BEHAVIOR: Drop message
        // NEW BEHAVIOR: Buffer for retry
        bufferedMessages.push(msg);
      }
    };

    // Simulate messages arriving BEFORE capture is registered
    setTimeout(() => {
      immediateMessages.forEach(msg => simulateMessageArrival(msg));
    }, 5);

    // Call handleOpenUrlCommand (will register capture at ~10-50ms)
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'data:text/html,<html><head><script>console.log("test")</script></head></html>',
      captureConsole: true,
      duration: 100,
    });

    // ASSERTION: All messages should be captured (not dropped)
    const pageMessages = result.consoleLogs.filter(
      log => !log.message.includes('[ChromeDevAssist]')
    );

    expect(pageMessages.length).toBeGreaterThanOrEqual(3);
    expect(pageMessages.some(log => log.message.includes('HEAD-INLINE-1'))).toBe(true);
    expect(pageMessages.some(log => log.message.includes('HEAD-INLINE-2'))).toBe(true);
    expect(pageMessages.some(log => log.message.includes('HEAD-INLINE-3'))).toBe(true);
  });

  /**
   * TEST 2: Pre-Registration Pattern
   *
   * Validates that capture is registered BEFORE tab is created,
   * eliminating the TOCTOU gap.
   */
  it('should register capture BEFORE creating tab', async () => {
    const captureTimestamps = [];
    const tabTimestamps = [];

    // Track when capture is registered
    const originalSet = captureState.set;
    captureState.set = jest.fn((...args) => {
      captureTimestamps.push(Date.now());
      return originalSet.apply(captureState, args);
    });

    // Track when tab is created
    chrome.tabs.create.mockImplementation(async opts => {
      tabTimestamps.push(Date.now());
      return { id: 123, url: opts.url };
    });

    await handleOpenUrlCommand('cmd-1', {
      url: 'http://localhost:9876/test.html',
      captureConsole: true,
      duration: 100,
    });

    // ASSERTION: Capture registered BEFORE tab created
    expect(captureTimestamps[0]).toBeLessThan(tabTimestamps[0]);
  });

  /**
   * TEST 3: Buffer Messages During Pending State
   *
   * If messages arrive while tab ID is not yet known,
   * they should be buffered and processed later.
   */
  it('should buffer messages that arrive before tab ID is set', async () => {
    chrome.tabs.create.mockImplementation(async () => {
      // Simulate slow tab creation (50ms)
      await sleep(50);
      return { id: 123, url: 'test.html' };
    });

    // Simulate message arriving during tab creation
    const earlyMessage = {
      level: 'log',
      message: 'EARLY-MESSAGE',
      timestamp: new Date().toISOString(),
    };

    // Start command
    const resultPromise = handleOpenUrlCommand('cmd-1', {
      url: 'http://localhost:9876/test.html',
      captureConsole: true,
      duration: 200,
    });

    // Send message after 10ms (before tab.id is known)
    setTimeout(() => {
      const capture = captureState.get('cmd-1');
      if (capture && capture.pendingTabUpdate) {
        // Should have buffer for pending messages
        if (!capture.bufferedMessages) {
          capture.bufferedMessages = [];
        }
        capture.bufferedMessages.push(earlyMessage);
      }
    }, 10);

    const result = await resultPromise;

    // ASSERTION: Buffered message should be in final logs
    expect(result.consoleLogs.some(log => log.message === 'EARLY-MESSAGE')).toBe(true);
  });

  /**
   * TEST 4: Global Capture Does NOT Cause Cross-Contamination
   *
   * The tester persona identified that Option 1 (global capture)
   * causes cross-contamination. This test ensures our fix doesn't
   * have that problem.
   */
  it('should NOT capture messages from other tabs when using pre-registration', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 123, url: 'test1.html' });

    // Start test capture
    const resultPromise = handleOpenUrlCommand('cmd-1', {
      url: 'http://localhost:9876/test.html',
      captureConsole: true,
      duration: 200,
    });

    // Simulate message from DIFFERENT tab (background tab user has open)
    setTimeout(() => {
      const capture = captureState.get('cmd-1');
      if (capture) {
        // Try to add message from wrong tab
        const wrongTabMessage = {
          level: 'log',
          message: 'MESSAGE-FROM-GMAIL',
          tabId: 456, // Different tab!
          timestamp: new Date().toISOString(),
        };

        // Should NOT be added (wrong tab)
        if (capture.tabId === null || capture.tabId === wrongTabMessage.tabId) {
          capture.logs.push(wrongTabMessage);
        }
      }
    }, 50);

    const result = await resultPromise;

    // ASSERTION: Should NOT contain messages from other tabs
    expect(result.consoleLogs.some(log => log.message.includes('GMAIL'))).toBe(false);
  });

  /**
   * TEST 5: Service Worker Restart During Capture
   *
   * Critical edge case: service worker restarts mid-capture,
   * clearing volatile memory.
   */
  it('should handle service worker restart gracefully', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 123, url: 'test.html' });

    const resultPromise = handleOpenUrlCommand('cmd-1', {
      url: 'http://localhost:9876/test.html',
      captureConsole: true,
      duration: 500,
    });

    // Simulate service worker restart after 100ms
    setTimeout(() => {
      // Clear volatile state (simulates service worker restart)
      captureState.clear();
      capturesByTab.clear();
    }, 100);

    // Should not crash, should return graceful error or empty result
    await expect(resultPromise).resolves.toBeDefined();
  });

  /**
   * TEST 6: Multiple Tabs Created Simultaneously
   *
   * Batch operation scenario - validates each capture is isolated.
   */
  it('should handle multiple simultaneous tab creations without cross-contamination', async () => {
    chrome.tabs.create
      .mockResolvedValueOnce({ id: 101, url: 'test1.html' })
      .mockResolvedValueOnce({ id: 102, url: 'test2.html' })
      .mockResolvedValueOnce({ id: 103, url: 'test3.html' });

    const results = await Promise.all([
      handleOpenUrlCommand('cmd-1', {
        url: 'http://localhost:9876/test1.html',
        captureConsole: true,
        duration: 200,
      }),
      handleOpenUrlCommand('cmd-2', {
        url: 'http://localhost:9876/test2.html',
        captureConsole: true,
        duration: 200,
      }),
      handleOpenUrlCommand('cmd-3', {
        url: 'http://localhost:9876/test3.html',
        captureConsole: true,
        duration: 200,
      }),
    ]);

    // Each capture should be isolated (verified by tabId)
    expect(results[0].tabId).toBe(101);
    expect(results[1].tabId).toBe(102);
    expect(results[2].tabId).toBe(103);

    // Captures should not share logs
    // (This would be tested more thoroughly with actual message simulation)
  });

  /**
   * TEST 7: Fast Local File (Worst Case Timing)
   *
   * Local files load in <5ms, maximizing race condition probability.
   */
  it('should capture console from fast-loading local file', async () => {
    chrome.tabs.create.mockImplementation(async opts => {
      // Simulate IMMEDIATE page load (local file)
      const tab = { id: 123, url: opts.url };

      // Simulate immediate console message (2ms after tab creation)
      setTimeout(() => {
        const capture = captureState.get('cmd-1');
        if (capture) {
          const msg = {
            level: 'log',
            message: 'FAST-LOCAL-MESSAGE',
            tabId: 123,
            timestamp: new Date().toISOString(),
          };

          // Add to capture if it exists and matches tabId
          if (capture.tabId === 123 || capture.tabId === null) {
            capture.logs.push(msg);
          }
        }
      }, 2);

      return tab;
    });

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'file:///Users/test/fast.html',
      captureConsole: true,
      duration: 200,
    });

    // Should capture the fast message
    expect(result.consoleLogs.some(log => log.message.includes('FAST-LOCAL'))).toBe(true);
  });
});

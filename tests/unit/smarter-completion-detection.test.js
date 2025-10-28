/**
 * Smarter Completion Detection Tests
 *
 * REQUIREMENT: End console capture when page signals ready instead of fixed duration
 *
 * Problem: Currently using fixed 10s duration for console capture.
 * - Too short → Misses messages from slow pages
 * - Too long → Wastes time on fast pages
 *
 * Solution: Inject script signals when page fully loaded and scripts executed.
 * Background ends capture early OR waits for max duration (whichever first).
 *
 * Benefits:
 * - Fast pages complete in <2s instead of always waiting 10s
 * - Slow pages get full duration without false negatives
 * - Better user experience (tests run faster)
 *
 * Test-First Discipline: These tests are written BEFORE implementing the feature.
 */

// Mock Chrome APIs
global.chrome = {
  tabs: {
    create: jest.fn(),
    remove: jest.fn(),
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

// Mock console capture state
const captureState = new Map();

// Mock page-ready signal handling
async function handlePageReadySignal(tabId) {
  // Find which capture this tab belongs to
  for (const [commandId, capture] of captureState.entries()) {
    if (capture.tabId === tabId && capture.active) {
      // End capture early
      console.log(`[Test] Page ready signal received for tab ${tabId}, ending capture early`);
      capture.active = false;
      capture.completedEarly = true;
      capture.endTime = Date.now();

      // Clear timeout if still pending
      if (capture.timeoutHandle) {
        clearTimeout(capture.timeoutHandle);
        capture.timeoutHandle = null;
      }

      return true;
    }
  }
  return false;
}

describe('Smarter Completion Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    captureState.clear();
  });

  // ========================================================================
  // Test Suite 1: Page-Ready Signal
  // ========================================================================

  describe('Page-ready signal mechanism', () => {
    test('should send page-ready signal after window.load event', () => {
      // Simulate: Page with defer scripts
      const mockWindow = {
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      // Simulate inject script registering listener
      mockWindow.addEventListener('load', () => {
        // Wait for defer scripts
        setTimeout(() => {
          const event = new CustomEvent('chromeDevAssist:pageReady');
          mockWindow.dispatchEvent(event);
        }, 100);
      });

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    });

    test('should forward page-ready signal from content script to background', () => {
      // Simulate: Content script receives CustomEvent
      const pageReadyEvent = new CustomEvent('chromeDevAssist:pageReady');

      // Content script forwards to background
      chrome.runtime.sendMessage({
        type: 'pageReady',
        tabId: 123,
        timestamp: Date.now(),
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'pageReady',
        tabId: 123,
        timestamp: expect.any(Number),
      });
    });

    test('should include tab ID in page-ready message', () => {
      const tabId = 456;

      chrome.runtime.sendMessage({
        type: 'pageReady',
        tabId: tabId,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ tabId: 456 })
      );
    });
  });

  // ========================================================================
  // Test Suite 2: Early Completion
  // ========================================================================

  describe('Early completion on page-ready', () => {
    test('should end capture early when page signals ready', async () => {
      // GIVEN: Active capture with 10s duration
      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        startTime: Date.now(),
        maxDuration: 10000,
        timeoutHandle: setTimeout(() => {}, 10000),
        completedEarly: false,
      });

      // WHEN: Page signals ready after 2s
      const completed = await handlePageReadySignal(123);

      // THEN: Capture ends early
      expect(completed).toBe(true);
      expect(captureState.get('cmd-1').active).toBe(false);
      expect(captureState.get('cmd-1').completedEarly).toBe(true);
      expect(captureState.get('cmd-1').timeoutHandle).toBeNull();
    });

    test('should not end capture if page-ready signal for wrong tab', async () => {
      // GIVEN: Capture for tab 123
      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        timeoutHandle: setTimeout(() => {}, 10000),
      });

      // WHEN: Page-ready signal for different tab
      const completed = await handlePageReadySignal(999);

      // THEN: Capture still active
      expect(completed).toBe(false);
      expect(captureState.get('cmd-1').active).toBe(true);
    });

    test('should handle multiple captures with different tabs', async () => {
      // GIVEN: Two active captures
      captureState.set('cmd-1', {
        tabId: 100,
        active: true,
        logs: [],
        timeoutHandle: setTimeout(() => {}, 10000),
        completedEarly: false,
      });

      captureState.set('cmd-2', {
        tabId: 200,
        active: true,
        logs: [],
        timeoutHandle: setTimeout(() => {}, 10000),
        completedEarly: false,
      });

      // WHEN: Tab 100 signals ready
      await handlePageReadySignal(100);

      // THEN: Only cmd-1 ends early
      expect(captureState.get('cmd-1').active).toBe(false);
      expect(captureState.get('cmd-1').completedEarly).toBe(true);
      expect(captureState.get('cmd-2').active).toBe(true); // Still active
      expect(captureState.get('cmd-2').completedEarly).toBe(false);
    });

    test('should clear timeout when ending capture early', async () => {
      const mockTimeout = setTimeout(() => {}, 10000);

      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        timeoutHandle: mockTimeout,
      });

      await handlePageReadySignal(123);

      expect(captureState.get('cmd-1').timeoutHandle).toBeNull();
    });
  });

  // ========================================================================
  // Test Suite 3: Timeout Fallback
  // ========================================================================

  describe('Timeout fallback for slow pages', () => {
    test('should still end capture after max duration if no page-ready signal', async () => {
      jest.useFakeTimers();

      const startTime = Date.now();
      let captureEnded = false;

      // GIVEN: Capture with 5s max duration
      const timeoutHandle = setTimeout(() => {
        captureEnded = true;
      }, 5000);

      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        startTime: startTime,
        maxDuration: 5000,
        timeoutHandle: timeoutHandle,
      });

      // WHEN: No page-ready signal arrives
      jest.advanceTimersByTime(5000);

      // THEN: Capture ends via timeout
      expect(captureEnded).toBe(true);

      jest.useRealTimers();
    });

    test('should ignore page-ready signal if already ended via timeout', async () => {
      // GIVEN: Capture already ended
      captureState.set('cmd-1', {
        tabId: 123,
        active: false, // Already ended
        logs: [],
        completedEarly: false, // Ended via timeout, not early
        timeoutHandle: null,
      });

      // WHEN: Late page-ready signal arrives
      const completed = await handlePageReadySignal(123);

      // THEN: Signal ignored
      expect(completed).toBe(false);
      expect(captureState.get('cmd-1').completedEarly).toBe(false);
    });
  });

  // ========================================================================
  // Test Suite 4: Real-World Scenarios
  // ========================================================================

  describe('Real-world page scenarios', () => {
    test('should complete fast page (data URI) in <1s', async () => {
      jest.useFakeTimers();

      const startTime = Date.now();
      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        startTime: startTime,
        maxDuration: 10000,
        timeoutHandle: setTimeout(() => {}, 10000),
      });

      // WHEN: Fast page signals ready after 500ms
      jest.advanceTimersByTime(500);
      await handlePageReadySignal(123);

      const duration = captureState.get('cmd-1').endTime - startTime;

      // THEN: Capture completed in <1s instead of waiting full 10s
      expect(duration).toBeLessThan(1000);
      expect(captureState.get('cmd-1').completedEarly).toBe(true);

      jest.useRealTimers();
    });

    test('should wait full duration for slow page without page-ready', async () => {
      jest.useFakeTimers();

      const startTime = Date.now();
      let timeoutFired = false;

      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        startTime: startTime,
        maxDuration: 10000,
        timeoutHandle: setTimeout(() => {
          timeoutFired = true;
        }, 10000),
      });

      // WHEN: Page never signals ready
      jest.advanceTimersByTime(10000);

      // THEN: Capture waits full 10s
      expect(timeoutFired).toBe(true);

      jest.useRealTimers();
    });

    test('should handle page with defer scripts (typical case)', async () => {
      jest.useFakeTimers();

      const startTime = Date.now();
      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        startTime: startTime,
        maxDuration: 10000,
        timeoutHandle: setTimeout(() => {}, 10000),
      });

      // Simulate: Page load (1s) + DOMContentLoaded (1s) + defer scripts (1s) = ~3s total
      jest.advanceTimersByTime(3000);
      await handlePageReadySignal(123);

      const duration = captureState.get('cmd-1').endTime - startTime;

      // THEN: Capture completes in ~3s instead of 10s
      expect(duration).toBeGreaterThan(2500);
      expect(duration).toBeLessThan(3500);
      expect(captureState.get('cmd-1').completedEarly).toBe(true);

      jest.useRealTimers();
    });
  });

  // ========================================================================
  // Test Suite 5: Edge Cases
  // ========================================================================

  describe('Edge cases and error handling', () => {
    test('should handle page-ready signal arriving multiple times', async () => {
      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        timeoutHandle: setTimeout(() => {}, 10000),
        completedEarly: false,
      });

      // WHEN: Page-ready signal arrives twice
      await handlePageReadySignal(123);
      const secondCall = await handlePageReadySignal(123);

      // THEN: Second signal is ignored
      expect(secondCall).toBe(false);
    });

    test('should not crash if captureState is empty', async () => {
      // GIVEN: No active captures
      captureState.clear();

      // WHEN: Page-ready signal arrives
      const completed = await handlePageReadySignal(123);

      // THEN: Gracefully returns false
      expect(completed).toBe(false);
    });

    test('should handle race between page-ready and timeout', async () => {
      jest.useFakeTimers();

      let timeoutFired = false;
      const timeoutHandle = setTimeout(() => {
        timeoutFired = true;
      }, 5000);

      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: [],
        timeoutHandle: timeoutHandle,
      });

      // WHEN: Page-ready arrives just before timeout
      jest.advanceTimersByTime(4999);
      await handlePageReadySignal(123);

      // Fast-forward past original timeout
      jest.advanceTimersByTime(1000);

      // THEN: Capture ended via page-ready, timeout was cleared
      expect(captureState.get('cmd-1').timeoutHandle).toBeNull();
      expect(timeoutFired).toBe(false); // Timeout was cleared

      jest.useRealTimers();
    });

    test('should preserve console logs when ending early', async () => {
      const existingLogs = [
        { level: 'log', message: 'Test 1', timestamp: Date.now() },
        { level: 'warn', message: 'Test 2', timestamp: Date.now() },
      ];

      captureState.set('cmd-1', {
        tabId: 123,
        active: true,
        logs: existingLogs,
        timeoutHandle: setTimeout(() => {}, 10000),
      });

      await handlePageReadySignal(123);

      // THEN: Logs preserved
      expect(captureState.get('cmd-1').logs).toEqual(existingLogs);
      expect(captureState.get('cmd-1').logs.length).toBe(2);
    });
  });
});

/**
 * INTEGRATION PLAN:
 *
 * Once these tests pass, implementation requires changes in 3 files:
 *
 * 1. inject-console-capture.js:
 *    window.addEventListener('load', () => {
 *      setTimeout(() => {
 *        window.dispatchEvent(new CustomEvent('chromeDevAssist:pageReady'));
 *      }, 100);  // Wait 100ms for defer scripts
 *    });
 *
 * 2. content-script.js:
 *    window.addEventListener('chromeDevAssist:pageReady', () => {
 *      chrome.runtime.sendMessage({
 *        type: 'pageReady',
 *        tabId: getCurrentTabId()
 *      });
 *    });
 *
 * 3. background.js (message handler):
 *    if (message.type === 'pageReady') {
 *      // Find active capture for this tab
 *      for (const [commandId, capture] of captureState.entries()) {
 *        if (capture.tabId === message.tabId && capture.active) {
 *          endCaptureEarly(commandId);
 *          break;
 *        }
 *      }
 *    }
 *
 * This will reduce average test time from 10s to ~3s for typical pages.
 */

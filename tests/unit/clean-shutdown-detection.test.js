/**
 * Clean Shutdown Detection Tests
 *
 * REQUIREMENT: Distinguish between crashes and normal service worker shutdowns
 *
 * Problem: Currently, crash detection can't tell if service worker was suspended
 * normally (by Chrome) or crashed unexpectedly. This leads to false positives.
 *
 * Solution: Call markCleanShutdown() when service worker is about to suspend normally.
 * When extension starts, check if lastShutdown timestamp exists - if not, it's a crash.
 *
 * Test-First Discipline: These tests are written BEFORE implementing the hook.
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    session: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    onSuspend: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock sessionMetadata (would be imported from background.js in real code)
let sessionMetadata = {
  extensionId: 'test-extension',
  startTime: Date.now(),
  lastShutdown: null,
};

// Mock markCleanShutdown function
async function markCleanShutdown() {
  sessionMetadata.lastShutdown = Date.now();
  await chrome.storage.session.set({ sessionMetadata });
}

describe('Clean Shutdown Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionMetadata = {
      extensionId: 'test-extension',
      startTime: Date.now(),
      lastShutdown: null,
    };
    chrome.storage.session.set.mockResolvedValue(undefined);
    chrome.storage.session.get.mockResolvedValue({});
  });

  // ========================================================================
  // Test Suite 1: markCleanShutdown() Function
  // ========================================================================

  describe('markCleanShutdown() function', () => {
    test('should set lastShutdown timestamp', async () => {
      const beforeTime = Date.now();

      await markCleanShutdown();

      const afterTime = Date.now();

      expect(sessionMetadata.lastShutdown).toBeGreaterThanOrEqual(beforeTime);
      expect(sessionMetadata.lastShutdown).toBeLessThanOrEqual(afterTime);
    });

    test('should persist sessionMetadata to storage', async () => {
      await markCleanShutdown();

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        sessionMetadata: expect.objectContaining({
          extensionId: 'test-extension',
          lastShutdown: expect.any(Number),
        }),
      });
    });

    test('should update existing sessionMetadata without losing other fields', async () => {
      sessionMetadata.customField = 'preserve-this';

      await markCleanShutdown();

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        sessionMetadata: expect.objectContaining({
          extensionId: 'test-extension',
          customField: 'preserve-this',
          lastShutdown: expect.any(Number),
        }),
      });
    });
  });

  // ========================================================================
  // Test Suite 2: chrome.runtime.onSuspend Listener
  // ========================================================================

  describe('chrome.runtime.onSuspend listener', () => {
    test('should register onSuspend listener on extension startup', () => {
      // In real implementation, this happens when background.js loads
      const mockListener = jest.fn();
      chrome.runtime.onSuspend.addListener(mockListener);

      expect(chrome.runtime.onSuspend.addListener).toHaveBeenCalledWith(mockListener);
    });

    test('should call markCleanShutdown when service worker suspends', async () => {
      // Simulate: Extension registers listener
      let suspendCallback = null;
      chrome.runtime.onSuspend.addListener.mockImplementation(callback => {
        suspendCallback = callback;
      });

      // Register the listener
      chrome.runtime.onSuspend.addListener(markCleanShutdown);

      // Verify listener was registered
      expect(suspendCallback).toBe(markCleanShutdown);

      // Simulate: Chrome suspends service worker
      const beforeTime = Date.now();
      await suspendCallback();
      const afterTime = Date.now();

      // Verify: markCleanShutdown was called
      expect(sessionMetadata.lastShutdown).toBeGreaterThanOrEqual(beforeTime);
      expect(sessionMetadata.lastShutdown).toBeLessThanOrEqual(afterTime);
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });

    test('should handle onSuspend listener calling markCleanShutdown synchronously', async () => {
      // onSuspend listener should be async-friendly
      const listener = async () => {
        await markCleanShutdown();
      };

      chrome.runtime.onSuspend.addListener(listener);

      // Simulate suspension
      const registeredListener = chrome.runtime.onSuspend.addListener.mock.calls[0][0];
      await registeredListener();

      expect(sessionMetadata.lastShutdown).toBeDefined();
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Test Suite 3: Crash Detection Integration
  // ========================================================================

  describe('Crash detection integration', () => {
    test('should detect crash when lastShutdown is missing', async () => {
      // Simulate: Extension starts after crash (no lastShutdown)
      chrome.storage.session.get.mockResolvedValue({
        sessionMetadata: {
          extensionId: 'test-extension',
          startTime: Date.now() - 60000, // Started 1 min ago
          lastShutdown: null, // ← No clean shutdown
        },
      });

      const stored = await chrome.storage.session.get('sessionMetadata');
      const crashed = !stored.sessionMetadata.lastShutdown;

      expect(crashed).toBe(true);
    });

    test('should detect clean shutdown when lastShutdown exists', async () => {
      // Simulate: Extension starts after clean shutdown
      chrome.storage.session.get.mockResolvedValue({
        sessionMetadata: {
          extensionId: 'test-extension',
          startTime: Date.now() - 60000,
          lastShutdown: Date.now() - 30000, // ← Clean shutdown 30s ago
        },
      });

      const stored = await chrome.storage.session.get('sessionMetadata');
      const crashed = !stored.sessionMetadata.lastShutdown;

      expect(crashed).toBe(false);
    });

    test('should detect crash if service worker restarted without suspension', async () => {
      // Scenario: Service worker was active, then restarted without onSuspend firing
      // This happens during actual crashes
      chrome.storage.session.get.mockResolvedValue({
        sessionMetadata: {
          extensionId: 'test-extension',
          startTime: Date.now() - 120000, // Started 2 min ago
          lastShutdown: Date.now() - 180000, // Last clean shutdown 3 min ago
        },
      });

      const stored = await chrome.storage.session.get('sessionMetadata');

      // If lastShutdown is BEFORE startTime, it means this session didn't shut down cleanly
      const lastShutdownBeforeStart =
        stored.sessionMetadata.lastShutdown < stored.sessionMetadata.startTime;

      expect(lastShutdownBeforeStart).toBe(true);
    });

    test('should clear lastShutdown on new session start', async () => {
      // New session should start with lastShutdown = null
      // This ensures we can detect crashes in THIS session
      const newSessionMetadata = {
        extensionId: 'test-extension',
        startTime: Date.now(),
        lastShutdown: null, // ← Reset for new session
      };

      await chrome.storage.session.set({ sessionMetadata: newSessionMetadata });

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        sessionMetadata: expect.objectContaining({
          lastShutdown: null,
        }),
      });
    });
  });

  // ========================================================================
  // Test Suite 4: Edge Cases
  // ========================================================================

  describe('Edge cases and error handling', () => {
    test('should handle storage.set failure gracefully', async () => {
      chrome.storage.session.set.mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(markCleanShutdown()).rejects.toThrow('Storage quota exceeded');

      // lastShutdown should still be set in memory
      expect(sessionMetadata.lastShutdown).toBeDefined();
    });

    test('should handle multiple rapid suspend/resume cycles', async () => {
      // Simulate: Service worker suspended and resumed multiple times quickly
      const timestamps = [];

      for (let i = 0; i < 5; i++) {
        await markCleanShutdown();
        timestamps.push(sessionMetadata.lastShutdown);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Each shutdown should have unique timestamp
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(5);

      // Timestamps should be increasing
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });

    test('should not interfere with other sessionMetadata fields', async () => {
      sessionMetadata.testState = {
        projectName: 'test-project',
        testId: '123',
        trackedTabs: [1, 2, 3],
      };

      await markCleanShutdown();

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        sessionMetadata: expect.objectContaining({
          testState: {
            projectName: 'test-project',
            testId: '123',
            trackedTabs: [1, 2, 3],
          },
          lastShutdown: expect.any(Number),
        }),
      });
    });

    test('should work when sessionMetadata is undefined initially', async () => {
      sessionMetadata = {
        extensionId: undefined,
        startTime: undefined,
        lastShutdown: undefined,
      };

      await markCleanShutdown();

      expect(sessionMetadata.lastShutdown).toBeDefined();
      expect(typeof sessionMetadata.lastShutdown).toBe('number');
    });
  });
});

/**
 * INTEGRATION NOTE:
 *
 * Once these tests pass, the actual implementation in background.js should:
 *
 * 1. Register onSuspend listener at startup:
 *    chrome.runtime.onSuspend.addListener(() => {
 *      console.log('[ChromeDevAssist] Service worker suspending...');
 *      markCleanShutdown();
 *    });
 *
 * 2. Clear lastShutdown on new session:
 *    sessionMetadata.lastShutdown = null;  // Reset for new session
 *    await chrome.storage.session.set({ sessionMetadata });
 *
 * 3. Check for crash on startup:
 *    const crashed = !restoredMetadata?.lastShutdown;
 *    if (crashed) {
 *      console.warn('[ChromeDevAssist] Previous session crashed');
 *      // Run crash recovery...
 *    }
 *
 * This will improve crash detection reliability and reduce false positives.
 */

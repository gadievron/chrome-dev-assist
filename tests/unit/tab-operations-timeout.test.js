/**
 * Tab Operations Timeout Tests
 *
 * REQUIREMENT: Tab operations must timeout instead of hanging indefinitely
 *
 * Problem: chrome.tabs.create/remove/get can hang if:
 * - Page is extremely slow to load
 * - Tab crashed
 * - Chrome is under heavy load
 *
 * Solution: Wrap all tab operations with withTimeout() utility
 *
 * Test-First Discipline: These tests are written BEFORE implementing withTimeout usage
 */

// Mock Chrome APIs
global.chrome = {
  tabs: {
    create: jest.fn(),
    remove: jest.fn(),
    get: jest.fn()
  }
};

// Mock withTimeout implementation (will be imported from background.js in real code)
async function withTimeout(promise, timeoutMs, operation) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
}

describe('Tab Operations Timeout Protection', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========================================================================
  // Test Suite 1: chrome.tabs.create() Timeout
  // ========================================================================

  describe('chrome.tabs.create() with timeout', () => {

    test('should timeout if tab creation takes longer than 5s', async () => {
      jest.useFakeTimers();

      // Mock slow tab creation (never resolves)
      chrome.tabs.create.mockImplementation(() => new Promise(() => {}));

      // Start tab creation with 5s timeout
      const promise = withTimeout(
        chrome.tabs.create({ url: 'https://slow-page.com' }),
        5000,
        'tab creation'
      );

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should reject with timeout error
      await expect(promise).rejects.toThrow('tab creation timeout after 5000ms');
    });

    test('should succeed if tab creation completes before timeout', async () => {
      jest.useFakeTimers();

      // Mock fast tab creation
      chrome.tabs.create.mockResolvedValue({ id: 123, url: 'https://fast.com' });

      // Start tab creation with 5s timeout
      const promise = withTimeout(
        chrome.tabs.create({ url: 'https://fast.com' }),
        5000,
        'tab creation'
      );

      // Fast-forward time (but not to timeout)
      jest.advanceTimersByTime(100);

      // Should succeed
      const result = await promise;
      expect(result.id).toBe(123);
    });

    test('should clean up timer when tab creation succeeds', async () => {
      jest.useFakeTimers();

      chrome.tabs.create.mockResolvedValue({ id: 456 });

      await withTimeout(
        chrome.tabs.create({ url: 'test' }),
        5000,
        'tab creation'
      );

      // Verify timer was cleared (no pending timers)
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ========================================================================
  // Test Suite 2: chrome.tabs.remove() Timeout
  // ========================================================================

  describe('chrome.tabs.remove() with timeout', () => {

    test('should timeout if tab removal takes longer than 3s', async () => {
      jest.useFakeTimers();

      // Mock slow tab removal (crashed tab scenario)
      chrome.tabs.remove.mockImplementation(() => new Promise(() => {}));

      const promise = withTimeout(
        chrome.tabs.remove(999),
        3000,
        'tab removal'
      );

      jest.advanceTimersByTime(3000);

      await expect(promise).rejects.toThrow('tab removal timeout after 3000ms');
    });

    test('should succeed if tab removal completes before timeout', async () => {
      jest.useFakeTimers();

      chrome.tabs.remove.mockResolvedValue(undefined); // tabs.remove returns void

      const promise = withTimeout(
        chrome.tabs.remove(123),
        3000,
        'tab removal'
      );

      jest.advanceTimersByTime(100);

      await expect(promise).resolves.toBeUndefined();
    });

    test('should clean up timer when tab removal fails', async () => {
      jest.useFakeTimers();

      chrome.tabs.remove.mockRejectedValue(new Error('Tab not found'));

      await expect(
        withTimeout(chrome.tabs.remove(999), 3000, 'tab removal')
      ).rejects.toThrow('Tab not found');

      // Timer should be cleaned up even on error
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ========================================================================
  // Test Suite 3: chrome.tabs.get() Timeout
  // ========================================================================

  describe('chrome.tabs.get() with timeout', () => {

    test('should timeout if tab query takes longer than 2s', async () => {
      jest.useFakeTimers();

      chrome.tabs.get.mockImplementation(() => new Promise(() => {}));

      const promise = withTimeout(
        chrome.tabs.get(123),
        2000,
        'tab query'
      );

      jest.advanceTimersByTime(2000);

      await expect(promise).rejects.toThrow('tab query timeout after 2000ms');
    });

    test('should succeed if tab query completes before timeout', async () => {
      jest.useFakeTimers();

      chrome.tabs.get.mockResolvedValue({ id: 123, url: 'https://test.com' });

      const promise = withTimeout(
        chrome.tabs.get(123),
        2000,
        'tab query'
      );

      jest.advanceTimersByTime(100);

      const result = await promise;
      expect(result.id).toBe(123);
    });
  });

  // ========================================================================
  // Test Suite 4: Real-World Scenarios
  // ========================================================================

  describe('Real-world tab operation scenarios', () => {

    test('should handle tab creation for data URI (instant load)', async () => {
      jest.useFakeTimers();

      chrome.tabs.create.mockResolvedValue({ id: 1, url: 'data:text/html,test' });

      const result = await withTimeout(
        chrome.tabs.create({ url: 'data:text/html,<h1>Test</h1>' }),
        5000,
        'data URI tab'
      );

      expect(result.id).toBe(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('should handle tab removal after autoClose (typical flow)', async () => {
      jest.useFakeTimers();

      // Simulate typical flow:
      // 1. Create tab
      chrome.tabs.create.mockResolvedValue({ id: 100 });
      const tab = await withTimeout(
        chrome.tabs.create({ url: 'test' }),
        5000,
        'tab creation'
      );

      // 2. Wait for test duration
      jest.advanceTimersByTime(3000);

      // 3. Close tab
      chrome.tabs.remove.mockResolvedValue(undefined);
      await withTimeout(
        chrome.tabs.remove(tab.id),
        3000,
        'tab cleanup'
      );

      expect(chrome.tabs.remove).toHaveBeenCalledWith(100);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('should handle tab removal failure gracefully (tab already closed)', async () => {
      jest.useFakeTimers();

      chrome.tabs.remove.mockRejectedValue(new Error('No tab with id: 999'));

      await expect(
        withTimeout(chrome.tabs.remove(999), 3000, 'tab cleanup')
      ).rejects.toThrow('No tab with id: 999');

      // Timer should still be cleaned up
      expect(jest.getTimerCount()).toBe(0);
    });

    test('should prevent indefinite hang when Chrome is under load', async () => {
      jest.useFakeTimers();

      // Simulate Chrome under load - all operations slow
      chrome.tabs.create.mockImplementation(() => new Promise(() => {}));
      chrome.tabs.get.mockImplementation(() => new Promise(() => {}));
      chrome.tabs.remove.mockImplementation(() => new Promise(() => {}));

      // Try to create tab
      const createPromise = withTimeout(
        chrome.tabs.create({ url: 'test' }),
        5000,
        'tab creation under load'
      );

      jest.advanceTimersByTime(5000);

      await expect(createPromise).rejects.toThrow('timeout after 5000ms');

      // Extension should not be permanently hung
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ========================================================================
  // Test Suite 5: Edge Cases
  // ========================================================================

  describe('Edge cases and error handling', () => {

    test('should handle multiple simultaneous tab operations', async () => {
      jest.useFakeTimers();

      chrome.tabs.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 });

      const promises = [
        withTimeout(chrome.tabs.create({ url: 'test1' }), 5000, 'tab1'),
        withTimeout(chrome.tabs.create({ url: 'test2' }), 5000, 'tab2'),
        withTimeout(chrome.tabs.create({ url: 'test3' }), 5000, 'tab3')
      ];

      jest.advanceTimersByTime(100);

      const results = await Promise.all(promises);

      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[2].id).toBe(3);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('should handle timeout occurring during error handling', async () => {
      jest.useFakeTimers();

      // Tab operation that throws error slowly
      chrome.tabs.create.mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Slow error')), 1000);
        })
      );

      const promise = withTimeout(
        chrome.tabs.create({ url: 'test' }),
        500,  // Timeout before error occurs
        'slow error scenario'
      );

      jest.advanceTimersByTime(500);

      // Should timeout before the slow error
      await expect(promise).rejects.toThrow('timeout after 500ms');
    });

    test('should handle Promise.race cleanup correctly', async () => {
      jest.useFakeTimers();

      chrome.tabs.create.mockResolvedValue({ id: 999 });

      await withTimeout(
        chrome.tabs.create({ url: 'test' }),
        5000,
        'cleanup test'
      );

      // Advance past timeout to ensure cleanup happened
      jest.advanceTimersByTime(10000);

      // No stale timers should remain
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

/**
 * INTEGRATION NOTE:
 *
 * Once these tests pass, the actual implementation in background.js should:
 *
 * 1. Wrap chrome.tabs.create():
 *    const tab = await withTimeout(
 *      chrome.tabs.create(createInfo),
 *      5000,
 *      'tab creation'
 *    );
 *
 * 2. Wrap chrome.tabs.remove():
 *    await withTimeout(
 *      chrome.tabs.remove(tabId),
 *      3000,
 *      'tab cleanup'
 *    );
 *
 * 3. Wrap chrome.tabs.get():
 *    const tab = await withTimeout(
 *      chrome.tabs.get(tabId),
 *      2000,
 *      'tab query'
 *    );
 *
 * This will prevent indefinite hangs and improve extension reliability.
 */

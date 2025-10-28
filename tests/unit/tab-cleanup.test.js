/**
 * Tests for automatic tab cleanup after openUrl operations
 *
 * IMPORTANT: These tests import and test the REAL handleOpenUrlCommand function
 * from extension/background.js, not mock implementations.
 *
 * Bug Context: Previous tests were "fake" - they defined their own mock functions
 * and tested those instead of the real implementation. This let bugs slip through.
 */

// Import REAL implementation from background.js
const { handleOpenUrlCommand } = require('../../extension/background');

describe('Tab Cleanup - REAL Implementation Tests', () => {
  let mockChrome;
  let consoleLogs;

  beforeEach(() => {
    // Reset console logs capture
    consoleLogs = [];

    // Mock console methods to capture logs
    global.console = {
      log: jest.fn((...args) => consoleLogs.push({ type: 'log', args })),
      warn: jest.fn((...args) => consoleLogs.push({ type: 'warn', args })),
      error: jest.fn((...args) => consoleLogs.push({ type: 'error', args })),
    };

    // Mock Chrome API
    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(),
        },
      },
    };

    // Set global chrome for tests
    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('openUrl with autoClose=true should close tab after operation', async () => {
    // TESTS REAL FUNCTION: handleOpenUrlCommand from background.js
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false, // Skip console capture for simpler test
      duration: 100,
    });

    // Verify tab was created
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: true,
    });

    // Verify tab exists check was performed
    expect(mockChrome.tabs.get).toHaveBeenCalledWith(123);

    // Verify tab was removed
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(123);

    // Verify response indicates tab was closed
    expect(result.tabClosed).toBe(true);
    expect(result.tabId).toBe(123);
  });

  test('openUrl with autoClose=false should leave tab open', async () => {
    const result = await handleOpenUrlCommand('cmd-2', {
      url: 'https://example.com',
      autoClose: false,
      captureConsole: false,
    });

    // Tab created
    expect(mockChrome.tabs.create).toHaveBeenCalled();

    // Tab NOT removed
    expect(mockChrome.tabs.remove).not.toHaveBeenCalled();

    // Response indicates tab NOT closed
    expect(result.tabClosed).toBe(false);
    expect(result.tabId).toBe(123);
  });

  test('openUrl default behavior should NOT auto-close (backward compatible)', async () => {
    // When autoClose not specified, defaults to false
    const result = await handleOpenUrlCommand('cmd-3', {
      url: 'https://example.com',
      captureConsole: false,
      // autoClose not specified
    });

    // Tab created
    expect(mockChrome.tabs.create).toHaveBeenCalled();

    // Tab NOT removed (backward compatible default)
    expect(mockChrome.tabs.remove).not.toHaveBeenCalled();

    // Response indicates tab NOT closed
    expect(result.tabClosed).toBe(false);
  });

  test('tab cleanup should happen even if capture fails', async () => {
    // Make scripting.executeScript fail to simulate capture error
    mockChrome.scripting.executeScript.mockRejectedValue(new Error('Script injection failed'));

    try {
      await handleOpenUrlCommand('cmd-4', {
        url: 'https://example.com',
        autoClose: true,
        captureConsole: true, // This will fail
        duration: 100,
      });
    } catch (err) {
      // Error expected from script injection
    }

    // Cleanup should still happen (finally block)
    // Note: This test will fail if the real implementation doesn't handle this correctly
    // That's GOOD - we want the test to catch this bug!
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(123);
  });

  test('should handle tab already closed gracefully', async () => {
    // Simulate tab already closed (get returns null)
    mockChrome.tabs.get.mockResolvedValue(null);

    const result = await handleOpenUrlCommand('cmd-5', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Tab creation attempted
    expect(mockChrome.tabs.create).toHaveBeenCalled();

    // Tab exists check performed
    expect(mockChrome.tabs.get).toHaveBeenCalledWith(123);

    // Tab remove NOT called (tab already gone)
    expect(mockChrome.tabs.remove).not.toHaveBeenCalled();

    // Response indicates cleanup attempted but tab was already gone
    expect(result.tabClosed).toBe(false);
  });

  test('should handle chrome.tabs.remove failure gracefully', async () => {
    // Simulate tab removal failure
    mockChrome.tabs.remove.mockRejectedValue(new Error('No tab with id: 123'));

    const result = await handleOpenUrlCommand('cmd-6', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Tab creation attempted
    expect(mockChrome.tabs.create).toHaveBeenCalled();

    // Tab remove attempted
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(123);

    // Response indicates cleanup failed
    expect(result.tabClosed).toBe(false);

    // Error should be logged (check console.error was called)
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(
      errorLogs.some(log =>
        log.args.some(arg => typeof arg === 'string' && arg.includes('TAB CLEANUP FAILED'))
      )
    ).toBe(true);
  });

  test('should include tabClosed status in response', async () => {
    const result = await handleOpenUrlCommand('cmd-7', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Response has required fields
    expect(result).toHaveProperty('tabId');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('consoleLogs');
    expect(result).toHaveProperty('tabClosed');

    // tabClosed reflects actual state
    expect(result.tabClosed).toBe(true);
  });

  test('verbose logging should provide debugging information', async () => {
    await handleOpenUrlCommand('cmd-8', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Check that verbose logging is present
    const allLogs = consoleLogs.filter(log => log.type === 'log');
    const logMessages = allLogs.flatMap(log => log.args).filter(arg => typeof arg === 'string');

    // Should log parameter extraction
    expect(logMessages.some(msg => msg.includes('handleOpenUrlCommand called'))).toBe(true);
    expect(logMessages.some(msg => msg.includes('Extracted parameters'))).toBe(true);

    // Should log finally block entry
    expect(logMessages.some(msg => msg.includes('Entering finally block'))).toBe(true);

    // Should log tab cleanup attempt
    expect(logMessages.some(msg => msg.includes('Attempting to close tab'))).toBe(true);

    // Should log success
    expect(logMessages.some(msg => msg.includes('Successfully closed tab'))).toBe(true);
  });

  test('chrome.tabs.remove should return Promise (API compatibility check)', async () => {
    // Track what chrome.tabs.remove returns
    let removeReturnValue;
    mockChrome.tabs.remove.mockImplementation(tabId => {
      removeReturnValue = Promise.resolve();
      return removeReturnValue;
    });

    await handleOpenUrlCommand('cmd-9', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Verify remove was called
    expect(mockChrome.tabs.remove).toHaveBeenCalled();

    // Check logs for Promise detection
    const allLogs = consoleLogs.filter(log => log.type === 'log');
    const logMessages = allLogs.flatMap(log => log.args);

    // Should log that it detected a Promise
    // (This will help debug if the real Chrome API doesn't return Promise)
    expect(
      logMessages.some(
        msg => typeof msg === 'string' && msg.includes('chrome.tabs.remove returned')
      )
    ).toBe(true);
  });
});

/**
 * TESTING STRATEGY NOTES:
 *
 * These tests are REAL because they:
 * 1. Import actual handleOpenUrlCommand from background.js
 * 2. Mock only the Chrome API (external dependency)
 * 3. Test actual business logic, not mock implementations
 * 4. Will FAIL if implementation is broken (catches bugs)
 *
 * Previous "fake" tests:
 * - Defined openUrlWithCleanup() in test file
 * - Tested that mock function instead of real code
 * - Always passed even when real code was broken
 * - Gave false confidence
 *
 * How to verify these are REAL tests:
 * 1. Break handleOpenUrlCommand in background.js
 * 2. Run these tests
 * 3. Tests MUST fail
 * 4. Fix implementation
 * 5. Tests MUST pass
 *
 * If tests pass regardless of implementation state → FAKE TESTS
 */

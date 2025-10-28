/**
 * Tests for Script Registration - Duplicate Prevention
 * Tests REAL implementation from extension/background.js
 *
 * Bug: Chrome throws "Duplicate script ID" when registerContentScripts() called twice
 * Fix: Check if already registered before registering, or unregister and retry
 */

const { registerConsoleCaptureScript } = require('../../extension/background');

describe('Script Registration: Duplicate Prevention', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock Chrome API
    mockChrome = {
      scripting: {
        registerContentScripts: jest.fn(),
        unregisterContentScripts: jest.fn(),
        getRegisteredContentScripts: jest.fn(),
      },
    };
    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('should skip registration if script already registered', async () => {
    // Simulate script already registered
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([{ id: 'console-capture' }]);

    await registerConsoleCaptureScript();

    // Should check for existing scripts
    expect(mockChrome.scripting.getRegisteredContentScripts).toHaveBeenCalled();

    // Should NOT try to register (already exists)
    expect(mockChrome.scripting.registerContentScripts).not.toHaveBeenCalled();

    // Should log that it's skipping
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('already registered, skipping')
    );
  });

  test('should register script if not already registered', async () => {
    // Simulate no scripts registered
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([]);
    mockChrome.scripting.registerContentScripts.mockResolvedValue();

    await registerConsoleCaptureScript();

    // Should check for existing scripts
    expect(mockChrome.scripting.getRegisteredContentScripts).toHaveBeenCalled();

    // Should register the script
    expect(mockChrome.scripting.registerContentScripts).toHaveBeenCalledWith([
      {
        id: 'console-capture',
        matches: ['<all_urls>'],
        js: ['inject-console-capture.js'],
        runAt: 'document_start',
        world: 'MAIN',
        allFrames: true,
      },
    ]);

    // Should log success
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('registered in MAIN world')
    );
  });

  test('should unregister and retry if duplicate error occurs', async () => {
    // Simulate race condition: check says not registered, but registration fails with duplicate
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([]);
    mockChrome.scripting.registerContentScripts
      .mockRejectedValueOnce(new Error('Duplicate script ID'))
      .mockResolvedValueOnce(); // Second attempt succeeds
    mockChrome.scripting.unregisterContentScripts.mockResolvedValue();

    await registerConsoleCaptureScript();

    // Should have tried to register (failed with duplicate)
    expect(mockChrome.scripting.registerContentScripts).toHaveBeenCalledTimes(2);

    // Should have unregistered the duplicate
    expect(mockChrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
      ids: ['console-capture'],
    });

    // Should log the retry
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate detected, unregistering and retrying')
    );
  });

  test('should log error if registration fails for non-duplicate reason', async () => {
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([]);
    mockChrome.scripting.registerContentScripts.mockRejectedValue(new Error('Permission denied'));

    await registerConsoleCaptureScript();

    // Should log the error
    expect(global.console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register console capture script'),
      expect.any(Error)
    );

    // Should NOT try to unregister
    expect(mockChrome.scripting.unregisterContentScripts).not.toHaveBeenCalled();
  });

  test('should handle errors gracefully and not crash', async () => {
    // Simulate getRegisteredContentScripts failing
    mockChrome.scripting.getRegisteredContentScripts.mockRejectedValue(
      new Error('API unavailable')
    );

    // Should not throw
    await expect(registerConsoleCaptureScript()).resolves.not.toThrow();

    // Should log error
    expect(global.console.error).toHaveBeenCalled();
  });

  test('should register with correct script configuration', async () => {
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([]);
    mockChrome.scripting.registerContentScripts.mockResolvedValue();

    await registerConsoleCaptureScript();

    const callArgs = mockChrome.scripting.registerContentScripts.mock.calls[0][0];
    const scriptConfig = callArgs[0];

    // Verify all configuration properties
    expect(scriptConfig.id).toBe('console-capture');
    expect(scriptConfig.matches).toEqual(['<all_urls>']);
    expect(scriptConfig.js).toEqual(['inject-console-capture.js']);
    expect(scriptConfig.runAt).toBe('document_start');
    expect(scriptConfig.world).toBe('MAIN');
    expect(scriptConfig.allFrames).toBe(true);
  });

  test('should handle empty registered scripts array', async () => {
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([]);
    mockChrome.scripting.registerContentScripts.mockResolvedValue();

    await registerConsoleCaptureScript();

    expect(mockChrome.scripting.registerContentScripts).toHaveBeenCalled();
  });

  test('should handle multiple scripts already registered', async () => {
    mockChrome.scripting.getRegisteredContentScripts.mockResolvedValue([
      { id: 'other-script-1' },
      { id: 'console-capture' }, // Our script is in the middle
      { id: 'other-script-2' },
    ]);

    await registerConsoleCaptureScript();

    // Should find our script and skip registration
    expect(mockChrome.scripting.registerContentScripts).not.toHaveBeenCalled();
  });
});

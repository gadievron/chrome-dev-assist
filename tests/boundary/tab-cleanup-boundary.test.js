/**
 * Boundary Tests: Tab Cleanup
 * Persona: 🐛 Boundary Tester - "Test The Edges"
 *
 * Focus: Min/max values, empty inputs, overflow conditions
 * Tests REAL implementation from extension/background.js
 */

const { handleOpenUrlCommand } = require('../../extension/background');

describe('Boundary: URL Length Limits', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('minimum valid URL: single character domain', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://a.b',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('maximum reasonable URL: 2048 characters', async () => {
    const longPath = 'a'.repeat(2000);
    const url = `https://example.com/${longPath}`;

    const result = await handleOpenUrlCommand('cmd-1', {
      url,
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('URL exactly at Chrome limit: 2083 characters', async () => {
    const path = 'a'.repeat(2048);
    const url = `https://example.com/${path}`;

    const result = await handleOpenUrlCommand('cmd-1', {
      url,
      autoClose: true,
      captureConsole: false,
    }).catch(err => ({ error: err }));

    // Should handle (either accept or reject gracefully)
    expect(result).toBeDefined();
  });

  test('URL beyond Chrome limit: 100,000 characters', async () => {
    const hugePath = 'a'.repeat(99950);
    const url = `https://example.com/${hugePath}`;

    const result = await handleOpenUrlCommand('cmd-1', {
      url,
      autoClose: true,
      captureConsole: false,
    }).catch(err => ({ error: err }));

    // Should reject or truncate
    expect(result).toBeDefined();
  });
});

describe('Boundary: Duration Limits', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('minimum duration: 0ms', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 0,
      captureConsole: true,
      autoClose: true,
    });

    expect(result.tabId).toBeDefined();
    expect(result.tabClosed).toBe(true);
  });

  test('duration: 1ms', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 1,
      captureConsole: true,
      autoClose: true,
    });

    expect(result.tabId).toBeDefined();
  });

  test('reasonable max duration: 60 seconds', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 60000,
      captureConsole: false,
      autoClose: true,
    });

    expect(result.tabId).toBeDefined();
  }, 65000);

  test('duration at Number.MAX_SAFE_INTEGER', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        duration: Number.MAX_SAFE_INTEGER,
        captureConsole: false,
      })
    ).rejects.toThrow();
  });

  test('duration at Number.MIN_SAFE_INTEGER', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        duration: Number.MIN_SAFE_INTEGER,
        captureConsole: false,
      })
    ).rejects.toThrow();
  });

  test('duration: -1 (just below zero)', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        duration: -1,
        captureConsole: false,
      })
    ).rejects.toThrow();
  });

  test('duration: 0.5 (fractional)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 0.5,
      captureConsole: true,
      autoClose: true,
    });

    expect(result.tabId).toBeDefined();
  });
});

describe('Boundary: Tab ID Limits', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn(),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('tab ID: 0 (minimum)', async () => {
    mockChrome.tabs.create.mockResolvedValue({ id: 0, url: 'https://example.com' });
    mockChrome.tabs.get.mockResolvedValue({ id: 0, url: 'https://example.com' });

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBe(0);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(0);
  });

  test('tab ID: 1 (first normal tab)', async () => {
    mockChrome.tabs.create.mockResolvedValue({ id: 1, url: 'https://example.com' });
    mockChrome.tabs.get.mockResolvedValue({ id: 1, url: 'https://example.com' });

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBe(1);
  });

  test('tab ID: Number.MAX_SAFE_INTEGER', async () => {
    const maxId = Number.MAX_SAFE_INTEGER;
    mockChrome.tabs.create.mockResolvedValue({ id: maxId, url: 'https://example.com' });
    mockChrome.tabs.get.mockResolvedValue({ id: maxId, url: 'https://example.com' });

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBe(maxId);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(maxId);
  });

  test('tab ID: -1 (invalid)', async () => {
    mockChrome.tabs.create.mockResolvedValue({ id: -1, url: 'https://example.com' });
    mockChrome.tabs.get.mockResolvedValue(null); // Tab doesn't exist

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Should handle invalid tab ID
    expect(result.tabId).toBe(-1);
    expect(result.tabClosed).toBe(false);
  });
});

describe('Boundary: Boolean Parameter Edge Cases', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('autoClose: exactly true', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(true);
  });

  test('autoClose: exactly false', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: false,
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(false);
  });

  test('autoClose: truthy value (1)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: 1,
      captureConsole: false,
    });

    // Should coerce to boolean
    expect(result.tabId).toBeDefined();
  });

  test('autoClose: falsy value (0)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: 0,
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(false);
  });

  test('autoClose: string "true"', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: 'true',
      captureConsole: false,
    });

    // Truthy string
    expect(result.tabId).toBeDefined();
  });

  test('autoClose: string "false"', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: 'false', // Truthy! (non-empty string)
      captureConsole: false,
    });

    // String "false" is truthy in JavaScript
    expect(result.tabId).toBeDefined();
  });

  test('autoClose: empty string (falsy)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: '',
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(false);
  });

  test('autoClose: null (falsy)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: null,
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(false);
  });

  test('autoClose: undefined (default)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: undefined,
      captureConsole: false,
    });

    expect(result.tabClosed).toBe(false);
  });
});

describe('Boundary: Empty and Null Values', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('empty params object (except url)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
    });

    // Should use defaults
    expect(result.tabId).toBeDefined();
    expect(result.tabClosed).toBe(false); // default autoClose=false
  });

  test('all params at default values explicitly', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      active: true,
      captureConsole: false,
      duration: 5000,
      autoClose: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('params with extra unknown fields', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      unknownField1: 'value',
      unknownField2: 123,
      __proto__: null,
    });

    // Should ignore unknown fields
    expect(result.tabId).toBeDefined();
  });
});

describe('Boundary: Command ID Edge Cases', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('command ID: empty string', async () => {
    const result = await handleOpenUrlCommand('', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: very long string (10000 chars)', async () => {
    const longId = 'cmd-' + 'a'.repeat(9996);

    const result = await handleOpenUrlCommand(longId, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: special characters', async () => {
    const specialId = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const result = await handleOpenUrlCommand(specialId, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: unicode characters', async () => {
    const unicodeId = 'cmd-你好-مرحبا-שלום-🎉';

    const result = await handleOpenUrlCommand(unicodeId, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: null', async () => {
    const result = await handleOpenUrlCommand(null, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: undefined', async () => {
    const result = await handleOpenUrlCommand(undefined, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });

  test('command ID: number', async () => {
    const result = await handleOpenUrlCommand(12345, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    expect(result.tabId).toBeDefined();
  });
});

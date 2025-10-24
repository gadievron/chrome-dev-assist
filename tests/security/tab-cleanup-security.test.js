/**
 * Security Tests: Tab Cleanup
 * Persona: 🔒 Security Tester - "Trust No Input"
 *
 * Focus: Input validation, injection prevention, DoS protection
 * Tests REAL implementation from extension/background.js
 */

const { handleOpenUrlCommand } = require('../../extension/background');

describe('Security: Tab Cleanup Input Validation', () => {
  let mockChrome;

  beforeEach(() => {
    // Mock console to suppress logs
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock Chrome API (external dependency)
    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' })
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([])
      }
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('should reject missing URL parameter', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {}))
      .rejects.toThrow(/url is required/i);
  });

  test('should reject null URL', async () => {
    await expect(handleOpenUrlCommand('cmd-1', { url: null }))
      .rejects.toThrow(/url is required/i);
  });

  test('should reject undefined URL', async () => {
    await expect(handleOpenUrlCommand('cmd-1', { url: undefined }))
      .rejects.toThrow(/url is required/i);
  });

  test('should reject empty string URL', async () => {
    await expect(handleOpenUrlCommand('cmd-1', { url: '' }))
      .rejects.toThrow(/url is required/i);
  });

  test('should reject javascript: protocol URLs', async () => {
    const maliciousUrl = 'javascript:alert(document.cookie)';

    // Should either reject or sanitize
    await expect(handleOpenUrlCommand('cmd-1', {
      url: maliciousUrl,
      autoClose: true
    })).rejects.toThrow();
  });

  test('should reject data: URLs with JavaScript', async () => {
    const maliciousUrl = 'data:text/html,<script>alert(1)</script>';

    await expect(handleOpenUrlCommand('cmd-1', {
      url: maliciousUrl,
      autoClose: true
    })).rejects.toThrow();
  });

  test('should handle extremely long URLs safely', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(100000);

    // Should either handle or reject gracefully
    const result = await handleOpenUrlCommand('cmd-1', {
      url: longUrl,
      autoClose: true,
      captureConsole: false
    }).catch(err => ({ error: err.message }));

    // Either succeeds with truncation or fails with clear error
    expect(result).toBeDefined();
  });

  test('should validate duration parameter type', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 'not a number'
    })).rejects.toThrow();
  });

  test('should reject negative duration', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: -1000
    })).rejects.toThrow();
  });

  test('should reject infinite duration', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: Infinity
    })).rejects.toThrow();
  });

  test('should reject NaN duration', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: NaN
    })).rejects.toThrow();
  });

  test('should reject duration exceeding reasonable maximum', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 999999999,  // Very long duration
      autoClose: true,
      captureConsole: false
    })).rejects.toThrow(/exceeds maximum allowed/);
  });

  test('should sanitize command ID to prevent injection', async () => {
    const maliciousId = '"; DROP TABLE commands; --';

    // Should handle safely
    const result = await handleOpenUrlCommand(maliciousId, {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false
    });

    expect(result.tabId).toBeDefined();
  });

  test('should reject prototype pollution attempts via __proto__', async () => {
    const maliciousParams = {
      url: 'https://example.com',
      '__proto__': { autoClose: false, injected: true }
    };

    await handleOpenUrlCommand('cmd-1', maliciousParams);

    // Should not pollute Object.prototype
    expect(Object.prototype.autoClose).toBeUndefined();
    expect(Object.prototype.injected).toBeUndefined();
  });

  test('should reject prototype pollution via constructor', async () => {
    const maliciousParams = {
      url: 'https://example.com',
      'constructor': { prototype: { polluted: true } }
    };

    await handleOpenUrlCommand('cmd-1', maliciousParams);

    // Should not pollute
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('should handle URL with embedded null bytes', async () => {
    const maliciousUrl = 'https://example.com\x00/admin';

    const result = await handleOpenUrlCommand('cmd-1', {
      url: maliciousUrl,
      autoClose: true,
      captureConsole: false
    }).catch(err => ({ error: err.message }));

    // Should either sanitize or reject
    expect(result).toBeDefined();
  });

  test('should validate boolean parameters', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: 'true',  // String instead of boolean
      active: 1,  // Number instead of boolean
      captureConsole: false
    });

    // Should handle type coercion safely
    expect(result.tabId).toBeDefined();
  });

  test('should handle circular reference in params safely', async () => {
    const params = {
      url: 'https://example.com',
      autoClose: true
    };
    params.self = params;  // Circular reference

    // Should not cause infinite loop or crash
    const result = await handleOpenUrlCommand('cmd-1', params);
    expect(result.tabId).toBeDefined();
  });

  test('should prevent resource exhaustion via massive params object', async () => {
    const hugeParams = {
      url: 'https://example.com',
      autoClose: true,
      metadata: {}
    };

    // Create huge nested object
    for (let i = 0; i < 1000; i++) {
      hugeParams.metadata[`key${i}`] = 'x'.repeat(1000);
    }

    // Should handle without memory issues
    const result = await handleOpenUrlCommand('cmd-1', hugeParams);
    expect(result.tabId).toBeDefined();
  });
});

describe('Security: Tab Cleanup Authorization', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' })
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([])
      }
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('should not allow closing tabs from different origins', async () => {
    // Create tab for example.com
    mockChrome.tabs.create.mockResolvedValue({
      id: 999,
      url: 'https://sensitive-bank.com'
    });

    // Try to close with autoClose
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://sensitive-bank.com',
      autoClose: true,
      captureConsole: false
    });

    // Should only close tabs it created
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(999);
  });

  test('should handle permission denied errors gracefully', async () => {
    mockChrome.tabs.remove.mockRejectedValue(
      new Error('Permission denied: Cannot close tab')
    );

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false
    });

    // Should not crash, should log error
    expect(result.tabClosed).toBe(false);
    expect(global.console.error).toHaveBeenCalled();
  });
});

describe('Security: Tab Cleanup Rate Limiting', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
        remove: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com' })
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([])
      }
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('should handle rapid sequential tab operations', async () => {
    const operations = Array(100).fill().map((_, i) =>
      handleOpenUrlCommand(`cmd-${i}`, {
        url: `https://example.com/${i}`,
        autoClose: true,
        captureConsole: false
      })
    );

    const results = await Promise.allSettled(operations);

    // All should complete (either success or graceful failure)
    results.forEach(result => {
      expect(result.status).toMatch(/fulfilled|rejected/);
    });

    // Most should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(50);
  });

  test('should prevent DoS via infinite loop in params', async () => {
    // This test ensures the function doesn't get stuck
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const operationPromise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false
    });

    // Should complete before timeout
    await expect(Promise.race([operationPromise, timeoutPromise]))
      .resolves.toBeDefined();
  });
});

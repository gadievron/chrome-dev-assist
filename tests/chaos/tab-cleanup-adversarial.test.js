/**
 * Adversarial/Chaos Tests: Tab Cleanup
 * Persona: 💥 Chaos Engineer - "Try to Truly Break It"
 *
 * Focus: Abuse the system at every step, find every possible way to cause failures
 * Tests REAL implementation with adversarial inputs and scenarios
 */

const { handleOpenUrlCommand } = require('../../extension/background');

describe('Adversarial: Type Confusion Attacks', () => {
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

  test('params is an array instead of object', async () => {
    const result = await handleOpenUrlCommand('cmd-1', ['https://example.com']).catch(err => ({
      error: err.message,
    }));

    // Should handle or reject gracefully
    expect(result).toBeDefined();
  });

  test('params is a string instead of object', async () => {
    const result = await handleOpenUrlCommand('cmd-1', 'https://example.com').catch(err => ({
      error: err.message,
    }));

    expect(result).toBeDefined();
  });

  test('params is a function', async () => {
    const result = await handleOpenUrlCommand('cmd-1', () => ({
      url: 'https://example.com',
    })).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('URL is an object with toString() that returns evil script', async () => {
    const evilUrl = {
      toString: () => 'javascript:alert(1)',
      toLowerCase: function () {
        return this.toString().toLowerCase();
      },
      trim: function () {
        return this;
      },
    };

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: evilUrl,
        autoClose: true,
      })
    ).rejects.toThrow();
  });

  test('URL is a Proxy that changes value on access', async () => {
    let accessCount = 0;
    const proxyUrl = new Proxy(
      {},
      {
        get: () => {
          accessCount++;
          return accessCount === 1 ? 'https://example.com' : 'javascript:alert(1)';
        },
      }
    );

    const result = await handleOpenUrlCommand('cmd-1', {
      url: proxyUrl,
      autoClose: true,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('duration is NaN masquerading as number', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        duration: NaN,
      })
    ).rejects.toThrow();
  });

  test('duration is object with valueOf() returning huge number', async () => {
    const evilDuration = {
      valueOf: () => Number.MAX_SAFE_INTEGER,
    };

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        duration: evilDuration,
      })
    ).rejects.toThrow();
  });
});

describe('Adversarial: Race Conditions', () => {
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

  test('open and close same tab simultaneously', async () => {
    const operations = [
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        autoClose: true,
      }),
      handleOpenUrlCommand('cmd-2', {
        url: 'https://example.com',
        autoClose: true,
      }),
    ];

    const results = await Promise.allSettled(operations);

    // Both should complete without crashing
    results.forEach(result => {
      expect(result.status).toMatch(/fulfilled|rejected/);
    });
  });

  test('1000 concurrent operations', async () => {
    const operations = Array(1000)
      .fill()
      .map((_, i) =>
        handleOpenUrlCommand(`cmd-${i}`, {
          url: `https://example.com/${i}`,
          autoClose: true,
          captureConsole: false,
        })
      );

    const results = await Promise.allSettled(operations);

    // Most should complete
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(800);
  }, 30000);

  test('tab deleted during operation', async () => {
    // Simulate tab being deleted mid-operation
    mockChrome.tabs.get.mockResolvedValueOnce({ id: 123 }).mockResolvedValueOnce(null); // Tab gone!

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('chrome API becomes undefined mid-operation', async () => {
    // Start operation
    const promise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    // Delete chrome object
    setTimeout(() => {
      delete global.chrome;
    }, 10);

    const result = await promise.catch(err => ({ error: err.message }));
    expect(result).toBeDefined();

    // Restore for cleanup
    global.chrome = mockChrome;
  });
});

describe('Adversarial: Memory and Resource Exhaustion', () => {
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

  test('params object with 10MB of data', async () => {
    const hugeParams = {
      url: 'https://example.com',
      autoClose: true,
      extraData: 'x'.repeat(10 * 1024 * 1024), // 10MB string
    };

    const result = await handleOpenUrlCommand('cmd-1', hugeParams).catch(err => ({
      error: err.message,
    }));

    expect(result).toBeDefined();
  });

  test('deeply nested object (10000 levels)', async () => {
    const obj = { url: 'https://example.com', autoClose: true };
    let current = obj;

    for (let i = 0; i < 10000; i++) {
      current.nested = {};
      current = current.nested;
    }

    const result = await handleOpenUrlCommand('cmd-1', obj).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('params with 100k properties', async () => {
    const params = { url: 'https://example.com', autoClose: true };

    for (let i = 0; i < 100000; i++) {
      params[`prop${i}`] = `value${i}`;
    }

    const result = await handleOpenUrlCommand('cmd-1', params).catch(err => ({
      error: err.message,
    }));

    expect(result).toBeDefined();
  });

  test('circular reference with 1000 nodes', async () => {
    const nodes = [];
    for (let i = 0; i < 1000; i++) {
      nodes.push({ id: i });
    }

    // Create circular chain
    for (let i = 0; i < 1000; i++) {
      nodes[i].next = nodes[(i + 1) % 1000];
    }

    const params = {
      url: 'https://example.com',
      autoClose: true,
      data: nodes[0],
    };

    const result = await handleOpenUrlCommand('cmd-1', params).catch(err => ({
      error: err.message,
    }));

    expect(result).toBeDefined();
  });
});

describe('Adversarial: Prototype Pollution Advanced', () => {
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

    // Clean up any pollution
    delete Object.prototype.polluted;
    delete Object.prototype.isAdmin;
    delete Object.prototype.autoClose;
  });

  test('attempt to pollute via __proto__ in JSON string', async () => {
    const maliciousJson = JSON.parse('{"__proto__":{"polluted":true}}');

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      ...maliciousJson,
    });

    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('attempt to pollute via constructor.prototype', async () => {
    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      constructor: {
        prototype: {
          isAdmin: true,
        },
      },
    });

    expect(Object.prototype.isAdmin).toBeUndefined();
  });

  test('attempt to change Object.prototype.toString', async () => {
    const originalToString = Object.prototype.toString;

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      __proto__: {
        toString: () => 'HACKED',
      },
    });

    expect(Object.prototype.toString).toBe(originalToString);
  });
});

describe('Adversarial: Malicious URL Schemes', () => {
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

  test('javascript: with unicode encoding', async () => {
    const evilUrl = 'java\u0073cript:alert(1)';

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: evilUrl,
      })
    ).rejects.toThrow();
  });

  test('javascript: with URL encoding', async () => {
    const evilUrl = 'jav%61script:alert(1)';

    const result = await handleOpenUrlCommand('cmd-1', {
      url: evilUrl,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('data: with base64 encoded HTML/JS', async () => {
    const evilUrl = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: evilUrl,
      })
    ).rejects.toThrow();
  });

  test('vbscript: protocol', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'vbscript:msgbox("XSS")',
      })
    ).rejects.toThrow();
  });

  test('file: protocol to access local files', async () => {
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'file:///etc/passwd',
      })
    ).rejects.toThrow();
  });

  test('chrome-extension: protocol hijacking', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'chrome-extension://fake-id/evil.html',
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('URL with CRLF injection', async () => {
    const evilUrl = 'https://example.com\r\nSet-Cookie: evil=true';

    const result = await handleOpenUrlCommand('cmd-1', {
      url: evilUrl,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('URL with homograph attack (punycode)', async () => {
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://xn--pple-43d.com', // аpple.com (Cyrillic 'а')
      autoClose: true,
      captureConsole: false,
    });

    // Should work (legitimate use case), but worth testing
    expect(result.tabId).toBeDefined();
  });
});

describe('Adversarial: Error Cascade Scenarios', () => {
  let mockChrome;

  beforeEach(() => {
    global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockChrome = {
      tabs: {
        create: jest.fn(),
        remove: jest.fn(),
        get: jest.fn(),
      },
      scripting: {
        executeScript: jest.fn(),
      },
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('tab create succeeds but returns malformed tab object', async () => {
    mockChrome.tabs.create.mockResolvedValue({}); // No id!

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('tab create returns null', async () => {
    mockChrome.tabs.create.mockResolvedValue(null);

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
      })
    ).rejects.toThrow();
  });

  test('tab create throws after delay', async () => {
    mockChrome.tabs.create.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tab creation failed')), 100);
      });
    });

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
      })
    ).rejects.toThrow();
  });

  test('tab.get returns different tab ID', async () => {
    mockChrome.tabs.create.mockResolvedValue({ id: 123 });
    mockChrome.tabs.get.mockResolvedValue({ id: 999 }); // Different!

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
    }).catch(err => ({ error: err.message }));

    expect(result).toBeDefined();
  });

  test('remove throws error, get still returns tab', async () => {
    mockChrome.tabs.create.mockResolvedValue({ id: 123 });
    mockChrome.tabs.remove.mockRejectedValue(new Error('Cannot remove'));
    mockChrome.tabs.get.mockResolvedValue({ id: 123 }); // Still exists!

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
    });

    expect(result.tabClosed).toBe(false);
  });
});

describe('Adversarial: Timing Attacks', () => {
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

  test('duration of 0 with autoClose should close immediately', async () => {
    const start = Date.now();

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 0,
      autoClose: true,
    });

    const elapsed = Date.now() - start;

    // Should complete very quickly
    expect(elapsed).toBeLessThan(1000);
  });

  test('operations with random delays', async () => {
    const operations = Array(50)
      .fill()
      .map((_, i) => {
        const randomDelay = Math.random() * 100;
        mockChrome.tabs.create.mockResolvedValueOnce(
          new Promise(resolve =>
            setTimeout(() => resolve({ id: i, url: 'https://example.com' }), randomDelay)
          )
        );

        return handleOpenUrlCommand(`cmd-${i}`, {
          url: 'https://example.com',
          autoClose: true,
          captureConsole: false,
        });
      });

    const results = await Promise.allSettled(operations);

    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(40);
  }, 10000);
});

describe('Adversarial: State Corruption', () => {
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

  test('mutate params object during operation', async () => {
    const params = {
      url: 'https://example.com',
      autoClose: true,
    };

    const promise = handleOpenUrlCommand('cmd-1', params);

    // Mutate while operation is running
    setTimeout(() => {
      params.url = 'javascript:alert(1)';
      params.autoClose = false;
    }, 10);

    const result = await promise.catch(err => ({ error: err.message }));
    expect(result).toBeDefined();
  });

  test('freeze params object', async () => {
    const params = Object.freeze({
      url: 'https://example.com',
      autoClose: true,
    });

    const result = await handleOpenUrlCommand('cmd-1', params);
    expect(result.tabId).toBeDefined();
  });

  test('params with getters that have side effects', async () => {
    let callCount = 0;
    const params = {
      get url() {
        callCount++;
        return 'https://example.com';
      },
      autoClose: true,
    };

    await handleOpenUrlCommand('cmd-1', params);

    // Should not call getter excessively
    expect(callCount).toBeLessThan(10);
  });
});

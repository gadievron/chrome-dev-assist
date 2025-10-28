/**
 * Phase 1.1 Integration Tests
 *
 * Tests for discovery & tab management features
 *
 * NOTE: These tests require:
 * 1. WebSocket server running
 * 2. Chrome Dev Assist extension loaded in Chrome
 * 3. At least one other extension installed for testing
 */

const WebSocket = require('ws');
const crypto = require('crypto');

describe('Phase 1.1 - Discovery & Tab Management', () => {
  let server;
  const PORT = 9876;

  beforeAll(async () => {
    // Start WebSocket server for tests
    const WebSocketServer = require('ws').Server;
    server = new WebSocketServer({ port: PORT + 1 }); // Use different port for tests
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  /**
   * Helper: Send command and wait for response
   */
  async function sendCommand(command) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:9876');
      const commandId = crypto.randomUUID();
      let timeout;

      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'command',
            id: commandId,
            command: command,
          })
        );

        timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Command timeout'));
        }, 10000);
      });

      ws.on('message', data => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());

        if (response.type === 'response' && response.id === commandId) {
          ws.close();
          resolve(response.data);
        } else if (response.type === 'error') {
          ws.close();
          reject(new Error(response.error.message));
        }
      });

      ws.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // ===================================================================
  // getAllExtensions Tests
  // ===================================================================

  describe('getAllExtensions', () => {
    test('returns list of installed extensions', async () => {
      const result = await sendCommand({
        type: 'getAllExtensions',
        params: {},
      });

      expect(result).toHaveProperty('extensions');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.extensions)).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    test('filters out self (Chrome Dev Assist)', async () => {
      const result = await sendCommand({
        type: 'getAllExtensions',
        params: {},
      });

      // Should not include Chrome Dev Assist itself
      const selfInList = result.extensions.some(ext => ext.name === 'Chrome Dev Assist');
      expect(selfInList).toBe(false);
    });

    test('includes extension details', async () => {
      const result = await sendCommand({
        type: 'getAllExtensions',
        params: {},
      });

      if (result.extensions.length > 0) {
        const ext = result.extensions[0];
        expect(ext).toHaveProperty('id');
        expect(ext).toHaveProperty('name');
        expect(ext).toHaveProperty('version');
        expect(ext).toHaveProperty('enabled');
        expect(ext).toHaveProperty('description');
        expect(ext).toHaveProperty('installType');

        // Validate types
        expect(typeof ext.id).toBe('string');
        expect(typeof ext.name).toBe('string');
        expect(typeof ext.version).toBe('string');
        expect(typeof ext.enabled).toBe('boolean');
      }
    });

    test('count matches array length', async () => {
      const result = await sendCommand({
        type: 'getAllExtensions',
        params: {},
      });

      expect(result.count).toBe(result.extensions.length);
    });
  });

  // ===================================================================
  // getExtensionInfo Tests
  // ===================================================================

  describe('getExtensionInfo', () => {
    let testExtensionId;

    beforeAll(async () => {
      // Get a valid extension ID for testing
      const result = await sendCommand({
        type: 'getAllExtensions',
        params: {},
      });

      if (result.extensions.length > 0) {
        testExtensionId = result.extensions[0].id;
      }
    });

    test('returns details for valid extension ID', async () => {
      if (!testExtensionId) {
        console.warn('Skipping test - no test extension available');
        return;
      }

      const result = await sendCommand({
        type: 'getExtensionInfo',
        params: { extensionId: testExtensionId },
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('enabled');
      expect(result).toHaveProperty('permissions');
      expect(result).toHaveProperty('installType');

      expect(result.id).toBe(testExtensionId);
    });

    test('throws error for non-existent extension', async () => {
      await expect(
        sendCommand({
          type: 'getExtensionInfo',
          params: { extensionId: 'abcdefghijklmnopqrstuvwxyzabcdef' },
        })
      ).rejects.toThrow(/not found/i);
    });

    test('throws error for missing extension ID', async () => {
      await expect(
        sendCommand({
          type: 'getExtensionInfo',
          params: {},
        })
      ).rejects.toThrow(/required/i);
    });

    test('includes permissions array', async () => {
      if (!testExtensionId) {
        console.warn('Skipping test - no test extension available');
        return;
      }

      const result = await sendCommand({
        type: 'getExtensionInfo',
        params: { extensionId: testExtensionId },
      });

      expect(Array.isArray(result.permissions)).toBe(true);
    });
  });

  // ===================================================================
  // openUrl Tests
  // ===================================================================

  describe('openUrl', () => {
    let createdTabId;

    afterEach(async () => {
      // Cleanup: close created tab
      if (createdTabId) {
        try {
          await sendCommand({
            type: 'closeTab',
            params: { tabId: createdTabId },
          });
        } catch (err) {
          // Ignore errors if tab already closed
        }
        createdTabId = null;
      }
    });

    test('opens URL in new tab', async () => {
      const result = await sendCommand({
        type: 'openUrl',
        params: { url: 'https://example.com' },
      });

      expect(result).toHaveProperty('tabId');
      expect(result).toHaveProperty('url');
      expect(typeof result.tabId).toBe('number');

      createdTabId = result.tabId;
    });

    test('throws error for missing URL', async () => {
      await expect(
        sendCommand({
          type: 'openUrl',
          params: {},
        })
      ).rejects.toThrow(/required/i);
    });

    test('supports active option', async () => {
      const result = await sendCommand({
        type: 'openUrl',
        params: { url: 'https://example.com', active: false },
      });

      expect(result.tabId).toBeDefined();
      createdTabId = result.tabId;
    });

    test('supports captureConsole option', async () => {
      const result = await sendCommand({
        type: 'openUrl',
        params: {
          url: 'https://example.com',
          captureConsole: true,
          duration: 1000,
        },
      });

      expect(result).toHaveProperty('consoleLogs');
      expect(Array.isArray(result.consoleLogs)).toBe(true);

      createdTabId = result.tabId;
    });

    test('returns tabId', async () => {
      const result = await sendCommand({
        type: 'openUrl',
        params: { url: 'https://example.com' },
      });

      expect(result.tabId).toBeGreaterThan(0);
      createdTabId = result.tabId;
    });
  });

  // ===================================================================
  // reloadTab Tests
  // ===================================================================

  describe('reloadTab', () => {
    let testTabId;

    beforeEach(async () => {
      // Create a test tab
      const result = await sendCommand({
        type: 'openUrl',
        params: { url: 'https://example.com' },
      });
      testTabId = result.tabId;
    });

    afterEach(async () => {
      // Cleanup
      if (testTabId) {
        try {
          await sendCommand({
            type: 'closeTab',
            params: { tabId: testTabId },
          });
        } catch (err) {
          // Ignore
        }
        testTabId = null;
      }
    });

    test('reloads tab by ID', async () => {
      const result = await sendCommand({
        type: 'reloadTab',
        params: { tabId: testTabId },
      });

      expect(result).toHaveProperty('tabId');
      expect(result.tabId).toBe(testTabId);
      expect(result).toHaveProperty('bypassCache');
    });

    test('supports bypassCache option (hard reload)', async () => {
      const result = await sendCommand({
        type: 'reloadTab',
        params: { tabId: testTabId, bypassCache: true },
      });

      expect(result.bypassCache).toBe(true);
    });

    test('supports captureConsole option', async () => {
      const result = await sendCommand({
        type: 'reloadTab',
        params: {
          tabId: testTabId,
          captureConsole: true,
          duration: 1000,
        },
      });

      expect(result).toHaveProperty('consoleLogs');
      expect(Array.isArray(result.consoleLogs)).toBe(true);
    });

    test('throws error for missing tabId', async () => {
      await expect(
        sendCommand({
          type: 'reloadTab',
          params: {},
        })
      ).rejects.toThrow(/required/i);
    });
  });

  // ===================================================================
  // closeTab Tests
  // ===================================================================

  describe('closeTab', () => {
    test('closes tab by ID', async () => {
      // Create tab
      const openResult = await sendCommand({
        type: 'openUrl',
        params: { url: 'https://example.com' },
      });

      const tabId = openResult.tabId;

      // Close tab
      const result = await sendCommand({
        type: 'closeTab',
        params: { tabId: tabId },
      });

      expect(result).toHaveProperty('closed');
      expect(result.closed).toBe(true);
      expect(result.tabId).toBe(tabId);
    });

    test('throws error for missing tabId', async () => {
      await expect(
        sendCommand({
          type: 'closeTab',
          params: {},
        })
      ).rejects.toThrow(/required/i);
    });
  });
});

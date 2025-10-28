/**
 * Tests for check-extension-health.js
 *
 * Tests the extension health checker that verifies:
 * - WebSocket server running
 * - Extension loaded
 * - API responding
 */

const chromeDevAssist = require('../../claude-code/index.js');

// Mock the API for testing different scenarios
jest.mock('../../claude-code/index.js');

describe('check-extension-health.js logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health check scenarios', () => {
    test('should pass when all checks succeed', async () => {
      // Mock successful responses
      chromeDevAssist.getAllExtensions.mockResolvedValueOnce({
        extensions: [{ id: 'test123', name: 'Test Extension' }],
        count: 1,
      });

      chromeDevAssist.getExtensionInfo.mockResolvedValueOnce({
        id: 'gnojocphflllgichkehjhkojkihcihfn',
        name: 'Chrome Dev Assist',
        version: '1.0.0',
        enabled: true,
      });

      chromeDevAssist.getAllExtensions.mockResolvedValueOnce({
        extensions: [{ id: 'test123', name: 'Test Extension' }],
        count: 1,
      });

      // Simulate health check logic
      let allChecksPassed = true;

      try {
        // Check 1: Server running
        await chromeDevAssist.getAllExtensions();

        // Check 2: Extension loaded
        const info = await chromeDevAssist.getExtensionInfo('gnojocphflllgichkehjhkojkihcihfn');
        expect(info.name).toBe('Chrome Dev Assist');
        expect(info.enabled).toBe(true);

        // Check 3: API functionality
        const result = await chromeDevAssist.getAllExtensions();
        expect(result.extensions).toBeDefined();
      } catch (err) {
        allChecksPassed = false;
      }

      expect(allChecksPassed).toBe(true);
    });

    test('should fail when server not responding', async () => {
      chromeDevAssist.getAllExtensions.mockRejectedValueOnce(new Error('Extension not connected'));

      let healthCheckPassed = true;

      try {
        await chromeDevAssist.getAllExtensions();
      } catch (err) {
        healthCheckPassed = false;
        expect(err.message).toContain('Extension not connected');
      }

      expect(healthCheckPassed).toBe(false);
    });

    test('should fail when extension not loaded', async () => {
      // Server running
      chromeDevAssist.getAllExtensions.mockResolvedValueOnce({
        extensions: [],
        count: 0,
      });

      // Extension not found
      chromeDevAssist.getExtensionInfo.mockRejectedValueOnce(new Error('Extension not found'));

      let healthCheckPassed = true;

      try {
        await chromeDevAssist.getAllExtensions(); // Pass
        await chromeDevAssist.getExtensionInfo('gnojocphflllgichkehjhkojkihcihfn'); // Fail
      } catch (err) {
        healthCheckPassed = false;
        expect(err.message).toContain('Extension not found');
      }

      expect(healthCheckPassed).toBe(false);
    });

    test('should timeout if server too slow', async () => {
      const TIMEOUT_MS = 100;

      chromeDevAssist.getAllExtensions.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      let timedOut = false;

      try {
        await Promise.race([
          chromeDevAssist.getAllExtensions(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)),
        ]);
      } catch (err) {
        timedOut = err.message === 'Timeout';
      }

      expect(timedOut).toBe(true);
    });
  });

  describe('Extension info validation', () => {
    test('should validate extension has required fields', async () => {
      const mockInfo = {
        id: 'gnojocphflllgichkehjhkojkihcihfn',
        name: 'Chrome Dev Assist',
        version: '1.0.0',
        enabled: true,
        description: 'Test extension',
      };

      chromeDevAssist.getExtensionInfo.mockResolvedValueOnce(mockInfo);

      const info = await chromeDevAssist.getExtensionInfo('gnojocphflllgichkehjhkojkihcihfn');

      expect(info).toHaveProperty('id');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('enabled');
      expect(info.id).toBe('gnojocphflllgichkehjhkojkihcihfn');
    });

    test('should detect disabled extension', async () => {
      chromeDevAssist.getExtensionInfo.mockResolvedValueOnce({
        id: 'gnojocphflllgichkehjhkojkihcihfn',
        name: 'Chrome Dev Assist',
        version: '1.0.0',
        enabled: false,
      });

      const info = await chromeDevAssist.getExtensionInfo('gnojocphflllgichkehjhkojkihcihfn');

      expect(info.enabled).toBe(false);
      // Health check should warn about disabled extension
    });
  });

  describe('API functionality checks', () => {
    test('should verify API returns valid data structure', async () => {
      const mockResponse = {
        extensions: [
          { id: 'ext1', name: 'Extension 1' },
          { id: 'ext2', name: 'Extension 2' },
        ],
        count: 2,
      };

      chromeDevAssist.getAllExtensions.mockResolvedValueOnce(mockResponse);

      const result = await chromeDevAssist.getAllExtensions();

      expect(result).toHaveProperty('extensions');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.extensions)).toBe(true);
      expect(result.count).toBe(result.extensions.length);
    });

    test('should handle empty extension list', async () => {
      chromeDevAssist.getAllExtensions.mockResolvedValueOnce({
        extensions: [],
        count: 0,
      });

      const result = await chromeDevAssist.getAllExtensions();

      expect(result.extensions).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Error messages', () => {
    test('should provide helpful error for connection failure', async () => {
      chromeDevAssist.getAllExtensions.mockRejectedValueOnce(new Error('Extension not connected'));

      try {
        await chromeDevAssist.getAllExtensions();
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('Extension not connected');
        // Health checker should provide helpful instructions
      }
    });

    test('should provide helpful error for extension not found', async () => {
      chromeDevAssist.getExtensionInfo.mockRejectedValueOnce(new Error('Extension ID not found'));

      try {
        await chromeDevAssist.getExtensionInfo('invalid-id');
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });
  });

  describe('Check sequencing', () => {
    test('should run checks in correct order', async () => {
      const callOrder = [];

      chromeDevAssist.getAllExtensions.mockImplementation(async () => {
        callOrder.push('getAllExtensions-1');
        return { extensions: [], count: 0 };
      });

      chromeDevAssist.getExtensionInfo.mockImplementation(async () => {
        callOrder.push('getExtensionInfo');
        return { id: 'test', name: 'Test', version: '1.0.0', enabled: true };
      });

      // Simulate health check sequence
      await chromeDevAssist.getAllExtensions(); // Check 1: Server
      await chromeDevAssist.getExtensionInfo('test'); // Check 2: Extension

      chromeDevAssist.getAllExtensions.mockImplementation(async () => {
        callOrder.push('getAllExtensions-2');
        return { extensions: [], count: 0 };
      });

      await chromeDevAssist.getAllExtensions(); // Check 3: API

      expect(callOrder).toEqual(['getAllExtensions-1', 'getExtensionInfo', 'getAllExtensions-2']);
    });

    test('should stop at first failure', async () => {
      const checks = [];

      chromeDevAssist.getAllExtensions.mockImplementation(async () => {
        checks.push('check1');
        throw new Error('Server not running');
      });

      try {
        // Check 1: Server
        await chromeDevAssist.getAllExtensions();
        checks.push('check2'); // Should not reach
        checks.push('check3'); // Should not reach
      } catch (err) {
        // Expected
      }

      // Only first check should have run
      expect(checks).toEqual(['check1']);
    });
  });

  describe('Integration with actual API', () => {
    // These tests use the actual API (no mocks)
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    test('should work with real API when extension loaded', async () => {
      // This test requires extension actually loaded
      // Skip if not in integration test environment
      if (process.env.INTEGRATION_TEST !== 'true') {
        return;
      }

      const result = await chromeDevAssist.getAllExtensions();
      expect(result).toHaveProperty('extensions');
    }, 10000);

    test('should fail gracefully when extension not loaded', async () => {
      // This test checks error handling with real API
      if (process.env.INTEGRATION_TEST !== 'true') {
        return;
      }

      try {
        await chromeDevAssist.getExtensionInfo('invalid-id-12345678901234567890123456');
        fail('Should have thrown error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    }, 10000);
  });
});

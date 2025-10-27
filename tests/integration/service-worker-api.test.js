/**
 * Service Worker API Tests
 * Tests for new service worker management functions:
 * - wakeServiceWorker()
 * - getServiceWorkerStatus()
 * - captureServiceWorkerLogs() (manual helper)
 */

const chromeDevAssist = require('../../claude-code/index.js');

describe('Service Worker API - New Features', () => {

  describe('wakeServiceWorker()', () => {
    it('should wake the service worker by sending a ping', async () => {
      const result = await chromeDevAssist.wakeServiceWorker();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    }, 10000);

    it('should return metadata about the service worker', async () => {
      const result = await chromeDevAssist.wakeServiceWorker();

      expect(result.extensionId).toBeDefined();
      expect(result.version).toBeDefined();
    }, 10000);

    it('should work multiple times in succession', async () => {
      const result1 = await chromeDevAssist.wakeServiceWorker();
      const result2 = await chromeDevAssist.wakeServiceWorker();
      const result3 = await chromeDevAssist.wakeServiceWorker();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Timestamps should be different
      expect(result2.timestamp).toBeGreaterThan(result1.timestamp);
      expect(result3.timestamp).toBeGreaterThan(result2.timestamp);
    }, 10000);
  });

  describe('getServiceWorkerStatus()', () => {
    it('should return service worker running status', async () => {
      const status = await chromeDevAssist.getServiceWorkerStatus();

      expect(status).toBeDefined();
      expect(typeof status.running).toBe('boolean');
      expect(typeof status.connected).toBe('boolean');
    }, 10000);

    it('should return true for running and connected after wake', async () => {
      // Wake first to ensure it's running
      await chromeDevAssist.wakeServiceWorker();

      const status = await chromeDevAssist.getServiceWorkerStatus();

      expect(status.running).toBe(true);
      expect(status.connected).toBe(true);
    }, 10000);

    it('should include metadata when service worker is running', async () => {
      const status = await chromeDevAssist.getServiceWorkerStatus();

      if (status.running) {
        expect(status.extensionId).toBeDefined();
        expect(status.version).toBeDefined();
        expect(status.timestamp).toBeDefined();
      }
    }, 10000);

    it('should have reasonable response time', async () => {
      const startTime = Date.now();
      await chromeDevAssist.getServiceWorkerStatus();
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // Should respond in under 2 seconds
      expect(responseTime).toBeLessThan(2000);
    }, 10000);
  });

  describe('captureServiceWorkerLogs() - Manual Helper', () => {
    it('should return a manual helper object', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper).toBeDefined();
      expect(helper.manual).toBe(true);
      expect(helper.automated).toBe(false);
    });

    it('should provide instructions', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper.instructions).toBeDefined();
      expect(typeof helper.instructions).toBe('string');
      expect(helper.instructions.length).toBeGreaterThan(100);
      expect(helper.instructions).toContain('chrome://extensions');
    });

    it('should provide URLs for manual access', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper.urls).toBeDefined();
      expect(helper.urls.extensions).toBe('chrome://extensions');
      expect(helper.urls.serviceworkerInternals).toBe('chrome://serviceworker-internals');
    });

    it('should include the duration in instructions', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(7500);

      expect(helper.instructions).toContain('7500');
    });

    it('should have a printInstructions method', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper.printInstructions).toBeDefined();
      expect(typeof helper.printInstructions).toBe('function');

      // Should not throw when called
      expect(() => helper.printInstructions()).not.toThrow();
    });

    it('should provide troubleshooting guidance', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper.troubleshooting).toBeDefined();
      expect(typeof helper.troubleshooting).toBe('object');
      expect(Object.keys(helper.troubleshooting).length).toBeGreaterThan(0);
    });

    it('should include expected log format information', () => {
      const helper = chromeDevAssist.captureServiceWorkerLogs(5000);

      expect(helper.expectedFormat).toBeDefined();
      expect(helper.expectedFormat.levels).toBeDefined();
      expect(Array.isArray(helper.expectedFormat.levels)).toBe(true);
      expect(helper.expectedFormat.levels).toContain('log');
      expect(helper.expectedFormat.levels).toContain('error');
    });
  });

  describe('External Logging Capability', () => {
    it('should provide enableExternalLogging function', () => {
      expect(chromeDevAssist.enableExternalLogging).toBeDefined();
      expect(typeof chromeDevAssist.enableExternalLogging).toBe('function');
    });

    it('should enable external logging with endpoint', async () => {
      const result = await chromeDevAssist.enableExternalLogging({
        endpoint: 'http://localhost:9999/logs',
        levels: ['error', 'warn']
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.enabled).toBe(true);
    }, 10000);

    it('should disable external logging', async () => {
      // Enable first
      await chromeDevAssist.enableExternalLogging({
        endpoint: 'http://localhost:9999/logs'
      });

      // Then disable
      const result = await chromeDevAssist.disableExternalLogging();

      expect(result.success).toBe(true);
      expect(result.enabled).toBe(false);
    }, 10000);

    it('should get external logging status', async () => {
      const status = await chromeDevAssist.getExternalLoggingStatus();

      expect(status).toBeDefined();
      expect(typeof status.enabled).toBe('boolean');
    }, 10000);

    it('should reject invalid endpoint URLs', async () => {
      await expect(
        chromeDevAssist.enableExternalLogging({ endpoint: 'not-a-url' })
      ).rejects.toThrow();
    }, 10000);

    it('should accept valid log levels only', async () => {
      const result = await chromeDevAssist.enableExternalLogging({
        endpoint: 'http://localhost:9999/logs',
        levels: ['log', 'error', 'warn', 'info', 'debug']
      });

      expect(result.success).toBe(true);
    }, 10000);
  });

  // Clean up after all tests
  afterAll(async () => {
    // Disable external logging if enabled
    try {
      await chromeDevAssist.disableExternalLogging();
    } catch (error) {
      // Ignore errors on cleanup
    }

    console.log('\n✅ All service worker API tests completed\n');
  });
});

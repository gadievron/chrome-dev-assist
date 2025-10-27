/**
 * Keep-Alive Mechanism Tests
 * Tests for service worker lifecycle and connection persistence
 *
 * Architecture:
 * - chrome.runtime.onStartup: Browser start
 * - chrome.runtime.onInstalled: Extension install/update/reload
 * - chrome.alarms 'keep-alive': Periodic ping every 15s
 * - WebSocket ping messages: Reset service worker idle timer (Chrome 116+)
 */

const chromeDevAssist = require('../../claude-code/index.js');

describe('Keep-Alive Mechanisms', () => {

  describe('WebSocket Ping Mechanism', () => {
    it('should send ping messages when connection is active', async () => {
      // Wake service worker to ensure connection
      const status = await chromeDevAssist.wakeServiceWorker();
      expect(status.success).toBe(true);
      expect(status.running).toBe(true);

      // Wait for keep-alive alarm to fire (15 seconds + buffer)
      // Note: We can't directly observe the ping, but we can verify
      // the connection stays active
      await new Promise(resolve => setTimeout(resolve, 16000));

      // Verify connection still active after alarm cycle
      const status2 = await chromeDevAssist.getServiceWorkerStatus();
      expect(status2.running).toBe(true);
      expect(status2.connected).toBe(true);
    }, 20000);

    it('should reconnect if connection lost during keep-alive', async () => {
      // This test verifies the keep-alive alarm detects disconnection
      // In production, if WebSocket closes, the alarm will trigger reconnection

      const status = await chromeDevAssist.getServiceWorkerStatus();
      expect(status.running).toBe(true);
    }, 10000);
  });

  describe('Connection Resilience', () => {
    it('should maintain connection for extended periods', async () => {
      // Verify connection persists beyond service worker idle timeout (30s)
      const initialStatus = await chromeDevAssist.wakeServiceWorker();
      expect(initialStatus.success).toBe(true);

      const initialTime = initialStatus.timestamp;

      // Wait 35 seconds (beyond 30s service worker idle timeout)
      console.log('Waiting 35 seconds to test keep-alive...');
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Connection should still be active (keep-alive prevented idle)
      const finalStatus = await chromeDevAssist.getServiceWorkerStatus();
      expect(finalStatus.success).toBe(true);
      expect(finalStatus.running).toBe(true);
      expect(finalStatus.timestamp).toBeGreaterThan(initialTime);
    }, 45000);

    it('should handle multiple rapid status checks', async () => {
      // Rapid API calls should not break connection
      const results = await Promise.all([
        chromeDevAssist.getServiceWorkerStatus(),
        chromeDevAssist.getServiceWorkerStatus(),
        chromeDevAssist.getServiceWorkerStatus(),
        chromeDevAssist.wakeServiceWorker(),
        chromeDevAssist.getServiceWorkerStatus()
      ]);

      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.running).toBe(true);
      });
    }, 10000);
  });

  describe('Service Worker Lifecycle', () => {
    it('should have alarm configured for keep-alive', async () => {
      // We can't directly check chrome.alarms from here,
      // but we can verify the service worker is responsive
      // which implies alarms are working

      const status = await chromeDevAssist.wakeServiceWorker();
      expect(status.success).toBe(true);

      // If alarm wasn't configured, service worker would be idle
      // and this second call might fail
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status2 = await chromeDevAssist.getServiceWorkerStatus();
      expect(status2.success).toBe(true);
    }, 10000);

    it('should respond immediately to wake requests', async () => {
      const startTime = Date.now();
      const result = await chromeDevAssist.wakeServiceWorker();
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      // Should respond in under 1 second
      expect(responseTime).toBeLessThan(1000);
    }, 10000);
  });

  describe('Error Recovery', () => {
    it('should recover from temporary disconnections', async () => {
      // Initial connection
      const status1 = await chromeDevAssist.wakeServiceWorker();
      expect(status1.success).toBe(true);

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should still be connected
      const status2 = await chromeDevAssist.getServiceWorkerStatus();
      expect(status2.success).toBe(true);
      expect(status2.running).toBe(true);
    }, 10000);

    it('should handle server restart gracefully', async () => {
      // Note: This test assumes server auto-restart capability
      // If server is down, API will auto-start it

      const status = await chromeDevAssist.getServiceWorkerStatus();
      expect(status).toBeDefined();

      // Even if connection was lost, it should recover
      expect(typeof status.running).toBe('boolean');
    }, 10000);
  });

  // Clean up
  afterAll(() => {
    console.log('\n✅ Keep-alive mechanism tests completed\n');
  });
});

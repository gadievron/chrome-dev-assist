/**
 * Health Manager - Performance Tests
 *
 * Validates performance characteristics of health-manager module
 * to ensure it doesn't introduce latency into critical path.
 */

const HealthManager = require('../../src/health/health-manager');
const WebSocket = require('ws');

describe('HealthManager - Performance', () => {

  test('isExtensionConnected() should execute in <1ms', () => {
    const health = new HealthManager();
    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    const iterations = 10000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      health.isExtensionConnected();
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`isExtensionConnected() avg time: ${avgTime.toFixed(4)}ms (${iterations} iterations)`);

    // Should be extremely fast (well under 1ms per call)
    expect(avgTime).toBeLessThan(1);
  });

  test('getHealthStatus() should execute in <5ms', () => {
    const health = new HealthManager();
    const mockSocket = { readyState: WebSocket.CONNECTING };
    health.setExtensionSocket(mockSocket);

    const iterations = 1000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      health.getHealthStatus();
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`getHealthStatus() avg time: ${avgTime.toFixed(4)}ms (${iterations} iterations)`);

    // Should be fast even with status object construction
    expect(avgTime).toBeLessThan(5);
  });

  test('ensureHealthy() should execute in <5ms when healthy', async () => {
    const health = new HealthManager();
    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    const iterations = 1000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await health.ensureHealthy();
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`ensureHealthy() avg time: ${avgTime.toFixed(4)}ms (${iterations} iterations)`);

    // Should be fast on happy path
    expect(avgTime).toBeLessThan(5);
  });

  test('should handle 1000 rapid state changes efficiently', () => {
    const health = new HealthManager();
    const socket = { readyState: WebSocket.CONNECTING };

    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      socket.readyState = [
        WebSocket.CONNECTING,
        WebSocket.OPEN,
        WebSocket.CLOSING,
        WebSocket.CLOSED
      ][i % 4];

      health.setExtensionSocket(socket);
      health.isExtensionConnected();
      health.getHealthStatus();
    }

    const elapsed = Date.now() - start;

    console.log(`1000 rapid state changes completed in ${elapsed}ms`);

    // Should complete in under 1 second
    expect(elapsed).toBeLessThan(1000);
  });

  test('should not leak memory with 10000 status checks', () => {
    const health = new HealthManager();
    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    const memBefore = process.memoryUsage().heapUsed;

    // Generate 10000 status objects
    for (let i = 0; i < 10000; i++) {
      const status = health.getHealthStatus();
      // Force some object creation
      const _ = JSON.stringify(status);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = (memAfter - memBefore) / 1024 / 1024; // MB

    console.log(`Memory delta after 10000 status checks: ${memDelta.toFixed(2)} MB`);

    // Should not accumulate significant memory (allow 10 MB for overhead)
    expect(memDelta).toBeLessThan(10);
  });

});

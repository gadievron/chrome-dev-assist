/**
 * Health Manager Tests
 *
 * Test-First Implementation: These tests define the behavior of the health-manager module
 * which centralizes all connection health checks and recovery logic.
 *
 * Following Rule 3: Tests written BEFORE implementation
 */

const HealthManager = require('../../src/health/health-manager');
const WebSocket = require('ws');

describe('HealthManager - Connection Status Checks', () => {

  test('should report extension as disconnected when socket is null', () => {
    const health = new HealthManager();

    // Mock: No extension connected
    health.setExtensionSocket(null);

    expect(health.isExtensionConnected()).toBe(false);
  });

  test('should report extension as disconnected when socket is CLOSED', () => {
    const health = new HealthManager();

    // Mock: Extension socket exists but closed
    const mockSocket = { readyState: WebSocket.CLOSED };
    health.setExtensionSocket(mockSocket);

    expect(health.isExtensionConnected()).toBe(false);
  });

  test('should report extension as connected when socket is OPEN', () => {
    const health = new HealthManager();

    // Mock: Extension socket is OPEN
    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    expect(health.isExtensionConnected()).toBe(true);
  });

  test('should report extension as disconnected when socket is CONNECTING', () => {
    const health = new HealthManager();

    // Mock: Extension socket is still connecting
    const mockSocket = { readyState: WebSocket.CONNECTING };
    health.setExtensionSocket(mockSocket);

    // CONNECTING is not fully connected yet
    expect(health.isExtensionConnected()).toBe(false);
  });

  test('should report extension as disconnected when socket is CLOSING', () => {
    const health = new HealthManager();

    // Mock: Extension socket is closing
    const mockSocket = { readyState: WebSocket.CLOSING };
    health.setExtensionSocket(mockSocket);

    expect(health.isExtensionConnected()).toBe(false);
  });
});

describe('HealthManager - Overall Health Status', () => {

  test('should report healthy when extension is connected', () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    const status = health.getHealthStatus();

    expect(status).toEqual({
      healthy: true,
      extension: { connected: true, readyState: WebSocket.OPEN },
      issues: []
    });
  });

  test('should report unhealthy when extension is disconnected', () => {
    const health = new HealthManager();

    health.setExtensionSocket(null);

    const status = health.getHealthStatus();

    expect(status.healthy).toBe(false);
    expect(status.extension.connected).toBe(false);
    expect(status.issues).toContain('Extension not connected');
  });

  test('should include readyState in health status', () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.CLOSING };
    health.setExtensionSocket(mockSocket);

    const status = health.getHealthStatus();

    expect(status.extension.readyState).toBe(WebSocket.CLOSING);
  });
});

describe('HealthManager - ensureHealthy()', () => {

  test('should not throw when system is healthy', async () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(mockSocket);

    // Should not throw
    await expect(health.ensureHealthy()).resolves.toBeUndefined();
  });

  test('should throw with clear error when extension not connected', async () => {
    const health = new HealthManager();

    health.setExtensionSocket(null);

    await expect(health.ensureHealthy()).rejects.toThrow(
      'Extension not connected. Please ensure Chrome Dev Assist extension is loaded and running.'
    );
  });

  test('should throw with readyState info when socket exists but not OPEN', async () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.CLOSING };
    health.setExtensionSocket(mockSocket);

    await expect(health.ensureHealthy()).rejects.toThrow(
      /Extension connection is CLOSING/
    );
  });
});

describe('HealthManager - Error Messages with Context', () => {

  test('should provide helpful error message for CONNECTING state', () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.CONNECTING };
    health.setExtensionSocket(mockSocket);

    const status = health.getHealthStatus();

    expect(status.issues).toContain('Extension is still connecting. Please wait...');
  });

  test('should provide helpful error message for CLOSING state', () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.CLOSING };
    health.setExtensionSocket(mockSocket);

    const status = health.getHealthStatus();

    expect(status.issues).toContain('Extension connection is closing. Will reconnect automatically.');
  });

  test('should provide helpful error message for CLOSED state', () => {
    const health = new HealthManager();

    const mockSocket = { readyState: WebSocket.CLOSED };
    health.setExtensionSocket(mockSocket);

    const status = health.getHealthStatus();

    expect(status.issues).toContain('Extension disconnected. Waiting for reconnection...');
  });
});

describe('HealthManager - Multiple Checks', () => {

  test('should track multiple health issues', () => {
    const health = new HealthManager();

    // Both extension and API disconnected
    health.setExtensionSocket(null);
    health.setApiSocket(null);

    const status = health.getHealthStatus();

    expect(status.healthy).toBe(false);
    expect(status.issues.length).toBeGreaterThanOrEqual(1); // MVP: Extension only
    expect(status.issues).toContain('Extension not connected');
    // API socket check is optional for MVP, can be added later
  });
});

describe('HealthManager - Integration Scenarios', () => {

  test('should work with real WebSocket connection lifecycle', () => {
    const health = new HealthManager();

    // Scenario: Connection lifecycle
    // 1. Initially null
    expect(health.isExtensionConnected()).toBe(false);

    // 2. Connecting
    const connectingSocket = { readyState: WebSocket.CONNECTING };
    health.setExtensionSocket(connectingSocket);
    expect(health.isExtensionConnected()).toBe(false);

    // 3. Open (connected)
    connectingSocket.readyState = WebSocket.OPEN;
    expect(health.isExtensionConnected()).toBe(true);

    // 4. Closing
    connectingSocket.readyState = WebSocket.CLOSING;
    expect(health.isExtensionConnected()).toBe(false);

    // 5. Closed
    connectingSocket.readyState = WebSocket.CLOSED;
    expect(health.isExtensionConnected()).toBe(false);
  });

  test('should handle rapid state changes', () => {
    const health = new HealthManager();

    const socket = { readyState: WebSocket.CONNECTING };

    // Rapid succession of state changes
    for (let i = 0; i < 100; i++) {
      socket.readyState = [
        WebSocket.CONNECTING,
        WebSocket.OPEN,
        WebSocket.CLOSING,
        WebSocket.CLOSED
      ][i % 4];

      health.setExtensionSocket(socket);

      // Should always return consistent result based on current state
      const connected = health.isExtensionConnected();
      const expectedConnected = socket.readyState === WebSocket.OPEN;
      expect(connected).toBe(expectedConnected);
    }
  });
});

describe('HealthManager - Edge Cases', () => {

  test('should handle undefined socket gracefully', () => {
    const health = new HealthManager();

    health.setExtensionSocket(undefined);

    expect(health.isExtensionConnected()).toBe(false);
    expect(() => health.getHealthStatus()).not.toThrow();
  });

  test('should handle socket without readyState property', () => {
    const health = new HealthManager();

    // Malformed socket object
    const badSocket = {};
    health.setExtensionSocket(badSocket);

    // Should treat as disconnected
    expect(health.isExtensionConnected()).toBe(false);
  });

  test('should handle socket with invalid readyState value', () => {
    const health = new HealthManager();

    const badSocket = { readyState: 999 };
    health.setExtensionSocket(badSocket);

    // Should treat as disconnected (not a valid WebSocket.OPEN value)
    expect(health.isExtensionConnected()).toBe(false);
  });
});

/**
 * Health Manager - API Socket Tests
 *
 * Test-First Implementation: Tests for API socket tracking (currently stubbed for MVP).
 * These tests define behavior for future API socket health monitoring.
 */

const HealthManager = require('../../src/health/health-manager');
const WebSocket = require('ws');

describe('HealthManager - API Socket Tracking', () => {

  test('should accept API socket via setApiSocket()', () => {
    const health = new HealthManager();

    const apiSocket = { readyState: WebSocket.OPEN };
    health.setApiSocket(apiSocket);

    // Should not throw
    expect(health.apiSocket).toBe(apiSocket);
  });

  test('should accept null API socket', () => {
    const health = new HealthManager();

    health.setApiSocket(null);

    // Should not throw
    expect(health.apiSocket).toBeNull();
  });

  test('should allow changing API socket', () => {
    const health = new HealthManager();

    const socket1 = { readyState: WebSocket.OPEN };
    const socket2 = { readyState: WebSocket.CLOSED };

    health.setApiSocket(socket1);
    expect(health.apiSocket).toBe(socket1);

    health.setApiSocket(socket2);
    expect(health.apiSocket).toBe(socket2);
  });

  test('should not affect extension socket when setting API socket', () => {
    const health = new HealthManager();

    const extSocket = { readyState: WebSocket.OPEN };
    const apiSocket = { readyState: WebSocket.OPEN };

    health.setExtensionSocket(extSocket);
    health.setApiSocket(apiSocket);

    // Extension socket should be unchanged
    expect(health.extensionSocket).toBe(extSocket);
    expect(health.isExtensionConnected()).toBe(true);
  });

  test('should initialize with null API socket', () => {
    const health = new HealthManager();

    expect(health.apiSocket).toBeNull();
  });

});

describe('HealthManager - API Socket in Health Status (Future)', () => {

  test('should not affect health status when API socket is null (MVP behavior)', () => {
    const health = new HealthManager();

    const extSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(extSocket);
    health.setApiSocket(null);

    const status = health.getHealthStatus();

    // Healthy because extension connected, API null is acceptable
    expect(status.healthy).toBe(true);
  });

  test('should not affect health status when API socket is OPEN (MVP behavior)', () => {
    const health = new HealthManager();

    const extSocket = { readyState: WebSocket.OPEN };
    const apiSocket = { readyState: WebSocket.OPEN };

    health.setExtensionSocket(extSocket);
    health.setApiSocket(apiSocket);

    const status = health.getHealthStatus();

    // Healthy because extension connected (API not checked in MVP)
    expect(status.healthy).toBe(true);
  });

  test('should not affect health status when API socket is CLOSED (MVP behavior)', () => {
    const health = new HealthManager();

    const extSocket = { readyState: WebSocket.OPEN };
    const apiSocket = { readyState: WebSocket.CLOSED };

    health.setExtensionSocket(extSocket);
    health.setApiSocket(apiSocket);

    const status = health.getHealthStatus();

    // Still healthy - API status not checked in MVP
    expect(status.healthy).toBe(true);
  });

});

describe('HealthManager - API Socket Future Expansion', () => {

  test('should preserve API socket reference for future use', () => {
    const health = new HealthManager();

    const apiSocket = { readyState: WebSocket.OPEN, customProp: 'test' };
    health.setApiSocket(apiSocket);

    // Should preserve exact reference (not a copy)
    expect(health.apiSocket).toBe(apiSocket);
    expect(health.apiSocket.customProp).toBe('test');
  });

  test('should handle API socket with undefined readyState gracefully', () => {
    const health = new HealthManager();

    const badApiSocket = {}; // No readyState
    health.setApiSocket(badApiSocket);

    // Should not throw when getting health status
    expect(() => health.getHealthStatus()).not.toThrow();
  });

});

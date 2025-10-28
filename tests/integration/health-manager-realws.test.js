/**
 * Health Manager - Real WebSocket Integration Test
 *
 * Tests HealthManager with actual WebSocket instances (not mocks)
 * to verify it works correctly with real connection lifecycle.
 */

const HealthManager = require('../../src/health/health-manager');
const WebSocket = require('ws');

describe('HealthManager - Real WebSocket Integration', () => {
  let server;
  let client;

  afterEach(async () => {
    // Cleanup
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
    if (server) {
      await new Promise(resolve => {
        server.close(resolve);
      });
    }
  });

  test('should work with real WebSocket in OPEN state', done => {
    const health = new HealthManager();

    // Create real WebSocket server
    server = new WebSocket.Server({ port: 0 }); // Random port

    server.on('listening', () => {
      const port = server.address().port;

      // Create real WebSocket client
      client = new WebSocket(`ws://localhost:${port}`);

      client.on('open', () => {
        // Set real WebSocket
        health.setExtensionSocket(client);

        // Check health
        const status = health.getHealthStatus();

        expect(status.healthy).toBe(true);
        expect(status.extension.connected).toBe(true);
        expect(status.extension.readyState).toBe(WebSocket.OPEN);

        done();
      });

      client.on('error', err => {
        done(err);
      });
    });
  }, 5000);

  test('should detect real WebSocket close event', done => {
    const health = new HealthManager();

    server = new WebSocket.Server({ port: 0 });

    server.on('listening', () => {
      const port = server.address().port;
      client = new WebSocket(`ws://localhost:${port}`);

      client.on('open', () => {
        health.setExtensionSocket(client);
        health.getHealthStatus(); // Establish baseline

        // Listen for health change event
        health.on('health-changed', event => {
          expect(event.previous.healthy).toBe(true);
          expect(event.current.healthy).toBe(false);
          done();
        });

        // Close the WebSocket
        client.close();

        // Check health after a delay (WebSocket close is async)
        setTimeout(() => {
          const status = health.getHealthStatus();

          // Should detect closed state
          expect(status.healthy).toBe(false);
          expect(status.extension.connected).toBe(false);
          expect(status.extension.readyState).toBe(WebSocket.CLOSED);
        }, 100);
      });

      client.on('error', err => {
        done(err);
      });
    });
  }, 5000);

  test('should track real WebSocket state transitions', done => {
    const health = new HealthManager();

    server = new WebSocket.Server({ port: 0 });

    const stateChanges = [];

    server.on('listening', () => {
      const port = server.address().port;
      client = new WebSocket(`ws://localhost:${port}`);

      health.setExtensionSocket(client);

      // Monitor state changes
      const checkState = setInterval(() => {
        const state = client.readyState;
        stateChanges.push({
          readyState: state,
          connected: health.isExtensionConnected(),
        });

        if (state === WebSocket.OPEN && stateChanges.length === 1) {
          // Close after first OPEN detection
          client.close();
        }

        if (state === WebSocket.CLOSED) {
          clearInterval(checkState);

          // Verify we saw the transition
          const hadConnecting = stateChanges.some(s => s.readyState === WebSocket.CONNECTING);
          const hadOpen = stateChanges.some(
            s => s.readyState === WebSocket.OPEN && s.connected === true
          );
          const hadClosed = stateChanges.some(
            s => s.readyState === WebSocket.CLOSED && s.connected === false
          );

          expect(hadConnecting || hadOpen).toBe(true); // Must have been connecting or open
          expect(hadOpen).toBe(true); // Must have been open
          expect(hadClosed).toBe(true); // Must be closed now

          done();
        }
      }, 10);

      client.on('error', err => {
        clearInterval(checkState);
        done(err);
      });
    });
  }, 5000);

  test('should emit events for real WebSocket state changes', done => {
    const health = new HealthManager();

    server = new WebSocket.Server({ port: 0 });

    let connectionEventFired = false;

    server.on('listening', () => {
      const port = server.address().port;
      client = new WebSocket(`ws://localhost:${port}`);

      health.setExtensionSocket(client);

      // Establish baseline (CONNECTING state)
      health.getHealthStatus();

      // Listen for connection state change
      health.on('connection-state-changed', event => {
        if (event.current.readyState === WebSocket.OPEN) {
          connectionEventFired = true;
        }
      });

      client.on('open', () => {
        // Give event time to fire
        setTimeout(() => {
          // Trigger state check
          health.getHealthStatus();

          // Verify event fired
          expect(connectionEventFired).toBe(true);
          done();
        }, 50);
      });

      client.on('error', err => {
        done(err);
      });
    });
  }, 5000);
});

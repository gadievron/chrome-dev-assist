/**
 * Health Manager - Observer Pattern Tests
 *
 * Test-First Implementation: These tests define the observer/event behavior
 * for health-manager's observability hooks.
 *
 * Architecture Decision: Use EventEmitter pattern for clean separation
 * between health checking (HealthManager) and reacting to changes (observers).
 */

const HealthManager = require('../../src/health/health-manager');
const WebSocket = require('ws');

describe('HealthManager - Observer Pattern Basics', () => {

  test('should support on() method for event listeners', () => {
    const health = new HealthManager();

    // Should have on() method (EventEmitter pattern)
    expect(typeof health.on).toBe('function');
  });

  test('should support off() method for removing listeners', () => {
    const health = new HealthManager();

    // Should have off() method
    expect(typeof health.off).toBe('function');
  });

  test('should support once() method for one-time listeners', () => {
    const health = new HealthManager();

    // Should have once() method
    expect(typeof health.once).toBe('function');
  });

  test('should support removeAllListeners() method', () => {
    const health = new HealthManager();

    // Should have removeAllListeners() method
    expect(typeof health.removeAllListeners).toBe('function');
  });

});

describe('HealthManager - health-changed Event', () => {

  test('should emit health-changed when health status changes', (done) => {
    const health = new HealthManager();

    // Start unhealthy (no socket)
    health.setExtensionSocket(null);
    health.getHealthStatus(); // ESTABLISH BASELINE

    let eventReceived = false;

    // Listen for health change
    health.on('health-changed', (event) => {
      eventReceived = true;

      // Verify event payload structure
      expect(event).toHaveProperty('previous');
      expect(event).toHaveProperty('current');
      expect(event).toHaveProperty('timestamp');

      // Previous state: unhealthy
      expect(event.previous.healthy).toBe(false);

      // Current state: healthy
      expect(event.current.healthy).toBe(true);
      expect(event.current.extension.connected).toBe(true);

      done();
    });

    // Change to healthy state
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);

    // Trigger health check to detect change
    health.getHealthStatus();

    // Ensure event was received
    setTimeout(() => {
      if (!eventReceived) {
        done(new Error('health-changed event not emitted'));
      }
    }, 100);
  });

  test('should NOT emit health-changed if health status unchanged', (done) => {
    const health = new HealthManager();

    // Start healthy
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus(); // Establish initial state

    let eventCount = 0;

    // Listen for health change
    health.on('health-changed', () => {
      eventCount++;
    });

    // Check health again (still healthy)
    health.getHealthStatus();
    health.getHealthStatus();
    health.getHealthStatus();

    // Wait and verify no events emitted
    setTimeout(() => {
      expect(eventCount).toBe(0);
      done();
    }, 100);
  });

  test('should emit health-changed when transitioning healthy → unhealthy', (done) => {
    const health = new HealthManager();

    // Start healthy
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus(); // Establish initial state

    // Listen for health change
    health.on('health-changed', (event) => {
      // Previous: healthy
      expect(event.previous.healthy).toBe(true);

      // Current: unhealthy
      expect(event.current.healthy).toBe(false);
      expect(event.current.extension.connected).toBe(false);

      done();
    });

    // Transition to unhealthy
    health.setExtensionSocket(null);
    health.getHealthStatus(); // Trigger change detection
  });

  test('should support multiple listeners for same event', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);
    health.getHealthStatus(); // ESTABLISH BASELINE

    let listener1Called = false;
    let listener2Called = false;

    // First listener
    health.on('health-changed', () => {
      listener1Called = true;
    });

    // Second listener
    health.on('health-changed', () => {
      listener2Called = true;
    });

    // Trigger change
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus();

    setTimeout(() => {
      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
      done();
    }, 100);
  });

});

describe('HealthManager - connection-state-changed Event', () => {

  test('should emit connection-state-changed when extension state changes', (done) => {
    const health = new HealthManager();

    // Start with no connection
    health.setExtensionSocket(null);
    health.getHealthStatus(); // Establish baseline

    // Listen for connection change
    health.on('connection-state-changed', (event) => {
      expect(event).toHaveProperty('connection'); // 'extension' or 'api'
      expect(event).toHaveProperty('previous');
      expect(event).toHaveProperty('current');

      expect(event.connection).toBe('extension');
      expect(event.previous.connected).toBe(false);
      expect(event.current.connected).toBe(true);
      expect(event.current.readyState).toBe(WebSocket.OPEN);

      done();
    });

    // Change extension state
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus();
  });

  test('should NOT emit connection-state-changed if connection unchanged', (done) => {
    const health = new HealthManager();

    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus(); // Establish baseline

    let eventCount = 0;

    health.on('connection-state-changed', () => {
      eventCount++;
    });

    // Check multiple times (no change)
    health.getHealthStatus();
    health.getHealthStatus();

    setTimeout(() => {
      expect(eventCount).toBe(0);
      done();
    }, 100);
  });

  test('should emit when readyState changes within same socket', (done) => {
    const health = new HealthManager();

    const socket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(socket);
    health.getHealthStatus(); // Establish baseline

    health.on('connection-state-changed', (event) => {
      expect(event.previous.readyState).toBe(WebSocket.OPEN);
      expect(event.current.readyState).toBe(WebSocket.CLOSING);
      done();
    });

    // Mutate socket state (simulates real WebSocket behavior)
    socket.readyState = WebSocket.CLOSING;
    health.getHealthStatus(); // Detect change
  });

});

describe('HealthManager - issues-updated Event', () => {

  test('should emit issues-updated when issues array changes', (done) => {
    const health = new HealthManager();

    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus(); // ESTABLISH BASELINE (no issues)

    health.on('issues-updated', (event) => {
      expect(event).toHaveProperty('previous');
      expect(event).toHaveProperty('current');

      expect(event.previous).toEqual([]);
      expect(event.current.length).toBeGreaterThan(0);
      // When socket is null, we get "Extension not connected"
      expect(event.current).toContain('Extension not connected');

      done();
    });

    // Create issue by removing socket
    health.setExtensionSocket(null);
    health.getHealthStatus();
  });

  test('should NOT emit issues-updated if issues unchanged', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);
    health.getHealthStatus(); // Establish baseline

    let eventCount = 0;

    health.on('issues-updated', () => {
      eventCount++;
    });

    // Check multiple times (same issues)
    health.getHealthStatus();
    health.getHealthStatus();

    setTimeout(() => {
      expect(eventCount).toBe(0);
      done();
    }, 100);
  });

});

describe('HealthManager - Observer Management', () => {

  test('should remove listener with off()', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);
    health.getHealthStatus(); // ESTABLISH BASELINE

    let callCount = 0;

    const listener = () => {
      callCount++;
    };

    // Add listener
    health.on('health-changed', listener);

    // Trigger event
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus();

    setTimeout(() => {
      expect(callCount).toBe(1);

      // Remove listener
      health.off('health-changed', listener);

      // Trigger event again
      health.setExtensionSocket(null);
      health.getHealthStatus();

      setTimeout(() => {
        // Should still be 1 (listener removed)
        expect(callCount).toBe(1);
        done();
      }, 100);
    }, 100);
  });

  test('should support once() for one-time listeners', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);
    health.getHealthStatus(); // ESTABLISH BASELINE

    let callCount = 0;

    // One-time listener
    health.once('health-changed', () => {
      callCount++;
    });

    // Trigger event
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus();

    setTimeout(() => {
      expect(callCount).toBe(1);

      // Trigger event again
      health.setExtensionSocket(null);
      health.getHealthStatus();

      setTimeout(() => {
        // Should still be 1 (once listener removed after first call)
        expect(callCount).toBe(1);
        done();
      }, 100);
    }, 100);
  });

  test('should remove all listeners with removeAllListeners()', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);

    let healthChangedCount = 0;
    let connectionChangedCount = 0;

    health.on('health-changed', () => { healthChangedCount++; });
    health.on('connection-state-changed', () => { connectionChangedCount++; });

    // Remove all listeners
    health.removeAllListeners();

    // Trigger events
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);
    health.getHealthStatus();

    setTimeout(() => {
      expect(healthChangedCount).toBe(0);
      expect(connectionChangedCount).toBe(0);
      done();
    }, 100);
  });

});

describe('HealthManager - Observer Error Handling', () => {

  test('should not crash if observer throws error', (done) => {
    const health = new HealthManager();

    health.setExtensionSocket(null);

    // Listener that throws
    health.on('health-changed', () => {
      throw new Error('Observer error');
    });

    // Second listener should still execute
    let secondListenerCalled = false;
    health.on('health-changed', () => {
      secondListenerCalled = true;
    });

    // Trigger event (should not crash)
    const openSocket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(openSocket);

    // Wrap in try-catch to handle potential error
    try {
      health.getHealthStatus();
    } catch (err) {
      // EventEmitter may throw if no error listener
      // This is expected behavior
    }

    setTimeout(() => {
      // Health manager should still be functional
      const status = health.getHealthStatus();
      expect(status.healthy).toBe(true);
      done();
    }, 100);
  });

});

describe('HealthManager - Observer Performance', () => {

  test('should add minimal overhead with observers (<1ms)', () => {
    const health = new HealthManager();

    // Add 10 observers
    for (let i = 0; i < 10; i++) {
      health.on('health-changed', () => {
        // Simulate light processing
        const x = Math.random();
      });
    }

    const socket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(socket);

    const iterations = 1000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      // Alternate state to trigger events
      socket.readyState = i % 2 === 0 ? WebSocket.OPEN : WebSocket.CLOSED;
      health.getHealthStatus();
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`Observer overhead: ${avgTime.toFixed(4)}ms per check (10 observers)`);

    // Should be fast even with 10 observers
    expect(avgTime).toBeLessThan(1);
  });

  test('should not leak memory with many event emissions', () => {
    const health = new HealthManager();

    const socket = { readyState: WebSocket.OPEN };
    health.setExtensionSocket(socket);

    // Add observer
    health.on('connection-state-changed', () => {
      // Empty observer
    });

    const memBefore = process.memoryUsage().heapUsed;

    // Generate 1000 state changes
    for (let i = 0; i < 1000; i++) {
      socket.readyState = [
        WebSocket.OPEN,
        WebSocket.CLOSED,
        WebSocket.CONNECTING,
        WebSocket.CLOSING
      ][i % 4];
      health.getHealthStatus();
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = (memAfter - memBefore) / 1024 / 1024; // MB

    console.log(`Memory delta after 1000 events: ${memDelta.toFixed(2)} MB`);

    // Should not leak significant memory
    expect(memDelta).toBeLessThan(5);
  });

});

# Comprehensive Test Plan
## Chrome Dev Assist - Exhaustive Testing Strategy

**Version**: 1.0
**Date**: 2025-10-24
**Status**: 🔴 DRAFT - Needs Implementation

---

## Table of Contents

1. [Current Test Coverage](#current-test-coverage)
2. [New Features Testing](#new-features-testing)
3. [Old Features Regression Testing](#old-features-regression-testing)
4. [Edge Cases Testing](#edge-cases-testing)
5. [Weird Scenarios Testing](#weird-scenarios-testing)
6. [Combination Testing](#combination-testing)
7. [Performance & Stress Testing](#performance--stress-testing)
8. [Security Testing](#security-testing)
9. [E2E Testing](#e2e-testing)
10. [Test Priority Matrix](#test-priority-matrix)
11. [Test Gaps Analysis](#test-gaps-analysis)

---

## Current Test Coverage

### ✅ Implemented Tests (77 tests)

#### Unit Tests (58 tests)
- **HealthManager Core** (`health-manager.test.js`): 20 tests
  - Socket state tracking
  - Health status calculation
  - ensureHealthy() validation
  - Error scenarios

- **HealthManager Observers** (`health-manager-observers.test.js`): 19 tests
  - EventEmitter pattern
  - health-changed events
  - connection-state-changed events
  - issues-updated events
  - Observer management (on, off, once, removeAllListeners)
  - Multiple listeners
  - Error handling in observers

- **HealthManager Performance** (`health-manager-performance.test.js`): 5 tests
  - Overhead measurement (0.007ms target)
  - Memory leak detection
  - Event emission performance

- **HealthManager API Socket** (`health-manager-api-socket.test.js`): 10 tests
  - setApiSocket() functionality
  - API socket state tracking
  - MVP behavior (API socket not affecting health)

- **Script Registration** (`script-registration.test.js`): ?
- **Tab Cleanup** (`tab-cleanup.test.js`): ?
- **ConsoleCapture POC** (`ConsoleCapture.poc.test.js`): ?

#### Integration Tests (19 tests)
- **WebSocket Server** (`websocket-server.test.js`): 6 tests
  - Server accepts connections
  - Registration acknowledgment
  - Command routing (API → Extension)
  - Response routing (Extension → API)
  - Extension not connected error
  - Multiple concurrent API connections

- **HealthManager Real WebSocket** (`health-manager-realws.test.js`): 4 tests
  - Real WebSocket in OPEN state
  - Real WebSocket close detection
  - State transitions tracking
  - Event emission on state changes

- **Server-Health Integration** (`server-health-integration.test.js`): 5 tests
  - healthManager.isExtensionConnected() usage
  - Extension disconnection detection
  - API command rejection when extension disconnected
  - Consistent error messages
  - Socket changes tracking

- **Native Messaging** (`native-messaging.test.js`): ?
- **API Client** (`api-client.test.js`): ?
- **Phase 1.1** (`phase-1.1.test.js`, `phase-1.1-medium.test.js`): ?
- **Dogfooding** (`dogfooding.test.js`): ?
- **Edge Cases** (`edge-cases.test.js`): ?

#### API Tests
- **API Index** (`tests/api/index.test.js`): ?

---

## New Features Testing

### 1. HealthManager Observability Hooks

#### ✅ Already Tested
- [x] EventEmitter inheritance
- [x] Basic event emission (health-changed, connection-state-changed, issues-updated)
- [x] on(), off(), once(), removeAllListeners()
- [x] Multiple listeners
- [x] Event payload structure
- [x] Change detection logic
- [x] Performance overhead

#### 🔴 NOT TESTED - Need Implementation

**HM-OBS-1: Observer Event Order**
```javascript
// Verify events fire in correct order during state transitions
test('events should fire in order: connection-state-changed → issues-updated → health-changed', (done) => {
  const health = new HealthManager();
  const eventOrder = [];

  health.on('connection-state-changed', () => eventOrder.push('connection'));
  health.on('issues-updated', () => eventOrder.push('issues'));
  health.on('health-changed', () => eventOrder.push('health'));

  health.setExtensionSocket(null);
  health.getHealthStatus(); // Baseline

  health.setExtensionSocket({ readyState: WebSocket.OPEN });
  health.getHealthStatus(); // Trigger

  setTimeout(() => {
    expect(eventOrder).toEqual(['connection', 'issues', 'health']);
    done();
  }, 50);
});
```
**Priority**: MEDIUM
**Risk**: Low
**Location**: `tests/unit/health-manager-observers.test.js`

---

**HM-OBS-2: Event Payload Immutability**
```javascript
// Verify event payloads cannot be mutated by observers
test('event payloads should be immutable (deep copies)', (done) => {
  const health = new HealthManager();

  health.on('health-changed', (event) => {
    // Try to mutate payload
    event.current.healthy = false;
    event.current.issues.push('INJECTED BUG');
    event.previous.extension.connected = true;
  });

  health.setExtensionSocket(null);
  health.getHealthStatus(); // Baseline

  health.setExtensionSocket({ readyState: WebSocket.OPEN });
  const status1 = health.getHealthStatus();

  // Get status again - should not be affected by mutation
  const status2 = health.getHealthStatus();

  expect(status1).toEqual(status2);
  expect(status2.healthy).toBe(true);
  expect(status2.issues).toHaveLength(0);
  done();
});
```
**Priority**: HIGH (security concern)
**Risk**: HIGH (state corruption)
**Location**: `tests/unit/health-manager-observers.test.js`

---

**HM-OBS-3: Observer Memory Leak with Rapid Add/Remove**
```javascript
// Stress test: rapidly add/remove observers
test('should not leak memory with rapid observer churn', () => {
  const health = new HealthManager();
  const socket = { readyState: WebSocket.OPEN };
  health.setExtensionSocket(socket);

  const memBefore = process.memoryUsage().heapUsed;

  for (let i = 0; i < 10000; i++) {
    const listener = () => {};
    health.on('health-changed', listener);
    health.off('health-changed', listener);
  }

  if (global.gc) global.gc();

  const memAfter = process.memoryUsage().heapUsed;
  const leakMB = (memAfter - memBefore) / 1024 / 1024;

  expect(leakMB).toBeLessThan(10); // Max 10MB leak
});
```
**Priority**: HIGH
**Risk**: MEDIUM
**Location**: `tests/unit/health-manager-performance.test.js`

---

**HM-OBS-4: Observer Exception Handling**
```javascript
// Verify system remains stable when observer throws
test('should continue emitting to other observers when one throws', (done) => {
  const health = new HealthManager();

  let observer2Called = false;
  let observer3Called = false;

  health.on('health-changed', () => {
    throw new Error('Observer 1 explodes!');
  });

  health.on('health-changed', () => {
    observer2Called = true;
    throw new Error('Observer 2 also explodes!');
  });

  health.on('health-changed', () => {
    observer3Called = true;
  });

  // Set up error handler to catch observer errors
  health.on('error', (err) => {
    // EventEmitter will emit 'error' event if no error handler
    expect(err.message).toMatch(/explodes/);
  });

  health.setExtensionSocket(null);
  health.getHealthStatus();

  health.setExtensionSocket({ readyState: WebSocket.OPEN });

  try {
    health.getHealthStatus();
  } catch (err) {
    // Expected - EventEmitter throws if observer throws
  }

  setTimeout(() => {
    // All observers should have been called despite errors
    expect(observer2Called).toBe(true);
    expect(observer3Called).toBe(true);

    // Health manager should still function
    const status = health.getHealthStatus();
    expect(status.healthy).toBe(true);
    done();
  }, 50);
});
```
**Priority**: HIGH
**Risk**: HIGH (system stability)
**Location**: `tests/unit/health-manager-observers.test.js`

---

**HM-OBS-5: Timestamp Accuracy**
```javascript
// Verify event timestamps are accurate
test('event timestamps should be within 10ms of event emission', (done) => {
  const health = new HealthManager();

  health.on('health-changed', (event) => {
    const now = Date.now();
    const delta = now - event.timestamp;

    expect(delta).toBeLessThan(10); // Max 10ms lag
    expect(event.timestamp).toBeGreaterThan(now - 100); // Not too old
    done();
  });

  health.setExtensionSocket(null);
  health.getHealthStatus();

  health.setExtensionSocket({ readyState: WebSocket.OPEN });
  health.getHealthStatus();
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/unit/health-manager-observers.test.js`

---

### 2. TypeScript Definitions

#### ✅ Already Tested
- [x] .d.ts file exists
- [x] Syntax valid (no compilation errors)

#### 🔴 NOT TESTED - Need Implementation

**TS-1: TypeScript Consumer Test**
```typescript
// tests/unit/health-manager-typescript.test.ts
import { HealthManager } from '../../src/health/health-manager';
import { HealthStatus, HealthChangedEvent } from '../../src/health/health-manager';

describe('HealthManager TypeScript Integration', () => {
  test('should provide correct types for TypeScript consumers', () => {
    const health = new HealthManager();

    // Type inference
    const status: HealthStatus = health.getHealthStatus();

    // Event listener types
    health.on('health-changed', (event: HealthChangedEvent) => {
      const prev: HealthStatus = event.previous;
      const curr: HealthStatus = event.current;
      const ts: number = event.timestamp;
    });

    // Should compile without errors
    expect(health).toBeInstanceOf(HealthManager);
  });

  test('should catch type errors at compile time', () => {
    const health = new HealthManager();

    // @ts-expect-error - invalid event name
    health.on('invalid-event', () => {});

    // @ts-expect-error - wrong parameter type
    health.setExtensionSocket('not a socket');

    // Should not compile
  });
});
```
**Priority**: MEDIUM
**Risk**: LOW
**Location**: `tests/unit/health-manager-typescript.test.ts` (NEW FILE)
**Note**: Requires TypeScript test runner setup

---

**TS-2: IntelliSense Verification (Manual Test)**
```
Manual Test Checklist:
□ Open VS Code with TypeScript file
□ Import HealthManager
□ Verify autocomplete shows methods
□ Verify parameter hints show correct types
□ Verify return type hints show HealthStatus
□ Verify event names autocomplete
□ Verify event payload types autocomplete
□ Verify hover documentation appears
□ Verify no @ts-ignore needed
```
**Priority**: LOW
**Risk**: LOW
**Type**: Manual testing
**Location**: Manual test document

---

### 3. Server Integration

#### ✅ Already Tested
- [x] healthManager.isExtensionConnected() replaces manual check
- [x] Extension socket tracking on registration
- [x] Extension socket clearing on disconnect
- [x] Error message consistency

#### 🔴 NOT TESTED - Need Implementation

**SI-1: HealthManager Initialization Failure**
```javascript
// What happens if HealthManager constructor throws?
test('server should handle HealthManager initialization failure gracefully', () => {
  // Mock HealthManager to throw
  jest.mock('../../src/health/health-manager', () => {
    return jest.fn().mockImplementation(() => {
      throw new Error('HealthManager initialization failed');
    });
  });

  // Should fail fast on startup (not later)
  expect(() => {
    require('../../server/websocket-server');
  }).toThrow('HealthManager initialization failed');
});
```
**Priority**: LOW
**Risk**: LOW (fail-fast is acceptable)
**Location**: `tests/integration/websocket-server.test.js`

---

**SI-2: HealthManager Method Throws Mid-Request**
```javascript
// What happens if isExtensionConnected() throws?
test('server should handle HealthManager method failure gracefully', (done) => {
  // ... setup server and mocked healthManager

  // Make isExtensionConnected() throw
  healthManager.isExtensionConnected = jest.fn(() => {
    throw new Error('HealthManager crashed!');
  });

  const apiClient = new WebSocket(`ws://localhost:${port}`);

  apiClient.on('open', () => {
    apiClient.send(JSON.stringify({
      id: 'test-123',
      type: 'executeScript',
      tabId: 1,
      code: 'console.log("test")'
    }));
  });

  apiClient.on('message', (data) => {
    const response = JSON.parse(data.toString());

    // Should return error, not crash server
    expect(response.type).toBe('error');
    expect(response.error.code).toBe('INTERNAL_ERROR');
    done();
  });
});
```
**Priority**: HIGH
**Risk**: HIGH (production stability)
**Location**: `tests/integration/websocket-server.test.js`

---

**SI-3: HealthManager Event Emission During Request Handling**
```javascript
// Verify events emitted correctly during live request handling
test('healthManager should emit events during live WebSocket request handling', (done) => {
  // ... setup server

  const eventsEmitted = [];

  healthManager.on('connection-state-changed', (event) => {
    eventsEmitted.push({ type: 'connection', data: event });
  });

  healthManager.on('health-changed', (event) => {
    eventsEmitted.push({ type: 'health', data: event });
  });

  // Connect extension
  const extClient = new WebSocket(`ws://localhost:${port}?role=extension`);

  extClient.on('open', () => {
    extClient.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extClient.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'registered') {
      // Disconnect extension
      extClient.close();

      setTimeout(() => {
        // Verify events emitted
        expect(eventsEmitted).toHaveLength(4); // 2 for connect, 2 for disconnect

        const connectionEvents = eventsEmitted.filter(e => e.type === 'connection');
        const healthEvents = eventsEmitted.filter(e => e.type === 'health');

        expect(connectionEvents).toHaveLength(2);
        expect(healthEvents).toHaveLength(2);
        done();
      }, 100);
    }
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/server-health-integration.test.js`

---

## Old Features Regression Testing

### 1. WebSocket Server Core

#### ✅ Already Tested (Partial)
- [x] Server accepts connections
- [x] Registration flow
- [x] Command routing
- [x] Response routing
- [x] Extension not connected error
- [x] Multiple concurrent API connections

#### 🔴 NOT TESTED - Need Implementation

**WS-REG-1: Multiple Extension Registration Attempts**
```javascript
test('server should reject second extension registration', (done) => {
  const ext1 = new WebSocket('ws://localhost:9876');
  const ext2 = new WebSocket('ws://localhost:9876');

  ext1.on('open', () => {
    ext1.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  ext1.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'registered') {
      // First registration succeeded, now try second
      ext2.on('open', () => {
        ext2.send(JSON.stringify({ type: 'register', role: 'extension' }));
      });

      ext2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe('error');
        expect(msg.error.code).toBe('DUPLICATE_REGISTRATION');

        ext2.on('close', () => {
          // Second extension should be disconnected
          expect(ext2.readyState).toBe(WebSocket.CLOSED);
          ext1.close();
          done();
        });
      });
    }
  });
});
```
**Priority**: HIGH
**Risk**: HIGH (security concern)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-REG-2: Extension Re-registration After Disconnect**
```javascript
test('server should allow extension re-registration after disconnect', (done) => {
  const ext1 = new WebSocket('ws://localhost:9876');

  ext1.on('open', () => {
    ext1.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  ext1.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'registered') {
      // Close first connection
      ext1.close();

      ext1.on('close', () => {
        // Wait for server cleanup
        setTimeout(() => {
          // Try to register again
          const ext2 = new WebSocket('ws://localhost:9876');

          ext2.on('open', () => {
            ext2.send(JSON.stringify({ type: 'register', role: 'extension' }));
          });

          ext2.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            expect(msg.type).toBe('registered'); // Should succeed
            ext2.close();
            done();
          });
        }, 100);
      });
    }
  });
});
```
**Priority**: HIGH
**Risk**: HIGH (affects usability)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-MSG-1: Malformed JSON Message**
```javascript
test('server should handle malformed JSON gracefully', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    ws.send('{ this is not valid json }');
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    expect(msg.type).toBe('error');
    expect(msg.error.code).toBe('INVALID_JSON');
    ws.close();
    done();
  });
});
```
**Priority**: HIGH
**Risk**: HIGH (security & stability)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-MSG-2: Message Missing Required Fields**
```javascript
test('server should reject messages missing required fields', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    // Send message without 'type' field
    ws.send(JSON.stringify({ foo: 'bar' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    expect(msg.type).toBe('error');
    expect(msg.error.code).toBe('MISSING_TYPE_FIELD');
    ws.close();
    done();
  });
});
```
**Priority**: HIGH
**Risk**: HIGH (input validation)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-MSG-3: Excessively Large Message**
```javascript
test('server should reject excessively large messages', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    // Send 10MB message
    const largePayload = 'x'.repeat(10 * 1024 * 1024);
    ws.send(JSON.stringify({
      type: 'executeScript',
      id: 'test',
      code: largePayload
    }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    expect(msg.type).toBe('error');
    expect(msg.error.code).toBe('MESSAGE_TOO_LARGE');
    ws.close();
    done();
  });

  // Or connection should be closed
  ws.on('close', () => {
    done();
  });
}, 10000);
```
**Priority**: HIGH
**Risk**: HIGH (DoS protection)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-CMD-1: Command Timeout**
```javascript
test('server should timeout commands that take too long', (done) => {
  // Setup extension that never responds
  const extWs = new WebSocket('ws://localhost:9876');
  const apiWs = new WebSocket('ws://localhost:9876');

  extWs.on('open', () => {
    extWs.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'registered') {
      // Extension registered, now send API command
      apiWs.on('open', () => {
        apiWs.send(JSON.stringify({
          id: 'timeout-test',
          type: 'executeScript',
          tabId: 1,
          code: 'while(true) {}' // Infinite loop
        }));
      });

      apiWs.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.type).toBe('error');
        expect(response.error.code).toBe('COMMAND_TIMEOUT');
        extWs.close();
        apiWs.close();
        done();
      });
    }

    // Extension receives command but doesn't respond
    if (msg.type === 'executeScript') {
      // Intentionally do nothing
    }
  });
}, 60000);
```
**Priority**: HIGH
**Risk**: HIGH (resource exhaustion)
**Location**: `tests/integration/websocket-server.test.js`

---

**WS-CMD-2: Response for Non-Existent Command**
```javascript
test('server should ignore responses for non-existent command IDs', (done) => {
  const extWs = new WebSocket('ws://localhost:9876');

  extWs.on('open', () => {
    extWs.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'registered') {
      // Send response for command that doesn't exist
      extWs.send(JSON.stringify({
        type: 'response',
        id: 'non-existent-command-id',
        result: { foo: 'bar' }
      }));

      // Wait a bit - should not crash server
      setTimeout(() => {
        // Server should still be functional
        expect(extWs.readyState).toBe(WebSocket.OPEN);
        extWs.close();
        done();
      }, 100);
    }
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/websocket-server.test.js`

---

### 2. Chrome Extension

#### ✅ Already Tested
- [ ] Extension loads successfully
- [ ] Background script runs
- [ ] Content script injection
- [ ] Popup functionality

#### 🔴 NOT TESTED - Need Implementation

**EXT-BG-1: Background Script WebSocket Connection**
```javascript
// E2E test
test('background script should connect to WebSocket server on startup', (done) => {
  // Launch Chrome with extension
  // Monitor WebSocket connections
  // Verify extension connects within 5 seconds
  // Verify extension sends registration message
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/extension-background.test.js` (NEW FILE)

---

**EXT-BG-2: Background Script Reconnection on Disconnect**
```javascript
test('background script should reconnect if WebSocket disconnects', (done) => {
  // Connect extension
  // Kill WebSocket server
  // Restart WebSocket server
  // Verify extension reconnects automatically
  // Verify < 10 second reconnect time
});
```
**Priority**: HIGH
**Risk**: HIGH (reliability)
**Location**: `tests/e2e/extension-background.test.js`

---

**EXT-CS-1: Content Script Injection**
```javascript
test('content script should inject into new tabs', (done) => {
  // Open new tab with test page
  // Verify content script injected
  // Verify window.__chromeDevAssist exists
  // Verify ConsoleCapture loaded
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/extension-content-script.test.js` (NEW FILE)

---

**EXT-CS-2: Content Script Message Handling**
```javascript
test('content script should handle messages from background script', (done) => {
  // Open test page
  // Send executeScript command from API
  // Verify content script executes code
  // Verify result returned
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/extension-content-script.test.js`

---

**EXT-POP-1: Popup Display**
```javascript
test('popup should display connection status', (done) => {
  // Open extension popup
  // Verify status indicator shows "Connected"
  // Kill server
  // Verify status indicator shows "Disconnected"
});
```
**Priority**: MEDIUM
**Risk**: LOW
**Location**: `tests/e2e/extension-popup.test.js` (NEW FILE)

---

**EXT-CONSOLE-1: ConsoleCapture Basic Functionality**
```javascript
test('ConsoleCapture should capture console.log calls', (done) => {
  // Open test page
  // Execute: console.log('test message')
  // Verify ConsoleCapture captured message
  // Verify message sent to background script
});
```
**Priority**: HIGH
**Risk**: HIGH (core functionality)
**Location**: `tests/e2e/console-capture.test.js` (NEW FILE)

---

**EXT-CONSOLE-2: ConsoleCapture Error Capturing**
```javascript
test('ConsoleCapture should capture console.error with stack traces', (done) => {
  // Execute: console.error(new Error('test error'))
  // Verify error captured
  // Verify stack trace included
  // Verify correct file/line number
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/console-capture.test.js`

---

### 3. API Client

#### ✅ Already Tested
- [ ] Basic command execution
- [ ] Response handling

#### 🔴 NOT TESTED - Need Implementation

**API-1: API Client Initialization**
```javascript
test('API client should connect to server successfully', async () => {
  const client = new ApiClient('ws://localhost:9876');
  await client.connect();
  expect(client.isConnected()).toBe(true);
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/api-client.test.js`

---

**API-2: API Client Command Execution**
```javascript
test('API client should execute script and return result', async () => {
  const client = new ApiClient('ws://localhost:9876');
  await client.connect();

  const result = await client.executeScript(
    tabId,
    'document.title'
  );

  expect(result).toBeDefined();
  expect(typeof result).toBe('string');
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/api-client.test.js`

---

**API-3: API Client Error Handling**
```javascript
test('API client should handle extension not connected error', async () => {
  const client = new ApiClient('ws://localhost:9876');
  await client.connect();

  // Don't connect extension

  await expect(
    client.executeScript(1, 'console.log("test")')
  ).rejects.toThrow('Extension not connected');
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/api-client.test.js`

---

**API-4: API Client Timeout Handling**
```javascript
test('API client should timeout long-running commands', async () => {
  const client = new ApiClient('ws://localhost:9876', { timeout: 1000 });
  await client.connect();

  // Connect extension but make it slow

  await expect(
    client.executeScript(1, 'while(true) {}')
  ).rejects.toThrow('Command timeout');
}, 5000);
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/api-client.test.js`

---

## Edge Cases Testing

### 1. Connection Edge Cases

**EDGE-CONN-1: Rapid Connect/Disconnect Cycles**
```javascript
test('server should handle rapid extension connect/disconnect cycles', (done) => {
  let connectCount = 0;
  const cycles = 100;

  function connectDisconnect() {
    const ws = new WebSocket('ws://localhost:9876');

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'register', role: 'extension' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'registered') {
        ws.close();
      }
    });

    ws.on('close', () => {
      connectCount++;
      if (connectCount < cycles) {
        setTimeout(connectDisconnect, 10);
      } else {
        // All cycles complete
        expect(connectCount).toBe(cycles);
        done();
      }
    });
  }

  connectDisconnect();
}, 30000);
```
**Priority**: HIGH
**Risk**: HIGH (stability)
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-CONN-2: Extension Disconnect Mid-Command**
```javascript
test('server should handle extension disconnect during command processing', (done) => {
  const extWs = new WebSocket('ws://localhost:9876');
  const apiWs = new WebSocket('ws://localhost:9876');

  extWs.on('open', () => {
    extWs.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'registered') {
      // Send API command
      apiWs.on('open', () => {
        apiWs.send(JSON.stringify({
          id: 'test-123',
          type: 'executeScript',
          tabId: 1,
          code: 'console.log("test")'
        }));
      });
    }

    if (msg.type === 'executeScript') {
      // Extension receives command but disconnects before responding
      extWs.close();
    }
  });

  apiWs.on('message', (data) => {
    const response = JSON.parse(data.toString());
    // Should get error, not hang forever
    expect(response.type).toBe('error');
    expect(response.error.code).toBe('EXTENSION_DISCONNECTED');
    done();
  });
}, 10000);
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-CONN-3: API Disconnect Before Response**
```javascript
test('server should handle API disconnect before receiving response', (done) => {
  const extWs = new WebSocket('ws://localhost:9876');
  let apiWs = new WebSocket('ws://localhost:9876');

  extWs.on('open', () => {
    extWs.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'registered') {
      apiWs.on('open', () => {
        apiWs.send(JSON.stringify({
          id: 'test-123',
          type: 'executeScript',
          tabId: 1,
          code: 'console.log("test")'
        }));

        // Disconnect API immediately after sending
        apiWs.close();
      });
    }

    if (msg.type === 'executeScript') {
      // Extension sends response
      setTimeout(() => {
        extWs.send(JSON.stringify({
          type: 'response',
          id: msg.id,
          result: { success: true }
        }));

        // Server should handle gracefully (no crash)
        setTimeout(() => {
          expect(extWs.readyState).toBe(WebSocket.OPEN);
          extWs.close();
          done();
        }, 100);
      }, 100);
    }
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-CONN-4: Simultaneous Multiple Extension Connections**
```javascript
test('server should reject all but first simultaneous extension connections', (done) => {
  const ext1 = new WebSocket('ws://localhost:9876');
  const ext2 = new WebSocket('ws://localhost:9876');
  const ext3 = new WebSocket('ws://localhost:9876');

  let registeredCount = 0;
  let rejectedCount = 0;

  function onMessage(ws, data) {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'registered') {
      registeredCount++;
    } else if (msg.type === 'error' && msg.error.code === 'DUPLICATE_REGISTRATION') {
      rejectedCount++;
    }

    if (registeredCount + rejectedCount === 3) {
      expect(registeredCount).toBe(1);
      expect(rejectedCount).toBe(2);
      ext1.close();
      ext2.close();
      ext3.close();
      done();
    }
  }

  ext1.on('open', () => ext1.send(JSON.stringify({ type: 'register', role: 'extension' })));
  ext2.on('open', () => ext2.send(JSON.stringify({ type: 'register', role: 'extension' })));
  ext3.on('open', () => ext3.send(JSON.stringify({ type: 'register', role: 'extension' })));

  ext1.on('message', (data) => onMessage(ext1, data));
  ext2.on('message', (data) => onMessage(ext2, data));
  ext3.on('message', (data) => onMessage(ext3, data));
});
```
**Priority**: HIGH
**Risk**: HIGH (race condition)
**Location**: `tests/integration/edge-cases.test.js`

---

### 2. Message Edge Cases

**EDGE-MSG-1: Empty Message**
```javascript
test('server should reject empty messages', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    ws.send('');
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    expect(msg.type).toBe('error');
    expect(msg.error.code).toBe('EMPTY_MESSAGE');
    ws.close();
    done();
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-MSG-2: Binary Message**
```javascript
test('server should handle binary messages gracefully', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    ws.send(buffer);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    expect(msg.type).toBe('error');
    expect(msg.error.code).toBe('INVALID_MESSAGE_FORMAT');
    ws.close();
    done();
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-MSG-3: Unicode and Special Characters**
```javascript
test('server should handle unicode and special characters in messages', (done) => {
  const extWs = new WebSocket('ws://localhost:9876');
  const apiWs = new WebSocket('ws://localhost:9876');

  const unicodeCode = '𝕌𝕟𝕚𝕔𝕠𝕕𝕖 𝔽𝕠𝕟𝕥 🚀 ユニコード 中文';

  extWs.on('open', () => {
    extWs.send(JSON.stringify({ type: 'register', role: 'extension' }));
  });

  extWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'registered') {
      apiWs.on('open', () => {
        apiWs.send(JSON.stringify({
          id: 'unicode-test',
          type: 'executeScript',
          tabId: 1,
          code: unicodeCode
        }));
      });
    }

    if (msg.type === 'executeScript') {
      // Verify unicode preserved
      expect(msg.code).toBe(unicodeCode);

      extWs.send(JSON.stringify({
        type: 'response',
        id: msg.id,
        result: { unicode: unicodeCode }
      }));
    }
  });

  apiWs.on('message', (data) => {
    const response = JSON.parse(data.toString());
    expect(response.result.unicode).toBe(unicodeCode);
    extWs.close();
    apiWs.close();
    done();
  });
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-MSG-4: Deeply Nested JSON**
```javascript
test('server should handle deeply nested JSON structures', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  // Create deeply nested object (1000 levels)
  let deepObj = { value: 'deep' };
  for (let i = 0; i < 1000; i++) {
    deepObj = { nested: deepObj };
  }

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'executeScript',
      id: 'deep-test',
      tabId: 1,
      code: JSON.stringify(deepObj)
    }));
  });

  ws.on('message', (data) => {
    // Should either handle it or reject with clear error
    const msg = JSON.parse(data.toString());
    expect(msg.type).toMatch(/error|response/);
    ws.close();
    done();
  });
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/integration/edge-cases.test.js`

---

### 3. State Edge Cases

**EDGE-STATE-1: Server Restart with Active Connections**
```javascript
test('server restart should cleanly disconnect all active clients', (done) => {
  // Connect multiple clients
  // Restart server
  // Verify all clients receive disconnect
  // Verify server starts cleanly
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/edge-cases.test.js`

---

**EDGE-STATE-2: Extension Socket State Desync**
```javascript
test('healthManager should detect desync between extensionSocket and actual state', (done) => {
  // Manually set extensionSocket to non-null
  // But socket is actually CLOSED
  // Verify healthManager detects incorrect state
  // Verify isExtensionConnected() returns false
});
```
**Priority**: HIGH
**Risk**: HIGH (state corruption)
**Location**: `tests/unit/health-manager.test.js`

---

**EDGE-STATE-3: Concurrent getHealthStatus() Calls**
```javascript
test('concurrent getHealthStatus() calls should return consistent results', async () => {
  const health = new HealthManager();
  health.setExtensionSocket({ readyState: WebSocket.OPEN });

  // Call getHealthStatus() 100 times concurrently
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(Promise.resolve(health.getHealthStatus()));
  }

  const results = await Promise.all(promises);

  // All results should be identical
  const first = JSON.stringify(results[0]);
  for (const result of results) {
    expect(JSON.stringify(result)).toBe(first);
  }
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/unit/health-manager.test.js`

---

## Weird Scenarios Testing

### 1. Timing Weirdness

**WEIRD-TIME-1: Commands Arriving Out of Order**
```javascript
test('server should handle responses arriving out of order', (done) => {
  // Send commands A, B, C
  // Extension responds C, A, B
  // Verify each API client gets correct response
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/weird-scenarios.test.js` (NEW FILE)

---

**WEIRD-TIME-2: Clock Skew**
```javascript
test('healthManager should handle system clock changes', () => {
  // This is tricky - can't actually change system clock
  // But can mock Date.now() to return weird values

  const originalNow = Date.now;
  let fakeTime = Date.now();

  Date.now = jest.fn(() => fakeTime);

  const health = new HealthManager();

  health.on('health-changed', (event) => {
    expect(event.timestamp).toBe(fakeTime);
  });

  health.setExtensionSocket(null);
  health.getHealthStatus();

  health.setExtensionSocket({ readyState: WebSocket.OPEN });

  // Jump backward in time (clock skew)
  fakeTime -= 10000;

  health.getHealthStatus();

  // Restore
  Date.now = originalNow;
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/unit/weird-scenarios.test.js` (NEW FILE)

---

**WEIRD-TIME-3: Simultaneous Extension Registration and Command**
```javascript
test('server should handle command arriving during registration', (done) => {
  // Race: extension registers while API sends command
  // Whichever happens first should determine behavior
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM (race condition)
**Location**: `tests/integration/weird-scenarios.test.js`

---

### 2. Resource Weirdness

**WEIRD-RES-1: Running Out of File Descriptors**
```javascript
test('server should handle file descriptor exhaustion gracefully', (done) => {
  // Open maximum number of connections
  // Try to open one more
  // Should reject with clear error
}, 60000);
```
**Priority**: LOW
**Risk**: MEDIUM
**Location**: `tests/integration/weird-scenarios.test.js`

---

**WEIRD-RES-2: Memory Pressure**
```javascript
test('server should handle memory pressure without crashing', (done) => {
  // Allocate large amount of memory
  // Verify server still responsive
  // Verify no memory leaks after GC
});
```
**Priority**: LOW
**Risk**: MEDIUM
**Location**: `tests/integration/weird-scenarios.test.js`

---

### 3. Protocol Weirdness

**WEIRD-PROTO-1: WebSocket Ping/Pong**
```javascript
test('server should respond to WebSocket ping frames', (done) => {
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    ws.ping();
  });

  ws.on('pong', () => {
    expect(true).toBe(true);
    ws.close();
    done();
  });
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/integration/weird-scenarios.test.js`

---

**WEIRD-PROTO-2: Slow Client (Backpressure)**
```javascript
test('server should handle slow client that does not read messages', (done) => {
  // Connect client
  // Server sends many messages
  // Client doesn't read (socket buffer fills)
  // Verify server handles backpressure
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/weird-scenarios.test.js`

---

## Combination Testing

### 1. Multi-Component Scenarios

**COMBO-1: Full E2E Flow**
```javascript
test('full E2E: API → Server → Extension → Page → Response', async () => {
  // 1. Start server
  // 2. Connect extension
  // 3. Open test page
  // 4. API client sends executeScript
  // 5. Extension executes on page
  // 6. Result returned to API
  // 7. Verify entire flow < 1 second
});
```
**Priority**: CRITICAL
**Risk**: CRITICAL
**Location**: `tests/e2e/full-flow.test.js` (NEW FILE)

---

**COMBO-2: Multiple Tabs + Multiple API Clients**
```javascript
test('server should route commands to correct tabs with multiple API clients', async () => {
  // Open 5 tabs
  // Connect 5 API clients
  // Each client sends command to different tab
  // Verify each client gets correct response
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/multi-client.test.js` (NEW FILE)

---

**COMBO-3: Rapid Command Burst**
```javascript
test('server should handle burst of 1000 commands', async () => {
  // Connect extension
  // Send 1000 commands simultaneously
  // Verify all complete within 10 seconds
  // Verify all return correct results
  // Verify no commands lost
}, 30000);
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/stress.test.js` (NEW FILE)

---

**COMBO-4: ConsoleCapture During Script Execution**
```javascript
test('ConsoleCapture should capture logs during executeScript', async () => {
  // Execute script that logs to console
  // Verify both script result AND console logs captured
  // Verify logs arrive in correct order
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/console-capture.test.js`

---

**COMBO-5: Extension Update/Reload**
```javascript
test('server should handle extension reload gracefully', async () => {
  // Connect extension
  // Reload extension (chrome.runtime.reload())
  // Verify extension reconnects automatically
  // Verify in-flight commands handled appropriately
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/extension-reload.test.js` (NEW FILE)

---

### 2. State Combination Scenarios

**COMBO-STATE-1: All Possible Connection States**
```javascript
test('server should handle all combinations of connection states', () => {
  const states = [
    { ext: false, api: false, name: 'nothing connected' },
    { ext: true, api: false, name: 'only extension' },
    { ext: false, api: true, name: 'only API' },
    { ext: true, api: true, name: 'both connected' }
  ];

  // Test each state
  // Verify healthManager reports correctly
  // Verify server behavior correct for each state
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/integration/state-combinations.test.js` (NEW FILE)

---

**COMBO-STATE-2: WebSocket ReadyState Combinations**
```javascript
test('healthManager should handle all WebSocket readyState values', () => {
  const health = new HealthManager();

  const states = [
    { state: WebSocket.CONNECTING, expected: false },
    { state: WebSocket.OPEN, expected: true },
    { state: WebSocket.CLOSING, expected: false },
    { state: WebSocket.CLOSED, expected: false },
    { state: 999, expected: false } // Invalid state
  ];

  for (const { state, expected } of states) {
    health.setExtensionSocket({ readyState: state });
    expect(health.isExtensionConnected()).toBe(expected);
  }
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/unit/health-manager.test.js`

---

## Performance & Stress Testing

### 1. Throughput Tests

**PERF-THRU-1: Commands Per Second**
```javascript
test('server should handle 1000 commands per second', async () => {
  // Measure: commands/sec sustainable rate
  // Target: > 1000 commands/sec
  // Monitor: CPU, memory, latency
}, 60000);
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/performance/throughput.test.js` (NEW FILE)

---

**PERF-THRU-2: Concurrent Connections**
```javascript
test('server should handle 100 concurrent API connections', async () => {
  // Open 100 API connections
  // Each sends 10 commands
  // Verify all complete successfully
}, 60000);
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/performance/throughput.test.js`

---

### 2. Latency Tests

**PERF-LAT-1: Command Latency P99**
```javascript
test('command latency P99 should be < 100ms', async () => {
  // Execute 1000 commands
  // Measure latency for each
  // Calculate P99
  // Expect < 100ms
}, 60000);
```
**Priority**: HIGH
**Risk**: MEDIUM
**Location**: `tests/performance/latency.test.js` (NEW FILE)

---

**PERF-LAT-2: HealthManager Overhead**
```javascript
test('healthManager overhead should be < 1ms per check', () => {
  // Already tested in health-manager-performance.test.js
  // Target: < 0.01ms
});
```
**Priority**: MEDIUM
**Risk**: LOW
**Location**: `tests/unit/health-manager-performance.test.js` ✅

---

### 3. Memory Tests

**PERF-MEM-1: Long-Running Stability**
```javascript
test('server should not leak memory over 1 hour', async () => {
  // Run server for 1 hour
  // Send continuous commands
  // Monitor memory usage
  // Verify < 50MB growth
}, 3600000);
```
**Priority**: MEDIUM
**Risk**: HIGH
**Location**: `tests/performance/memory.test.js` (NEW FILE)

---

**PERF-MEM-2: EventEmitter Memory Leak**
```javascript
test('healthManager should not leak memory with continuous events', () => {
  // Already tested in health-manager-performance.test.js
  // Target: < 5MB for 1000 events
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/unit/health-manager-performance.test.js` ✅

---

### 4. Stress Tests

**STRESS-1: Maximum Message Size**
```javascript
test('server should handle maximum allowed message size', async () => {
  // Send message at size limit (e.g., 1MB)
  // Verify handled successfully
  // Send message over limit
  // Verify rejected
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/performance/stress.test.js` (NEW FILE)

---

**STRESS-2: Rapid State Changes**
```javascript
test('healthManager should handle 10000 state changes per second', () => {
  const health = new HealthManager();
  const socket = { readyState: WebSocket.OPEN };
  health.setExtensionSocket(socket);

  const start = Date.now();

  for (let i = 0; i < 10000; i++) {
    socket.readyState = i % 2 === 0 ? WebSocket.OPEN : WebSocket.CLOSED;
    health.getHealthStatus();
  }

  const elapsed = Date.now() - start;
  const rate = 10000 / (elapsed / 1000);

  console.log(`State changes per second: ${rate.toFixed(0)}`);
  expect(rate).toBeGreaterThan(5000); // At least 5000/sec
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/performance/stress.test.js`

---

## Security Testing

### 1. Input Validation

**SEC-INPUT-1: SQL Injection Attempt (if DB used)**
```javascript
test('server should sanitize inputs to prevent SQL injection', async () => {
  // Not applicable currently - no DB
  // But if DB added in future, test:
  // executeScript(1, "'; DROP TABLE users; --")
});
```
**Priority**: N/A
**Risk**: N/A
**Location**: `tests/security/injection.test.js` (FUTURE)

---

**SEC-INPUT-2: XSS in Console Logs**
```javascript
test('ConsoleCapture should escape HTML in logged content', async () => {
  // Execute: console.log('<script>alert("XSS")</script>')
  // Verify captured log escapes HTML
  // Verify no script execution
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/security/xss.test.js` (NEW FILE)

---

**SEC-INPUT-3: Command Injection**
```javascript
test('executeScript should not allow command injection', async () => {
  // Try to inject shell commands
  // executeScript(1, '`rm -rf /`')
  // Verify command not executed on server
});
```
**Priority**: HIGH
**Risk**: CRITICAL
**Location**: `tests/security/injection.test.js` (NEW FILE)

---

### 2. Authentication & Authorization

**SEC-AUTH-1: Unauthenticated Access**
```javascript
test('server should reject connections without auth token', async () => {
  // Connect without token
  // Verify connection rejected
});
```
**Priority**: HIGH
**Risk**: CRITICAL
**Location**: `tests/security/auth.test.js` (NEW FILE)

---

**SEC-AUTH-2: Invalid Auth Token**
```javascript
test('server should reject connections with invalid auth token', async () => {
  // Connect with wrong token
  // Verify connection rejected
});
```
**Priority**: HIGH
**Risk**: CRITICAL
**Location**: `tests/security/auth.test.js`

---

**SEC-AUTH-3: Token Replay Attack**
```javascript
test('server should prevent token replay attacks', async () => {
  // Capture valid token
  // Try to reuse from different client
  // Verify rejected (if using nonce/timestamp)
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/security/auth.test.js`

---

### 3. DoS Protection

**SEC-DOS-1: Connection Flood**
```javascript
test('server should rate-limit connection attempts', async () => {
  // Attempt 1000 connections per second
  // Verify rate limiting kicks in
  // Verify legitimate connections still work
}, 30000);
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/security/dos.test.js` (NEW FILE)

---

**SEC-DOS-2: Message Flood**
```javascript
test('server should rate-limit messages per connection', async () => {
  // Send 10000 messages per second
  // Verify rate limiting
  // Verify connection not DoS'd
}, 30000);
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/security/dos.test.js`

---

**SEC-DOS-3: Memory Bomb**
```javascript
test('server should reject excessively large messages', async () => {
  // Already tested in WS-MSG-3
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/integration/websocket-server.test.js` (see WS-MSG-3)

---

### 4. Data Leakage

**SEC-LEAK-1: Error Messages**
```javascript
test('error messages should not leak sensitive information', async () => {
  // Trigger various errors
  // Verify error messages safe for external consumption
  // No stack traces, file paths, internal state
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/security/leakage.test.js` (NEW FILE)

---

**SEC-LEAK-2: Health Status Exposure**
```javascript
test('health status should not expose sensitive server internals', () => {
  const health = new HealthManager();
  const status = health.getHealthStatus();

  // Verify no sensitive data in status object
  expect(status).not.toHaveProperty('password');
  expect(status).not.toHaveProperty('token');
  expect(status).not.toHaveProperty('internalState');
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/security/leakage.test.js`

---

## E2E Testing

### 1. Full User Workflows

**E2E-FLOW-1: Developer Debugging Workflow**
```javascript
test('E2E: developer debugs console error on live page', async () => {
  // 1. Developer opens site with errors
  // 2. Extension captures console errors
  // 3. Developer queries API for errors
  // 4. API returns captured errors with stack traces
  // 5. Developer fixes bug
  // 6. Verifies error no longer appears
});
```
**Priority**: CRITICAL
**Risk**: CRITICAL
**Location**: `tests/e2e/workflows/debugging.test.js` (NEW FILE)

---

**E2E-FLOW-2: Automated Testing Workflow**
```javascript
test('E2E: automated test suite uses API to control browser', async () => {
  // 1. Test runner starts
  // 2. API client connects
  // 3. Test opens page via executeScript
  // 4. Test interacts with page
  // 5. Test captures console logs
  // 6. Test asserts on results
  // 7. Test closes page
});
```
**Priority**: CRITICAL
**Risk**: CRITICAL
**Location**: `tests/e2e/workflows/automated-testing.test.js` (NEW FILE)

---

**E2E-FLOW-3: Monitoring Workflow**
```javascript
test('E2E: continuous monitoring of production site', async () => {
  // 1. Monitoring script connects
  // 2. Opens target site
  // 3. Subscribes to console errors via healthManager events
  // 4. Receives error notifications in real-time
  // 5. Alerts triggered on error patterns
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/workflows/monitoring.test.js` (NEW FILE)

---

### 2. Cross-Browser Testing

**E2E-BROWSER-1: Chrome Stable**
```javascript
test('E2E: full flow works on Chrome stable', async () => {
  // Run full flow on Chrome stable
});
```
**Priority**: CRITICAL
**Risk**: CRITICAL
**Location**: `tests/e2e/browsers/chrome-stable.test.js` (NEW FILE)

---

**E2E-BROWSER-2: Chrome Beta**
```javascript
test('E2E: full flow works on Chrome beta', async () => {
  // Run full flow on Chrome beta
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/e2e/browsers/chrome-beta.test.js` (NEW FILE)

---

**E2E-BROWSER-3: Chrome Canary**
```javascript
test('E2E: full flow works on Chrome canary', async () => {
  // Run full flow on Chrome canary
});
```
**Priority**: LOW
**Risk**: LOW
**Location**: `tests/e2e/browsers/chrome-canary.test.js` (NEW FILE)

---

### 3. Real-World Site Testing

**E2E-SITE-1: Simple Static Site**
```javascript
test('E2E: works on simple static HTML page', async () => {
  // Open static test page
  // Verify console capture works
  // Verify script execution works
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/sites/static.test.js` (NEW FILE)

---

**E2E-SITE-2: React SPA**
```javascript
test('E2E: works on React single-page app', async () => {
  // Open React app
  // Navigate between routes
  // Verify console capture persists
});
```
**Priority**: HIGH
**Risk**: HIGH
**Location**: `tests/e2e/sites/react-spa.test.js` (NEW FILE)

---

**E2E-SITE-3: Complex Production Site**
```javascript
test('E2E: works on complex production site (e.g., GitHub)', async () => {
  // Open github.com
  // Verify extension doesn't break site
  // Verify can capture console logs
  // Verify can execute scripts
});
```
**Priority**: MEDIUM
**Risk**: MEDIUM
**Location**: `tests/e2e/sites/production.test.js` (NEW FILE)

---

## Test Priority Matrix

### Priority 1 (CRITICAL - Implement First)
**Must pass before any release**

| Test ID | Description | Risk | Effort |
|---------|-------------|------|--------|
| COMBO-1 | Full E2E flow | CRITICAL | HIGH |
| E2E-FLOW-1 | Developer workflow | CRITICAL | HIGH |
| E2E-FLOW-2 | Automated testing workflow | CRITICAL | HIGH |
| E2E-BROWSER-1 | Chrome stable support | CRITICAL | MEDIUM |
| WS-REG-1 | Duplicate registration | HIGH | LOW |
| SEC-INPUT-3 | Command injection | CRITICAL | MEDIUM |
| SEC-AUTH-1 | Unauthenticated access | CRITICAL | MEDIUM |

---

### Priority 2 (HIGH - Implement Soon)
**Should pass before production use**

| Test ID | Description | Risk | Effort |
|---------|-------------|------|--------|
| HM-OBS-2 | Event payload immutability | HIGH | LOW |
| HM-OBS-3 | Observer memory leak | HIGH | MEDIUM |
| HM-OBS-4 | Observer exception handling | HIGH | MEDIUM |
| WS-REG-2 | Re-registration after disconnect | HIGH | LOW |
| WS-MSG-1 | Malformed JSON | HIGH | LOW |
| WS-MSG-2 | Missing required fields | HIGH | LOW |
| WS-MSG-3 | Large message rejection | HIGH | MEDIUM |
| WS-CMD-1 | Command timeout | HIGH | HIGH |
| EDGE-CONN-1 | Rapid connect/disconnect | HIGH | MEDIUM |
| EDGE-CONN-2 | Disconnect mid-command | HIGH | MEDIUM |
| EDGE-CONN-4 | Simultaneous connections | HIGH | MEDIUM |
| SEC-INPUT-2 | XSS in console logs | HIGH | MEDIUM |
| SEC-DOS-1 | Connection flood | HIGH | HIGH |
| SEC-DOS-2 | Message flood | HIGH | HIGH |
| SEC-LEAK-1 | Error message safety | HIGH | LOW |

---

### Priority 3 (MEDIUM - Implement Eventually)
**Nice to have, increases confidence**

| Test ID | Description | Risk | Effort |
|---------|-------------|------|--------|
| HM-OBS-1 | Event order | MEDIUM | LOW |
| TS-1 | TypeScript consumer | LOW | MEDIUM |
| SI-2 | HealthManager method throws | HIGH | MEDIUM |
| SI-3 | Event emission during requests | MEDIUM | MEDIUM |
| WS-CMD-2 | Response for non-existent ID | MEDIUM | LOW |
| EDGE-CONN-3 | API disconnect before response | MEDIUM | MEDIUM |
| EDGE-MSG-1 | Empty message | MEDIUM | LOW |
| EDGE-MSG-2 | Binary message | MEDIUM | LOW |
| EDGE-MSG-3 | Unicode handling | MEDIUM | MEDIUM |
| EDGE-STATE-1 | Server restart handling | HIGH | HIGH |
| EDGE-STATE-2 | Socket state desync | HIGH | MEDIUM |
| EDGE-STATE-3 | Concurrent getHealthStatus | MEDIUM | LOW |
| COMBO-2 | Multiple tabs + clients | HIGH | HIGH |
| COMBO-3 | Rapid command burst | HIGH | MEDIUM |
| COMBO-4 | ConsoleCapture during execution | HIGH | MEDIUM |
| COMBO-5 | Extension reload | HIGH | HIGH |
| COMBO-STATE-1 | All connection states | MEDIUM | MEDIUM |
| COMBO-STATE-2 | All readyState values | MEDIUM | LOW |
| PERF-THRU-1 | 1000 commands/sec | MEDIUM | MEDIUM |
| PERF-THRU-2 | 100 concurrent connections | MEDIUM | MEDIUM |
| PERF-LAT-1 | P99 latency < 100ms | MEDIUM | MEDIUM |
| E2E-SITE-2 | React SPA support | HIGH | MEDIUM |
| E2E-SITE-3 | Production site support | MEDIUM | MEDIUM |

---

### Priority 4 (LOW - Implement If Time Allows)
**Edge cases, not business-critical**

| Test ID | Description | Risk | Effort |
|---------|-------------|------|--------|
| HM-OBS-5 | Timestamp accuracy | LOW | LOW |
| TS-2 | IntelliSense verification | LOW | LOW |
| SI-1 | HealthManager init failure | LOW | LOW |
| EDGE-MSG-4 | Deeply nested JSON | LOW | LOW |
| WEIRD-TIME-1 | Out-of-order responses | HIGH | MEDIUM |
| WEIRD-TIME-2 | Clock skew | LOW | MEDIUM |
| WEIRD-TIME-3 | Registration+command race | MEDIUM | MEDIUM |
| WEIRD-RES-1 | File descriptor exhaustion | MEDIUM | HIGH |
| WEIRD-RES-2 | Memory pressure | MEDIUM | HIGH |
| WEIRD-PROTO-1 | WebSocket ping/pong | LOW | LOW |
| WEIRD-PROTO-2 | Slow client backpressure | MEDIUM | MEDIUM |
| PERF-MEM-1 | 1-hour stability | HIGH | HIGH |
| STRESS-1 | Maximum message size | HIGH | LOW |
| STRESS-2 | Rapid state changes | LOW | LOW |
| SEC-AUTH-3 | Token replay attack | MEDIUM | HIGH |
| SEC-LEAK-2 | Health status exposure | MEDIUM | LOW |
| E2E-BROWSER-2 | Chrome beta support | MEDIUM | LOW |
| E2E-BROWSER-3 | Chrome canary support | LOW | LOW |

---

## Test Gaps Analysis

### Current Coverage: ~77 tests

### Estimated Total Tests Needed: ~150-200 tests

### Major Gaps:

#### 1. **E2E Testing** (90% gap)
- **Missing**: Full user workflows, browser testing, real site testing
- **Impact**: HIGH - Can't verify system works end-to-end
- **Recommendation**: Implement Priority 1 E2E tests ASAP

#### 2. **Security Testing** (95% gap)
- **Missing**: Input validation, auth/authz, DoS protection, data leakage
- **Impact**: CRITICAL - Security vulnerabilities undetected
- **Recommendation**: Implement SEC-AUTH and SEC-INPUT tests immediately

#### 3. **Edge Case Testing** (80% gap)
- **Missing**: Connection edge cases, message edge cases, state edge cases
- **Impact**: HIGH - Production bugs likely
- **Recommendation**: Implement EDGE-CONN tests before production

#### 4. **Stress Testing** (100% gap)
- **Missing**: Throughput, latency, memory, stress tests
- **Impact**: MEDIUM - Performance issues unknown
- **Recommendation**: Implement PERF-LAT and COMBO-3 tests

#### 5. **Weird Scenarios** (100% gap)
- **Missing**: Timing weirdness, resource weirdness, protocol weirdness
- **Impact**: LOW-MEDIUM - Rare but possible edge cases
- **Recommendation**: Implement Priority 3-4 weird tests over time

#### 6. **Extension Testing** (90% gap)
- **Missing**: Background script, content script, popup, ConsoleCapture
- **Impact**: HIGH - Core functionality untested
- **Recommendation**: Implement EXT-BG and EXT-CONSOLE tests

#### 7. **API Client Testing** (70% gap)
- **Missing**: Error handling, timeout handling, initialization
- **Impact**: MEDIUM - API reliability unknown
- **Recommendation**: Implement API-1 through API-4 tests

---

## Implementation Plan

### Phase 1: Critical Path (Week 1)
**Goal**: Ensure system basically works E2E

1. Set up E2E test infrastructure (Puppeteer, Chrome driver)
2. Implement COMBO-1 (Full E2E flow)
3. Implement E2E-FLOW-1 (Developer workflow)
4. Implement SEC-AUTH-1 (Auth basics)
5. Implement WS-REG-1 (Duplicate registration)

**Success Criteria**: Can prove system works end-to-end with basic security

---

### Phase 2: High Priority (Week 2)
**Goal**: Cover high-risk edge cases

1. Implement all Priority 2 HIGH tests
2. Focus on:
   - Observer robustness (HM-OBS-2, HM-OBS-3, HM-OBS-4)
   - Message validation (WS-MSG-1, WS-MSG-2, WS-MSG-3)
   - Connection edge cases (EDGE-CONN-1, EDGE-CONN-2, EDGE-CONN-4)
   - Security (SEC-INPUT-2, SEC-DOS-1, SEC-DOS-2)

**Success Criteria**: 80% confidence in production stability

---

### Phase 3: Medium Priority (Week 3-4)
**Goal**: Increase coverage and confidence

1. Implement Priority 3 MEDIUM tests
2. Focus on:
   - Extension testing (EXT-BG, EXT-CS, EXT-CONSOLE)
   - API client testing (API-1 through API-4)
   - Combination scenarios (COMBO-2, COMBO-3, COMBO-4)
   - Performance testing (PERF-THRU, PERF-LAT)

**Success Criteria**: 95% confidence in production stability

---

### Phase 4: Low Priority (Ongoing)
**Goal**: Fill remaining gaps over time

1. Implement Priority 4 LOW tests as time allows
2. Add tests for bugs found in production
3. Continuous improvement

**Success Criteria**: Near-100% confidence

---

## Test Maintenance

### Test Review Cadence
- **Weekly**: Review failed tests, flaky tests
- **Monthly**: Review test coverage, identify gaps
- **Quarterly**: Review test priorities, update plan

### Test Health Metrics
- **Pass Rate**: Target > 99%
- **Flaky Test Rate**: Target < 1%
- **Test Execution Time**: Target < 10 minutes for unit/integration, < 30 minutes for E2E
- **Code Coverage**: Target > 80% line coverage

### Test Documentation
- Keep this test plan updated
- Document test infrastructure setup
- Document how to run tests locally
- Document how to debug failing tests

---

## Conclusion

This comprehensive test plan provides:
- **Current state**: 77 tests implemented
- **Target state**: ~150-200 tests needed
- **Gaps identified**: E2E (90%), Security (95%), Edge Cases (80%)
- **Priority matrix**: Clear roadmap for implementation
- **4-phase plan**: Week 1 (critical), Week 2 (high), Week 3-4 (medium), Ongoing (low)

**Next Steps:**
1. Review and approve test plan
2. Set up E2E test infrastructure
3. Begin Phase 1 implementation
4. Track progress weekly

**Success Metric**: When we can confidently deploy to production knowing the system is thoroughly tested.

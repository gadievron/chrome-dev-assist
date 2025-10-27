# Protocol Design Best Practices

**Context**: Test Orchestration Protocol for Chrome Dev Assist
**Date**: 2025-10-24

---

## 🎯 CORE PRINCIPLES

### 1. Simplicity First

> "Make interfaces easy to use correctly and hard to use incorrectly." - Scott Meyers

**Best Practice**: Minimal required parameters
```javascript
// ❌ BAD: Too many required fields
startTest({ projectName, testName, testId, version, expectedTabs, expectedDuration });

// ✅ GOOD: One essential parameter
startTest(testId);
```

**Rationale**: Every required parameter is a chance for user error

---

### 2. Idempotency

> "Calling an operation multiple times should have the same effect as calling it once."

**Best Practice**: Make operations safe to retry
```javascript
// ✅ GOOD: Can call multiple times safely
startTest('test-001');  // Creates test
startTest('test-001');  // Returns existing test (not error)
```

**Rationale**: Network failures, retries, and race conditions happen

---

### 3. Clear State Machine

> "The protocol should have well-defined states and transitions."

**Best Practice**: Document state transitions
```
IDLE
  ├─ startTest() → RUNNING
  ├─ startTest() (already running) → ERROR

RUNNING
  ├─ endTest() → CLEANUP → IDLE
  ├─ abortTest() → EMERGENCY_CLEANUP → IDLE
  ├─ startTest() → ERROR (overlapping test)
```

**Rationale**: Users need to understand what operations are valid when

---

### 4. Graceful Degradation

> "System should handle failures gracefully, not catastrophically."

**Best Practice**: Provide escape hatches
```javascript
// If test stuck in RUNNING state:
await abortTest(testId);  // Emergency cleanup

// If cleanup failed:
await verifyCleanup(expectedClosedTabs);  // Detect orphans
await verifyCleanup({ autoClean: true });  // Force cleanup
```

**Rationale**: Things will go wrong, provide recovery mechanisms

---

### 5. Stateless Where Possible

> "Store state only when absolutely necessary."

**Best Practice**: Minimize state
```javascript
// ❌ BAD: Storing unnecessary state
let testState = {
  activeTest: { testId, projectName, testName, version, startTime, ... },
  history: [...],  // Unused
  metadata: {...}  // Unused
};

// ✅ GOOD: Only essential state
let testState = {
  activeTestId: 'test-001',
  trackedTabs: [123, 456]
};
```

**Rationale**: Less state = fewer bugs, easier to reason about

---

### 6. Persistent State

> "State that matters should survive crashes."

**Best Practice**: Persist critical state
```javascript
// ❌ BAD: In-memory only (lost on service worker restart)
let testState = { ... };

// ✅ GOOD: Persisted to storage
let testState = { ... };
await chrome.storage.session.set({ testState });

// On startup:
const saved = await chrome.storage.session.get('testState');
if (saved.testState) testState = saved.testState;
```

**Rationale**: Service workers suspend, browser crashes happen

---

## 📋 PROTOCOL-SPECIFIC PATTERNS

### 1. Request-Response Pattern

**Best Practice**: Every command gets a response
```javascript
// Request
{
  type: 'command',
  id: 'cmd-uuid',
  command: { type: 'startTest', params: {...} }
}

// Response (success)
{
  type: 'response',
  id: 'cmd-uuid',
  data: { testId: 'test-001', status: 'started' }
}

// Response (error)
{
  type: 'error',
  id: 'cmd-uuid',
  error: { message: 'Test already running', code: 'TEST_ALREADY_RUNNING' }
}
```

**Rationale**: Client knows operation succeeded/failed

---

### 2. Timeout Handling

**Best Practice**: Every operation has a timeout
```javascript
const COMMAND_TIMEOUT = 30000;  // 30 seconds

setTimeout(() => {
  reject(new Error('Command timeout'));
}, COMMAND_TIMEOUT);
```

**Rationale**: Prevent indefinite hangs

---

### 3. Version Negotiation

**Best Practice**: Include protocol version
```javascript
// Registration message
{
  type: 'register',
  client: 'extension',
  protocolVersion: '1.0.0'
}

// Server validates
if (msg.protocolVersion !== '1.0.0') {
  throw new Error('Incompatible protocol version');
}
```

**Rationale**: Allows backward compatibility

---

### 4. Error Codes

**Best Practice**: Structured error codes
```javascript
const ErrorCodes = {
  TEST_ALREADY_RUNNING: 'TEST_ALREADY_RUNNING',
  TEST_NOT_FOUND: 'TEST_NOT_FOUND',
  TAB_NOT_FOUND: 'TAB_NOT_FOUND',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR'
};

// Usage
throw new Error('Test already running');
error.code = ErrorCodes.TEST_ALREADY_RUNNING;
```

**Rationale**: Programmatic error handling

---

## 🔒 SECURITY BEST PRACTICES

### 1. Input Validation

**Best Practice**: Validate all inputs
```javascript
function validateTestId(testId) {
  if (!testId) throw new Error('testId required');
  if (typeof testId !== 'string') throw new Error('testId must be string');
  if (testId.length > 100) throw new Error('testId too long');
  if (!/^[a-z0-9-]+$/.test(testId)) throw new Error('testId invalid format');
}
```

**Rationale**: Prevent injection, DoS, unexpected behavior

---

### 2. Rate Limiting

**Best Practice**: Limit operation frequency
```javascript
const RATE_LIMIT_MS = 1000;  // Max 1 startTest per second
let lastStartTime = 0;

function handleStartTest(params) {
  const now = Date.now();
  if (now - lastStartTime < RATE_LIMIT_MS) {
    throw new Error('Rate limit exceeded');
  }
  lastStartTime = now;
  // ...
}
```

**Rationale**: Prevent DoS attacks

---

### 3. Resource Limits

**Best Practice**: Bound all resources
```javascript
const MAX_TRACKED_TABS = 100;
const MAX_TEST_HISTORY = 10;
const MAX_TESTID_LENGTH = 100;

if (trackedTabs.length > MAX_TRACKED_TABS) {
  throw new Error('Too many tracked tabs');
}
```

**Rationale**: Prevent memory exhaustion

---

### 4. Sanitize Outputs

**Best Practice**: Don't leak sensitive data
```javascript
// ❌ BAD: Exposes internal tab IDs
return { allTabs: chrome.tabs.query({}) };

// ✅ GOOD: Only return what's needed
return { trackedTabs: testState.trackedTabs };
```

**Rationale**: Minimize information disclosure

---

## 🧪 TESTABILITY PATTERNS

### 1. Separation of Concerns

**Best Practice**: Separate protocol from implementation
```javascript
// ✅ GOOD: Protocol layer (API)
async function startTest(testId) {
  return await sendCommand({ type: 'startTest', params: { testId } });
}

// ✅ GOOD: Implementation layer (Extension)
async function handleStartTestCommand(params) {
  // Implementation details
}
```

**Rationale**: Can test API without extension, mock responses

---

### 2. Testable State

**Best Practice**: Make state inspectable
```javascript
// ✅ GOOD: Expose getTestStatus() for testing
async function getTestStatus() {
  return {
    activeTestId: testState.activeTestId,
    trackedTabs: testState.trackedTabs
  };
}

// Test can verify state
const status = await getTestStatus();
expect(status.activeTestId).toBe('test-001');
```

**Rationale**: Tests can verify protocol behavior

---

### 3. Deterministic Behavior

**Best Practice**: Avoid random/timing-dependent behavior
```javascript
// ❌ BAD: Non-deterministic
const testId = `test-${Math.random()}`;

// ✅ GOOD: Deterministic
const testId = params.testId;  // User provides
```

**Rationale**: Tests should be repeatable

---

## 📊 REAL-WORLD EXAMPLES

### 1. HTTP Protocol (Gold Standard)

**What they do well**:
- Stateless (each request independent)
- Clear methods (GET, POST, DELETE)
- Standard status codes (200, 404, 500)
- Headers for metadata
- Idempotent operations (GET, PUT)

**Applied to our protocol**:
```javascript
// Clear command names (like HTTP methods)
startTest()  → POST /test
endTest()    → DELETE /test
getStatus()  → GET /test/status

// Standard error codes (like HTTP status)
200 → Success
409 → Conflict (test already running)
404 → Not Found (test doesn't exist)
500 → Internal Error
```

---

### 2. WebSocket Protocol

**What they do well**:
- Bidirectional communication
- Frame-based messages
- Ping/pong for keep-alive
- Clean disconnect (close frames)

**Applied to our protocol**:
```javascript
// Keep-alive (ping/pong)
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);

// Graceful disconnect
ws.on('close', () => {
  reconnect();
});
```

---

### 3. JSON-RPC 2.0

**What they do well**:
- Request-response pairing (id)
- Structured errors ({ code, message, data })
- Batching (multiple requests in one)

**Applied to our protocol**:
```javascript
// Request-response pairing
{
  jsonrpc: '2.0',
  id: 'cmd-uuid',
  method: 'startTest',
  params: { testId: 'test-001' }
}

{
  jsonrpc: '2.0',
  id: 'cmd-uuid',
  result: { status: 'started' }
}
```

---

## ✅ CHECKLIST: Is Your Protocol Good?

### Simplicity
- [ ] Minimal required parameters (< 3)
- [ ] Clear command names (verb-based)
- [ ] No unnecessary state
- [ ] Easy to use correctly

### Reliability
- [ ] Idempotent operations where possible
- [ ] Timeout handling
- [ ] Error recovery (abort, cleanup)
- [ ] State persistence

### Security
- [ ] Input validation
- [ ] Rate limiting
- [ ] Resource limits
- [ ] No sensitive data leaks

### Testability
- [ ] Separation of concerns
- [ ] Inspectable state
- [ ] Deterministic behavior
- [ ] Mock-friendly

### Documentation
- [ ] State machine documented
- [ ] Error codes documented
- [ ] Usage examples
- [ ] Edge cases covered

---

## 🎯 RECOMMENDATIONS FOR OUR PROTOCOL

### Keep ✅
1. **Request-response pairing** (command ID matching)
2. **Clear command names** (startTest, endTest)
3. **State inspection** (getTestStatus)
4. **Error recovery** (abortTest)
5. **Cleanup verification** (verifyCleanup)

### Add 🆕
1. **State persistence** (chrome.storage.session)
2. **Idempotency** (startTest twice = same result)
3. **Rate limiting** (max 1 startTest/sec)
4. **Resource limits** (max 100 tabs)
5. **Protocol version** ('1.0.0' in registration)

### Remove ❌
1. **Test history** (unused)
2. **expectedTabs** (not validated)
3. **expectedDuration** (not validated)
4. **projectName/testName/version** (optional metadata)

---

## 📚 REFERENCES

### Industry Standards
- **HTTP/1.1**: RFC 7230-7235 (request-response, status codes)
- **WebSocket**: RFC 6455 (bidirectional, frames, keep-alive)
- **JSON-RPC 2.0**: Request-response pairing, structured errors

### Best Practice Sources
- *Designing Data-Intensive Applications* (Martin Kleppmann)
- *RESTful Web APIs* (Leonard Richardson)
- *Chrome Extension API Design* (Google)

### Lessons From Production
- **Keep it simple**: 80% of complexity is unused
- **Persist state**: Service workers restart frequently
- **Provide escape hatches**: Users need recovery from failures
- **Test everything**: Protocols are hard to change once deployed

---

**Next**: Apply these best practices to simplify our protocol

**Goal**: Achieve 9/10 on all dimensions (Architect, Developer, Security)

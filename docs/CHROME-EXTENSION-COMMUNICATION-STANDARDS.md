# Chrome Extension Communication Standards

**Context**: Test Orchestration Protocol for Chrome Dev Assist
**Research Date**: 2025-10-24
**Sources**: Chrome Developer Documentation, Stack Overflow, Medium articles

---

## 🏗️ CHROME EXTENSION MESSAGING ARCHITECTURE

### Official Chrome Messaging APIs

Chrome provides **two** messaging patterns:

#### 1. One-Time Messages (Request-Response)

**API**: `chrome.runtime.sendMessage()` / `chrome.tabs.sendMessage()`

**Use Case**: Single request-response exchanges

```javascript
// Content Script → Service Worker
chrome.runtime.sendMessage(
  { type: 'getStatus' },
  (response) => {
    console.log(response.status);
  }
);

// Service Worker (listener)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getStatus') {
    sendResponse({ status: 'active' });
  }
  return true;  // Keep channel open for async
});
```

**Characteristics**:
- ✅ Simple API
- ✅ Automatic request-response pairing
- ✅ Built-in error handling
- ❌ No state preservation
- ❌ Overhead for multiple messages

---

#### 2. Long-Lived Connections (Ports)

**API**: `chrome.runtime.connect()` / `chrome.tabs.connect()`

**Use Case**: Multiple messages over same connection

```javascript
// Content Script → Service Worker
const port = chrome.runtime.connect({ name: 'test-channel' });

port.postMessage({ type: 'startTest', testId: 'test-001' });
port.postMessage({ type: 'endTest', testId: 'test-001' });

port.onMessage.addListener((msg) => {
  console.log('Response:', msg);
});

// Service Worker (listener)
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    // Handle message
    port.postMessage({ status: 'ok' });
  });
});
```

**Characteristics**:
- ✅ Efficient for multiple messages
- ✅ Bidirectional communication
- ✅ Connection lifecycle (disconnect events)
- ❌ More complex API
- ⚠️ Connection lost when service worker suspends

---

### Service Worker Lifecycle (Manifest V3)

**Critical**: Service workers shut down after **5 minutes** of inactivity

**Implications**:
1. **In-memory state is lost** when service worker suspends
2. **Connections close** (Ports disconnect)
3. **Event listeners must be at top level** (not async)

**Solutions**:
```javascript
// ✅ GOOD: Event listener at top level
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse);
  return true;
});

// ❌ BAD: Event listener registered async
async function init() {
  chrome.runtime.onMessage.addListener(...);  // WON'T WORK
}
init();
```

---

## 🌐 WEB PAGE ↔ EXTENSION COMMUNICATION

### Three-Layer Architecture

```
Web Page
  ↓ window.postMessage()
Content Script
  ↓ chrome.runtime.sendMessage()
Service Worker
```

**Layer 1: Web Page → Content Script**

```javascript
// Web page (injected script)
window.postMessage({ type: 'test', data: '...' }, '*');

// Content Script
window.addEventListener('message', (event) => {
  // SECURITY: Validate origin
  if (event.source !== window) return;

  // Forward to service worker
  chrome.runtime.sendMessage(event.data);
});
```

**Layer 2: Content Script → Service Worker**

```javascript
// Content Script
chrome.runtime.sendMessage({ type: 'test', data: '...' }, (response) => {
  // Send back to web page
  window.postMessage(response, '*');
});
```

---

## 🔒 SECURITY STANDARDS

### 1. Origin Validation

**CRITICAL**: Always validate `message.origin`

```javascript
window.addEventListener('message', (event) => {
  // ❌ BAD: Accept all messages
  handleMessage(event.data);

  // ✅ GOOD: Validate origin
  if (event.origin !== 'https://trusted-domain.com') {
    return;  // Reject
  }
  handleMessage(event.data);
});
```

**Why**: Malicious pages can send messages to your extension

---

### 2. External Connectivity

**manifest.json**:
```json
{
  "externally_connectable": {
    "matches": [
      "https://trusted-domain.com/*",
      "http://localhost:*"
    ]
  }
}
```

**Why**: Restricts which domains can send messages to your extension

---

### 3. Message Sanitization

**CRITICAL**: Don't blindly trust message content

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ❌ BAD: Execute untrusted input
  eval(msg.code);  // NEVER

  // ✅ GOOD: Validate and sanitize
  if (typeof msg.testId !== 'string') {
    sendResponse({ error: 'Invalid testId type' });
    return;
  }

  if (msg.testId.length > 100) {
    sendResponse({ error: 'testId too long' });
    return;
  }

  if (!/^[a-z0-9-]+$/.test(msg.testId)) {
    sendResponse({ error: 'testId invalid format' });
    return;
  }

  // Now safe to use
  handleStartTest(msg.testId);
});
```

---

## 🎯 OUR CURRENT ARCHITECTURE

### We Use: WebSocket (External Server)

```
API Client (Node.js)
  ↓ WebSocket (localhost:9876)
WebSocket Server
  ↓ WebSocket (localhost:9876)
Extension Service Worker
```

**Why WebSocket Instead of chrome.runtime?**

| Feature | chrome.runtime | WebSocket |
|---------|----------------|-----------|
| External API (Node.js) | ❌ No | ✅ Yes |
| Bidirectional | ✅ Yes | ✅ Yes |
| Reconnection | ⚠️ Manual | ✅ Built-in |
| Persistence | ❌ No | ✅ Server-side |
| Complexity | ✅ Low | ⚠️ Medium |

**Conclusion**: WebSocket is correct choice for our use case (external API)

---

## 📋 APPLYING STANDARDS TO OUR PROTOCOL

### 1. Message Structure (Aligned with Chrome Patterns)

**Our Current (Good)**:
```javascript
{
  type: 'command',  // Like chrome.runtime message type
  id: 'cmd-uuid',   // Request-response pairing (like sendMessage callback)
  command: {
    type: 'startTest',
    params: { testId: 'test-001' }
  }
}
```

**Aligned with**: `chrome.runtime.sendMessage()` pattern

---

### 2. Registration (Connection Establishment)

**Our Current (Good)**:
```javascript
// Extension → Server
ws.send(JSON.stringify({
  type: 'register',
  client: 'extension',
  extensionId: chrome.runtime.id
}));
```

**Aligned with**: `chrome.runtime.connect({ name: 'channel' })` pattern

---

### 3. Reconnection (Service Worker Suspension)

**Our Current (Good)**:
```javascript
ws.onclose = () => {
  chrome.alarms.create('reconnect-websocket', { delayInMinutes: 0.017 });
};

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reconnect-websocket') {
    connectToServer();
  }
});
```

**Aligned with**: Chrome best practice (use alarms, not setTimeout)

---

### 4. State Persistence (NEW REQUIREMENT)

**Chrome Best Practice**:
```javascript
// Save state on changes
async function updateTestState(changes) {
  Object.assign(testState, changes);
  await chrome.storage.session.set({ testState });
}

// Load state on service worker startup
const saved = await chrome.storage.session.get('testState');
if (saved.testState) {
  testState = saved.testState;
}
```

**Why chrome.storage.session?**
- ✅ Persists across service worker restarts
- ✅ Cleared when browser closes (no permanent storage)
- ✅ Fast (in-memory + disk backup)

---

## 🚀 RECOMMENDATIONS FOR OUR PROTOCOL

### 1. Keep WebSocket Architecture ✅

**Reason**: We need external API (Node.js client), WebSocket is appropriate

---

### 2. Add chrome.storage.session Persistence ⭐ CRITICAL

**Implement**:
```javascript
// In background.js

// Load state on startup
chrome.storage.session.get('testState').then(data => {
  if (data.testState) {
    testState = data.testState;
    console.log('Restored test state:', testState);
  }
});

// Save state on changes
async function handleStartTestCommand(params) {
  testState.activeTestId = params.testId;
  testState.trackedTabs = [];
  testState.startTime = Date.now();

  // PERSIST
  await chrome.storage.session.set({ testState });

  return { testId: params.testId, status: 'started' };
}
```

**Why**: Service worker restarts every 5 minutes, state must persist

---

### 3. Align Message Format with Chrome Standards ✅

**Current** (already aligned):
```javascript
{
  type: 'command',
  id: 'cmd-uuid',
  command: { type: 'startTest', params: {...} }
}
```

**Chrome standard**:
```javascript
chrome.runtime.sendMessage(
  { type: 'startTest', params: {...} },
  (response) => { ... }
);
```

**Verdict**: ✅ Already aligned

---

### 4. Add Security Validation ⭐ IMPORTANT

**Implement**:
```javascript
// Validate testId (prevent injection)
function validateTestId(testId) {
  if (!testId || typeof testId !== 'string') {
    throw new Error('testId must be non-empty string');
  }

  if (testId.length > 100) {
    throw new Error('testId too long (max 100 chars)');
  }

  if (!/^[a-z0-9_-]+$/i.test(testId)) {
    throw new Error('testId contains invalid characters');
  }

  return true;
}

// Use in handlers
async function handleStartTestCommand(params) {
  validateTestId(params.testId);
  // ... rest of implementation
}
```

---

### 5. Event Listeners at Top Level ✅

**Current** (already correct):
```javascript
// ✅ GOOD: Listener at top level
ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  // ... handle
};
```

**Verdict**: ✅ Already aligned with Chrome best practices

---

## 📊 COMPARISON: Our Protocol vs Chrome Standards

| Standard | Chrome | Our Protocol | Status |
|----------|--------|--------------|--------|
| Message pairing | `sendMessage + callback` | `command.id → response.id` | ✅ Aligned |
| Bidirectional | Ports | WebSocket | ✅ Aligned |
| Reconnection | Manual | chrome.alarms | ✅ Aligned |
| State persistence | chrome.storage.session | ❌ Missing | ⚠️ **MUST ADD** |
| Security validation | Origin check | ❌ Missing | ⚠️ **SHOULD ADD** |
| Event listeners | Top-level | Top-level | ✅ Aligned |
| Error handling | try/catch | try/catch + error response | ✅ Aligned |

**Overall Alignment**: 5/7 (71%) → **ADD** state persistence + security validation

---

## ✅ ACTION ITEMS

### 1. Add chrome.storage.session Persistence (CRITICAL)

**Priority**: 🔴 CRITICAL
**Why**: Service worker restarts every 5 minutes, state is lost

**Implementation**:
- [ ] Load testState on service worker startup
- [ ] Save testState on every change (startTest, endTest, tab creation)
- [ ] Add error handling for storage failures

**Estimate**: 30 minutes

---

### 2. Add Security Validation (IMPORTANT)

**Priority**: 🟡 IMPORTANT
**Why**: Prevent injection, DoS attacks

**Implementation**:
- [ ] Validate testId format
- [ ] Validate all input parameters
- [ ] Add rate limiting (max 1 startTest/sec)
- [ ] Add resource limits (max 100 tabs)

**Estimate**: 20 minutes

---

### 3. Simplify Protocol (RECOMMENDED)

**Priority**: 🟢 RECOMMENDED
**Why**: User requested "keep it simple", persona review agrees

**Implementation**:
- [ ] Remove unused fields (history, expectedTabs, expectedDuration)
- [ ] Make projectName/testName/version optional
- [ ] Simplify state to { activeTestId, trackedTabs }

**Estimate**: 15 minutes

---

## 📚 REFERENCES

### Official Chrome Documentation
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Service Workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)

### Industry Articles
- [Message Passing & Security in Chrome Extensions (Duo Security)](https://duo.com/labs/tech-notes/message-passing-and-security-considerations-in-chrome-extensions)
- [Service Workers in Browser Extensions (Madhura Mehendale, Medium)](https://medium.com/whatfix-techblog/service-worker-in-browser-extensions-a3727cd9117a)
- [Chrome Extensions For Beginners - Manifest V3 (Jimmy Lam, Medium)](https://jl978.medium.com/chrome-extensions-for-beginners-46019a826cd6)

---

**Next Steps**: Apply these standards to our test orchestration protocol implementation

**Goal**: Achieve Chrome Extension best practices compliance (7/7 standards)

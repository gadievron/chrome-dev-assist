# WebSocket Protocol Specification

**Version**: 1.2.0
**Last Updated**: 2025-10-25
**Status**: Active

---

## Overview

Communication between the Node.js client, WebSocket server, and Chrome extension follows a bidirectional request-response pattern.

**Architecture**:

```
Client (Node.js) ←→ WebSocket Server ←→ Extension (Chrome)
```

---

## Message Types

### 1. Registration Messages

#### Extension Registration (Phase 0 Multi-Extension Support)

**Direction**: Extension → Server
**Purpose**: Register extension with server on connection

**Protocol v1.2.0+** (Phase 0 - Full Metadata):

```javascript
{
  type: 'register',
  client: 'extension',
  extensionId: 'abcdefghijklmnopqrstuvwxyzabcdef',  // Required
  name: 'Chrome Dev Assist',                          // Required (from manifest)
  version: '1.0.0',                                   // Required (semantic version)
  capabilities: [                                     // Required (array of strings)
    'test-orchestration',
    'console-capture',
    'tab-control'
  ],
  metadata: {                                         // Optional (max 10KB)
    userAgent: 'Mozilla/5.0...',
    timestamp: 1698765432000,
    manifest: {
      name: 'Chrome Dev Assist',
      version: '1.0.0',
      permissions: ['tabs', 'management', 'storage']
    }
  },
  recovery: {                                         // Optional (crash recovery)
    crashDetected: false,
    recoveryCount: 0
  }
}
```

**Protocol v1.0-1.1** (Legacy - Still Supported):

```javascript
{
  type: 'register',
  client: 'extension',
  extensionId: 'abcdefghijklmnopqrstuvwxyzabcdef'
}
// Server provides defaults: name='Unknown Extension', version='0.0.0', capabilities=[]
```

**Validation** (Phase 0):

- `extensionId`: 32 lowercase letters (a-z), format: `/^[a-z]{32}$/`
- `name`: Non-empty string, max 100 chars, no XSS characters (`<>'"&`)
- `version`: Semantic version format: `/^\d+\.\d+\.\d+$/`
- `capabilities`: Array of whitelisted strings:
  - `test-orchestration` - Start/end tests, track tabs
  - `console-capture` - Intercept console logs
  - `tab-control` - Create/reload/close tabs
  - `window-management` - Create/manage windows
- `metadata`: Optional object, max 10KB JSON size
  - Whitelisted fields: `userAgent`, `timestamp`
  - Sensitive fields removed: `key`, `oauth2`, `oauth2_client_id`
- `recovery`: Optional crash recovery status

**Response**: None (server stores connection and metadata)

**Security**: All fields validated using `server/validation.js` module

---

### 2. Command Messages

#### Command Request

**Direction**: Client → Server → Extension
**Purpose**: Execute operation in Chrome extension

```javascript
{
  type: 'command',
  id: 'cmd-uuid-here',
  command: {
    type: 'commandType',  // See Command Types below
    params: { ... }
  }
}
```

#### Command Response

**Direction**: Extension → Server → Client
**Purpose**: Return command result

```javascript
{
  type: 'response',
  id: 'cmd-uuid-here',  // Matches request ID
  data: { ... }
}
```

#### Command Error

**Direction**: Extension → Server → Client
**Purpose**: Return command error

```javascript
{
  type: 'error',
  id: 'cmd-uuid-here',
  error: {
    message: 'Error description',
    code: 'ERROR_CODE'
  }
}
```

---

## Command Types

### Extension Management

#### getAllExtensions

**Purpose**: Get list of all installed Chrome extensions

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-123',
  command: {
    type: 'getAllExtensions',
    params: {}
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-123',
  data: {
    extensions: [
      {
        id: 'abc...',
        name: 'Extension Name',
        version: '1.0.0',
        enabled: true,
        permissions: ['tabs', 'storage']
      }
    ],
    count: 5
  }
}
```

---

#### getExtensionInfo

**Purpose**: Get detailed info about specific extension

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-124',
  command: {
    type: 'getExtensionInfo',
    params: {
      extensionId: 'abc...'
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-124',
  data: {
    id: 'abc...',
    name: 'Extension Name',
    version: '1.0.0',
    enabled: true,
    permissions: ['tabs', 'storage'],
    manifest: { ... }
  }
}
```

---

#### enableExtension / disableExtension / toggleExtension

**Purpose**: Enable, disable, or toggle extension state

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-125',
  command: {
    type: 'enableExtension',  // or 'disableExtension', 'toggleExtension'
    params: {
      extensionId: 'abc...'
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-125',
  data: {
    extensionId: 'abc...',
    enabled: true  // new state
  }
}
```

---

#### reload

**Purpose**: Reload extension (disable + enable)

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-126',
  command: {
    type: 'reload',
    params: {
      extensionId: 'abc...',
      captureConsole: false,   // optional
      duration: 5000,          // optional, if captureConsole=true
      allowSelfReload: false   // optional, allow extension to reload itself
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-126',
  data: {
    extensionId: 'abc...',
    reloadSuccess: true,
    consoleLogs: []  // if captureConsole=true
  }
}
```

**Security**: By default, Chrome Dev Assist extension cannot reload itself to prevent issues. Set `allowSelfReload: true` to override.

---

#### forceReload

**Purpose**: Force reload Chrome Dev Assist extension via `chrome.runtime.reload()`

**Added**: v1.2.0

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-132',
  command: {
    type: 'forceReload',
    params: {}
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-132',
  data: {
    reloading: true
  }
}
```

**Behavior**:

- Sends response immediately
- Waits 100ms
- Calls `chrome.runtime.reload()` to restart service worker
- Extension disconnects and reconnects within ~1 second

**Use cases**:

- Automated testing workflows (runtime restart)
- Clearing extension state
- Recovering from errors
- Testing reload resilience

**Important**:

- ⚠️ Reloads extension **runtime**, NOT code from disk
- For code changes, use Level 4 reload (manual remove/reload)
- See [EXTENSION-RELOAD-GUIDE.md](../EXTENSION-RELOAD-GUIDE.md) for complete guide

---

### Tab Management

#### openUrl

**Purpose**: Open URL in new tab

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-127',
  command: {
    type: 'openUrl',
    params: {
      url: 'http://example.com',
      active: true,              // optional, default: true
      captureConsole: false,     // optional, default: false
      duration: 5000,            // optional, if captureConsole=true
      autoClose: false           // optional, default: false
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-127',
  data: {
    tabId: 123,
    url: 'http://example.com',
    consoleLogs: [],  // if captureConsole=true
    tabClosed: false  // if autoClose=true
  }
}
```

---

#### reloadTab

**Purpose**: Reload a tab

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-128',
  command: {
    type: 'reloadTab',
    params: {
      tabId: 123,
      bypassCache: false,    // optional, default: false (Cmd+Shift+R if true)
      captureConsole: false, // optional
      duration: 5000         // optional, if captureConsole=true
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-128',
  data: {
    tabId: 123,
    consoleLogs: []  // if captureConsole=true
  }
}
```

---

#### closeTab

**Purpose**: Close a tab

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-129',
  command: {
    type: 'closeTab',
    params: {
      tabId: 123
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-129',
  data: {
    closed: true
  }
}
```

---

### Console Capture

#### capture

**Purpose**: Capture console logs from all tabs

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-130',
  command: {
    type: 'capture',
    params: {
      duration: 5000  // ms to capture
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-130',
  data: {
    consoleLogs: [
      {
        level: 'log',
        message: 'Test message',
        timestamp: 1234567890,
        source: 'page'
      }
    ],
    duration: 5000,
    logCount: 1
  }
}
```

---

### Test Fixture Metadata

#### getPageMetadata

**Purpose**: Extract test metadata from page

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-131',
  command: {
    type: 'getPageMetadata',
    params: {
      tabId: 123
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-131',
  data: {
    metadata: {
      projectName: 'chrome-dev-assist',
      testId: 'test-001',
      testName: 'Basic Test',
      version: '1.0.0'
    },
    dataAttributes: {
      'test-project': 'chrome-dev-assist',
      'test-id': 'test-001'
    }
  }
}
```

---

## Test Orchestration Protocol (v1.1.0)

### startTest

**Purpose**: Start test with automatic resource tracking

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-200',
  command: {
    type: 'startTest',
    params: {
      testId: 'test-001',
      autoCleanup: true  // optional, default: true
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-200',
  data: {
    testId: 'test-001',
    status: 'started',
    timestamp: 1234567890,
    state: {
      activeTestId: 'test-001',
      trackedTabs: [],
      startTime: 1234567890
    }
  }
}
```

**Side Effects**:

- Sets `testState.activeTestId = testId`
- Sets `testState.trackedTabs = []`
- Sets `testState.startTime = Date.now()`
- Sets `testState.autoCleanup = true/false`
- Persists state to `chrome.storage.session`
- Prevents overlapping tests (throws error if test already running)

**Errors**:

- `Test already running: {testId}` - Another test is active

---

### endTest

**Purpose**: End test and trigger cleanup

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-201',
  command: {
    type: 'endTest',
    params: {
      testId: 'test-001',
      result: 'passed'  // 'passed', 'failed', or 'aborted'
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-201',
  data: {
    testId: 'test-001',
    status: 'ended',
    result: 'passed',
    duration: 5000,
    cleanup: {
      tabsClosed: [123, 456],
      orphansDetected: [],
      cleanupSuccess: true
    }
  }
}
```

**Side Effects**:

- If `autoCleanup=true`: Closes all tracked tabs
- Clears `testState.activeTestId`
- Clears `testState.trackedTabs`
- Persists cleared state to `chrome.storage.session`

**Errors**:

- `No active test to end` - No test is running
- `Test ID mismatch` - Different test is running

---

### getTestStatus

**Purpose**: Get current test status

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-202',
  command: {
    type: 'getTestStatus',
    params: {}
  }
}
```

**Response** (active test):

```javascript
{
  type: 'response',
  id: 'cmd-202',
  data: {
    activeTest: {
      testId: 'test-001',
      startTime: 1234567890,
      elapsedTime: 5000,
      trackedTabs: [123, 456],
      autoCleanup: true
    }
  }
}
```

**Response** (no active test):

```javascript
{
  type: 'response',
  id: 'cmd-202',
  data: {
    activeTest: null
  }
}
```

---

### abortTest

**Purpose**: Emergency abort test with cleanup

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-203',
  command: {
    type: 'abortTest',
    params: {
      testId: 'test-001',
      reason: 'Test timeout'  // optional
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-203',
  data: {
    testId: 'test-001',
    status: 'aborted',
    reason: 'Test timeout',
    timestamp: 1234567891,
    cleanup: {
      tabsClosed: [123, 456],
      orphansDetected: [],
      cleanupSuccess: true
    }
  }
}
```

**Side Effects**:

- **Always** closes tracked tabs (regardless of `autoCleanup` setting)
- Clears test state
- Persists to storage

**Errors**:

- `No active test to abort` - No test is running
- `Test ID mismatch` - Different test is running

---

### verifyCleanup

**Purpose**: Verify tabs were closed (orphan detection)

**Request**:

```javascript
{
  type: 'command',
  id: 'cmd-204',
  command: {
    type: 'verifyCleanup',
    params: {
      expectedClosedTabs: [123, 456]  // optional, default: []
    }
  }
}
```

**Response**:

```javascript
{
  type: 'response',
  id: 'cmd-204',
  data: {
    verified: true,
    orphans: [],
    expectedClosed: [123, 456],
    stillOpen: []
  }
}
```

**Response** (orphans detected):

```javascript
{
  type: 'response',
  id: 'cmd-204',
  data: {
    verified: false,
    orphans: [123],  // Tab 123 still open
    expectedClosed: [123, 456],
    stillOpen: [123]
  }
}
```

---

## Tab Tracking Integration

When a test is active, tab operations automatically track tabs:

```javascript
// Start test
await startTest('test-001');
// testState.activeTestId = 'test-001'
// testState.trackedTabs = []

// Open tab → auto-tracked
await openUrl('http://test.com');
// testState.trackedTabs = [123]  ← Tab automatically added

// Open another tab → auto-tracked
await openUrl('http://test2.com');
// testState.trackedTabs = [123, 456]

// End test → auto-cleanup
await endTest('test-001');
// Tabs 123 and 456 automatically closed
// testState.activeTestId = null
// testState.trackedTabs = []
```

---

## State Persistence

**Critical**: All test state is persisted to `chrome.storage.session`

**Why**: Service workers suspend after 5 minutes of inactivity. State must persist across suspensions.

**What's persisted**:

```javascript
{
  testState: {
    activeTestId: 'test-001',
    trackedTabs: [123, 456],
    startTime: 1234567890,
    autoCleanup: true
  }
}
```

**When persisted**:

- On `startTest()` - Save initial state
- On `openUrl()` - Save updated trackedTabs
- On `endTest()` - Save cleared state
- On `abortTest()` - Save cleared state

**Recovery on service worker restart**:

```javascript
// Service worker starts
chrome.storage.session.get('testState').then(data => {
  if (data.testState) {
    testState = data.testState; // Restore state
    console.log('Test state restored:', testState);
  }
});
```

---

## Security Validation

### Input Validation

**testId**:

- Required: Must be non-empty string
- Length: Max 100 characters
- Format: `^[a-z0-9_-]+$` (alphanumeric, underscore, hyphen)
- Rejects: `test;DROP TABLE`, `../../etc/passwd`, etc.

**Example**:

```javascript
function validateTestId(testId) {
  if (!testId || typeof testId !== 'string') {
    throw new Error('testId must be non-empty string');
  }
  if (testId.length > 100) {
    throw new Error('testId too long (max 100 characters)');
  }
  if (!/^[a-z0-9_-]+$/i.test(testId)) {
    throw new Error('testId contains invalid characters');
  }
}
```

---

## Error Codes

| Code                      | Meaning                           |
| ------------------------- | --------------------------------- |
| `EXTENSION_NOT_CONNECTED` | Extension not connected to server |
| `DUPLICATE_REGISTRATION`  | Extension already registered      |
| `INVALID_JSON`            | Message not valid JSON            |
| `INVALID_MESSAGE`         | Message missing required fields   |
| `UNKNOWN_MESSAGE_TYPE`    | Unknown message type              |
| `INVALID_COMMAND`         | Command missing ID field          |
| `SEND_FAILED`             | Failed to send to extension       |
| `TEST_ALREADY_RUNNING`    | Test already active               |
| `NO_ACTIVE_TEST`          | No test running                   |
| `TEST_ID_MISMATCH`        | Wrong test ID provided            |
| `INVALID_RESULT`          | Invalid test result value         |

---

## Protocol Version History

### v1.2.0 (2025-10-25) - Phase 0 Multi-Extension Support

- ✅ Enhanced `register` message with full metadata (name, version, capabilities, metadata)
- ✅ Added server-side validation module (`server/validation.js`)
- ✅ Added security validation:
  - Extension ID format validation
  - Name validation (max 100 chars, XSS prevention)
  - Version validation (semantic versioning)
  - Capabilities whitelist validation
  - Metadata size limit (10KB DoS prevention)
  - Manifest sanitization (removes secrets: key, oauth2)
- ✅ Added `forceReload` command (service worker restart)
- ✅ Added `allowSelfReload` option to `reload` command
- ✅ Backward compatibility with v1.0-1.1 registration (server provides defaults)

### v1.1.0 (2025-10-24) - Test Orchestration

- ✅ Added Test Orchestration Protocol (5 commands)
- ✅ Added state persistence (chrome.storage.session)
- ✅ Added tab auto-tracking
- ✅ Added auto-cleanup on test end
- ✅ Added overlapping test prevention
- ✅ Added security validation (testId format)

### v1.0.0 (Initial) - Core Commands

- Extension management commands
- Tab management commands
- Console capture
- Page metadata extraction

---

## Future Protocol Changes

### Planned for v1.3.0 (Window Management)

- `getAllWindows` - List Chrome windows
- `getFocusedWindow` - Get focused window
- Window pinning in test state
- Window info in responses

### Planned for v1.4.0 (Advanced Extension Discovery)

- Extension routing (targetExtensionId in commands)
- Query extensions by capability
- Extension health status

---

**End of Protocol Specification**

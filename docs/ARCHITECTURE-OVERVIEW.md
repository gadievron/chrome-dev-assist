# Chrome Dev Assist - Architecture Overview

Detailed architecture documentation for the chrome-dev-assist system.

**For quick reference, see:** [CLAUDE.md](../CLAUDE.md) | [API.md](API.md)

---

## System Architecture

### 3-Layer WebSocket Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Node.js API   │         │  WebSocket       │         │    Chrome       │
│   (Your Code)   │◄───────►│   Server         │◄───────►│   Extension     │
│ claude-code/    │  :9876  │  server/         │  :9876  │  extension/     │
│   index.js      │         │  websocket-      │         │  background.js  │
│                 │         │  server.js       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### Message Flow

1. **Node.js API** → WebSocket server (command)
2. **Server routes** → Chrome extension
3. **Extension executes** via Chrome APIs
4. **Extension** → Server → Node.js (response)

### Auto-start Behavior

- Server automatically starts on first API call if not running
- Single instance enforcement via PID file
- Health check endpoint for monitoring

---

## Key Components

### 1. Node.js API (`claude-code/index.js`)

**Purpose**: Simple API for extension testing

**Features**:

- **10 public functions**:
  - Extension management: `getAllExtensions()`, `getExtensionInfo()`, `reload()`, `reloadAndCapture()`
  - Console capture: `captureLogs()`
  - Tab operations: `openUrl()`, `reloadTab()`, `closeTab()`
  - DOM inspection: `getPageMetadata()` (Phase 1.3)
  - Screenshot: `captureScreenshot()` (Phase 1.3)
- **Auto-start server**: Automatically spawns server if connection fails
- **Validation**: Extension ID format validation (`/^[a-p]{32}$/`)
- **Timeouts**: 30 second command timeout

**Key Functions**:

```javascript
// Extension management
async function reload(extensionId, options = {})
async function getAllExtensions()
async function getExtensionInfo(extensionId)

// Console capture
async function captureLogs(duration = 3000, options = {})

// Tab operations
async function openUrl(url, options = {})
async function reloadTab(tabId, options = {})
async function closeTab(tabId)

// DOM inspection (Phase 1.3)
async function getPageMetadata(tabId)

// Screenshot (Phase 1.3)
async function captureScreenshot(tabId, options = {})
```

### 2. WebSocket Server (`server/websocket-server.js`)

**Purpose**: Route messages between Node.js and Chrome extension

**Features**:

- **Port**: 9876 (localhost only for security)
- **Single instance enforcement**: PID file prevents duplicate servers
- **Token-based authentication**: For HTTP fixture serving
- **Health endpoint**: `/health` for monitoring
- **Duplicate prevention**: Only one extension can connect

**Security Layers**:

1. **Network binding** - Prevents remote access (127.0.0.1 only)
2. **Host header validation** - Prevents DNS rebinding
3. **Token authentication** - Prevents cross-localhost attacks
4. **Path traversal protection** - Prevents directory traversal

**Message Protocol**:

```javascript
// Command (Node.js → Extension)
{
  id: "cmd_1234567890",
  type: "reload",
  params: { extensionId: "abc...", options: {} }
}

// Response (Extension → Node.js)
{
  commandId: "cmd_1234567890",
  success: true,
  result: { ... }
}

// Error Response
{
  commandId: "cmd_1234567890",
  success: false,
  error: "Error message"
}
```

**See:** [WEBSOCKET-PROTOCOL.md](WEBSOCKET-PROTOCOL.md) for complete protocol details.

### 3. Chrome Extension (`extension/`)

**Components**:

1. **Service Worker** (`background.js`)
   - Command execution
   - WebSocket client
   - Auto-reconnect on disconnect
   - Console capture coordination

2. **Content Script** (`inject-console-capture.js`)
   - Intercepts console.log in MAIN world
   - Sends captured logs to extension

3. **Manifest v3**
   - Required permissions: "management", "tabs", "scripting", "<all_urls>"
   - Service worker lifecycle management

**Console Capture Architecture**:

```
MAIN world (page) → ISOLATED world (content script) → Extension (service worker)
                          ↓
                    window.postMessage
                          ↓
                    Captured logs
```

### 4. Test Infrastructure

**Test Types**:

- **Unit tests** (`tests/unit/`): Component isolation testing
- **Integration tests** (`tests/integration/`): Full system testing
- **Security tests** (`tests/security/`): Security validation
- **Chaos tests** (`tests/chaos/`): Adversarial testing

**Test Status**:

- **28/106 tests passing** (73 require manual extension loading)
- **Core functionality**: ✅ All working when extension loaded
- **Known issue**: Tests require extension manually loaded (Puppeteer automation planned)

**See:** [TESTING-GUIDE.md](../TESTING-GUIDE.md) for complete testing documentation.

---

## Performance & Constraints

### Memory Management

- **Max logs per capture**: 10,000 logs (prevents memory exhaustion)
- **Capture cleanup**: 60-second interval
- **Max capture age**: 5 minutes after completion
- **Index optimization**: O(1) tab lookup using `Map<tabId, Set<commandId>>`

**Memory Safety**:

```javascript
// ConsoleCapture module enforces limits
const MAX_LOGS_PER_CAPTURE = 10000;

if (state.logs.length >= MAX_LOGS_PER_CAPTURE) {
  console.warn(`Capture ${commandId} reached max logs (${MAX_LOGS_PER_CAPTURE})`);
  return; // Discard additional logs
}
```

### Timeouts

| Operation          | Timeout      | Configurable  |
| ------------------ | ------------ | ------------- |
| Command execution  | 30 seconds   | No            |
| Console capture    | 1-60 seconds | Yes           |
| Server start delay | 1 second     | No            |
| Capture cleanup    | 60 seconds   | No (internal) |

### Concurrency

- **Single extension connection**: One extension connects at a time
- **Multiple commands**: Handled via command ID tracking
- **Race condition prevention**: Command-specific capture state
- **Tab-specific indexing**: O(1) lookup for logs by tab

**Concurrency Safety**:

```javascript
// Each command gets unique ID
const commandId = generateCommandId(); // "cmd_1234567890"

// Tab-specific indexing prevents cross-tab conflicts
capturesByTab.set(tabId, new Set([commandId]));
```

### Known Limitations

1. **Cannot reload itself**: Chrome Dev Assist prevents self-destruction
2. **One extension connection**: Per server instance
3. **Manual extension loading**: Tests require manual setup
4. **file:// URLs**: Require "Allow access to file URLs" permission
5. **Service worker lifecycle**: May disconnect during Chrome updates

---

## Data Flow Diagrams

### Extension Reload Flow

```
Node.js API
  ↓ reload(extensionId)
WebSocket Server
  ↓ route command
Chrome Extension
  ↓ chrome.management.setEnabled(false)
  ↓ chrome.management.setEnabled(true)
Extension Reloaded
  ↓ response
WebSocket Server
  ↓ route response
Node.js API
  ↓ return result
```

### Console Capture Flow

```
Page loads
  ↓
Content script injects
  ↓ MAIN world
console.log("test")
  ↓ intercepted
window.postMessage({ type: 'CONSOLE_LOG', ... })
  ↓ ISOLATED world
Content script receives
  ↓ chrome.runtime.sendMessage
Extension receives
  ↓ stores in captureState
Node.js API polls
  ↓ getCommandLogs(commandId)
WebSocket Server routes
  ↓
Extension returns logs
  ↓
Node.js receives logs
```

### Tab Operations Flow

```
Node.js API
  ↓ openUrl(url)
WebSocket Server
  ↓ route command
Chrome Extension
  ↓ chrome.tabs.create({ url })
Tab Created
  ↓ tabId
Content script auto-injected (if console capture active)
  ↓ response { tabId }
WebSocket Server
  ↓ route response
Node.js API
  ↓ return { tabId }
```

---

## Module Architecture

### ConsoleCapture Module (`extension/modules/ConsoleCapture.js`)

**Purpose**: Centralized console capture logic

**Features**:

- Tab-specific log storage
- Command-specific capture state
- Automatic stale capture cleanup
- Memory limit enforcement (10,000 logs per capture)

**API**:

```javascript
const capture = new ConsoleCapture();

// Start capture for command
capture.start(commandId, tabId, duration);

// Add log entry
capture.addLog(tabId, logEntry);

// Get logs for command
const logs = capture.getLogs(commandId);

// Cleanup
capture.cleanup(commandId);

// Stale cleanup (returns count)
const count = capture.cleanupStale(thresholdMs);

// Get stats
const stats = capture.getStats();
```

**Integration Status**: ✅ Fully integrated (Phase 3, Oct 27)

### HealthManager Module (`server/modules/HealthManager.js`)

**Purpose**: Server health monitoring

**Features**:

- Uptime tracking
- Request counting
- Error tracking
- Health check endpoint

**Integration Status**: ✅ Active (4 usages in websocket-server.js)

### Level4 CDP Module (`claude-code/level4-reload-cdp.js`)

**Purpose**: Advanced Chrome DevTools Protocol reload

**Features**:

- Disk-level extension reload
- CDP WebSocket connection
- Expression evaluation

**Integration Status**: ⚠️ Implemented but not exposed in public API (internal-only)

**Why Not Exposed**: Requires Chrome to be started with `--remote-debugging-port=9222` flag

---

## Security Architecture

**See:** [SECURITY.md](SECURITY.md) for complete security documentation.

### Defense-in-Depth (4 Layers)

1. **Network binding** - `127.0.0.1` only
2. **Host header validation** - Prevents DNS rebinding
3. **Token authentication** - UUID-based tokens for HTTP fixtures
4. **Path traversal protection** - Validates all file paths

### Input Validation

| Input              | Validation       | Regex/Method                       |
| ------------------ | ---------------- | ---------------------------------- |
| Extension ID       | Format check     | `/^[a-p]{32}$/`                    |
| URL                | Full parsing     | `new URL(url)`                     |
| Tab ID             | Positive integer | `Number.isInteger() && > 0`        |
| Duration           | 1-60000ms        | Range check                        |
| Screenshot options | Type + range     | Multiple checks (Phase 1.3 P0 fix) |

### CVE-2025-53773 Protection

**Fixes Applied (Oct 28)**:

- 50+ `echo` → `printf` conversions (prevents command injection)
- `grep -E` → `grep -F` (literal matching only)
- Shell script security audit workflow added

---

## Extension Architecture

### Service Worker Lifecycle

**States**:

1. **Installing** - Extension being loaded
2. **Active** - Service worker running
3. **Idle** - Service worker suspended (after 30 seconds inactivity)
4. **Terminated** - Service worker killed by Chrome

**Auto-reconnect**:

```javascript
// Extension reconnects to server on wake
chrome.runtime.onStartup.addListener(() => {
  connectToWebSocketServer();
});

// Periodic ping to keep connection alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 25000); // Every 25 seconds
```

**See:** [SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md](SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md)

---

## Future Architecture Plans

### Planned Features (Not Yet Implemented)

- **Puppeteer automation**: Launch Chrome with extension loaded automatically
- **Better test isolation**: Remove test interdependencies
- **OAuth2 integration**: When cloud sync or external APIs needed
- **Multi-extension support**: Connect multiple extensions simultaneously

### Infrastructure Improvements

- **HealthManager integration**: Full monitoring dashboard
- **Level4 CDP exposure**: Advanced API for power users
- **ConsoleCapture enhancements**: Filtering, search, export

**See:** [KNOWN-ISSUES.md](KNOWN-ISSUES.md) for complete list of planned improvements.

---

**Last Updated:** 2025-10-30
**Related:** [CLAUDE.md](../CLAUDE.md) | [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md) | [WEBSOCKET-PROTOCOL.md](WEBSOCKET-PROTOCOL.md)

# Dependency Map - Chrome Dev Assist

**Date:** 2025-10-26
**Purpose:** Complete dependency graph showing relationships between all files
**Coverage:** 118 JavaScript files (excluding node_modules)

---

## VISUAL DEPENDENCY GRAPH

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER APPLICATION                            │
│                    (Calls Node.js API)                              │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API LAYER (Node.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  claude-code/index.js  ◄──┐                                         │
│  ├─ Exports 8 functions    │                                        │
│  ├─ Uses: ws               │                                        │
│  ├─ Uses: server/validation│                                        │
│  └─ Uses: server/websocket-server (auto-start)                      │
│                            │                                        │
│  claude-code/level4-reload-cdp.js (STANDALONE)                      │
│  ├─ CDP-based reload       │                                        │
│  ├─ Uses: ws, http         │                                        │
│  └─ Uses: server/validation│                                        │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVER LAYER (Node.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│  server/websocket-server.js                                         │
│  ├─ Listens on localhost:9876                                       │
│  ├─ Routes: API ◄─► Extension                                       │
│  ├─ Uses: ws, fs, path, crypto                                      │
│  ├─ Serves: tests/fixtures/ over HTTP                               │
│  └─ Auth: .auth-token file                                          │
│                             │                                        │
│  server/validation.js       │                                        │
│  ├─ No dependencies         │                                        │
│  └─ Exports 6 functions + 2 constants                               │
└────────────────────────────┼──────────────────────────────────────┘
                             │ WebSocket (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CHROME EXTENSION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  extension/background.js (Service Worker)                           │
│  ├─ Connects to WebSocket server                                    │
│  ├─ Command handlers (8 commands)                                   │
│  ├─ Uses: extension/lib/error-logger.js                             │
│  ├─ Registers: content-script.js                                    │
│  └─ Manages: Console capture state                                  │
│         │                                                            │
│         ├─► extension/content-script.js (ISOLATED world)            │
│         │   └─ Injects: inject-console-capture.js                   │
│         │                                                            │
│         ├─► extension/inject-console-capture.js (MAIN world)        │
│         │   └─ Wraps: console.log/error/warn/info/debug             │
│         │                                                            │
│         ├─► extension/popup/popup.js (Popup UI)                     │
│         │   └─ Reads: chrome.storage.local                          │
│         │                                                            │
│         ├─► extension/lib/error-logger.js (Utility)                 │
│         │   └─ No dependencies                                      │
│         │                                                            │
│         └─► extension/modules/ConsoleCapture.js (POC - not used)    │
│             └─ No dependencies                                      │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    HEALTH MONITORING (Node.js)                      │
├─────────────────────────────────────────────────────────────────────┤
│  src/health/health-manager.js                                       │
│  ├─ EventEmitter subclass                                           │
│  ├─ Tracks WebSocket states                                         │
│  ├─ Uses: events, ws                                                │
│  └─ Emits: 'change' events                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## LAYER-BY-LAYER DEPENDENCY ANALYSIS

### LAYER 1: Node.js API (Entry Point)

#### claude-code/index.js
**Depends On:**
- `ws` (npm) - WebSocket client
- `server/validation.js` - Extension ID validation
- `server/websocket-server.js` - Auto-start via child_process

**Used By:**
- User applications (require('./claude-code/index.js'))
- Manual test scripts (26 files in test-*.js, scripts/manual-tests/)
- Integration tests (tests/integration/)

**Exports:**
```javascript
{
  reloadAndCapture,  // → sendCommand('reload', ...) → WebSocket → Extension
  reload,            // → sendCommand('reload', ...) → WebSocket → Extension
  captureLogs,       // → sendCommand('capture', ...) → WebSocket → Extension
  getAllExtensions,  // → sendCommand('getAllExtensions', ...) → WebSocket → Extension
  getExtensionInfo,  // → sendCommand('getExtensionInfo', ...) → WebSocket → Extension
  openUrl,           // → sendCommand('openUrl', ...) → WebSocket → Extension
  reloadTab,         // → sendCommand('reloadTab', ...) → WebSocket → Extension
  closeTab           // → sendCommand('closeTab', ...) → WebSocket → Extension
}
```

---

#### claude-code/level4-reload-cdp.js
**Depends On:**
- `ws` (npm) - WebSocket client (for CDP)
- `http` (node) - HTTP client (for CDP endpoint discovery)
- `server/validation.js` - Extension ID validation

**Used By:**
- NOT YET INTEGRATED into main API
- tests/unit/level4-reload-cdp.test.js (skipped tests)
- tests/integration/level4-reload.test.js (skipped tests)

**Exports:**
```javascript
level4ReloadCDP(extensionId, options) // → CDP WebSocket → Chrome
```

**Note:** Standalone module, NOT called by index.js currently

---

### LAYER 2: Server Layer

#### server/websocket-server.js
**Depends On:**
- `ws` (npm) - WebSocket server
- `fs` (node) - File system (PID file, auth token)
- `path` (node) - Path utilities
- `crypto` (node) - Auth token generation

**Used By:**
- `claude-code/index.js` - Auto-started via spawn()
- Direct execution: `node server/websocket-server.js`

**Serves:**
- WebSocket connections on localhost:9876
- HTTP requests for test fixtures (tests/fixtures/)
- Auth token validation

**Message Routing:**
```
API Client → WebSocket → Server → Extension
                   ▲              ▼
                   └──── Response ─┘
```

---

#### server/validation.js
**Depends On:**
- NONE (pure functions)

**Used By:**
- `claude-code/index.js` - validateExtensionId()
- `claude-code/level4-reload-cdp.js` - validateExtensionId()
- `extension/background.js` - Validation logic duplicated for defense-in-depth

**Exports:**
```javascript
{
  validateExtensionId(id),           // → boolean
  validateMetadata(metadata),        // → throws on invalid
  sanitizeManifest(manifest),        // → sanitized object
  validateCapabilities(capabilities),// → throws on invalid
  validateName(name),                // → throws on invalid
  validateVersion(version),          // → throws on invalid
  METADATA_SIZE_LIMIT,               // → 10KB constant
  ALLOWED_CAPABILITIES               // → array of strings
}
```

---

### LAYER 3: Chrome Extension Layer

#### extension/background.js (Service Worker)
**Depends On:**
- `extension/lib/error-logger.js` - Error categorization

**Used By:**
- Chrome extension runtime (auto-loaded as service worker)

**Registers:**
- `extension/content-script.js` - Injected into all pages

**Message Handlers:**
```javascript
// From WebSocket server
handleReloadCommand()         → chrome.management.setEnabled()
handleCaptureCommand()        → startConsoleCapture()
handleGetAllExtensionsCommand() → chrome.management.getAll()
handleGetExtensionInfoCommand() → chrome.management.get()
handleOpenUrlCommand()        → chrome.tabs.create()
handleReloadTabCommand()      → chrome.tabs.reload()
handleCloseTabCommand()       → chrome.tabs.remove()

// From content scripts
chrome.runtime.onMessage (type: 'console') → Store logs
```

**Data Flow:**
```
WebSocket Server → background.js → Chrome APIs
                                 ↓
                         content-script.js
                                 ↓
                    inject-console-capture.js
                                 ↓
                        Page console output
```

---

#### extension/content-script.js (ISOLATED World)
**Depends On:**
- NONE

**Used By:**
- `extension/background.js` - Registered via chrome.scripting

**Injects:**
- `extension/inject-console-capture.js` into MAIN world

**Message Flow:**
```
MAIN world (inject-console-capture.js)
    ↓ CustomEvent ('chromeDevAssist:consoleLog')
ISOLATED world (content-script.js)
    ↓ chrome.runtime.sendMessage
Service Worker (background.js)
```

---

#### extension/inject-console-capture.js (MAIN World)
**Depends On:**
- NONE (runs in page context)

**Used By:**
- `extension/content-script.js` - Injected via script tag

**Wraps:**
```javascript
console.log   → sendToExtension('log', args) → CustomEvent
console.error → sendToExtension('error', args) → CustomEvent
console.warn  → sendToExtension('warn', args) → CustomEvent
console.info  → sendToExtension('info', args) → CustomEvent
console.debug → sendToExtension('debug', args) → CustomEvent
```

**Security:**
- No access to chrome.* APIs
- Runs in page sandbox
- Cannot communicate directly with extension (uses CustomEvent bridge)

---

#### extension/popup/popup.js (Popup UI)
**Depends On:**
- NONE

**Used By:**
- Chrome extension runtime (popup.html)

**Reads:**
- `chrome.storage.local` - Extension status

---

#### extension/lib/error-logger.js (Utility)
**Depends On:**
- NONE

**Used By:**
- `extension/background.js` - Error logging

**Exports:**
```javascript
ErrorLogger {
  logExpectedError(context, message, error)   → console.warn
  logUnexpectedError(context, message, error) → console.error
  logInfo(context, message, data)             → console.log
  logCritical(context, message, error)        → console.error
}
```

**Purpose:** Prevents Chrome crash detection by using console.warn for expected errors

---

#### extension/modules/ConsoleCapture.js (POC - Not Integrated)
**Depends On:**
- NONE

**Used By:**
- tests/unit/ConsoleCapture.poc.test.js - POC validation

**Status:** Class-based implementation not yet integrated into background.js

---

### LAYER 4: Health Monitoring

#### src/health/health-manager.js
**Depends On:**
- `events` (node) - EventEmitter
- `ws` (npm) - WebSocket state constants

**Used By:**
- `server/websocket-server.js` - NOT YET INTEGRATED (designed for future use)
- tests/unit/health-manager*.test.js - Unit tests
- tests/integration/health-manager-realws.test.js - Integration tests

**Exports:**
```javascript
HealthManager extends EventEmitter {
  setExtensionSocket(socket)  → Track extension WebSocket
  setApiSocket(socket)        → Track API WebSocket
  isExtensionConnected()      → boolean
  getHealthStatus()           → {healthy, extension, api, issues}
  ensureHealthy()             → throws if unhealthy
}
```

**Events:**
```javascript
.on('change', (currentState, previousState) => { ... })
```

---

## TEST DEPENDENCIES

### Unit Tests (tests/unit/) - Test Production Code

| Test File | Tests | Dependencies |
|-----------|-------|--------------|
| error-logger.test.js | extension/lib/error-logger.js | jest |
| health-manager.test.js | src/health/health-manager.js | jest, ws |
| health-manager-api-socket.test.js | src/health/health-manager.js | jest, ws |
| health-manager-observers.test.js | src/health/health-manager.js | jest, ws |
| ConsoleCapture.poc.test.js | extension/modules/ConsoleCapture.js | jest |
| auth-token-fixture-access.test.js | server/websocket-server.js | jest, http |
| clean-shutdown-detection.test.js | server/websocket-server.js | jest, ws |
| connection-logic-unit.test.js | extension/background.js | jest (mocks Chrome APIs) |
| console-capture-race-condition.test.js | extension/background.js | jest |
| extension-discovery-validation.test.js | server/validation.js | jest |
| level4-reload-cdp.test.js | claude-code/level4-reload-cdp.js | jest, ws, http |
| page-metadata.test.js | extension/background.js | jest |
| tab-cleanup.test.js | extension/background.js | jest |
| websocket-connection-stability.test.js | server/websocket-server.js | jest, ws |

---

### Integration Tests (tests/integration/) - Test System

| Test File | Tests | Dependencies |
|-----------|-------|--------------|
| websocket-server.test.js | WebSocket communication | jest, ws |
| complete-system.test.js | End-to-end flow | jest, claude-code/index.js, Chrome extension |
| api-client.test.js | API contract | jest, claude-code/index.js |
| health-manager-realws.test.js | Health monitoring | jest, src/health/health-manager.js, ws |
| test-helpers.js | Test utilities | fs, path |

**All integration tests depend on:**
- WebSocket server running (localhost:9876)
- Chrome extension loaded and connected
- Test fixtures (tests/fixtures/)

---

### Manual Test Scripts - Test Workflows

**All manual test scripts depend on:**
- `claude-code/index.js` - Main API
- WebSocket server running
- Chrome extension loaded
- Environment variable: `TEST_EXTENSION_ID` or `EXTENSION_ID`

| Script | Primary Function Tested | Additional Dependencies |
|--------|------------------------|-------------------------|
| test-api.js | captureLogs() | None |
| test-auto-debug.js | Console interception | Data URL generation |
| test-capture.js | Capture command | WebSocket (direct) |
| test-complete-system.js | All 8 API functions | None |
| test-errors.js | Error handling | None |
| test-getallextensions.js | getAllExtensions() | None |
| test-http-page.js | HTTP page capture | HTTP server on :8765 |
| test-auth-debug.js | HTTP auth | server/websocket-server.js |
| test-errorlogger-*.js | ErrorLogger | extension/lib/error-logger.js |
| test-force-reload.js | Force reload | None |

---

## DEPENDENCY CHAINS (Critical Paths)

### User → Extension Reload

```
User Application
  ↓ require()
claude-code/index.js
  ↓ reload(extensionId)
  ↓ sendCommand({type: 'reload', params: {extensionId}})
  ↓ WebSocket client connects to localhost:9876
  ↓
server/websocket-server.js
  ↓ Routes command to extension WebSocket
  ↓
extension/background.js
  ↓ handleReloadCommand()
  ↓ chrome.management.setEnabled(id, false)
  ↓ chrome.management.setEnabled(id, true)
  ↓ Send response
  ↓
server/websocket-server.js
  ↓ Routes response to API WebSocket
  ↓
claude-code/index.js
  ↓ Resolves promise
  ↓
User Application receives result
```

---

### User → Console Log Capture

```
User Application
  ↓ reloadAndCapture(extensionId, {duration: 5000})
  ↓
claude-code/index.js
  ↓ sendCommand({type: 'reload', params: {extensionId, captureConsole: true}})
  ↓
server/websocket-server.js
  ↓
extension/background.js
  ↓ handleReloadCommand()
  ↓ startConsoleCapture(commandId, 5000)
  ↓ chrome.management.setEnabled() x2
  ↓ Wait 5 seconds
  ↓
(Meanwhile, in browser tabs...)
Page JavaScript
  ↓ console.log('test')
  ↓
inject-console-capture.js (MAIN world)
  ↓ sendToExtension('log', ['test'])
  ↓ dispatchEvent(CustomEvent 'chromeDevAssist:consoleLog')
  ↓
content-script.js (ISOLATED world)
  ↓ addEventListener('chromeDevAssist:consoleLog')
  ↓ chrome.runtime.sendMessage({type: 'console', ...})
  ↓
extension/background.js
  ↓ chrome.runtime.onMessage listener
  ↓ Store log in captureState.get(commandId).logs
  ↓
(After 5 seconds...)
extension/background.js
  ↓ getCommandLogs(commandId)
  ↓ Send response with consoleLogs array
  ↓
server/websocket-server.js
  ↓
claude-code/index.js
  ↓ Resolves promise with {consoleLogs: [...]}
  ↓
User Application receives logs
```

---

## EXTERNAL DEPENDENCIES (npm/node)

### Production Dependencies
```json
{
  "ws": "WebSocket client/server library"
}
```

### Development Dependencies
```json
{
  "jest": "Test framework",
  "@types/chrome": "Chrome API types",
  "eslint": "Linting (if configured)"
}
```

### Node.js Built-ins Used
- `events` - EventEmitter (health-manager.js)
- `fs` - File system (websocket-server.js, test-helpers.js)
- `path` - Path utilities (websocket-server.js, test-helpers.js)
- `crypto` - Auth token generation (websocket-server.js)
- `http` - HTTP server (websocket-server.js), CDP client (level4-reload-cdp.js)
- `child_process` - Server auto-start (index.js)

---

## CHROME API DEPENDENCIES

### Extension APIs Used (extension/background.js)
```javascript
chrome.management.setEnabled()    // Reload extensions
chrome.management.getAll()        // List extensions
chrome.management.get()           // Get extension info
chrome.tabs.create()              // Open URLs
chrome.tabs.reload()              // Reload tabs
chrome.tabs.remove()              // Close tabs
chrome.tabs.query()               // Find tabs
chrome.scripting.registerContentScripts() // Register content scripts
chrome.runtime.sendMessage()      // Send to background (from content script)
chrome.runtime.onMessage          // Receive from content scripts
chrome.storage.local              // Persistent storage (popup.js)
```

### Permissions Required (manifest.json)
```json
{
  "permissions": [
    "management",     // Extension reload
    "tabs",          // Tab operations
    "scripting",     // Content script injection
    "storage",       // Local storage
    "<all_urls>"     // Access all pages for console capture
  ]
}
```

---

## CIRCULAR DEPENDENCIES

### NONE DETECTED ✅

The architecture has clean unidirectional dependencies:
1. User → API Layer → Server Layer → Extension Layer
2. No extension layer code depends on server layer
3. No server layer code depends on API layer
4. Tests depend on production code, not vice versa

---

## MISSING INTEGRATIONS

### HealthManager Not Integrated
**File:** `src/health/health-manager.js`
**Status:** Implemented and tested, but NOT used by server/websocket-server.js
**Recommendation:** Integrate health monitoring into WebSocket server

### Level4 CDP Reload Not Integrated
**File:** `claude-code/level4-reload-cdp.js`
**Status:** Implemented, but NOT exposed in main API (claude-code/index.js)
**Recommendation:** Add to exports or document as experimental

### ConsoleCapture Class Not Integrated
**File:** `extension/modules/ConsoleCapture.js`
**Status:** POC implementation, not used by background.js
**Recommendation:** Either integrate or remove (current inline implementation works)

---

## DEPENDENCY VULNERABILITIES

### Single Points of Failure

1. **WebSocket Server (localhost:9876)**
   - ALL communication flows through this
   - If down, entire system is non-functional
   - **Mitigation:** Auto-start in index.js, health checks

2. **Chrome Extension Connection**
   - If extension disconnects, API calls fail
   - **Mitigation:** Auto-reconnect in background.js, health checks

3. **Content Script Injection**
   - If content script fails to inject, console capture fails
   - **Mitigation:** registerContentScripts() at startup, error handling

---

## FILE DEPENDENCY COUNT

### Most Depended-Upon Files (High Impact)
1. **server/websocket-server.js** - 3 direct dependents (index.js, tests, manual execution)
2. **claude-code/index.js** - 85+ dependents (all manual tests, integration tests, user apps)
3. **extension/background.js** - 59+ dependents (all tests that require Chrome extension)
4. **server/validation.js** - 2 direct dependents (index.js, level4-reload-cdp.js)
5. **extension/lib/error-logger.js** - 1 direct dependent (background.js) + 20+ test files

### Least Depended-Upon Files (Low Impact)
1. **extension/popup/popup.js** - 0 dependents (standalone UI)
2. **extension/modules/ConsoleCapture.js** - 1 dependent (POC test)
3. **src/health/health-manager.js** - 0 production dependents (only tests)
4. **claude-code/level4-reload-cdp.js** - 0 production dependents (not integrated)

---

## DEPENDENCY COMPLEXITY SCORE

**Calculation:** Average number of dependencies per file

| Layer | Files | Total Deps | Avg per File |
|-------|-------|------------|--------------|
| API | 2 | 5 | 2.5 |
| Server | 2 | 4 | 2.0 |
| Extension | 6 | 1 | 0.17 |
| Health | 1 | 2 | 2.0 |
| **Production Total** | **11** | **12** | **1.09** |
| Tests | 59 | ~118 | ~2.0 |
| Manual Tests | 36 | ~72 | ~2.0 |
| **Overall** | **106** | **~202** | **~1.9** |

**Verdict:** LOW COMPLEXITY ✅
- Clean separation of concerns
- Minimal cross-dependencies
- No circular dependencies
- Most files have 0-2 dependencies

---

## NEXT STEPS

1. **Integrate HealthManager** - Connect to websocket-server.js for production health monitoring
2. **Decide on Level4 CDP** - Either expose in API or document as experimental/remove
3. **Consolidate ConsoleCapture** - Either integrate class or remove (inline implementation works)
4. **Document content-script-v2.js** - Determine if v1 or v2 is canonical
5. **Clean up test files** - Remove 20 duplicate/obsolete files per consolidation plan

---

**Related Documents:**
- COMPLETE-FILE-INDEX-2025-10-26.md - Full file inventory
- CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md - Code verification
- COMPLETE-FUNCTIONALITY-MAP.md - Feature inventory

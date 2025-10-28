# Complete File Index - Chrome Dev Assist

**Date:** 2025-10-26
**Total JavaScript Files:** 118 (excluding node_modules)
**Status:** Complete codebase inventory with dependency mapping

---

## INDEX BY CATEGORY

### 📦 PRODUCTION CODE (Core System - 10 files)

#### Node.js API Layer (2 files)

| File                                 | Purpose                 | Exports                                 | Dependencies                                   | Lines |
| ------------------------------------ | ----------------------- | --------------------------------------- | ---------------------------------------------- | ----- |
| **claude-code/index.js**             | Main API entry point    | 8 functions (reload, captureLogs, etc.) | ws, server/validation, server/websocket-server | 350   |
| **claude-code/level4-reload-cdp.js** | CDP-based reload method | level4ReloadCDP()                       | ws, http, server/validation                    | 198   |

**Functions in claude-code/index.js:**

- `reloadAndCapture(extensionId, options)` - Reload + capture console logs
- `reload(extensionId)` - Reload extension only
- `captureLogs(duration)` - Capture logs without reload
- `getAllExtensions()` - List all extensions
- `getExtensionInfo(extensionId)` - Get single extension metadata
- `openUrl(url, options)` - Open URL in tab
- `reloadTab(tabId)` - Reload specific tab
- `closeTab(tabId)` - Close specific tab
- `sendCommand(command, timeout)` - Internal WebSocket sender
- `startServer()` - Auto-start WebSocket server
- `validateExtensionId(id)` - Extension ID validation
- `generateCommandId()` - UUID generator

**Constants:**

- `DEFAULT_DURATION = 5000`
- `DEFAULT_TIMEOUT = 30000`
- `EXTENSION_ID_LENGTH = 32`

**Functions in level4-reload-cdp.js:**

- `getCDPWebSocketURL(port)` - Query CDP endpoint
- `evaluateExpression(ws, expression)` - Execute JS via CDP
- `level4ReloadCDP(extensionId, options)` - CDP reload method

---

#### Server Layer (2 files)

| File                           | Purpose                | Exports                   | Dependencies         | Lines |
| ------------------------------ | ---------------------- | ------------------------- | -------------------- | ----- |
| **server/websocket-server.js** | WebSocket server core  | None (executable)         | ws, fs, path, crypto | 583   |
| **server/validation.js**       | Input validation layer | 6 functions + 2 constants | None                 | 196   |

**Functions in websocket-server.js:**

- `ensureSingleInstance()` - PID file management
- `log(message, data)` - Debug logging
- `logError(message, error)` - Error logging
- `handleHttpRequest(req, res)` - Serve fixtures over HTTP
- `handleRegister(ws, message)` - Client registration
- `handleCommand(ws, message)` - Command routing
- `handleResponse(ws, message)` - Response routing
- `cleanup()` - Graceful shutdown

**Constants:**

- `PORT = 9876`
- `HOST = '127.0.0.1'`
- `DEBUG = process.env.DEBUG === 'true'`
- `FIXTURES_PATH = path.join(__dirname, '../tests/fixtures')`
- `PID_FILE = path.join(__dirname, '../.server-pid')`
- `AUTH_TOKEN = crypto.randomBytes(32).toString('hex')`
- `TOKEN_FILE = path.join(__dirname, '../.auth-token')`

**Functions in validation.js:**

- `validateExtensionId(id)` - Extension ID format check
- `validateMetadata(metadata)` - Metadata validation
- `sanitizeManifest(manifest)` - Manifest sanitization
- `validateCapabilities(capabilities)` - Capability whitelist
- `validateName(name)` - Extension name validation
- `validateVersion(version)` - Version string validation

**Constants:**

- `METADATA_SIZE_LIMIT = 10 * 1024` (10KB)
- `ALLOWED_CAPABILITIES = ['test-orchestration', 'console-capture', 'window-management', 'tab-control']`

---

#### Chrome Extension Layer (6 files)

| File                                    | Purpose                         | Exports              | Dependencies               | Lines |
| --------------------------------------- | ------------------------------- | -------------------- | -------------------------- | ----- |
| **extension/background.js**             | Service worker                  | None                 | extension/lib/error-logger | ~900  |
| **extension/content-script.js**         | ISOLATED world bridge           | None                 | None                       | 32    |
| **extension/inject-console-capture.js** | MAIN world console interception | None                 | None                       | 81    |
| **extension/popup/popup.js**            | Popup UI                        | None                 | None                       | 24    |
| **extension/lib/error-logger.js**       | Error logging utility           | ErrorLogger class    | None                       | 156   |
| **extension/modules/ConsoleCapture.js** | Console capture POC             | ConsoleCapture class | None                       | 251   |

**Functions in background.js:**

- `registerConsoleCaptureScript()` - Register content scripts
- `connectToServer()` - WebSocket connection
- `handleReloadCommand(command)` - Reload handler
- `handleCaptureCommand(command)` - Capture handler
- `handleGetAllExtensionsCommand(command)` - Extension list
- `handleGetExtensionInfoCommand(command)` - Extension info
- `handleOpenUrlCommand(command)` - URL opener
- `handleReloadTabCommand(command)` - Tab reload
- `handleCloseTabCommand(command)` - Tab close
- `startConsoleCapture(commandId, duration)` - Start capture
- `cleanupCapture(commandId)` - Cleanup capture
- `getCommandLogs(commandId)` - Get logs
- `sleep(ms)` - Async delay

**Constants:**

- `MAX_LOGS_PER_CAPTURE = 10000`
- `CLEANUP_INTERVAL_MS = 60000`
- `MAX_CAPTURE_AGE_MS = 300000`
- `MAX_MESSAGE_LENGTH = 10000` (line 687)

**Callbacks:**

- `setInterval(() => { /* cleanup */ }, CLEANUP_INTERVAL_MS)` - Periodic cleanup
- `chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { /* console messages */ })` - Console log receiver

**Functions in error-logger.js:**

- `ErrorLogger.logExpectedError(context, message, error)` - Expected errors (console.warn)
- `ErrorLogger.logUnexpectedError(context, message, error)` - Unexpected errors (console.error)
- `ErrorLogger.logInfo(context, message, data)` - Info logging (console.log)
- `ErrorLogger.logCritical(context, message, error)` - Critical errors
- `ErrorLogger._buildErrorData(context, message, error)` - Internal builder

**Functions in inject-console-capture.js:**

- `sendToExtension(level, args)` - Dispatch to content script
- `console.log` wrapper
- `console.error` wrapper
- `console.warn` wrapper
- `console.info` wrapper
- `console.debug` wrapper

**Constants:**

- `originalLog`, `originalError`, `originalWarn`, `originalInfo`, `originalDebug` - Original console methods
- `MAX_MESSAGE_LENGTH = 10000`

**Functions in ConsoleCapture.js (POC - not yet integrated):**

- `constructor()`
- `start(captureId, options)`
- `stop(captureId)`
- `addLog(tabId, logEntry)`
- `getLogs(captureId)`
- `cleanup(captureId)`
- `isActive(captureId)`
- `getStats(captureId)`
- `getAllCaptureIds()`
- `cleanupStale(thresholdMs)`

---

#### Health Monitoring (1 file)

| File                             | Purpose                   | Exports             | Dependencies | Lines |
| -------------------------------- | ------------------------- | ------------------- | ------------ | ----- |
| **src/health/health-manager.js** | Centralized health checks | HealthManager class | events, ws   | 292   |

**Functions in HealthManager:**

- `constructor()`
- `setExtensionSocket(socket)`
- `setApiSocket(socket)`
- `isExtensionConnected()`
- `getHealthStatus()`
- `ensureHealthy()`
- `getReadyStateName(readyState)`
- `_detectAndEmitChanges(currentState)` - Private
- `_arraysEqual(arr1, arr2)` - Private

---

### 🧪 TEST SUITE (59 files)

#### Unit Tests (tests/unit/ - 20 files)

| File                                       | Tests What                          | Key Coverage                                           |
| ------------------------------------------ | ----------------------------------- | ------------------------------------------------------ |
| **error-logger.test.js**                   | extension/lib/error-logger.js       | Expected vs unexpected errors, security, consolidation |
| **health-manager.test.js**                 | src/health/health-manager.js        | Connection status, error messages, state transitions   |
| **health-manager-api-socket.test.js**      | src/health/health-manager.js        | API socket tracking                                    |
| **health-manager-observers.test.js**       | src/health/health-manager.js        | Event emission, observers                              |
| **ConsoleCapture.poc.test.js**             | extension/modules/ConsoleCapture.js | POC validation (5 tests)                               |
| **auth-token-fixture-access.test.js**      | server/websocket-server.js          | HTTP auth token validation                             |
| **clean-shutdown-detection.test.js**       | server/websocket-server.js          | Graceful shutdown                                      |
| **connection-logic-unit.test.js**          | extension/background.js             | WebSocket reconnection                                 |
| **console-capture-race-condition.test.js** | extension/background.js             | Race conditions in capture                             |
| **extension-discovery-validation.test.js** | server/validation.js                | Extension metadata validation                          |
| **hard-reload.test.js**                    | extension/background.js             | Hard reload behavior                                   |
| **level4-reload-auto-detect.test.js**      | claude-code/level4-reload-cdp.js    | CDP auto-detection                                     |
| **level4-reload-cdp.test.js**              | claude-code/level4-reload-cdp.js    | CDP reload method                                      |
| **metadata-leak-debug.test.js**            | extension/background.js             | Metadata leakage prevention                            |
| **page-metadata.test.js**                  | extension/background.js             | getPageMetadata() security                             |
| **screenshot.test.js**                     | extension/background.js             | Screenshot functionality                               |
| **script-registration.test.js**            | extension/background.js             | Content script registration                            |
| **smarter-completion-detection.test.js**   | extension/background.js             | Command completion detection                           |
| **tab-cleanup.test.js**                    | extension/background.js             | Tab resource cleanup                                   |
| **tab-operations-timeout.test.js**         | extension/background.js             | Tab operation timeouts                                 |
| **test-orchestration.test.js**             | extension/background.js             | Test lifecycle                                         |
| **timeout-wrapper.test.js**                | claude-code/index.js                | Timeout handling                                       |
| **websocket-connection-stability.test.js** | server/websocket-server.js          | Connection stability                                   |

---

#### Integration Tests (tests/integration/ - 26 files)

| File                                       | Purpose                             | Dependencies                     |
| ------------------------------------------ | ----------------------------------- | -------------------------------- |
| **websocket-server.test.js**               | WebSocket server communication      | server/websocket-server.js       |
| **complete-system.test.js**                | End-to-end system test              | All components                   |
| **api-client.test.js**                     | API contract validation             | claude-code/index.js             |
| **adversarial-tests.test.js**              | Chaos testing                       | All components                   |
| **chrome-crash-prevention.test.js**        | Chrome crash detection prevention   | extension/lib/error-logger.js    |
| **console-error-crash-detection.test.js**  | Console error handling              | extension/lib/error-logger.js    |
| **dogfooding.test.js**                     | Self-testing (reload own extension) | All components                   |
| **edge-cases-complete.test.js**            | Comprehensive edge cases            | All components                   |
| **edge-cases-stress.test.js**              | Stress testing                      | All components                   |
| **edge-cases.test.js**                     | Basic edge cases                    | All components                   |
| **health-manager-realws.test.js**          | Real WebSocket health checks        | src/health/health-manager.js     |
| **improvements-6-7-8.test.js**             | Feature verification                | All components                   |
| **improvements-verification.test.js**      | Feature verification                | All components                   |
| **level4-reload.test.js**                  | CDP reload integration              | claude-code/level4-reload-cdp.js |
| **multi-feature-integration.test.js**      | Multiple features combined          | All components                   |
| **native-messaging.test.js**               | Native messaging protocol           | extension/background.js          |
| **phase-1.1-medium.test.js**               | Phase 1.1 features                  | All components                   |
| **phase-1.1.test.js**                      | Phase 1.1 features                  | All components                   |
| **reconnection-behavior.test.js**          | WebSocket reconnection              | server/websocket-server.js       |
| **reload-button-fix.test.js**              | Reload button behavior              | extension/background.js          |
| **resource-cleanup.test.js**               | Resource cleanup                    | extension/background.js          |
| **screenshot-security.test.js**            | Screenshot security                 | extension/background.js          |
| **screenshot-visual-verification.test.js** | Screenshot validation               | extension/background.js          |
| **server-health-integration.test.js**      | Server health monitoring            | src/health/health-manager.js     |
| **service-worker-api.test.js**             | Service worker API                  | extension/background.js          |
| **service-worker-lifecycle.test.js**       | Service worker lifecycle            | extension/background.js          |
| **test-helpers.js**                        | Test utilities                      | None (exports helpers)           |

**test-helpers.js exports:**

- `getFixtureUrl(filename)` - Get fixture URL (HTTP or file://)
- `getUrlMode()` - Get URL mode config
- `sleep(ms)` - Async delay

---

#### Security Tests (tests/security/ - 3 files)

| File                                  | Purpose                        |
| ------------------------------------- | ------------------------------ |
| **tab-cleanup-security.test.js**      | Tab cleanup attack vectors     |
| **websocket-client-security.test.js** | Client-side WebSocket security |
| **websocket-server-security.test.js** | Server-side WebSocket security |

---

#### Performance Tests (tests/performance/ - 1 file)

| File                                   | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| **health-manager-performance.test.js** | Health manager performance benchmarks |

---

#### Chaos/Adversarial Tests (tests/chaos/ - 1 file)

| File                                | Purpose                       |
| ----------------------------------- | ----------------------------- |
| **tab-cleanup-adversarial.test.js** | Chaos testing for tab cleanup |

---

#### Boundary Tests (tests/boundary/ - 1 file)

| File                             | Purpose                                |
| -------------------------------- | -------------------------------------- |
| **tab-cleanup-boundary.test.js** | Boundary value testing for tab cleanup |

---

#### Meta Tests (tests/meta/ - 2 files)

| File                           | Purpose                     |
| ------------------------------ | --------------------------- |
| **test-quality.test.js**       | Test suite quality checks   |
| **test-reality-check.test.js** | Test assumptions validation |

---

#### API Tests (tests/api/ - 1 file)

| File              | Purpose            |
| ----------------- | ------------------ |
| **index.test.js** | API contract tests |

---

#### Test Support (tests/ - 2 files)

| File                       | Purpose                |
| -------------------------- | ---------------------- |
| **cleanup-test-tabs.js**   | Tab cleanup utility    |
| **crash-recovery.test.js** | Crash recovery testing |

---

### 🛠️ MANUAL TEST SCRIPTS (36 files)

#### Canonical Location: scripts/manual-tests/ (10 files)

| File                         | Purpose                         | Status    |
| ---------------------------- | ------------------------------- | --------- |
| **test-api.js**              | Test captureLogs() API          | CANONICAL |
| **test-auto-debug.js**       | Console interception validation | CANONICAL |
| **test-capture.js**          | WebSocket capture command       | CANONICAL |
| **test-complete-system.js**  | Full system demo                | CANONICAL |
| **test-errors.js**           | Error scenarios                 | CANONICAL |
| **test-example.js**          | Basic example                   | CANONICAL |
| **test-getallextensions.js** | Extension enumeration           | CANONICAL |
| **test-http-page.js**        | HTTP server page test           | CANONICAL |
| **test-https-url.js**        | HTTPS URL test                  | CANONICAL |
| **test-manual-open.js**      | Manual inspection               | CANONICAL |

---

#### Root Level: test-\*.js (26 files)

| File                                      | Purpose               | Status             |
| ----------------------------------------- | --------------------- | ------------------ |
| **test-api.js**                           | Capture logs test     | DUPLICATE → DELETE |
| **test-auto-debug.js**                    | Console interception  | DUPLICATE → DELETE |
| **test-capture.js**                       | WebSocket capture     | DUPLICATE → DELETE |
| **test-complete-system.js**               | System demo           | DUPLICATE → DELETE |
| **test-console-minimal.js**               | Minimal capture       | DUPLICATE → DELETE |
| **test-errors.js**                        | Error scenarios       | DUPLICATE → DELETE |
| **test-example.js**                       | Basic example         | DUPLICATE → DELETE |
| **test-getallextensions.js**              | Extension enumeration | DUPLICATE → DELETE |
| **test-http-page.js**                     | HTTP server test      | DUPLICATE → DELETE |
| **test-https-url.js**                     | HTTPS URL test        | DUPLICATE → DELETE |
| **test-manual-open.js**                   | Manual inspection     | DUPLICATE → DELETE |
| **test-auth-debug.js**                    | HTTP auth testing     | UNIQUE → KEEP      |
| **test-console-capture-diagnostic.js**    | Capture diagnostic    | UNIQUE → KEEP      |
| **test-errorlogger-automated.js**         | ErrorLogger tests     | UNIQUE → KEEP      |
| **test-errorlogger-reload.js**            | ErrorLogger reload    | UNIQUE → KEEP      |
| **test-errorlogger-simple.js**            | Simple ErrorLogger    | UNIQUE → KEEP      |
| **test-force-reload.js**                  | Force reload command  | UNIQUE → KEEP      |
| **test-list-extensions.js**               | List extensions       | UNIQUE → KEEP      |
| **test-reload-and-verify-errorlogger.js** | Reload + ErrorLogger  | UNIQUE → KEEP      |
| **test-tab-cleanup-verification.js**      | Tab cleanup test      | UNIQUE → KEEP      |
| **test-verify-inject-script.js**          | Script injection      | UNIQUE → KEEP      |
| **test-5s.js**                            | Browser spawn test    | OBSOLETE → DELETE  |
| **test-connection-simple.js**             | Simple connection     | OBSOLETE → DELETE  |
| **test-longer-duration.js**               | Extended capture      | OBSOLETE → DELETE  |
| **test-reload-after-fix.js**              | Verify fix            | OBSOLETE → DELETE  |
| **test-reload-self.js**                   | Self-reload           | OBSOLETE → DELETE  |

---

### 🔍 DEBUG & DIAGNOSTIC SCRIPTS (5 files)

| File                               | Purpose                         | Status              |
| ---------------------------------- | ------------------------------- | ------------------- |
| **debug-console-capture.js**       | Console capture debugging       | KEEP                |
| **debug-metadata.js**              | Metadata security testing       | KEEP                |
| **diagnose-connection.js** (root)  | Connection diagnostics          | DELETE (superseded) |
| **scripts/diagnose-connection.js** | Enhanced connection diagnostics | KEEP (canonical)    |
| **run-integration-tests.js**       | Test runner wrapper             | KEEP                |

---

### 🏗️ PROTOTYPES & BACKUPS (4 files)

| File                                   | Purpose                     | Status                    |
| -------------------------------------- | --------------------------- | ------------------------- |
| **prototype/api-client.js**            | WebSocket API POC           | DELETE (superseded)       |
| **prototype/server.js**                | WebSocket server POC        | DELETE (superseded)       |
| **extension/content-script-backup.js** | Content script backup       | DELETE (backup)           |
| **extension/content-script-v2.js**     | Alternative console capture | EVALUATE (may be current) |

---

### 🔧 UTILITIES (1 file)

| File                                  | Purpose                | Status |
| ------------------------------------- | ---------------------- | ------ |
| **scripts/add-autoclose-to-tests.js** | Add autoClose to tests | KEEP   |

---

## SUMMARY BY STATUS

### Production Code: 10 files

- ✅ All required for runtime
- ✅ All documented in COMPLETE-FUNCTIONALITY-MAP.md

### Test Suite: 59 files

- ✅ All required for quality assurance
- ✅ Comprehensive coverage across unit, integration, security, performance

### Manual Tests: 36 files

- ✅ Keep 10 canonical (scripts/manual-tests/)
- ✅ Keep 10 unique root-level
- ❌ Delete 11 duplicate root-level
- ❌ Delete 5 obsolete root-level

### Debug/Diagnostic: 5 files

- ✅ Keep 4
- ❌ Delete 1 (superseded)

### Prototypes/Backups: 4 files

- ❌ Delete 3 (superseded)
- ⚠️ Evaluate 1 (content-script-v2.js)

### Utilities: 1 file

- ✅ Keep

---

## FILE CONSOLIDATION PLAN

### DELETE (20 files total):

**Duplicates (11):**

1. test-api.js
2. test-auto-debug.js
3. test-capture.js
4. test-complete-system.js
5. test-console-minimal.js
6. test-errors.js
7. test-example.js
8. test-getallextensions.js
9. test-http-page.js
10. test-https-url.js
11. test-manual-open.js

**Obsolete (5):** 12. test-5s.js 13. test-connection-simple.js 14. test-longer-duration.js 15. test-reload-after-fix.js 16. test-reload-self.js

**Prototypes/Backups (3):** 17. prototype/api-client.js 18. prototype/server.js 19. extension/content-script-backup.js

**Superseded (1):** 20. diagnose-connection.js (root)

### MOVE (10 files):

Move unique root test-\*.js to scripts/manual-tests/:

1. test-auth-debug.js → scripts/manual-tests/
2. test-console-capture-diagnostic.js → scripts/manual-tests/
3. test-errorlogger-automated.js → scripts/manual-tests/
4. test-errorlogger-reload.js → scripts/manual-tests/
5. test-errorlogger-simple.js → scripts/manual-tests/
6. test-force-reload.js → scripts/manual-tests/
7. test-list-extensions.js → scripts/manual-tests/
8. test-reload-and-verify-errorlogger.js → scripts/manual-tests/
9. test-tab-cleanup-verification.js → scripts/manual-tests/
10. test-verify-inject-script.js → scripts/manual-tests/

### EVALUATE (1 file):

- extension/content-script-v2.js - Determine if v1 or v2 is current

---

## TOTAL FILE COUNT

**Current:** 118 files
**After Consolidation:** 98 files (-20 deletions)

**Breakdown After Cleanup:**

- Production: 10
- Tests: 59
- Manual Tests: 20 (all in scripts/manual-tests/)
- Debug/Diagnostic: 4
- Utilities: 1
- Prototypes: 0
- Evaluate: 1 (content-script-v2.js)
- **Total: 98**

---

**Next Document:** DEPENDENCY-MAP-2025-10-26.md

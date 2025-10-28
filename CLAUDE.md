# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Global Development Rules - MANDATORY

**CRITICAL**: All development must follow these global rules without exception:

### Core Rule Files (Located at ~/\*)

- **Security Rules**: `~/SECURITY_RULES.md` - Input validation, authentication, data protection
- **Coding Standards**: `~/CODING_STANDARDS.md` - Language standards, project structure, documentation
- **Development Rules**: `~/DEVELOPMENT_RULES.md` - Workflow, testing, API design, performance
- **Precision Rules**: `~/PRECISION_RULES.md` - Surgical changes, scope discipline, dependency verification
- **Simplicity Rules**: `~/SIMPLICITY_RULES.md` - Functionality first, avoid complexity, fail fast
- **Testing Rules**: `~/TESTING_RULES.md` - MANDATORY testing gates, coverage requirements, TDD
- **Completion Validation**: `~/COMPLETION_VALIDATION_RULES.md` - End-of-work validation checklist

---

## Chrome Dev Assist - Project-Specific Guide

**What this is**: Automated Chrome extension testing tool with WebSocket-based communication between Node.js and Chrome extensions.

**Current Status**: v1.0.0 - Core features working, 14 phantom APIs remain (was 16, Phase 1.3 implemented 2)

---

## ⚠️ Critical Information

### 14 Phantom APIs (DO NOT USE)

During comprehensive audit, **16 functions were discovered with tests but NO implementation**. Phase 1.3 implemented 2, leaving **14 phantoms**. These will fail:

- `startTest()`, `endTest()`, `abortTest()`, `getTestStatus()`
- ~~`getPageMetadata()`~~, ~~`captureScreenshot()`~~ ✅ Implemented Oct 27
- `captureServiceWorkerLogs()`, `getServiceWorkerStatus()`, `wakeServiceWorker()`
- `enableExtension()`, `disableExtension()`, `toggleExtension()`
- `enableExternalLogging()`, `disableExternalLogging()`, `getExternalLoggingStatus()`
- `verifyCleanup()`

**See**: `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` for full analysis

### 10 Actually Implemented Functions

```javascript
// Extension management
getAllExtensions()
getExtensionInfo(extensionId)
reload(extensionId)
reloadAndCapture(extensionId, options)

// Console capture
captureLogs(duration)

// Tab operations
openUrl(url, options)
reloadTab(tabId, options)
closeTab(tabId)

// DOM inspection (Phase 1.3)
getPageMetadata(tabId)  ✨ NEW Oct 27

// Screenshot capture (Phase 1.3)
captureScreenshot(tabId, options)  ✨ NEW Oct 27
```

**P0 Bug Fix (Oct 27)**: captureScreenshot() had critical validation bug fixed same day:

- **Bug**: Accepted NaN, Infinity, floats (discovered by 5-persona code review)
- **Fix**: Added 5 missing validation checks (commit 197fd79)
- **Tests**: 7 new edge case tests added (25 total, 100% pass rate)
- **Security**: Comprehensive warnings added to README.md and docs/API.md
- **Approval**: Unanimous approval from all 5 expert reviewers
- **Documentation**: 8 comprehensive review documents (5,595 lines)

**See**: `.SESSION-SUMMARY-P0-FIXES-2025-10-27.md` for complete details

---

## Development Commands

### Setup

```bash
# Install dependencies
npm install

# Load Chrome extension manually
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → Select extension/ folder
# 4. Note the extension ID (32 characters)
```

### Running Tests

```bash
# All tests (requires extension loaded)
npm test

# Specific test suites
npx jest tests/integration/websocket-server.test.js
npx jest tests/integration/complete-system.test.js
npx jest tests/unit/

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual Testing

```bash
# Start WebSocket server
node server/websocket-server.js

# Run manual test script
node test-complete-system.js

# Run specific manual tests
node test-reload-self.js
node test-console-minimal.js
```

### Common Operations

```bash
# Kill stuck server
pkill -f websocket-server
lsof -i :9876  # Find process on port 9876

# Check server status
curl http://localhost:9876/health

# View server logs
DEBUG=true node server/websocket-server.js
```

---

## Architecture Overview

**3-Layer WebSocket Architecture**:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Node.js API   │         │  WebSocket       │         │    Chrome       │
│   (Your Code)   │◄───────►│   Server         │◄───────►│   Extension     │
│ claude-code/    │  :9876  │  server/         │  :9876  │  extension/     │
│   index.js      │         │  websocket-      │         │  background.js  │
│                 │         │  server.js       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Message Flow**:

1. Node.js API → WebSocket server (command)
2. Server routes → Chrome extension
3. Extension executes via Chrome APIs
4. Extension → Server → Node.js (response)

**Auto-start**: Server automatically starts on first API call if not running

---

## Key Components

### 1. Node.js API (`claude-code/index.js`)

- **Purpose**: Simple API for extension testing
- **8 public functions**: reload, reloadAndCapture, captureLogs, getAllExtensions, getExtensionInfo, openUrl, reloadTab, closeTab
- **Auto-start server**: Automatically spawns server if connection fails
- **Validation**: Extension ID format validation (`/^[a-p]{32}$/`)
- **Timeouts**: 30 second command timeout

### 2. WebSocket Server (`server/websocket-server.js`)

- **Purpose**: Route messages between Node.js and Chrome extension
- **Port**: 9876 (localhost only for security)
- **Features**:
  - Single instance enforcement (PID file)
  - Token-based authentication for HTTP fixtures
  - Health endpoint
  - Duplicate extension registration prevention
- **Security**: 4 layers (network binding, host validation, token auth, path traversal protection)

### 3. Chrome Extension (`extension/`)

- **Service Worker**: `background.js` - Command execution, WebSocket client
- **Content Script**: `inject-console-capture.js` - Intercepts console.log in MAIN world
- **Manifest v3**: Required permissions: "management", "tabs", "scripting", "<all_urls>"
- **Auto-reconnect**: Reconnects to server on disconnect
- **Console Capture**: 3-layer architecture (MAIN world → ISOLATED world → Extension)

### 4. Test Infrastructure

- **Unit tests**: `tests/unit/` - Component isolation testing
- **Integration tests**: `tests/integration/` - Full system testing
- **Security tests**: `tests/security/` - WebSocket security, tab cleanup security
- **Chaos tests**: `tests/chaos/` - Adversarial testing
- **Known issue**: Tests require extension manually loaded (Puppeteer automation planned)

---

## Testing Strategy

### Current Test Status

- **28/106 tests passing** (73 failing due to environment setup)
- **Core functionality**: ✅ All working when extension loaded
- **WebSocket integration**: ✅ 6/6 tests passing
- **Manual testing**: ✅ All passing

### Test Categories

- **Unit tests** (`tests/unit/`): 30+ tests
  - Extension ID validation
  - Console capture logic
  - Tab cleanup
  - Health manager

- **Integration tests** (`tests/integration/`): 50+ tests
  - WebSocket communication
  - Extension reload
  - Console capture
  - Multi-feature workflows

- **Security tests** (`tests/security/`): 10+ tests
  - WebSocket security
  - Tab cleanup security
  - Client security

- **Edge cases** (`tests/integration/edge-cases-*.test.js`):
  - Memory limits
  - Concurrency
  - Special data types
  - Stress testing

### Test Dependencies

⚠️ **Prerequisites**:

1. Chrome extension MUST be loaded manually
2. WebSocket server MUST be running
3. Extension MUST be connected to server

**Planned improvement**: Puppeteer automation to launch Chrome with extension

### Running Single Test

```bash
# Specific file
npx jest tests/unit/error-logger.test.js

# Specific test
npx jest -t "should validate extension ID format"

# With verbose output
npx jest tests/integration/complete-system.test.js --verbose
```

---

## Security Considerations

### Authentication Method

- **Token-based auth** for HTTP fixture serving
- Token generated on server start, stored in `.auth-token`
- Token passed via query parameter: `?token=<uuid>`
- Token auto-deleted on server shutdown
- **See**: `docs/decisions/001-test-infrastructure-authentication.md`

### Network Security

- **Localhost-only binding** (`127.0.0.1`)
- No remote access possible
- HTTP is secure for localhost (no network exposure)
- **See**: `docs/decisions/002-http-vs-https-for-localhost.md`

### Input Validation

- **Extension ID**: Validated against `/^[a-p]{32}$/` regex
- **URL validation**: Full URL parsing before opening
- **Tab ID validation**: Must be positive integer
- **Duration limits**: 1-60000ms for console capture

### Defense-in-Depth (4 Layers)

1. **Network binding** - Prevents remote access
2. **Host header validation** - Prevents DNS rebinding
3. **Token authentication** - Prevents cross-localhost attacks
4. **Path traversal protection** - Prevents directory traversal

**Complete security docs**: `docs/SECURITY.md`

---

## Performance & Constraints

### Memory Management

- **Max logs per capture**: 10,000 logs (prevents memory exhaustion)
- **Capture cleanup**: 60-second interval
- **Max capture age**: 5 minutes after completion
- **Index optimization**: O(1) tab lookup using Map<tabId, Set<commandId>>

### Timeouts

- **Command timeout**: 30 seconds
- **Console capture**: 1-60 seconds (configurable)
- **Server start delay**: 1 second wait for server ready

### Concurrency

- **Single extension connection**: One extension connects at a time
- **Multiple commands**: Handled via command ID tracking
- **Race condition prevention**: Command-specific capture state

### Known Limitations

- Cannot reload Chrome Dev Assist itself (prevent self-destruction)
- One extension connection per server instance
- Tests require manual extension loading
- file:// URL mode requires "Allow access to file URLs" permission

---

## Common Development Tasks

### Adding New API Function

1. **Add function to** `claude-code/index.js`:

```javascript
async function newFunction(param) {
  // Validation
  const command = { id: generateCommandId(), type: 'newType', params: { param } };
  return await sendCommand(command);
}
```

2. **Add handler in** `extension/background.js`:

```javascript
case 'newType':
  const result = await handleNewType(command.params);
  sendResponse({ result });
  break;
```

3. **Export from** `claude-code/index.js`:

```javascript
module.exports = { ..., newFunction };
```

4. **Write tests** in `tests/integration/`:

```javascript
test('newFunction should work', async () => {
  const result = await chromeDevAssist.newFunction(param);
  expect(result).toBeDefined();
});
```

### Debugging WebSocket Issues

1. **Check server running**: `lsof -i :9876`
2. **Check extension connected**: Open extension service worker console
3. **Enable debug logging**: `DEBUG=true node server/websocket-server.js`
4. **Check WebSocket messages**: Look for `[Server] Message:` logs
5. **Check command routing**: Verify command ID matches in request/response

### Fixing Test Failures

1. **"Extension not connected"**: Load extension in Chrome, verify service worker running
2. **"Command timeout"**: Check extension console for errors, increase timeout if needed
3. **"Invalid extension ID"**: Use 32-character ID from chrome://extensions
4. **"Port already in use"**: Kill old server with `pkill -f websocket-server`

---

## Documentation Index

### Essential (Start Here)

- `README.md` - Quick start and API reference
- `docs/API.md` - Complete API documentation
- `docs/QUICK_REFERENCE.md` - Quick lookup guide
- **This file** - Development guide for Claude Code

### Architecture & Design

- `docs/WEBSOCKET-PROTOCOL.md` - WebSocket message protocol
- `docs/CHROME-EXTENSION-COMMUNICATION-STANDARDS.md` - Communication patterns
- `docs/SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md` - Service worker behavior
- `ARCHITECTURE-ANALYSIS-2025-10-26.md` - Complete architecture analysis

### Security

- `docs/SECURITY.md` - Complete security architecture
- `docs/decisions/001-test-infrastructure-authentication.md` - Why token auth
- `docs/decisions/002-http-vs-https-for-localhost.md` - Why HTTP not HTTPS
- `docs/decisions/003-future-oauth2-strategy.md` - Future OAuth2 plan
- `SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md` - All 35 restrictions

### Testing & Quality

- `TESTING-GUIDE.md` - How to run tests
- `docs/TESTING-GUIDELINES-FOR-TESTERS.md` - Testing best practices
- `TEST-COVERAGE-COMPLETE.md` - Coverage analysis
- `TESTS-INDEX.md` - Complete test inventory

### Audit & Verification

- `CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md` - Complete code verification (100% coverage)
- `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` - 16 phantom APIs discovered
- `COMPLETE-FUNCTIONS-LIST-2025-10-26.md` - All 98 implemented items
- `COMPLETE-RELATIONSHIP-MAP-FINAL-2025-10-26.md` - Function relationships
- `PLACEHOLDER-TESTS-INDEX-2025-10-26.md` - 24 placeholder tests to fix

### Navigation

- `QUICK-LOOKUP-GUIDE.md` - Answer questions in <30 seconds
- `KNOWLEDGE-GRAPH.md` - Document relationships
- `DOCUMENTATION-INDEX.md` - All 245+ files categorized

---

## Known Issues & Warnings

### Test Suite Status

- **7 failed, 3 passed** test suites (10 total)
- **73 failed, 28 passed, 5 skipped** tests (106 total)
- **Root cause**: 60% require extension loaded, 30% reference deprecated code, 10% test interdependencies
- **Workaround**: Manual extension loading before tests
- **Planned fix**: Puppeteer automation

### Phantom APIs (CRITICAL)

- **16 functions tested but not implemented** - See section above
- **DO NOT USE** - They will fail at runtime
- **Why**: Tests written before implementation, never completed
- **Impact**: Tests pass but functionality missing

### Placeholder Tests

- **24 tests** contain `expect(true).toBe(true)` - No actual validation
- **Files**: 9 test files affected
- **See**: `PLACEHOLDER-TESTS-INDEX-2025-10-26.md`

### Unused Modules

- **HealthManager**: Imported but not used
- **ConsoleCapture**: POC only, not integrated
- **Level4 CDP**: Implemented but not exposed via API

---

## Development Workflow

### Before Starting Work

1. **Read existing docs** relevant to your task (see Documentation Index)
2. **Check** `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` to avoid phantom functions
3. **Load extension** in Chrome if running tests
4. **Start server** with `node server/websocket-server.js`

### Feature Development

1. **Write tests first** (TDD approach)
2. **Verify no phantom API** - Check function exists in `claude-code/index.js` or `extension/background.js`
3. **Implement minimal change** to pass tests
4. **Run full test suite** to check for regressions
5. **Update docs** if API changes

### Bug Fixing

1. **Reproduce** with minimal test case
2. **Check audit docs** for related known issues
3. **Fix surgically** - Minimal change to resolve
4. **Verify no regressions** - Run full test suite
5. **Document** in `FIXED-LOG.md` after 24-hour cooling period

### Code Review Checklist

- [ ] Tests written and passing
- [ ] No phantom APIs used
- [ ] Extension ID validation follows `/^[a-p]{32}$/`
- [ ] WebSocket error handling present
- [ ] No hardcoded extension IDs or tokens
- [ ] Documentation updated (API.md, README.md if applicable)
- [ ] Security implications considered (4-layer defense)

---

## Emergency Procedures

### Server Won't Start

```bash
# Check port availability
lsof -i :9876

# Kill existing server
pkill -f websocket-server

# Remove stale PID file
rm .server-pid

# Restart
node server/websocket-server.js
```

### Extension Not Responding

1. Open `chrome://extensions`
2. Find "Chrome Dev Assist"
3. Click "service worker" link
4. Check console for errors
5. Click "Reload" on extension card
6. Verify "Connected to server" message

### Tests Hanging

```bash
# Kill Jest
pkill -f jest

# Kill any stuck Chrome processes
pkill -f Chrome

# Restart server
pkill -f websocket-server
node server/websocket-server.js

# Retry tests
npm test
```

### Rollback Process

```bash
# Revert to last working commit
git log --oneline  # Find last good commit
git revert <commit-hash>

# Or reset (use with caution)
git reset --hard <commit-hash>

# Reload extension manually
# chrome://extensions → Reload button
```

---

## Future Plans

### Planned Features (Not Yet Implemented)

- **Screenshots** (`captureScreenshot`) - Phantom API, needs implementation
- **Page metadata** (`getPageMetadata`) - Phantom API, needs implementation
- **Test orchestration** (startTest/endTest) - Phantom APIs, needs implementation
- **Service worker capture** - Phantom APIs, needs implementation
- **Extension enable/disable** - Phantom APIs, needs implementation

### Infrastructure Improvements

- **Puppeteer automation** - Launch Chrome with extension loaded automatically
- **Better test isolation** - Remove test interdependencies
- **Cleanup placeholder tests** - 24 tests need real assertions
- **Integrate unused modules** - HealthManager, Level4 CDP

### OAuth2 Integration (When Needed)

**Trigger**: Cloud sync, user data, external APIs
**Plan**: See `docs/decisions/003-future-oauth2-strategy.md`

- OAuth2 + PKCE
- `chrome.identity.launchWebAuthFlow()`
- Tokens in `chrome.storage.session`

---

## Remember

- **16 phantom APIs exist** - Check before using any function
- **Tests require manual setup** - Extension must be loaded
- **localhost is secure** - HTTP is fine for local development
- **4 layers of security** - Defense-in-depth architecture
- **Surgical changes only** - Minimal modifications per task
- **Test first** - TDD approach required
- **Document everything** - Update API.md and README.md

---

**COMPLETION REQUIREMENT**: Every task ends with validation checklist from `~/COMPLETION_VALIDATION_RULES.md`

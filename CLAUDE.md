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

## Chrome Dev Assist - Project Overview

**What this is**: Automated Chrome extension testing tool with WebSocket-based communication between Node.js and Chrome extensions.

**Current Status**: v1.0.0 - Core features working, 14 phantom APIs remain (was 16, Phase 1.3 implemented 2)

**Architecture**: 3-layer WebSocket system (Node.js ↔ Server ↔ Chrome Extension)

---

## ⚠️ CRITICAL: Phantom APIs (DO NOT USE)

**14 functions have tests but NO implementation** - These will fail at runtime:

- `startTest()`, `endTest()`, `abortTest()`, `getTestStatus()`
- `captureServiceWorkerLogs()`, `getServiceWorkerStatus()`, `wakeServiceWorker()`
- `enableExtension()`, `disableExtension()`, `toggleExtension()`
- `enableExternalLogging()`, `disableExternalLogging()`, `getExternalLoggingStatus()`
- `verifyCleanup()`

**✅ Implemented (Phase 1.3)**: `getPageMetadata()`, `captureScreenshot()`

**See**: [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) for complete details.

---

## Quick Start

### Setup

```bash
npm install

# Load extension manually in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → Select extension/ folder
# 4. Note the extension ID (32 characters)
```

### Running Tests

```bash
npm test                    # All tests (requires extension loaded)
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
```

### Manual Testing

```bash
node server/websocket-server.js   # Start server
node test-complete-system.js      # Run manual tests
```

**See**: [TESTING-GUIDE.md](TESTING-GUIDE.md) for complete testing documentation.

---

## Architecture

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

**Message Flow**: Node.js → Server → Extension → Server → Node.js

**See**: [docs/ARCHITECTURE-OVERVIEW.md](docs/ARCHITECTURE-OVERVIEW.md) for complete architecture details.

---

## 10 Working Functions

```javascript
// Extension management
getAllExtensions();
getExtensionInfo(extensionId);
reload(extensionId);
reloadAndCapture(extensionId, options);

// Console capture
captureLogs(duration);

// Tab operations
openUrl(url, options);
reloadTab(tabId, options);
closeTab(tabId);

// DOM inspection (Phase 1.3)
getPageMetadata(tabId);

// Screenshot (Phase 1.3)
captureScreenshot(tabId, options);
```

**See**: [docs/API.md](docs/API.md) for complete API reference.

---

## Documentation Index

**Essential**:

- [README.md](README.md) - Project overview | [TESTING-GUIDE.md](TESTING-GUIDE.md) - Testing docs
- [docs/API.md](docs/API.md) - API reference | [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) - Quick lookup

**Development**:

- [docs/DEVELOPMENT-GUIDE.md](docs/DEVELOPMENT-GUIDE.md) - Workflow, debugging, emergency procedures
- [docs/CI-CD.md](docs/CI-CD.md) - CI/CD workflows

**Architecture**:

- [docs/ARCHITECTURE-OVERVIEW.md](docs/ARCHITECTURE-OVERVIEW.md) - Complete architecture
- [docs/WEBSOCKET-PROTOCOL.md](docs/WEBSOCKET-PROTOCOL.md) - Message protocol

**Security**:

- [docs/SECURITY.md](docs/SECURITY.md) - 4-layer defense architecture
- [docs/decisions/](docs/decisions/) - Security design decisions

**Issues**:

- [TO-FIX.md](TO-FIX.md) - Active issues (19 tracked)
- [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) - Phantom APIs, limitations
- [PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md](PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md) - Detailed analysis

**Audit**:

- [CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md](CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md) - Complete verification
- [TESTS-INDEX.md](TESTS-INDEX.md) - Test inventory

---

## Known Issues

- **28/106 tests passing** (73 require manual extension loading)
- **14 phantom APIs** with tests but no implementation (see list above)
- **CI/CD Issue #3**: ShellCheck linting failures - ⏳ PENDING

**See**: [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) and [TO-FIX.md](TO-FIX.md) for complete details.

---

## Development Workflow

### Feature Development

1. Write tests first (TDD)
2. Check no phantom APIs used (see list above)
3. Implement minimal change
4. Run full test suite
5. Update docs if API changes

### Before Starting Work

1. Read relevant docs (see Documentation Index above)
2. Check `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` to avoid phantom functions
3. Load extension if running tests
4. Start server: `node server/websocket-server.js`

### Code Review Checklist

- [ ] Tests written and passing
- [ ] No phantom APIs used
- [ ] Extension ID validation follows `/^[a-p]{32}$/`
- [ ] WebSocket error handling present
- [ ] No hardcoded extension IDs or tokens
- [ ] Documentation updated
- [ ] Security implications considered

**See**: [docs/DEVELOPMENT-GUIDE.md](docs/DEVELOPMENT-GUIDE.md) for complete development workflow.

---

## Remember

- **14 phantom APIs exist** - Check before using any function (see list above)
- **Tests require manual setup** - Extension must be loaded manually
- **localhost is secure** - HTTP is fine for local development (127.0.0.1 binding)
- **4 layers of security** - Network, host validation, token auth, path protection
- **Surgical changes only** - Minimal modifications per task
- **Test first** - TDD approach required
- **Document everything** - Update docs when changing APIs

---

**COMPLETION REQUIREMENT**: Every task ends with validation checklist from `~/COMPLETION_VALIDATION_RULES.md`

**Version**: 1.0.0
**Last Updated**: 2025-10-30
**Lines**: 219 (under 250 limit ✅)

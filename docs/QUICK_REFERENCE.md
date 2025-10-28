# Quick Reference - Chrome Dev Assist

**Fast lookup for architectural decisions, security documentation, and key implementation details.**

⚠️ **CRITICAL UPDATE (2025-10-27):** 14 phantom APIs remain (was 16, Phase 1.3 implemented 2). See [Phantom APIs](#-phantom-apis-warning) section below.

---

## 🚨 Phantom APIs Warning

**⚠️ IMPORTANT:** During a comprehensive audit (8 rounds of user challenges), **14 phantom APIs** were discovered - functions that have extensive test coverage but are NOT implemented in the codebase.

**DO NOT USE these functions** - they will fail with "function not found" errors:

<details>
<parameter name="summary"><strong>Click to see all 14 phantom APIs</strong></summary>

1. startTest(testId, options)
2. endTest(testId)
3. abortTest(testId, reason)
4. getTestStatus()
5. captureServiceWorkerLogs()
6. getServiceWorkerStatus()
7. wakeServiceWorker()
8. enableExtension(extensionId)
9. disableExtension(extensionId)
10. toggleExtension(extensionId)
11. enableExternalLogging()
12. disableExternalLogging()
13. getExternalLoggingStatus()
14. verifyCleanup()

</details>

**Actually Implemented Functions (10):**

- getAllExtensions()
- getExtensionInfo(extensionId)
- reload(extensionId)
- reloadAndCapture(extensionId, options)
- captureLogs(duration)
- openUrl(url, options)
- reloadTab(tabId, options)
- closeTab(tabId)
- **getPageMetadata(tabId)** ✨ NEW (Phase 1.3)
- **captureScreenshot(tabId, options)** ✨ NEW (Phase 1.3)

**See detailed analysis:** `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md`

---

## ✨ What's New

### P1-P2 Implementation (2025-10-28)

**Security & Robustness Improvements** - Four critical enhancements to prevent DoS attacks, handle edge cases, and document race conditions.

**Quick Facts:**

- 🛡️ **1MB Metadata Limit (P1-1)** - Prevents memory exhaustion DoS attacks
- 🔄 **Circular Reference Handling (P1-2)** - Safe JSON serialization with WeakSet cycle detection
- ⚠️ **TOCTOU Documentation (P1-3)** - Race condition scenarios documented with recovery strategies
- 🔢 **Integer Validation (P2-2)** - Screenshot quality must be whole number (prevents undefined Chrome behavior)
- 🧪 **62 New Tests (P1-P2)** - Comprehensive validation, integration, and visual verification tests

**What's Protected:**

- **getPageMetadata()**: Now rejects >1MB metadata, handles circular refs, documents 3 TOCTOU races
- **captureScreenshot()**: Now rejects fractional quality values (e.g., 75.5), documents same 3 TOCTOU races

**Documentation:**

- Implementation: `extension/background.js:730-741, 790-803`, `claude-code/index.js:314-317`
- Tests: 4 new test files (screenshot-validation, edge-case-validation, p2-3-phase2, p2-3-phase3)
- Docs: `docs/API.md`, `README.md` (Security Protections), `CHANGELOG.md`

### Self-Healing Mechanism (2025-10-27)

Chrome Dev Assist extension now includes **automatic self-healing** to recover from connection failures.

**Quick Facts:**

- ⏱️ **60-second timeout** - Automatically reloads if disconnected for 60+ seconds
- 🔄 **Auto-reconnect** - Attempts reconnection every 1 second
- 🛡️ **Infinite loop protection** - Maximum 3 reload attempts
- 🎯 **Smart recovery** - Cancels reload if reconnection succeeds

**Why It Matters:**

- Extension won't get stuck in bad state
- Automatically recovers from server restarts
- No manual intervention needed

**Documentation:**

- Implementation details: `.SESSION-SUMMARY-SELF-HEALING-2025-10-27.md`
- Bug fixes: `.BUG-FIXES-PERSONA-REVIEW-2025-10-27.md`
- User guide: `README.md` (Advanced Usage section)
- API docs: `docs/API.md` (Key Features section)

### P0 Validation Bug Fixed (Phase 1.3)

**Critical bug fixed in captureScreenshot()** - API was accepting invalid inputs (NaN, Infinity, floats).

**Quick Facts:**

- 🐛 **Bug discovered by**: 5-persona code review (unanimous finding)
- ✅ **Fix verified**: 37 validation tests passing (25 for captureScreenshot, 12 for getPageMetadata)
- 🔒 **Security added**: Comprehensive warnings in README.md and API.md
- 📊 **Coverage**: 100% validation coverage (7/7 checks)

**What was fixed**:

```javascript
// BEFORE: NaN, Infinity, 123.456 incorrectly passed validation
if (typeof tabId !== 'number') throw...
if (tabId <= 0) throw...  // NaN <= 0 is FALSE (bug!)

// AFTER: Comprehensive validation (matches getPageMetadata)
✅ null/undefined check
✅ typeof check
✅ NaN check (Number.isNaN)
✅ Infinity check (Number.isFinite)
✅ Integer check (Number.isInteger)
✅ Positive check (> 0)
✅ Safe range check (< MAX_SAFE_INTEGER)
```

**Documentation:**

- Complete fix summary: `.P0-VALIDATION-BUG-FIX-2025-10-27.md`
- Multi-persona review: `.MULTI-PERSONA-REVIEW-SUMMARY-2025-10-27.md`
- Individual reviews: `.PERSONA-*-REVIEW-2025-10-27.md` (5 files)
- Test file: `tests/unit/screenshot-validation.test.js`

---

## 🔍 Finding Information Fast

### Security Questions

| Question                       | Document                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| Why HTTP instead of HTTPS?     | [ADR-002](./decisions/002-http-vs-https-for-localhost.md)        |
| How does authentication work?  | [ADR-001](./decisions/001-test-infrastructure-authentication.md) |
| Complete security architecture | [SECURITY.md](./SECURITY.md)                                     |
| Future OAuth2 implementation   | [ADR-003](./decisions/003-future-oauth2-strategy.md)             |
| Is token encrypted?            | [SECURITY.md](./SECURITY.md#why-token-in-query-parameter)        |

### Implementation Details

| What                     | File                                | Key Lines |
| ------------------------ | ----------------------------------- | --------- |
| **Token generation**     | `server/websocket-server.js`        | 33-44     |
| **Token validation**     | `server/websocket-server.js`        | 88-100    |
| **HTTP request handler** | `server/websocket-server.js`        | 70-217    |
| **Test URL helper**      | `tests/integration/test-helpers.js` | 60-76     |
| **Token cleanup**        | `server/websocket-server.js`        | 449-481   |

### Test Information

| Test Type              | File                                           | Purpose                                  |
| ---------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Edge cases**         | `tests/integration/edge-cases.test.js`         | Memory limits, concurrency, special data |
| **Dogfooding**         | `tests/integration/dogfooding.test.js`         | Extension testing itself                 |
| **Test effectiveness** | `.claude-state/test-effectiveness-analysis.md` | Which tests catch most bugs              |

---

## 📋 Architecture Decision Records (ADRs)

**Location**: `docs/decisions/`

Quick index of all decisions:

| ADR                                                          | Title              | Status      | Quick Summary                             |
| ------------------------------------------------------------ | ------------------ | ----------- | ----------------------------------------- |
| [001](./decisions/001-test-infrastructure-authentication.md) | Test Auth Strategy | ✅ Accepted | Token-based auth with 4 layers of defense |
| [002](./decisions/002-http-vs-https-for-localhost.md)        | HTTP for Localhost | ✅ Accepted | HTTP is secure for localhost testing      |
| [003](./decisions/003-future-oauth2-strategy.md)             | Future OAuth2      | 📋 Proposed | OAuth2 + PKCE when we need user auth      |

**How to use**: When making decisions, check existing ADRs first. Create new ADR if needed.

---

## 🔐 Security Layers

Our test infrastructure has **4 layers of security**:

```
┌─────────────────────────────────────────┐
│ Layer 1: Network Binding (127.0.0.1)   │ ← Prevents remote access
├─────────────────────────────────────────┤
│ Layer 2: Host Header Validation        │ ← Prevents DNS rebinding
├─────────────────────────────────────────┤
│ Layer 3: Token Authentication          │ ← Prevents cross-localhost attacks
├─────────────────────────────────────────┤
│ Layer 4: Directory Traversal Protection│ ← Prevents path traversal
└─────────────────────────────────────────┘
```

**Key Principle**: Defense-in-depth means multiple independent security controls.

**Details**: [SECURITY.md](./SECURITY.md#architecture-defense-in-depth)

---

## 🚀 Quick Start Commands

### Start Test Server

```bash
node server/websocket-server.js
```

### Run Tests

```bash
# All tests
npm test

# Edge cases only
npx jest tests/integration/edge-cases.test.js

# Dogfooding tests only
npx jest tests/integration/dogfooding.test.js

# With file:// URLs (fallback mode)
USE_FILE_URLS=true npm test
```

### Verify Authentication

```bash
# Test 1: No token (should fail with 401)
curl http://localhost:9876/fixtures/basic-test.html

# Test 2: Valid token (should succeed with 200)
TOKEN=$(cat .auth-token)
curl "http://localhost:9876/fixtures/basic-test.html?token=$TOKEN"
```

---

## 📁 File Structure

```
chrome-dev-assist/
├── server/
│   └── websocket-server.js          ← HTTP + WebSocket server with auth
├── scripts/                         ← Development & validation scripts
│   ├── validate-extension-syntax.js ← Detects Node.js-only code
│   ├── check-extension-health.js    ← Verifies extension working
│   └── pre-commit-validation.sh     ← Comprehensive validation gate
├── tests/
│   ├── fixtures/                    ← Test HTML files
│   ├── integration/                 ← Integration tests
│   └── unit/                        ← Unit tests (80 tests total)
│       ├── console-capture-class.test.js         ← 47 tests
│       ├── validate-extension-syntax.test.js     ← 19 tests
│       └── check-extension-health.test.js        ← 14 tests
├── docs/
│   ├── SECURITY.md                  ← Complete security architecture
│   ├── QUICK_REFERENCE.md           ← This file
│   ├── PREVENTING-EXTENSION-BUGS.md ← Bug prevention system
│   └── decisions/                   ← Architecture Decision Records
│       ├── README.md                ← ADR index
│       ├── 001-*.md                 ← Test infrastructure auth
│       ├── 002-*.md                 ← HTTP vs HTTPS
│       └── 003-*.md                 ← Future OAuth2 strategy
├── .auth-token                      ← Ephemeral token (git-ignored)
└── .gitignore                       ← Includes .auth-token
```

---

## 🎯 Common Tasks

### Add New Security Decision

1. Read existing ADRs: `docs/decisions/README.md`
2. Create new ADR: `docs/decisions/00X-your-decision.md`
3. Update ADR index: Add entry to `docs/decisions/README.md`
4. Link from code: Add comment in relevant files

### Update Test Helper

**File**: `tests/integration/test-helpers.js`

**When**: Changing URL generation, token handling, or environment variables

**Remember to update**:

- Both test files (`edge-cases.test.js`, `dogfooding.test.js`)
- Documentation in ADR-001

### Change Authentication Strategy

**Don't**: Modify without reviewing security docs

**Do**:

1. Read [ADR-001](./decisions/001-test-infrastructure-authentication.md)
2. Consider impact on all 4 security layers
3. Update [SECURITY.md](./SECURITY.md)
4. Create new ADR or supersede ADR-001
5. Update all references in code

---

## 🐛 Troubleshooting

### Tests Fail with "401 Unauthorized"

**Cause**: Token missing or invalid

**Fix**:

```bash
# Check token exists
cat .auth-token

# Restart server (regenerates token)
pkill -f websocket-server
node server/websocket-server.js
```

### Tests Fail with "Extension not connected"

**Cause**: Chrome extension not running

**Fix**:

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable Developer Mode
4. Ensure "Chrome Dev Assist" is loaded and enabled
5. Check extension background worker for errors

### Tests Fail with "Not Found"

**Cause**: Wrong URL or missing fixture file

**Fix**:

```bash
# List available fixtures
ls tests/fixtures/

# Check URL generation
node -e "const {getFixtureUrl} = require('./tests/integration/test-helpers'); console.log(getFixtureUrl('basic-test.html'))"

# Verify with curl
TOKEN=$(cat .auth-token)
curl "http://localhost:9876/fixtures/basic-test.html?token=$TOKEN"
```

### Want to Use file:// URLs Instead

**When**: HTTP server issues, debugging, CI/CD without server

**How**:

```bash
# Enable file:// URL mode
USE_FILE_URLS=true npm test

# Requires Chrome extension permission:
# chrome://extensions → Chrome Dev Assist → "Allow access to file URLs"
```

---

## 📚 Deep Dives

### Security Architecture

- **Start here**: [SECURITY.md](./SECURITY.md)
- **Specific questions**: [ADR-001](./decisions/001-test-infrastructure-authentication.md), [ADR-002](./decisions/002-http-vs-https-for-localhost.md)
- **Future planning**: [ADR-003](./decisions/003-future-oauth2-strategy.md)

### Test Strategy

- **Which tests to run**: [test-effectiveness-analysis.md](../.claude-state/test-effectiveness-analysis.md)
- **Test architecture**: `tests/integration/` directory
- **URL modes**: [test-helpers.js](../tests/integration/test-helpers.js) comments

### Development Workflow

1. Start server: `node server/websocket-server.js`
2. Load extension in Chrome
3. Run tests: `npm test`
4. Check logs: Console shows URL mode, test results
5. Clean up: Ctrl+C stops server (auto-deletes token)

---

## 🔮 Future Plans

### When We Need User Authentication

**Trigger**: Cloud sync, external APIs, premium features, user data

**Plan**: [ADR-003: OAuth2 + PKCE](./decisions/003-future-oauth2-strategy.md)

**Key decisions already made**:

- Use OAuth2 with PKCE (not custom auth)
- Store tokens in `chrome.storage.session`
- Keep refresh tokens server-side only
- Use `chrome.identity.launchWebAuthFlow()` for compatibility

---

## 📞 Getting Help

### For Developers

- Check this document first
- Read relevant ADR
- Search `docs/decisions/`
- Check `docs/SECURITY.md`

### For Claude

- Always read `docs/decisions/README.md` first when making architectural decisions
- Check if decision already exists in ADR index
- Create new ADR if needed (next number in sequence)
- Update index when adding ADR
- Link ADRs from code comments

### For Security Questions

- Read [SECURITY.md](./SECURITY.md) first
- Check [ADR-001](./decisions/001-test-infrastructure-authentication.md) for auth details
- Check [ADR-002](./decisions/002-http-vs-https-for-localhost.md) for HTTP rationale
- Open issue if question not answered

---

## ⚡ TL;DR

**For impatient developers:**

```bash
# Start server
node server/websocket-server.js

# Run tests (in another terminal)
npm test

# That's it! Authentication is automatic.
```

**For Claude:**

- **Decisions**: `docs/decisions/README.md`
- **Security**: `docs/SECURITY.md`
- **Why HTTP**: [ADR-002](./decisions/002-http-vs-https-for-localhost.md)
- **Why Token Auth**: [ADR-001](./decisions/001-test-infrastructure-authentication.md)

**For security auditors:**

- Read [SECURITY.md](./SECURITY.md)
- Review all ADRs in `docs/decisions/`
- Check [test-effectiveness-analysis.md](../.claude-state/test-effectiveness-analysis.md)

---

**Last Updated**: 2025-10-27 (Added self-healing mechanism documentation)

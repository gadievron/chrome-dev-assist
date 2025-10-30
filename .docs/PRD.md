# Product Requirements - Chrome Dev Assist

**Product vision and feature specifications**

**Last Updated:** 2025-10-30
**Version:** 1.0.0

---

## Vision

**Problem:** Chrome extension developers need to test extensions programmatically during development and CI/CD, but Chrome lacks an official API for automated extension testing.

**Solution:** Chrome Dev Assist provides a Node.js API to programmatically reload extensions and capture console logs via WebSocket communication.

**Target Users:**

- Chrome extension developers
- QA/Test automation engineers
- CI/CD pipeline authors

---

## Core Features

### Feature 1: Extension Reload

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P0 (Critical)

**Requirements:**

- REQ-001: Reload any Chrome extension by ID
- REQ-002: Validate extension ID format (32 chars, a-p only)
- REQ-003: Return reload success/failure status
- REQ-004: Include extension name in response

**Implementation:**

- API: `reload(extensionId)`
- Files: `claude-code/index.js:45-78`, `extension/background.js:300-340`
- Tests: `tests/unit/extension-discovery-validation.test.js` (63 tests, 100% coverage)

**Dependencies:** chrome.management API

---

### Feature 2: Console Log Capture

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P0 (Critical)

**Requirements:**

- REQ-005: Capture console logs from all tabs
- REQ-006: Support configurable duration (1-60 seconds)
- REQ-007: Capture all log levels (log, warn, error, info, debug)
- REQ-008: Include timestamp, source, URL, tabId, frameId

**Implementation:**

- API: `captureLogs(duration)`, `reloadAndCapture(extensionId, options)`
- Files: `claude-code/index.js:115-180`, `extension/inject-console-capture.js`, `extension/background.js:750-820`
- Tests: `tests/integration/complete-system.test.js` (55 tests), `tests/integration/edge-cases-complete.test.js` (30 tests)

**Architecture:** 3-layer capture (MAIN world → ISOLATED world → Extension)

**Dependencies:** chrome.scripting API, chrome.tabs API

---

### Feature 3: Extension Management

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P1 (High)

**Requirements:**

- REQ-009: List all installed extensions
- REQ-010: Get extension details by ID
- REQ-011: Enable/disable extensions (future)
- REQ-012: Toggle extension state (future)

**Implementation:**

- API: `getAllExtensions()`, `getExtensionInfo(extensionId)`
- Files: `claude-code/index.js:180-225`
- Tests: `tests/api/index.test.js` (8 tests)

---

### Feature 4: Tab Management

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P1 (High)

**Requirements:**

- REQ-013: Open URL in new tab
- REQ-014: Reload tab by ID
- REQ-015: Close tab by ID
- REQ-016: Auto-track tabs during tests

**Implementation:**

- API: `openUrl(url, opts)`, `reloadTab(tabId, opts)`, `closeTab(tabId)`
- Files: `claude-code/index.js:225-280`
- Tests: `tests/unit/tab-cleanup.test.js` (20 tests)

---

### Feature 5: Page Metadata Extraction (Phase 1.3)

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P1 (High)

**Requirements:**

- REQ-017: Extract data-\* attributes
- REQ-018: Extract window.testMetadata
- REQ-019: 1MB size limit (DoS prevention)
- REQ-020: Circular reference handling

**Implementation:**

- API: `getPageMetadata(tabId)`
- Files: `claude-code/index.js:213-256`, `extension/background.js:656-712`
- Tests: `tests/unit/page-metadata.test.js` (18 tests including P1-1 size limit)

**Security:** P1-1 DoS protection, P1-2 circular reference safe serialization

---

### Feature 6: Screenshot Capture (Phase 1.3)

**Status:** ✅ Implemented (v1.0.0)
**Priority:** P1 (High)

**Requirements:**

- REQ-021: Capture PNG/JPEG screenshots
- REQ-022: Configurable quality (0-100)
- REQ-023: Integer validation for quality (P2-2)
- REQ-024: Tab ID validation (NaN, Infinity, float rejection)

**Implementation:**

- API: `captureScreenshot(tabId, {format, quality})`
- Files: `claude-code/index.js:280-340`, `extension/background.js:820-890`
- Tests: `tests/unit/screenshot-validation.test.js` (25 tests), `tests/integration/p2-3-phase3-visual.test.js` (10 tests)

**Security:** P2-2 prevents undefined Chrome API behavior with fractional quality values

---

## Feature Status Matrix

| Feature              | Status     | Priority | Tests | Coverage | Version |
| -------------------- | ---------- | -------- | ----- | -------- | ------- |
| Extension Reload     | ✅ Done    | P0       | 63    | 100%     | v1.0.0  |
| Console Capture      | ✅ Done    | P0       | 85+   | 100%     | v1.0.0  |
| Extension Management | ✅ Done    | P1       | 8     | 100%     | v1.0.0  |
| Tab Management       | ✅ Done    | P1       | 38    | 100%     | v1.0.0  |
| Page Metadata        | ✅ Done    | P1       | 22    | 100%     | v1.0.0  |
| Screenshot Capture   | ✅ Done    | P1       | 41    | 100%     | v1.0.0  |
| Test Orchestration   | 🚧 Partial | P2       | 26    | 100%     | -       |
| Service Worker API   | ✅ Done    | P1       | 28    | 100%     | v1.2.0  |

**Legend:**

- ✅ Done: Implemented and tested
- 🚧 Partial: Some functions implemented
- ⏳ Planned: Defined but not started
- ❌ Blocked: Blocked by dependencies

---

## Future Features (Phase 2+)

### Network Interception

**Status:** ⏳ Planned
**Priority:** P2 (Medium)
**Requirements:**

- Intercept HTTP requests/responses
- Modify request headers
- Mock API responses

### Element Interaction

**Status:** ⏳ Planned
**Priority:** P2 (Medium)
**Requirements:**

- Click elements
- Fill forms
- Trigger events

### Visual Regression Testing

**Status:** ⏳ Planned
**Priority:** P3 (Low)
**Requirements:**

- Screenshot diff comparison
- OCR text extraction
- Visual assertions

---

## Non-Functional Requirements

### Performance

- Command execution: <500ms (excluding Chrome API delays)
- Console capture overhead: <5% CPU
- Memory limit: 10,000 logs max per capture

### Security

- Localhost binding only (127.0.0.1)
- Token-based authentication for fixtures
- Input validation (extension ID, tab ID, duration)
- DoS prevention (1MB metadata limit, 10K log limit)

### Reliability

- Auto-reconnect on disconnect
- Self-healing (60s timeout → auto-reload)
- Max 3 self-heal attempts

### Compatibility

- Chrome 88+ (Manifest V3)
- Node.js 14+
- Cross-platform (macOS, Windows, Linux)

---

## Success Metrics

**v1.0.0 Goals:**

- ✅ 10 core API functions working
- ✅ 85%+ test coverage
- ✅ CI/CD integration possible
- ✅ <1s command execution (average)

**Future Goals:**

- 95%+ test coverage
- <300ms command execution
- Puppeteer integration for automated Chrome launch

---

## Migration from Existing Documentation

**Content migrated from:**

- `../README.md` - Feature list
- `../docs/KNOWN-ISSUES.md` - Known limitations
- `../docs/API.md` - API contracts
- `../PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` - Unimplemented features

---

**Last Updated:** 2025-10-30
**Maintained By:** Chrome Dev Assist Team

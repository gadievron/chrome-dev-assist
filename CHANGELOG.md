# Changelog

All notable changes to Chrome Dev Assist will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added - P1-P2 Implementation (2025-10-28)

**P1-1: DoS Protection - 1MB Metadata Size Limit**

- Added 1MB size limit for `getPageMetadata()` to prevent memory exhaustion attacks
- UTF-8 byte counting with `TextEncoder` for accurate size measurement
- Clear error messages showing actual size vs limit (e.g., "1025KB exceeds 1MB limit")
- Implementation: `extension/background.js:790-803`
- Tests: `tests/unit/page-metadata.test.js` (18 tests, including P1-1 boundary tests)

**P1-2: Circular Reference Handling**

- Added `safeStringify()` function with WeakSet-based cycle detection
- O(1) circular reference detection (vs O(n²) with Array-based seen list)
- Replaces circular references with `[Circular]` string marker
- Handles nested objects, arrays, and complex object graphs safely
- Implementation: `extension/background.js:730-741`
- Tests: `tests/integration/p1-2-metadata-edge-cases.test.js` (4 tests)

**P1-3: Race Condition Documentation (TOCTOU)**

- Documented 3 race scenarios for `getPageMetadata()` and `captureScreenshot()`:
  1. **Tab closure race:** Tab closes between API call and execution
  2. **Tab navigation race:** Tab navigates to different URL during execution
  3. **Extension reload race:** Extension reloads during command execution
- Added client recovery strategies with code examples
- Implementation: Comprehensive comments in `extension/background.js:689-718, 826-853`
- Documentation: `docs/API.md` sections for both APIs, `README.md` Security Protections section

**P2-2: Screenshot Quality Integer Validation**

- Added integer validation for `captureScreenshot()` quality parameter
- Prevents undefined Chrome API behavior with fractional quality values (e.g., 75.5)
- Handles JavaScript edge cases: 75.0 → 75 (accepted), 75.5 → rejected
- Only validates user input (not default value of 90)
- Implementation: `claude-code/index.js:314-317`
- Tests: `tests/unit/screenshot-validation.test.js` (21 tests, 3 new P2-2 tests)

**P2-3: Comprehensive Screenshot Testing (41 Tests)**

- **Phase 1 - Unit Tests (18 tests):** `tests/unit/edge-case-validation.test.js`
  - Quality boundaries (0, 1, 99, 100)
  - Format case sensitivity ("PNG", "JPEG", "jpeg")
  - Edge cases (MAX_SAFE_INTEGER, String('123'), Boolean(true))
- **Phase 2 - Integration Tests (13 tests):** `tests/integration/p2-3-phase2-restrictions.test.js`
  - Chrome extension restriction validation
  - Concurrency testing (multiple screenshots)
  - Race condition scenarios
  - Fixtures: `iframe-test.html`, `canvas-test.html`
- **Phase 3 - Visual Verification (10 tests):** `tests/integration/p2-3-phase3-visual.test.js`
  - PNG/JPEG signature verification
  - Visual quality comparison
  - Format-specific validation
  - Fixture: `text-content-test.html`

### Changed

- **docs/API.md** - Updated with P1-P2 features, race condition documentation, test coverage counts
- **TESTS-INDEX.md** - Added 4 new test files, updated statistics (44 test files, 37 fixtures)
- **README.md** - Added P1-P2 features to Features section, added Security Protections subsection

### Fixed

- **P2-2:** Prevents fractional quality values (e.g., 75.5) from causing undefined Chrome API behavior
- **P1-1:** Prevents DoS attacks via oversized metadata objects (>1MB)
- **P1-2:** Prevents infinite loops from circular references in page metadata

### Security

- **1MB Metadata Size Limit (P1-1)** - Prevents memory exhaustion DoS attacks
- **Circular Reference Detection (P1-2)** - Safe JSON serialization prevents infinite loops
- **TOCTOU Documentation (P1-3)** - Comprehensive race condition documentation with client recovery strategies
- **Integer Validation (P2-2)** - Prevents undefined Chrome API behavior

---

## [1.0.0] - 2025-10-27

### Added

- **Self-Healing Mechanism** - Automatic extension reload after 60s of persistent connection loss
  - Multi-persona review (11 personas: 8 standard + 3 Claude Code experts)
  - Comprehensive safety validation
  - Maximum 3 reload attempts
  - See `.BUG-FIXES-PERSONA-REVIEW-2025-10-27.md` for details

### Fixed

- **Critical require() bug** - Fixed CommonJS require() being called in Chrome extension context
- **Build prevention system** - ESLint pre-commit hooks to prevent similar bugs

---

## Initial Release

### Added

- Core API: `reload()`, `reloadAndCapture()`, `captureLogs()`
- Extension management: `getAllExtensions()`, `getExtensionInfo()`
- Tab operations: `openUrl()`, `reloadTab()`, `closeTab()`
- DOM inspection: `getPageMetadata()`, `captureScreenshot()`
- WebSocket-based 3-layer architecture (Node.js ↔ Server ↔ Chrome Extension)
- Auto-start server (no manual management required)
- Auto-reconnect on disconnection
- Extension ID validation with clear error messages
- Token-based authentication for test fixtures
- Comprehensive test suite (40 test files, 30 fixtures at initial release)

---

[Unreleased]: https://github.com/yourusername/chrome-dev-assist/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/chrome-dev-assist/releases/tag/v1.0.0

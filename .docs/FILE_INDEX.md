# File Index - Chrome Dev Assist

**Complete file inventory with descriptions**

**Last Updated:** 2025-10-30
**Total Files:** 211 files
**Total Lines of Code:** ~15,000

---

## Production Code (11 files)

### Node.js API Layer

- `claude-code/index.js` - Main API (340 lines, 10 public functions)
- `claude-code/level4-reload-cdp.js` - CDP-based reload (198 lines, not integrated)

### WebSocket Server

- `server/websocket-server.js` - WebSocket + HTTP server (450 lines)
- `server/validation.js` - Input validation (150 lines)

### Chrome Extension

- `extension/manifest.json` - Manifest V3 config (50 lines)
- `extension/background.js` - Service worker (890 lines)
- `extension/inject-console-capture.js` - Console capture script (180 lines)
- `extension/content-script.js` - Content script coordinator (120 lines)

### Extension Modules

- `extension/modules/ConsoleCapture.js` - POC class (251 lines, not used)
- `src/health/health-manager.js` - Health monitoring (292 lines)

### Utilities

- `src/utils/error-logger.js` - Error logging (80 lines)

**Total Production Code:** ~3,001 lines

---

## Test Files (70 files, 1,276 tests)

### Unit Tests (tests/unit/)

- 30 test files
- ~400 tests
- Focus: Component isolation

### Integration Tests (tests/integration/)

- 25 test files
- ~500 tests
- Focus: Feature workflows

### Security Tests (tests/security/)

- 2 test files
- ~20 tests
- Focus: Security validation

### Performance Tests (tests/performance/)

- 1 test file
- ~5 tests

### Other Test Directories

- tests/api/, tests/boundary/, tests/chaos/, tests/meta/

**Total Test Code:** ~8,000 lines

---

## Documentation (245+ files)

**Structured Docs (.docs/)**

- 13 core files (~5,945 lines)

**Essential Guides (docs/)**

- API.md, ARCHITECTURE-OVERVIEW.md, DEVELOPMENT-GUIDE.md, QUICK_REFERENCE.md
- SECURITY.md, TESTING-GUIDELINES-FOR-TESTERS.md
- KNOWN-ISSUES.md, PREVENTING-EXTENSION-BUGS.md
- ~2,500 lines

**Audit & Analysis (root)**

- 50+ analysis documents (~25,000 lines)
- CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md
- PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md
- COMPLETE-FUNCTIONS-LIST-2025-10-26.md
- And many more...

**Total Documentation:** ~33,000 lines

---

## Configuration Files

- `package.json` - Dependencies and scripts
- `package-lock.json` - Dependency lock file
- `.gitignore` - Git exclusions
- `.eslintrc.json` - ESLint config
- `.prettierrc` - Prettier config
- `.yamllint.yml` - YAML linting config
- `.markdownlintignore` - Markdown linting exclusions

---

## CI/CD (.github/workflows/)

- `critical-checks.yml` - Linting, security, token budget
- `test-coverage.yml` - Test execution
- `codeql.yml` - Security analysis
- `lint.yml` - Code linting

---

## Scripts (scripts/)

- `validate-extension-syntax.js` - Extension syntax validation
- `check-extension-health.js` - Extension health check
- `pre-commit-validation.sh` - Pre-commit hooks
- `cleanup-test-session.sh` - Test cleanup
- `launch-chrome-with-extension.sh` - Chrome launcher

---

## Fixtures (tests/fixtures/)

24 HTML test fixtures for integration tests

---

## Migration Reference

**Content should be migrated from:**

- `../COMPLETE-AUDIT-118-FILES-2025-10-26.md` - Complete file inventory
- `../CODE-TO-FUNCTIONALITY-AUDIT-2025-10-26.md` - Code verification

---

**Maintained By:** Chrome Dev Assist Team

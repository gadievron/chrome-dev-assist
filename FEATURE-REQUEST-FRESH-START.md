# Feature Request: Fresh Start (Level 0 Reload)

**ID:** CHROME-FEAT-20251026-001
**Date:** 2025-10-26
**Status:** Feature Request
**Priority:** Low
**Complexity:** Medium

---

## Problem Statement

When all other reload methods fail or when you need a completely clean slate:
- Chrome instance is broken/crashed
- Extension ID has changed (loaded from different path)
- Need to test fresh installation behavior
- CI/CD pipelines need automated fresh start
- Want to discover extension ID programmatically after loading

**Current workaround:** Manual steps (launch Chrome, load unpacked, note ID)

---

## Proposed Solution

Add `freshStart()` method that:
1. Launches new Chrome instance with debugging enabled
2. Loads extension from directory via CDP
3. Auto-discovers extension ID using one of three methods:
   - Reads `key` field from manifest.json (if present)
   - Queries `chrome.management.getAll()` and finds by name/version
   - Scans Chrome Extensions directory for matching manifest
4. Returns extension ID and Chrome instance handle
5. Allows cleanup when done

---

## API Design

```javascript
const chromeDevAssist = require('./claude-code/index.js');

// Launch Chrome and load extension
const result = await chromeDevAssist.freshStart({
  extensionPath: './extension',
  chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',  // Optional
  debugPort: 9222,  // Optional
  userDataDir: '/tmp/chrome-test',  // Optional (default: temp)
  headless: false  // Optional
});

console.log('Extension ID:', result.extensionId);
// → gnojocphflllgichkehjhkojkihcihfn

// Use extension...
await chromeDevAssist.connect(result.extensionId);

// Clean up
await chromeDevAssist.closeChromeInstance(result.chromeInstance);
```

**Return value:**
```javascript
{
  extensionId: string,           // Auto-discovered ID
  chromeInstance: ChromeProcess, // For process management
  debugUrl: string,              // CDP debug URL
  discoveryMethod: string        // How ID was found ('manifest-key', 'management-api', 'filesystem')
}
```

---

## Extension ID Discovery Methods

### Method 1: Fixed Key in manifest.json (RECOMMENDED)

**Add to extension/manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "Chrome Dev Assist",
  "version": "1.0.0",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Benefits:**
- Extension ID is always the same: `gnojocphflllgichkehjhkojkihcihfn`
- No discovery needed
- Works across all Chrome instances
- Recommended by Chrome for published extensions

**How to generate:**
```bash
# Chrome generates .pem file when you package extension
# Use chrome.runtime.id from a packaged version
# Or generate via openssl:
openssl genrsa 2048 | openssl rsa -pubout -outform DER | openssl base64 -A
```

### Method 2: chrome.management.getAll() via CDP

```javascript
// Connect to Chrome via CDP
const CDP = require('chrome-remote-interface');
const client = await CDP({ port: 9222 });

// Get all extensions
const { extensions } = await client.Management.getAll();

// Find by name and version
const target = extensions.find(ext =>
  ext.name === 'Chrome Dev Assist' &&
  ext.version === '1.0.0' &&
  ext.type === 'extension'
);

const extensionId = target.id;
```

**Benefits:**
- Works without manifest key
- Most reliable fallback
- Chrome's official API

**Drawbacks:**
- Requires CDP connection
- Requires extension to be loaded first

### Method 3: Filesystem Scan

```javascript
const fs = require('fs');
const path = require('path');

// Chrome extensions directory
const extensionsDir = path.join(
  os.homedir(),
  'Library/Application Support/Google/Chrome/Default/Extensions'
);

// Scan each extension directory
for (const id of fs.readdirSync(extensionsDir)) {
  const manifestPath = path.join(extensionsDir, id, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    if (manifest.name === 'Chrome Dev Assist') {
      return id;
    }
  }
}
```

**Benefits:**
- Works without running Chrome
- Fast

**Drawbacks:**
- OS-specific paths
- Fragile (Chrome can change directory structure)
- May find wrong version if multiple installed

---

## Implementation Plan

### Phase 1: Basic Chrome Launch + CDP (1-2 hours)
```javascript
// src/chrome-launcher.js
async function launchChrome(options) {
  const { chromePath, debugPort, userDataDir } = options;

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    `--load-extension=${options.extensionPath}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  // Wait for CDP ready
  await waitForDebugger(debugPort);

  return chrome;
}
```

### Phase 2: Extension ID Discovery (2-3 hours)
```javascript
// src/extension-id-discovery.js
async function discoverExtensionId(options) {
  // Method 1: Check manifest.json for key field
  const manifestPath = path.join(options.extensionPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));

  if (manifest.key) {
    return {
      extensionId: calculateIdFromKey(manifest.key),
      method: 'manifest-key'
    };
  }

  // Method 2: Query via CDP
  const CDP = require('chrome-remote-interface');
  const client = await CDP({ port: options.debugPort });
  const { extensions } = await client.Management.getAll();

  const target = extensions.find(ext =>
    ext.name === manifest.name &&
    ext.version === manifest.version
  );

  if (target) {
    return {
      extensionId: target.id,
      method: 'management-api'
    };
  }

  // Method 3: Filesystem scan (fallback)
  return {
    extensionId: await scanExtensionsDirectory(manifest.name),
    method: 'filesystem'
  };
}
```

### Phase 3: API Integration (1 hour)
```javascript
// claude-code/index.js
async function freshStart(options) {
  const chrome = await launchChrome(options);
  const { extensionId, method } = await discoverExtensionId(options);

  return {
    extensionId,
    chromeInstance: chrome,
    debugUrl: `http://localhost:${options.debugPort}`,
    discoveryMethod: method
  };
}

module.exports = {
  freshStart,
  closeChromeInstance: async (chrome) => {
    chrome.kill('SIGTERM');
    await waitForExit(chrome);
  }
};
```

### Phase 4: Tests (2-3 hours)
- Unit tests for ID discovery methods
- Integration tests for Chrome launch
- End-to-end tests with real extension

**Total estimate:** 6-9 hours

---

## Use Cases

### Use Case 1: CI/CD Pipeline
```javascript
// .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - name: Test extension
      run: |
        node test-fresh-start.js

// test-fresh-start.js
const { freshStart } = require('./claude-code');

const { extensionId } = await freshStart({
  extensionPath: './extension',
  headless: true
});

// Run tests...
await runTests(extensionId);
```

### Use Case 2: Chrome Recovery
```javascript
// Extension broke, need fresh start
const { extensionId } = await chromeDevAssist.freshStart({
  extensionPath: './extension',
  userDataDir: '/tmp/recovery-profile'  // Fresh profile
});

console.log('Extension loaded with new ID:', extensionId);
```

### Use Case 3: Automated Testing Framework
```javascript
// Setup hook
beforeAll(async () => {
  const result = await chromeDevAssist.freshStart({
    extensionPath: './extension'
  });

  global.EXTENSION_ID = result.extensionId;
  global.CHROME = result.chromeInstance;
});

afterAll(async () => {
  await chromeDevAssist.closeChromeInstance(global.CHROME);
});
```

---

## Alternatives Considered

### Alternative 1: Require Fixed Manifest Key
**Pros:** Simplest, no discovery needed
**Cons:** Requires manifest.json modification, not flexible

**Decision:** Support both (key preferred, discovery as fallback)

### Alternative 2: User Provides ID
**Pros:** No discovery logic needed
**Cons:** Defeats purpose (user doesn't know ID yet)

**Decision:** Rejected - defeats the feature goal

### Alternative 3: Store ID After First Load
**Pros:** Only discover once
**Cons:** Doesn't help with fresh starts

**Decision:** Can be added as optimization later

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Chrome launch fails | High | Low | Validate Chrome path, clear error messages |
| ID discovery fails | High | Medium | Try all 3 methods, fail with helpful error |
| Process cleanup fails | Medium | Low | Use SIGTERM → SIGKILL escalation |
| Platform differences | Medium | High | Test on macOS/Linux/Windows |
| CDP port conflicts | Low | Low | Make port configurable |

---

## Dependencies

**External:**
- `chrome-remote-interface` (CDP client)
- `chrome-launcher` (or custom Chrome launch)

**Internal:**
- Existing CDP infrastructure (from level4Reload work)
- Extension manifest.json parsing

---

## Testing Strategy

### Unit Tests
- Extension ID calculation from manifest key
- Manifest.json parsing
- Extensions directory scanning

### Integration Tests
- Chrome launch with various options
- CDP connection establishment
- Management API queries

### End-to-End Tests
- Full fresh start workflow
- ID discovery accuracy
- Process cleanup

**Test coverage target:** 80%+

---

## Documentation

**Files to update:**
- ✅ EXTENSION-RELOAD-GUIDE.md (Level 0 added)
- [ ] claude-code/README.md (API reference)
- [ ] docs/TESTING-GUIDELINES-FOR-TESTERS.md (fresh start usage)
- [ ] examples/fresh-start-example.js (working example)

---

## Acceptance Criteria

✅ **Must have:**
- [ ] Launches Chrome with extension loaded
- [ ] Discovers extension ID (at least one method works)
- [ ] Returns extension ID and Chrome instance
- [ ] Cleanup function kills Chrome cleanly
- [ ] Works on macOS (primary development platform)
- [ ] 80%+ test coverage

⚠️ **Should have:**
- [ ] All three discovery methods implemented
- [ ] Works on Linux
- [ ] Works on Windows
- [ ] Headless mode support
- [ ] Error messages guide user to fix issues

💡 **Nice to have:**
- [ ] Auto-detect Chrome path
- [ ] Multiple Chrome versions support
- [ ] Parallel instance support
- [ ] Browser profiles management

---

## Status

**Current:** Feature request (not implemented)
**Next step:** User decision (implement now or defer)
**Priority:** Low (can use fixed manifest key as workaround)
**Effort:** Medium (6-9 hours)

---

## Related Issues

- CHROME-FEAT-20251025-009: level4Reload() implementation (85% complete)
- Related to: Chrome service worker caching issues
- Related to: CI/CD testing infrastructure

---

## Decision

**User to decide:**
1. Implement now (add to current session)
2. Defer to future session (add to FEATURE-SUGGESTIONS-TBD.md)
3. Use workaround (add fixed `key` to manifest.json)

**Recommendation:** Use workaround (fixed manifest key) for now, implement fresh start later if needed.

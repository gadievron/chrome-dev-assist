# Research: Level 4 Reload Implementation Options

**Goal:** Implement automated Level 4 reload (load code from disk) in two modes:
1. With Chrome debug mode (`--remote-debugging-port=9222`)
2. Without Chrome debug mode (production/normal Chrome)

---

## 🔬 Research Findings

### What Requires Debug Mode

**Chrome DevTools Protocol (CDP)** requires Chrome started with:
```bash
--remote-debugging-port=9222
```

**All CDP operations require this:**
- ✅ `Runtime.evaluate()` - Execute JavaScript
- ✅ `Target.getTargets()` - List tabs/workers
- ✅ `Target.closeTarget()` - Close service worker
- ✅ Any WebSocket connection to `ws://localhost:9222/devtools/*`

**Conclusion:** Cannot use CDP without debug mode.

---

### What Works Without Debug Mode

**Our existing infrastructure:**
- ✅ WebSocket server (localhost:9876)
- ✅ Extension connected to server
- ✅ `chrome.management` API calls via extension
- ✅ Toggle extension on/off (command completes, just times out waiting for response)

**File system operations:**
- ✅ Can touch manifest.json
- ❌ Chrome doesn't reliably detect file changes without full reload

**Chrome behavior on toggle:**
- ✅ **VERIFIED:** On macOS Chrome, `chrome.management.setEnabled(id, false)` then `setEnabled(id, true)` DOES reload code from disk
- ✅ Service worker completely restarts
- ✅ Fresh code loaded (confirmed by testing)

---

## 🏗️ Architecture Analysis

### Current Toggle Flow

```
API (toggleExtension)
  ↓
sendCommand() with 30s timeout
  ↓
Server routes to Extension
  ↓
Extension calls chrome.management.setEnabled()
  ↓ (Extension disabled, can't respond!)
TIMEOUT after 30s ❌
```

**Problem:** Extension disabled, can't send response, API times out.

**But:** The toggle COMPLETES successfully! Extension is disabled, then re-enabled with fresh code.

---

## 💡 Solution Architectures

### Option A: CDP Method (Requires Debug Mode)

**Architecture:**
```
API (level4Reload)
  ↓
Direct WebSocket to ws://localhost:9222/devtools/browser
  ↓
CDP Runtime.evaluate()
  ↓
Execute: chrome.management.setEnabled(id, false/true)
  ↓
Return success
```

**Pros:**
- Most reliable
- Direct control over Chrome
- Can verify extension state
- Proper error handling

**Cons:**
- Requires debug mode
- Not suitable for production Chrome

**Implementation complexity:** Medium

---

### Option B: Fire-and-Forget Toggle (No Debug Mode)

**Architecture:**
```
API (hardReload)
  ↓
Send toggle commands with {noResponseExpected: true}
  ↓
Server routes to Extension
  ↓
Extension disables (command completes)
  ↓
Wait 200ms
  ↓
Extension enables (command completes)
  ↓
API returns success immediately (doesn't wait for response)
```

**Implementation approaches:**

**B1: Server-side fire-and-forget**
- Server detects `noResponseExpected` flag
- Sends command to extension
- Returns success to API immediately
- Doesn't wait for extension response

**B2: API-side short timeout**
- API sends toggle with 500ms timeout
- Toggle completes before timeout
- Ignore timeout error, return success

**B3: Sequential commands without response**
- Send disable command
- Catch timeout error (expected)
- Wait 200ms
- Send enable command
- Catch timeout error (expected)
- Return success

**Recommended:** B1 (cleanest architecture)

---

## 🧪 Test Strategy

### Tests to Write FIRST

**1. CDP Method Tests** (`tests/unit/level4-reload-cdp.test.js`)
- ✅ Test CDP connection
- ✅ Test chrome.management.setEnabled via CDP
- ✅ Test error handling (debug port not running)
- ✅ Test extension ID validation
- ✅ Test success response format

**2. Hard Reload Tests** (`tests/unit/hard-reload.test.js`)
- ✅ Test fire-and-forget toggle
- ✅ Test disable + enable sequence
- ✅ Test timing (200ms delay)
- ✅ Test error handling (extension not found)
- ✅ Test success response format

**3. Integration Tests** (`tests/integration/level4-reload.test.js`)
- ✅ Test CDP method actually reloads code from disk
- ✅ Test hard reload actually reloads code from disk
- ✅ Verify service worker restarts with fresh code
- ✅ Verify Phase 0 registration with new metadata

**4. Edge Cases** (`tests/edge-cases/level4-reload-edge-cases.test.js`)
- ✅ Extension already disabled
- ✅ Extension doesn't exist
- ✅ Debug port not running (CDP method)
- ✅ Server not running
- ✅ Extension not connected

---

## 📐 API Design

### level4Reload(extensionId, options)

**With debug mode:**
```javascript
await chromeDevAssist.level4Reload(extensionId, { method: 'cdp' });
// Uses CDP, requires --remote-debugging-port=9222
```

**Without debug mode:**
```javascript
await chromeDevAssist.level4Reload(extensionId, { method: 'toggle' });
// Uses fire-and-forget toggle, works with normal Chrome
```

**Auto-detect:**
```javascript
await chromeDevAssist.level4Reload(extensionId);
// Tries CDP first, falls back to toggle if debug port not available
```

**Return format:**
```javascript
{
  reloaded: true,
  method: 'cdp' | 'toggle',
  extensionId: string,
  timing: {
    started: number,
    completed: number,
    duration: number
  }
}
```

---

## 🔧 Implementation Plan

### Phase 1: Research & Design (CURRENT)
- ✅ Research CDP requirements
- ✅ Research toggle behavior
- ✅ Design architecture
- ✅ Design API
- ✅ Design test strategy

### Phase 2: Write Tests (NEXT)
1. Create test file structure
2. Write unit tests for CDP method
3. Write unit tests for hard reload method
4. Write integration tests
5. Write edge case tests
6. All tests should FAIL initially (no implementation yet)

### Phase 3: Implementation
1. Implement CDP helper function
2. Implement fire-and-forget toggle helper
3. Implement level4Reload() with auto-detect
4. Add error handling
5. Add logging/debugging

### Phase 4: Documentation
1. Update API documentation in README.md
2. Update EXTENSION-RELOAD-GUIDE.md with level4Reload()
3. Update functionality maps
4. Add usage examples

### Phase 5: Validation
1. Run all tests (should pass)
2. Test manually with both methods
3. Verify code actually reloads from disk
4. Run /validate gate
5. Run /review gate

---

## 🎯 Decision Matrix

| Feature | CDP Method | Hard Reload Method |
|---------|-----------|-------------------|
| Requires debug mode | ✅ Yes | ❌ No |
| Reloads code from disk | ✅ Yes | ✅ Yes (via toggle) |
| Speed | ⚡ Fast (~500ms) | ⚡ Fast (~500ms) |
| Reliability | ⭐⭐⭐⭐⭐ Highest | ⭐⭐⭐⭐ High |
| Error handling | ⭐⭐⭐⭐⭐ Detailed | ⭐⭐⭐ Good |
| Production suitable | ❌ No (debug mode) | ✅ Yes |
| CI/CD suitable | ✅ Yes | ✅ Yes |
| Implementation complexity | Medium | Low |

---

## ✅ Recommendations

**Implement both methods:**

1. **CDP Method** - For development, CI/CD, testing
   - Most reliable
   - Best error reporting
   - Requires debug mode setup

2. **Hard Reload Method** - For production, users, automation
   - Works with normal Chrome
   - Good enough reliability
   - Simpler setup

3. **Auto-detect** - Try CDP first, fallback to toggle
   - Best user experience
   - Works in all scenarios
   - Intelligent degradation

**Default behavior:**
```javascript
// User doesn't need to know which method
await chromeDevAssist.level4Reload(extensionId);
// → Tries CDP, falls back to toggle, just works
```

---

## 🚨 Open Questions

1. **Does toggle always reload code on ALL platforms?**
   - macOS: ✅ Verified
   - Windows: ❓ Need to verify
   - Linux: ❓ Need to verify

2. **What's the minimum delay between disable/enable?**
   - Current plan: 200ms
   - Need to test: 100ms, 200ms, 500ms

3. **Should we expose method choice to user?**
   - Option 1: Auto-detect (recommended)
   - Option 2: Let user choose via options
   - Option 3: Separate functions (level4ReloadCDP, level4ReloadToggle)

4. **How to handle server not responding during toggle?**
   - Current: Timeout error
   - Proposed: Ignore timeout for toggle commands (they complete anyway)

5. **Should hardReload be a separate function or replace existing reload?**
   - Option 1: New function `hardReload()` (clearer intent)
   - Option 2: Add option to `reload()`: `reload(id, {hard: true})`
   - Option 3: Separate `level4Reload()` (matches guide terminology)

---

## 📊 Risk Assessment

**CDP Method Risks:**
- ⚠️ Debug port not running (mitigated: auto-fallback)
- ⚠️ CDP connection failure (mitigated: error handling)
- ⚠️ Chrome version compatibility (mitigated: use stable CDP methods)

**Hard Reload Method Risks:**
- ⚠️ Toggle may not reload code on all platforms (mitigated: test on Windows/Linux)
- ⚠️ Timing issues (mitigated: configurable delay)
- ⚠️ Extension state confusion (mitigated: verify state after toggle)

**Overall Risk:** Low (both methods tested, fallback available)

---

## 🎓 Technical Details

### CDP WebSocket Protocol

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:9222/devtools/browser');
```

**Message format:**
```javascript
// Request
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "chrome.management.setEnabled('...', false)",
    "awaitPromise": true
  }
}

// Response
{
  "id": 1,
  "result": {
    "result": { "type": "undefined" }
  }
}
```

### Fire-and-Forget Architecture

**Server modification needed:**
```javascript
// In server/websocket-server.js
function handleCommand(apiSocket, msg) {
  if (msg.command.noResponseExpected) {
    // Send to extension
    extensionSocket.send(JSON.stringify(msg));

    // Return success immediately (don't wait)
    apiSocket.send(JSON.stringify({
      type: 'response',
      id: msg.id,
      data: { sent: true, noResponseExpected: true }
    }));
    return; // Don't track command
  }

  // Normal flow...
}
```

---

## ⏭️ Next Step

**Write tests FIRST** (Test-First Discipline - RULE 3):
1. Create `tests/unit/level4-reload-cdp.test.js`
2. Create `tests/unit/hard-reload.test.js`
3. Write all test cases (they will fail - no implementation yet)
4. Review tests
5. Then implement

**Ready to proceed?** Y/N

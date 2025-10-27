# Extension Reload Guide - Escalation Levels

**When to use each reload method based on what changed**

Chrome caches extension code aggressively, especially service worker code. Different types of changes require different reload strategies.

---

## 🟢 Level 1: Soft Reload (Content Scripts, HTML, CSS)

**What it does:** Launches new Chrome instance, loads extension, discovers extension ID programmatically

**When to use:**
- Complete clean slate (no Chrome state)
- Testing fresh installation
- CI/CD environments
- Chrome instance crashed or corrupted
- Need guaranteed-fresh extension ID discovery

**How it works:**
1. Launch Chrome with `--remote-debugging-port=9222`
2. Load unpacked extension from directory
3. Use `chrome.management.getAll()` via CDP to discover extension ID
4. Return ID for subsequent operations

**How to do it:**
```javascript
const chromeDevAssist = require('./claude-code/index.js');

// Launch Chrome and load extension (auto-discover ID)
const { extensionId, chromeInstance } = await chromeDevAssist.freshStart({
  extensionPath: './extension',
  chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  debugPort: 9222,
  userDataDir: '/tmp/chrome-test-profile'  // Temporary profile
});

console.log('Extension loaded with ID:', extensionId);

// Now you can use the extension
await chromeDevAssist.forceReload(); // Works with discovered ID

// Clean up when done
await chromeDevAssist.closeChromeInstance(chromeInstance);
```

**Extension ID Discovery Methods:**

### Method 1: Fixed ID via manifest.json key (RECOMMENDED)
Add a `key` field to your manifest.json to get a consistent extension ID across all installs:

```json
{
  "manifest_version": 3,
  "name": "Chrome Dev Assist",
  "version": "1.0.0",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**How to generate key:**
```bash
# Package extension first to get key
cd chrome-dev-assist
# Chrome generates .pem key on first package
# Extract public key from .pem and add to manifest.json
```

**Benefit:** Same extension ID every time (e.g., `gnojocphflllgichkehjhkojkihcihfn`)

### Method 2: Discovery via chrome.management API
If no fixed key exists, discover ID programmatically:

```javascript
// After loading extension, query all extensions
const extensions = await cdp.send('Management.getAll');

// Find by name, version, or path
const devAssist = extensions.find(ext =>
  ext.name === 'Chrome Dev Assist' &&
  ext.version === '1.0.0'
);

const extensionId = devAssist.id;
```

### Method 3: Parse Chrome Extensions Directory
Chrome stores extension IDs in user data directory:

```bash
# macOS
~/Library/Application Support/Google/Chrome/Default/Extensions/

# Linux
~/.config/google-chrome/Default/Extensions/

# Windows
%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\
```

Each subdirectory is an extension ID. Find by matching manifest.json contents.

**Speed:** 🐌 Slow (10-20 seconds - new Chrome launch)

**Pros:**
- Complete clean slate
- No cached state
- Guaranteed fresh extension load
- Works even if existing Chrome instance is broken
- Auto-discovers extension ID
- Ideal for CI/CD pipelines

**Cons:**
- Slowest method (new process startup)
- Requires Chrome binary path
- Requires CDP port (--remote-debugging-port)
- More complex setup
- Temporary user data directory cleanup needed

**What it reloads:** Content scripts, HTML files, CSS, images, web-accessible resources

**What it DOESN'T reload:** Service worker (background.js)

**When to use:**
- Changed content scripts
- Changed popup HTML/CSS
- Changed fixtures or assets
- Changed web-accessible resources

**How to do it:**
```
1. Go to chrome://extensions/
2. Find "Chrome Dev Assist"
3. Click the reload icon (circular arrow) ⟲
```

**Speed:** ⚡ Instant (< 1 second)

**Pros:**
- Fast
- No reconnection needed
- Works for most UI changes

**Cons:**
- DOES NOT reload service worker code
- Extension keeps running (no restart)

---

## 🟡 Level 2: API Reload (Soft Extension Restart)

**What it reloads:** All extension code including service worker

**What it does:** Calls `chrome.management.setEnabled()` via API

**When to use:**
- Testing reload functionality
- Automating extension restart in tests
- Soft restart without manual intervention
- Enabling/disabling extensions programmatically

**How to do it:**
```javascript
const chromeDevAssist = require('./claude-code/index.js');

// Method 1: reload() - Disable then re-enable extension
// ⚠️ IMPORTANT: Use allowSelfReload: true to reload the extension itself
await chromeDevAssist.reload(EXTENSION_ID, { allowSelfReload: true });

// Method 2: enable() - Enable a disabled extension
await chromeDevAssist.enableExtension(EXTENSION_ID);

// Method 3: disable() - Disable an extension
await chromeDevAssist.disableExtension(EXTENSION_ID);

// Method 4: toggle() - Toggle extension enabled state
await chromeDevAssist.toggleExtension(EXTENSION_ID); // OFF
await new Promise(r => setTimeout(r, 2000));         // Wait
await chromeDevAssist.toggleExtension(EXTENSION_ID); // ON
```

**WebSocket Command Options:**
```javascript
// Direct WebSocket command format (if not using index.js)
{
  type: 'command',
  id: 'unique-id',
  targetExtensionId: EXTENSION_ID,
  command: {
    type: 'reload',  // or 'enable', 'disable', 'toggle'
    params: {
      extensionId: EXTENSION_ID,
      allowSelfReload: true,  // Required for self-reload (bug fixed 2025-10-26)
      captureConsole: false,
      duration: 5000  // For capture commands
    }
  }
}
```

**Speed:** ⚡ Fast (2-4 seconds)

**Pros:**
- Can be automated
- Programmatic control
- Restarts service worker

**Cons:**
- MAY NOT reload code from disk on first use after changes
- Chrome might cache service worker code
- Can timeout if extension disabled too long (30s limit)
- Self-reload requires `allowSelfReload: true` parameter (security feature)

**Bug Fix (2025-10-26):**
- Fixed parameter bug in reload command handler (extension/background.js:655)
- Changed: `options?.allowSelfReload` → `params?.allowSelfReload`
- **Impact:** Self-reload now works correctly with `allowSelfReload: true`

---

## 🟠 Level 3: Force Reload (Service Worker Restart)

**What it reloads:** Service worker only (calls `chrome.runtime.reload()` from inside extension)

**What it does:** Extension triggers its own reload

**When to use:**
- Extension already running with updated code
- Need to restart service worker without manual steps
- Automated testing workflows

**How to do it:**
```javascript
const chromeDevAssist = require('./claude-code/index.js');

await chromeDevAssist.forceReload();
```

**Speed:** ⚡ Very fast (< 1 second)

**Pros:**
- Instant service worker restart
- Automated
- No manual intervention

**Cons:**
- Only works if extension already loaded with new code
- Cannot reload code from disk (Chrome limitation)
- First-time changes still need Level 4

**Important:** This is for *runtime* reload, not *code* reload. Use Level 4 for code changes.

---

## 🔴 Level 4: Full Remove/Reload OR level4Reload() API (REQUIRED for Service Worker Code Changes)

**What it reloads:** EVERYTHING - forces Chrome to reload all code from disk

**What it does:** Disables and re-enables extension to force disk reload

**When to use:**
- Changed service worker (background.js) code
- Changed manifest.json
- Chrome still running old cached service worker
- First deployment of new features
- "Registration failed" errors in server logs

**Why needed:** Chrome aggressively caches service worker code. Levels 1-3 reload the runtime, but Chrome may NOT load fresh code from disk until the extension is fully disabled and re-enabled.

**How to do it:**

### Method 1: API (Automated) - ⚠️ EXPERIMENTAL/DEFERRED

**Status:** 85% complete, DEFERRED to future release (requires Chrome debug mode setup)

```javascript
const chromeDevAssist = require('./claude-code/index.js');

// Auto-detect best method (tries CDP, falls back to toggle)
await chromeDevAssist.level4Reload('your-extension-id');

// Force toggle method (works without Chrome debug mode)
await chromeDevAssist.level4Reload('your-extension-id', { method: 'toggle' });

// CDP method (requires Chrome started with --remote-debugging-port=9222)
await chromeDevAssist.level4Reload('your-extension-id', { method: 'cdp' });
```

**Two API Methods:**
1. **Toggle Method** (disable→enable):
   - Sends disable→enable commands via extension API
   - Works with normal Chrome (no setup required)
   - Fire-and-forget pattern (doesn't wait for response)
   - Automatic CDP recovery if toggle fails
   - ⚠️ **Limitation:** Extension must be running to receive commands (Catch-22 if disabled)

2. **CDP Method** (Chrome DevTools Protocol):
   - Uses Chrome DevTools Protocol for external control
   - Most reliable (can control disabled extensions)
   - Best for CI/CD automation
   - ⚠️ **Requirement:** Chrome started with `--remote-debugging-port=9222`
   - See LEVEL4-RELOAD-STATUS.md for setup instructions

**Implementation Status (2025-10-25):**
- ✅ Code: 85% complete (both methods implemented)
- ✅ Tests: 60 tests written (test-first discipline)
- ✅ API exports: level4Reload() available in index.js
- ⚠️ **Blocker:** Requires Chrome debug mode for testing
- ⚠️ **Classification:** EXPERIMENTAL - marked for future release
- ⚠️ **Not production-ready:** Cannot be tested without environment setup

**See:** FEATURE-SUGGESTIONS-TBD.md (CHROME-FEAT-20251025-009) and LEVEL4-RELOAD-STATUS.md for details

### Method 2: Manual (Always Works)
```
1. Go to chrome://extensions/
2. Find "Chrome Dev Assist"
3. Click "Remove" button
4. Click "Load unpacked" button
5. Select the /extension/ directory
```

**Speed:**
- API toggle: ⚡ Fast (200-500ms)
- API CDP: ⚡ Fast (10-15s with recovery)
- Manual: 🐌 Slow (10-15 seconds)

**Pros:**
- GUARANTEED to load fresh code from disk
- Fixes all caching issues
- Only way to update service worker on first deployment
- API methods can be automated (toggle works without debug mode)

**Cons:**
- Manual process slow
- Extension gets new ID with manual remove (might break tests)
- CDP method requires Chrome debug mode setup

**When REQUIRED:**
- First time deploying new service worker code
- Seeing "Registration failed: name must be non-empty string" errors
- Level 1-3 reloads don't work
- Extension behavior doesn't match updated code

**See Also:** LEVEL4-RELOAD-STATUS.md for complete implementation details

---

## 📊 Escalation Decision Tree

```
Is Chrome completely broken or need clean slate?
├─ YES → Use Level 0 (Fresh Start) - New Chrome instance
└─ NO: Did you change background.js (service worker)?
    ├─ YES: Is this the FIRST deployment of these changes?
    │   ├─ YES → Use Level 4 (Full Remove/Reload) ⚠️ REQUIRED
    │   └─ NO (code already loaded once) → Try Level 3 (Force Reload)
    │       └─ Didn't work? → Use Level 4
    └─ NO: Did you change content scripts, HTML, or CSS?
        ├─ YES → Use Level 1 (Soft Reload)
        └─ NO: Just testing reload functionality?
            └─ Use Level 2 or 3 (API Reload or Force Reload)
```

---

## 🔍 How to Tell Which Level You Need

### Check Server Logs

**Old code still running:**
```
[Server ERROR] Registration failed: name must be non-empty string
```
→ Use Level 4 (Full Remove/Reload)

**New code running:**
```
[Server] Extension registered: Chrome Dev Assist v1.0.0
[Server] Capabilities: test-orchestration, console-capture, tab-control
```
→ Level 1-3 will work

### Check Extension Console

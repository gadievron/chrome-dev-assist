# Chrome Dev Assist - API Documentation

**Version**: 1.0.0 (ACTUAL - Verified 2025-10-27)
**Last Updated**: 2025-10-27
**Status:** ✅ ACCURATE - All documented functions exist in code

⚠️ **IMPORTANT:** This document has been updated to reflect ONLY the functions that actually exist in the code. Previous versions documented planned v1.1.0 and v1.2.0 features that were never implemented. See `PLANNED-FEATURES.md` for future roadmap.

---

## Installation

```javascript
const chromeDevAssist = require('./claude-code/index.js');
```

---

## Quick Start

```javascript
// Reload an extension
await chromeDevAssist.reload('your-extension-id-here');

// Reload + capture console logs (5 seconds)
const result = await chromeDevAssist.reloadAndCapture(
  'your-extension-id-here',
  { duration: 5000 }
);
console.log(result.consoleLogs);

// Capture logs only (no reload)
const logs = await chromeDevAssist.captureLogs(3000);
```

---

## Key Features

### Self-Healing Mechanism ✨ NEW

The Chrome Dev Assist extension includes **automatic self-healing** to recover from persistent connection failures.

**How It Works:**
- When WebSocket connection to server is lost, extension attempts to reconnect every 1 second
- If reconnection fails for **60 seconds**, extension automatically reloads itself
- On successful reconnection, self-heal timer is cancelled
- Maximum **3 reload attempts** before giving up (prevents infinite loops if server is permanently down)

**Why This Matters:**
- Extension won't get stuck in a bad state
- Automatically recovers from transient failures
- Balances false positives (temporary network issues) vs recovery time

**User-Facing Behavior:**
- **Normal operation:** No visible effect
- **Temporary server restart:** Reconnects within seconds, no reload
- **Persistent connection loss:** Extension reloads after 60s, reconnects automatically

**Logs to Monitor:**
```javascript
[ChromeDevAssist] Self-heal timer started (60s until reload)
[ChromeDevAssist] Self-heal timer cancelled (reconnection successful)
[ChromeDevAssist] Self-healing: No reconnection after 60s, reloading extension (attempt 1/3)...
```

**Configuration:**
- `SELF_HEAL_TIMEOUT_MS`: 60 seconds (validated minimum: 5 seconds)
- `MAX_SELF_HEAL_ATTEMPTS`: 3 attempts before giving up

**Implementation Details:**
- See `.BUG-FIXES-PERSONA-REVIEW-2025-10-27.md` for multi-persona review findings
- See `.SESSION-SUMMARY-SELF-HEALING-2025-10-27.md` for complete implementation documentation

---

## API Functions (8 Total)

### Extension Management (2 functions)

#### `getAllExtensions()`
Get list of all installed Chrome extensions

**Returns**: `Promise<Object>`
```javascript
{
  extensions: [
    {
      id: 'abc...',
      name: 'Extension Name',
      version: '1.0.0',
      enabled: true,
      permissions: ['tabs', 'storage']
    }
  ],
  count: 5
}
```

**Example**:
```javascript
const result = await chromeDevAssist.getAllExtensions();
console.log(`Found ${result.count} extensions`);
result.extensions.forEach(ext => {
  console.log(`- ${ext.name} v${ext.version}`);
});
```

---

#### `getExtensionInfo(extensionId)`
Get detailed information about specific extension

**Parameters**:
- `extensionId` (string, required): Chrome extension ID (32 characters)

**Returns**: `Promise<Object>`
```javascript
{
  id: 'abc...',
  name: 'Extension Name',
  version: '1.0.0',
  enabled: true,
  description: 'Extension description',
  permissions: ['tabs', 'storage'],
  hostPermissions: ['<all_urls>'],
  installType: 'development',  // 'admin', 'development', 'normal', 'sideload', 'other'
  mayDisable: true             // Whether user can disable this extension
}
```

**Example**:
```javascript
const info = await chromeDevAssist.getExtensionInfo('abcdefghijklmnopqrstuvwxyzabcdef');
console.log(`Extension: ${info.name} v${info.version}`);
console.log(`Enabled: ${info.enabled}`);
console.log(`Permissions: ${info.permissions.join(', ')}`);
```

---

### Extension Reload & Console Capture (3 functions)

#### `reload(extensionId)`
Reload extension (disable + enable)

**Parameters**:
- `extensionId` (string, required): Chrome extension ID (32 characters)

**Returns**: `Promise<Object>`
```javascript
{
  extensionId: 'abc...',
  extensionName: 'Extension Name',
  reloadSuccess: true
}
```

**Example**:
```javascript
const result = await chromeDevAssist.reload('abcdefghijklmnopqrstuvwxyzabcdef');
console.log(`Reloaded: ${result.extensionName}`);
```

---

#### `reloadAndCapture(extensionId, options)`
Reload extension AND capture console logs

**Parameters**:
- `extensionId` (string, required): Chrome extension ID
- `options` (Object, optional):
  - `duration` (number): Capture duration ms (default: 5000, max: 60000)

**Returns**: `Promise<Object>`
```javascript
{
  extensionId: 'abc...',
  extensionName: 'Extension Name',
  reloadSuccess: true,
  consoleLogs: [
    {
      level: 'log',      // 'log', 'warn', 'error', 'info', 'debug'
      message: 'Extension loaded',
      timestamp: 1234567890,  // Unix timestamp ms
      source: 'page',
      url: 'chrome-extension://abc.../background.html',
      tabId: 123,
      frameId: 0
    }
  ]
}
```

**Example**:
```javascript
const result = await chromeDevAssist.reloadAndCapture(
  'abcdefghijklmnopqrstuvwxyzabcdef',
  { duration: 3000 }
);

// Check for errors
const errors = result.consoleLogs.filter(log => log.level === 'error');
if (errors.length > 0) {
  console.error('Extension has errors:', errors);
  errors.forEach(err => {
    console.error(`  [${err.timestamp}] ${err.message}`);
  });
} else {
  console.log('✅ No errors found');
}
```

---

#### `captureLogs(duration)`
Capture console logs WITHOUT reloading

**Parameters**:
- `duration` (number, optional): Capture duration ms (default: 5000, max: 60000)

**Returns**: `Promise<Object>`
```javascript
{
  consoleLogs: [
    {
      level: 'log',
      message: 'Test message',
      timestamp: 1234567890,
      source: 'page',
      url: 'http://example.com',
      tabId: 123,
      frameId: 0
    }
  ],
  duration: 5000,
  logCount: 1
}
```

**Example**:
```javascript
const result = await chromeDevAssist.captureLogs(5000);
console.log(`Captured ${result.consoleLogs.length} logs in ${result.duration}ms`);

// Filter by level
const warnings = result.consoleLogs.filter(log => log.level === 'warn');
const errors = result.consoleLogs.filter(log => log.level === 'error');

console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
```

---

### Tab Management (3 functions)

#### `openUrl(url, options)`
Open URL in new tab

**Parameters**:
- `url` (string, required): URL to open (must be valid HTTP/HTTPS URL)
- `options` (Object, optional):
  - `active` (boolean): Focus the tab (default: true)
  - `captureConsole` (boolean): Capture console logs (default: false)
  - `duration` (number): Console capture duration ms (default: 5000)
  - `autoClose` (boolean): Auto-close tab after capture (default: false)

**Returns**: `Promise<Object>`
```javascript
{
  tabId: 123,
  url: 'http://example.com',
  consoleLogs: [],  // if captureConsole=true
  tabClosed: false  // if autoClose=true
}
```

**Example**:
```javascript
// Simple tab open
const tab = await chromeDevAssist.openUrl('http://localhost:9876/test.html');
console.log(`Tab ${tab.tabId} opened`);

// With console capture
const result = await chromeDevAssist.openUrl('http://localhost:9876/test.html', {
  captureConsole: true,
  duration: 3000
});
result.consoleLogs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
});

// With auto-close for testing
const testResult = await chromeDevAssist.openUrl('http://localhost:9876/test.html', {
  captureConsole: true,
  duration: 2000,
  autoClose: true
});
console.log(`Tab ${testResult.tabId} auto-closed: ${testResult.tabClosed}`);
```

---

#### `reloadTab(tabId, options)`
Reload a tab

**Parameters**:
- `tabId` (number, required): Tab ID to reload
- `options` (Object, optional):
  - `bypassCache` (boolean): Hard reload / Cmd+Shift+R (default: false)
  - `captureConsole` (boolean): Capture console logs (default: false)
  - `duration` (number): Console capture duration ms (default: 5000)

**Returns**: `Promise<Object>`
```javascript
{
  tabId: 123,
  consoleLogs: []  // if captureConsole=true
}
```

**Example**:
```javascript
// Simple reload
await chromeDevAssist.reloadTab(123);

// Hard reload with console capture
const result = await chromeDevAssist.reloadTab(123, {
  bypassCache: true,
  captureConsole: true,
  duration: 3000
});
console.log(`Captured ${result.consoleLogs.length} logs`);
```

---

#### `closeTab(tabId)`
Close a tab

**Parameters**:
- `tabId` (number, required): Tab ID to close

**Returns**: `Promise<Object>`
```javascript
{
  closed: true
}
```

**Example**:
```javascript
await chromeDevAssist.closeTab(123);
console.log('Tab closed');
```

---

## Extension Reload Restrictions

### Cannot Reload Chrome Dev Assist Itself

Chrome Dev Assist cannot reload itself for security reasons:

```javascript
const info = await chromeDevAssist.getExtensionInfo('your-chrome-dev-assist-id');
await chromeDevAssist.reload(info.id);
// Error: "Cannot reload self"
```

**Why:** Reloading would break the WebSocket connection and interrupt command execution.

**Workaround:** Manually reload from `chrome://extensions` page.

---

### Cannot Reload Enterprise-Locked Extensions

Extensions installed by IT administrators may be locked from reloading:

```javascript
const info = await chromeDevAssist.getExtensionInfo(extensionId);

if (!info.mayDisable) {
  console.log('⚠️  Cannot reload this extension (enterprise policy)');
  // Attempting to reload will fail with:
  // Error: "Failed to disable extension: Extension is not allowed to be disabled"
}
```

**Why:**
- Extensions with `installType: 'admin'` often have `mayDisable: false`
- Chrome enforces enterprise policies (ExtensionInstallForcelist)
- Attempting to reload will fail

**Check before reloading:**
```javascript
const info = await chromeDevAssist.getExtensionInfo(extensionId);

if (info.mayDisable === false) {
  console.log(`Cannot reload ${info.name} - locked by enterprise policy`);
} else {
  await chromeDevAssist.reload(extensionId);
}
```

**Workaround:** None - enterprise policies cannot be bypassed.

---

### getAllExtensions() Filtering

The `getAllExtensions()` function automatically filters out:

**1. Chrome Dev Assist itself:**
```javascript
const result = await chromeDevAssist.getAllExtensions();
// Will NOT include Chrome Dev Assist in the list
// (cannot reload self - see restriction above)
```

**2. Chrome Apps (type === 'app'):**
```javascript
// Only returns extensions, NOT Chrome Apps
// Chrome Apps use different APIs and cannot be managed the same way
```

**Example:**
```javascript
const result = await chromeDevAssist.getAllExtensions();
// Returns only:
// - Extensions (type === 'extension')
// - Excludes Chrome Dev Assist
// - Excludes Chrome Apps
```

---

## Complete Workflow Example

```javascript
const chromeDevAssist = require('./claude-code/index.js');

async function testExtension() {
  try {
    // 1. Get all extensions
    const extensions = await chromeDevAssist.getAllExtensions();
    console.log(`Found ${extensions.count} extensions`);

    // 2. Find your extension
    const myExt = extensions.extensions.find(ext =>
      ext.name === 'My Extension'
    );

    if (!myExt) {
      throw new Error('Extension not found');
    }

    console.log(`Testing: ${myExt.name} (${myExt.id})`);

    // 3. Reload and capture logs
    const result = await chromeDevAssist.reloadAndCapture(myExt.id, {
      duration: 5000
    });

    console.log(`Reload success: ${result.reloadSuccess}`);
    console.log(`Captured ${result.consoleLogs.length} logs`);

    // 4. Check for errors
    const errors = result.consoleLogs.filter(log => log.level === 'error');

    if (errors.length > 0) {
      console.error(`❌ Found ${errors.length} errors:`);
      errors.forEach(err => {
        console.error(`  ${err.message}`);
      });
      process.exit(1);
    } else {
      console.log('✅ No errors found');
    }

    // 5. Open test page
    const tab = await chromeDevAssist.openUrl('http://localhost:9876/test.html', {
      captureConsole: true,
      duration: 3000,
      autoClose: true
    });

    console.log(`Test page logs: ${tab.consoleLogs.length}`);

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testExtension();
```

---

## Error Handling

All API functions throw descriptive errors:

```javascript
try {
  await chromeDevAssist.reload('invalid-id');
} catch (error) {
  console.error(error.message);
  // "extensionId must be 32 characters"
}

try {
  await chromeDevAssist.openUrl('not-a-url');
} catch (error) {
  console.error(error.message);
  // "Invalid URL format"
}

try {
  await chromeDevAssist.captureLogs(-1000);
} catch (error) {
  console.error(error.message);
  // "Duration must be between 1 and 60000 ms"
}

try {
  await chromeDevAssist.closeTab('abc');
} catch (error) {
  console.error(error.message);
  // "tabId must be a positive number"
}
```

---

## Input Validation

### Extension ID Validation

**Format:** 32 lowercase letters using **a-p alphabet only** (not a-z)

```javascript
// ✅ Valid - only uses a-p:
'gnojocphflllgichkehjhkojkihcihfn'
'abcdefghijklmnopabcdefghijklmnop'

// ❌ Invalid - contains letters outside a-p range:
'abcdefghijklmnopqrstuvwxyzabcdef'  // Contains q-z
// Error: "Invalid extension ID format (must be 32 lowercase letters a-p)"

// ❌ Invalid - wrong length:
'short'  // Only 5 characters
// Error: "extensionId must be 32 characters"

// ❌ Invalid - contains numbers:
'abc123def456ghi789jkl012mno345pq'
// Error: "Invalid extension ID format (must be 32 lowercase letters a-p)"

// ❌ Invalid - uppercase:
'GNOJOCPHFLLLGICHKEHJHKOJKIHCIHFN'
// Error: "Invalid extension ID format (must be 32 lowercase letters a-p)"
```

**Why a-p only?**
- Chrome generates extension IDs from base-32 encoded public keys
- Base-32 uses a 32-character alphabet
- Chrome chose a-p (16 letters) for the alphabet instead of a-z
- Historical Chrome design decision

**Common Mistakes:**
- Using full alphabet (a-z) ❌
- Including numbers (0-9) ❌
- Wrong length (not 32 characters) ❌
- Uppercase letters ❌

**Location:** `claude-code/index.js:327-328`, `server/validation.js:34-42`

### URL Validation

**Allowed Protocols:**
```javascript
// ✅ These work:
await chromeDevAssist.openUrl('http://example.com');
await chromeDevAssist.openUrl('https://example.com');
await chromeDevAssist.openUrl('http://localhost:9876/test.html');
```

**Blocked Protocols (Security):**
```javascript
// ❌ Dangerous protocols - explicitly blocked:
await chromeDevAssist.openUrl('javascript:alert(1)');
// Error: "Dangerous URL protocol not allowed: javascript"

await chromeDevAssist.openUrl('data:text/html,<script>alert(1)</script>');
// Error: "Dangerous URL protocol not allowed: data"

await chromeDevAssist.openUrl('vbscript:msgbox');
// Error: "Dangerous URL protocol not allowed: vbscript"

await chromeDevAssist.openUrl('file:///etc/passwd');
// Error: "Dangerous URL protocol not allowed: file"
```

**Why Blocked:**
- `javascript:` - Code injection attacks
- `data:` - XSS via data URLs
- `vbscript:` - Legacy scripting attacks
- `file:` - Local file system access (security risk)

**Chrome Internal Pages:**
```javascript
// ❌ Chrome prevents extensions from opening chrome:// URLs:
await chromeDevAssist.openUrl('chrome://extensions');
await chromeDevAssist.openUrl('chrome://settings');
await chromeDevAssist.openUrl('chrome://flags');
// These will fail or be blocked by Chrome's security policy
```

**Location:** `extension/background.js:396-401`

### Tab ID Validation

**Format:** Positive integer (must be > 0)

```javascript
// ✅ Valid:
await chromeDevAssist.reloadTab(123);
await chromeDevAssist.reloadTab(456);

// ❌ Invalid - zero:
await chromeDevAssist.reloadTab(0);
// Error: "tabId must be a positive number"

// ❌ Invalid - negative:
await chromeDevAssist.reloadTab(-1);
// Error: "tabId must be a positive number"

// ❌ Invalid - string:
await chromeDevAssist.reloadTab('123');
// Error: "tabId must be a positive number"

// ❌ Invalid - null/undefined:
await chromeDevAssist.reloadTab(null);
// Error: "tabId must be a positive number"
```

**Location:** `claude-code/index.js:166-167`

---

### Duration Validation

**API Layer (User-Facing):** 1ms - 60,000ms (60 seconds)

```javascript
// ✅ Valid:
await chromeDevAssist.captureLogs(5000);   // 5 seconds
await chromeDevAssist.captureLogs(30000);  // 30 seconds
await chromeDevAssist.captureLogs(60000);  // 60 seconds (max)

// ❌ Invalid - too short:
await chromeDevAssist.captureLogs(0);
// Error: "Duration must be between 1 and 60000 ms"

// ❌ Invalid - negative:
await chromeDevAssist.captureLogs(-1000);
// Error: "Duration must be between 1 and 60000 ms"

// ❌ Invalid - too long:
await chromeDevAssist.captureLogs(120000);  // 2 minutes
// Error: "Duration must be between 1 and 60000 ms"

// ❌ Invalid - NaN:
await chromeDevAssist.captureLogs(NaN);
// Error: "Duration must be between 1 and 60000 ms"

// ❌ Invalid - Infinity:
await chromeDevAssist.captureLogs(Infinity);
// Error: "Duration must be between 1 and 60000 ms"

// ❌ Invalid - string:
await chromeDevAssist.captureLogs('5000');
// Error: "Duration must be between 1 and 60000 ms"
```

**Dual Duration Limits (Defense-in-Depth):**

1. **API Layer:** 1ms - 60,000ms (60 seconds)
   - Location: `claude-code/index.js:65-67`
   - Purpose: Recommended limit for normal usage

2. **Extension Hard Limit:** Max 600,000ms (10 minutes)
   - Location: `extension/background.js` (internal)
   - Purpose: Safety limit to prevent memory exhaustion if API layer bypassed

**Why two limits?**
- API limit encourages reasonable durations
- Extension hard limit prevents runaway captures
- Defense-in-depth architecture

---

## How It Works

WebSocket-based architecture for reliable communication:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Node.js API   │         │  WebSocket       │         │    Chrome       │
│   (Your Code)   │◄───────►│   Server         │◄───────►│   Extension     │
│                 │  :9876  │  (Auto-Start)    │  :9876  │  (Auto-Connect) │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Components:**
1. **WebSocket Server** - Auto-starts, routes messages (localhost:9876)
2. **Chrome Extension** - Auto-connects, handles commands
3. **Node.js API** - Simple interface (`reload`, `reloadAndCapture`, etc.)

**Communication Flow:**
1. Your code calls `chromeDevAssist.reload(extensionId)`
2. API sends command to WebSocket server
3. Server routes command to Chrome extension
4. Extension executes reload (disable → enable)
5. Extension sends response back to server
6. Server routes response back to API
7. API returns result to your code

---

## Auto-Start Server

Server automatically starts on first API call if not running:

```javascript
// Server not running
const result = await chromeDevAssist.reload('abc...');
// → API detects ECONNREFUSED
// → API spawns server: node server/websocket-server.js
// → API waits 1 second
// → API retries connection
// → Command succeeds
```

No manual server management required!

---

## Finding Extension IDs

1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle top right)
3. Extension ID shown below each extension (32 characters, lowercase a-p)

**Example:** `gnojocphflllgichkehjhkojkihcihfn`

---

## Permission Requirements

Chrome Dev Assist requires powerful Chrome permissions to function. Understanding these permissions helps you make informed decisions about security and privacy.

### "management" Permission

**What it allows:**
- List all installed extensions
- Get detailed extension information
- Enable/disable extensions
- Listen for extension install/uninstall events

**User sees in Chrome:**
> "Manage your apps, extensions, and themes"

**Required for:**
- `reload()` - Must disable then re-enable extension
- `getAllExtensions()` - Must query installed extensions
- `getExtensionInfo()` - Must read extension metadata

**Why necessary:**
- Cannot reload extensions without management permission
- Cannot query extension state without this permission
- Core functionality of Chrome Dev Assist

**Location:** `extension/manifest.json:permissions`

---

### "<all_urls>" Host Permission

**What it allows:**
- Inject content scripts into any website
- Run scripts in the MAIN world context
- Capture console logs from all pages
- Access page content

**User sees in Chrome:**
> "Read and change all your data on all websites"

**Required for:**
- Console log capture from any website
- Injecting console interception scripts
- Capturing logs from extension background pages

**Why necessary:**
- Console logs can only be captured by injecting scripts into pages
- Cannot pre-determine which URLs need monitoring
- Must have permission for all URLs to capture from any page

**How it's used:**
```javascript
// Content script injected at document_start
// Intercepts console.log(), console.error(), etc.
// Forwards captured logs to service worker
// No persistent access - only during capture
```

**Security note:**
- Chrome Dev Assist is **passive until you call an API function**
- Content scripts don't automatically capture - only when capture is requested
- No data is sent to external servers (localhost-only)
- Source code is available for inspection

**Location:** `extension/manifest.json:host_permissions`

---

### Why These Permissions?

**Cannot function without them:**
- Management permission: Required by Chrome API to control extensions
- Host permission: Required to inject console capture scripts

**Alternatives considered:**
- ❌ Limited URL patterns - Cannot predict which URLs user will test
- ❌ ActiveTab permission - Doesn't work for background page captures
- ❌ Manual approval per domain - Too cumbersome for development tool

**Chrome's permission system:**
- User must explicitly approve when installing extension
- Permissions are shown during installation
- Can be revoked at any time via `chrome://extensions`

**Trust model:**
- Chrome Dev Assist is a **local development tool**
- All communication stays on your machine (localhost-only)
- No telemetry, no external network requests
- Open source - code is inspectable

---

## Troubleshooting

### "Extension not connected"

**Fix:**
1. Open `chrome://extensions`
2. Verify Chrome Dev Assist is loaded and enabled
3. Click "service worker" link → check console for connection messages
4. Look for `[ChromeDevAssist] Connected to server`

---

### "Command timeout"

**Fix:**
1. Check extension loaded: `chrome://extensions`
2. Check extension console for errors
3. Reload extension manually and retry
4. Verify server running: `lsof -i :9876`

---

### "Port 9876 already in use"

**Fix:**
```bash
# Kill old server
pkill -f websocket-server

# Or find and kill specific process
lsof -i :9876
kill <PID>
```

---

### No logs captured

**Causes:**
- No browser activity during capture window
- Capture duration too short
- Logs occurred before capture started

**Fix:**
- Increase duration: `{duration: 10000}`
- Open webpages during capture
- Logs must occur DURING capture window

---

## Advanced Usage

### Debug Logging

```bash
DEBUG=true node server/websocket-server.js
```

Shows connection details, message routing, command flow.

---

### Test Multiple Extensions

```javascript
const extensions = [
  'abcdefghijklmnopqrstuvwxyzabcdef',
  'bcdefghijklmnopqrstuvwxyzabcdefa'
];

for (const extId of extensions) {
  const result = await chromeDevAssist.reloadAndCapture(extId);

  const errors = result.consoleLogs.filter(log => log.level === 'error');

  if (errors.length > 0) {
    console.error(`❌ ${result.extensionName}:`, errors.length, 'errors');
  } else {
    console.log(`✅ ${result.extensionName} - no errors`);
  }
}
```

---

### CI/CD Integration

```javascript
// test-extension.js
const chromeDevAssist = require('./claude-code/index.js');

async function testExtension() {
  const result = await chromeDevAssist.reloadAndCapture(
    process.env.EXTENSION_ID,
    { duration: 3000 }
  );

  const errors = result.consoleLogs.filter(log => log.level === 'error');

  if (errors.length > 0) {
    console.error(`Found ${errors.length} errors`);
    errors.forEach(err => console.error(err.message));
    process.exit(1);
  }

  console.log('✅ Tests passed');
}

testExtension();
```

---

## Limitations

### Console Capture Limits (Defense-in-Depth)

**10,000 Log Limit Per Capture**
- Maximum logs captured per command: 10,000 logs
- When limit reached: Warning log added, further logs dropped
- Location: `extension/background.js:728-744`
- Purpose: Prevent memory exhaustion from pages with excessive console output

**10,000 Character Message Truncation (Dual-Layer)**

Messages are truncated at TWO enforcement points:

1. **Layer 1 - Source (inject script):**
   - Location: `extension/inject-console-capture.js:36-39`
   - Truncates at: 10,000 characters
   - Purpose: Prevents memory exhaustion at source, reduces data transfer through CustomEvent bridge

2. **Layer 2 - Service Worker (backup):**
   - Location: `extension/background.js:687-691`
   - Truncates at: 10,000 characters
   - Purpose: Catches messages that bypass injection, final enforcement before storage

**Architecture:**
```
Page (MAIN world)
  ↓
[Layer 1 Truncation: 10,000 chars]
  ↓
CustomEvent bridge
  ↓
Content Script (ISOLATED world)
  ↓
chrome.runtime.sendMessage
  ↓
[Layer 2 Truncation: 10,000 chars]
  ↓
Storage
```

**Truncated messages:**
- Original: `"A".repeat(15000)` (15,000 characters)
- Captured: `"AAAA...AAA... [truncated]"` (10,000 characters + marker)

### Advanced Features

**Log Level Preservation**

All 5 console output levels are captured and preserved:
```javascript
console.log('message')   // → level: 'log'
console.warn('warning')  // → level: 'warn'
console.error('error')   // → level: 'error'
console.info('info')     // → level: 'info'
console.debug('debug')   // → level: 'debug'
```

Each log entry includes:
- `level` - Console method used
- `message` - Captured message (truncated if needed)
- `timestamp` - When log occurred
- `source` - Origin of the log
- `url` - Page URL
- `tabId` - Tab identifier
- `frameId` - Frame identifier

**Tab Isolation (Dual-Index System)**

Console logs are isolated per tab using O(1) lookups:

```javascript
// Primary index: Map<commandId, captureState>
// Secondary index: Map<tabId, Set<commandId>>
```

**Benefits:**
- Fast log routing (O(1) per log)
- No performance degradation with multiple tabs
- No cross-contamination between tabs
- Efficient memory cleanup per tab

**Example:**
- Tab A logs: Captured only for Tab A commands
- Tab B logs: Captured only for Tab B commands
- No mixing, no race conditions

### Current Capabilities (v1.0.0)

**Implemented:**
- ✅ Extension reload
- ✅ Console log capture (10K log limit, 10K char truncation)
- ✅ Tab management
- ✅ Extension info retrieval
- ✅ Log level preservation (5 levels)
- ✅ Tab isolation (dual-index)

**Not Implemented:**
- ❌ Screenshots (planned v1.3.0)
- ❌ Test orchestration (planned v1.1.0)
- ❌ Service worker control (planned v1.2.0)

### Known Limitations

**Circular Reference Handling**

Objects with circular references are NOT nicely serialized in captured console logs:

```javascript
const obj = { name: 'parent' };
obj.self = obj;  // Circular reference

console.log(obj);
// Captured as: "[object Object]" (not helpful)
// NOT captured as: { name: 'parent', self: '[Circular]' }
```

**Why:**
- Captured console logs use native `JSON.stringify()`
- Circular references cause `JSON.stringify()` to throw
- Fallback is `String(obj)` which returns `"[object Object]"`
- The codebase has `safeStringify()` function but it's only used for internal debug logs

**Workaround:**
- Use `JSON.stringify()` yourself before logging
- Or log individual properties separately
- Chrome DevTools console shows the full object (not affected by this limitation)

**Location:** `extension/inject-console-capture.js:24-29`

### System Constraints

- **Connection:** One extension connects at a time
- **Self-reload:** Cannot reload Chrome Dev Assist itself (security)
- **Capture duration:** Max 60 seconds (60,000 ms)
- **Network:** WebSocket server localhost-only (127.0.0.1)
- **Log retention:** Logs cleared after capture completes
- **Message size:** 10,000 characters max (dual-layer enforcement)
- **Circular objects:** Captured as `"[object Object]"` (see Known Limitations above)

---

## Security

**Threat Model:** Local development tool (localhost only)

### Localhost-Only Network Access

**WebSocket server binds to 127.0.0.1 (localhost) for security:**

```bash
# ✅ This works (from your local machine):
curl http://127.0.0.1:9876/health
curl http://localhost:9876/health

# ❌ This does NOT work (from another computer on your network):
# From 192.168.1.50 trying to access your machine at 192.168.1.100:
curl http://192.168.1.100:9876/health
# Connection refused - server not accessible from external IPs

# ❌ This does NOT work (from a VM trying to access host):
# From VM trying to access host:
curl http://10.0.2.2:9876/health
# Connection refused
```

**What this means:**
- Server ONLY listens on 127.0.0.1 (loopback interface)
- Traffic never leaves your machine
- Other computers on your network cannot connect
- VMs and containers cannot connect (unless using port forwarding)

**Why localhost-only?**
- **Security:** Prevents external attackers from controlling your browser
- **Threat model:** No remote network access = much smaller attack surface
- **Privacy:** All console logs stay on your machine

**Workarounds for remote access (if needed):**

```bash
# Option 1: SSH port forwarding (recommended, secure)
# On remote machine:
ssh -L 9876:localhost:9876 your-username@your-machine
# Now remote machine can access via localhost:9876

# Option 2: Change binding (NOT RECOMMENDED - security risk)
# Edit server/websocket-server.js:
# const HOST = '0.0.0.0';  // Allows external access - USE WITH CAUTION
# This exposes your browser control to your entire network
```

**Location:** `server/websocket-server.js:34`

---

### Why HTTP (Not HTTPS) for Localhost?

**WebSocket server uses HTTP, not HTTPS:**

```bash
# ✅ Works:
http://localhost:9876/health
ws://localhost:9876

# ❌ Does NOT work:
https://localhost:9876/health
wss://localhost:9876
```

**Why HTTP is used:**

1. **No security benefit on localhost:**
   - Traffic on 127.0.0.1 never leaves your computer
   - HTTPS protects data in transit over networks
   - No network transit = no benefit from encryption

2. **Industry standard:**
   - Jest uses HTTP for test servers
   - Playwright uses HTTP for test fixtures
   - Cypress uses HTTP for local development
   - webpack-dev-server uses HTTP by default

3. **Simplified setup:**
   - No SSL certificates required
   - No certificate trust warnings
   - Easier local development workflow

**Is this secure?**

✅ **YES** - for localhost:
- Loopback traffic (127.0.0.1) never reaches network interfaces
- Operating system routes it internally (kernel-level)
- Cannot be intercepted by network-level attacks (MITM, packet sniffing)
- Physical access to machine required for any compromise

**When would HTTPS be needed?**

Only if the server bound to 0.0.0.0 (all interfaces) and allowed external network access:
- Then traffic could travel over actual networks
- Then HTTPS would provide encryption in transit
- But this violates our threat model (localhost-only tool)

**Decision rationale:**

See architecture decision record: `docs/decisions/002-http-vs-https-for-localhost.md`

---

### Security Measures

- ✅ Server binds to `127.0.0.1` (no external access)
- ✅ Host header validation (rejects non-localhost requests)
- ✅ Token authentication (prevents other localhost apps from connecting)
- ✅ Extension ID validation (prevents malformed input)
- ✅ URL protocol validation (blocks javascript:, data:, file:, vbscript:)
- ✅ Input validation on all parameters
- ✅ No code injection, no eval()
- ✅ Defense-in-depth architecture (multiple validation layers)

---

## Dependencies

- `ws` - WebSocket library (v8.18.3)
- `uuid` - Unique ID generation (v13.0.0)

---

## API Version History

### v1.0.0 (2025-10-24 - CURRENT)
- ✅ Extension management functions (getAllExtensions, getExtensionInfo)
- ✅ Extension reload functions (reload, reloadAndCapture)
- ✅ Console capture (captureLogs)
- ✅ Tab management (openUrl, reloadTab, closeTab)
- ✅ WebSocket architecture
- ✅ Auto-start server
- ✅ Auto-reconnect

### Planned Future Versions (NOT YET IMPLEMENTED)
See `PLANNED-FEATURES.md` for roadmap:
- v1.1.0 - Test Orchestration API (startTest, endTest, etc.)
- v1.2.0 - Service Worker API, External Logging API
- v1.3.0 - Screenshot capture, Page metadata extraction
- v2.0.0 - Level 4 reload (load fresh code from disk)

⚠️ **CRITICAL FINDING - Phantom APIs Discovered (2025-10-26):**

During a comprehensive audit, **16 phantom APIs** were discovered - functions with extensive test coverage but NO implementation:

**The 16 Phantom APIs:**
1. startTest(testId, options)
2. endTest(testId)
3. abortTest(testId, reason)
4. getTestStatus()
5. getPageMetadata(tabId) - 60+ security test cases exist
6. captureScreenshot(tabId, options)
7. captureServiceWorkerLogs()
8. getServiceWorkerStatus()
9. wakeServiceWorker()
10. enableExtension(extensionId)
11. disableExtension(extensionId)
12. toggleExtension(extensionId)
13. enableExternalLogging()
14. disableExternalLogging()
15. getExternalLoggingStatus()
16. verifyCleanup()

**DO NOT USE** these functions - they will throw "function not found" errors.

**See detailed analysis:** `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md`

---

## Complete Implementation Status

**Implemented Functions:** 8 (documented above)
- getAllExtensions()
- getExtensionInfo(extensionId)
- reload(extensionId)
- reloadAndCapture(extensionId, options)
- captureLogs(duration)
- openUrl(url, options)
- reloadTab(tabId, options)
- closeTab(tabId)

**Total Codebase:**
- 98 implemented items (72 functions + 4 listeners + 22 constants) across 11 production files
- 16 phantom APIs (tested but not implemented)
- 24 placeholder tests (expect(true).toBe(true) pattern)
- 3 unused modules (HealthManager, ConsoleCapture, Level4 CDP)

**Audit Details:** See `COMPLETE-AUDIT-118-FILES-2025-10-26.md` for complete findings.

---

**End of API Documentation**

**Last Verified:** 2025-10-26
**Verification Method:** Direct code inspection of all 11 production files + systematic grep of all test files
**Audit Rounds:** 8 rounds of user challenges led to discovering 16 phantom APIs (initially reported as 4-5)
**Accuracy:** 100% - All 8 documented functions verified to exist in code

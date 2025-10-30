# Functions Index - Chrome Dev Assist

**Complete function registry**

**Last Updated:** 2025-10-30

---

## Public API Functions (10)

### reload(extensionId)

**Location:** `claude-code/index.js:45-78`
**Purpose:** Reload Chrome extension
**Parameters:** extensionId (string)
**Returns:** Promise<{extensionId, extensionName, reloadSuccess}>
**Tests:** tests/api/index.test.js, tests/integration/complete-system.test.js

### reloadAndCapture(extensionId, options)

**Location:** `claude-code/index.js:78-115`
**Purpose:** Reload extension + capture console logs
**Parameters:** extensionId (string), options.duration (number)
**Returns:** Promise<{extensionId, extensionName, reloadSuccess, consoleLogs}>
**Tests:** tests/integration/complete-system.test.js

### captureLogs(duration)

**Location:** `claude-code/index.js:115-180`
**Purpose:** Capture console logs without reload
**Parameters:** duration (number, 1-60000ms)
**Returns:** Promise<{consoleLogs}>
**Tests:** tests/integration/complete-system.test.js, tests/integration/edge-cases-complete.test.js

### getAllExtensions()

**Location:** `claude-code/index.js:180-200`
**Purpose:** List all installed extensions
**Returns:** Promise<Array<{id, name, version, enabled}>>

### getExtensionInfo(extensionId)

**Location:** `claude-code/index.js:200-225`
**Purpose:** Get extension details
**Parameters:** extensionId (string)
**Returns:** Promise<{id, name, version, enabled, description}>

### openUrl(url, options)

**Location:** `claude-code/index.js:225-250`
**Purpose:** Open URL in new tab
**Parameters:** url (string), options.active (boolean)
**Returns:** Promise<{tabId, url}>

### reloadTab(tabId, options)

**Location:** `claude-code/index.js:250-270`
**Purpose:** Reload tab
**Parameters:** tabId (number), options.bypassCache (boolean)
**Returns:** Promise<{tabId, success}>

### closeTab(tabId)

**Location:** `claude-code/index.js:270-290`
**Purpose:** Close tab
**Parameters:** tabId (number)
**Returns:** Promise<{tabId, success}>

### getPageMetadata(tabId)

**Location:** `claude-code/index.js:213-256`
**Purpose:** Extract page metadata
**Parameters:** tabId (number)
**Returns:** Promise<{tabId, metadata}>
**Security:** 1MB size limit, circular reference handling

### captureScreenshot(tabId, options)

**Location:** `claude-code/index.js:280-340`
**Purpose:** Capture screenshot
**Parameters:** tabId (number), options.format (string), options.quality (number)
**Returns:** Promise<{tabId, dataUrl, format, quality}>
**Validation:** Integer quality (P2-2 fix)

---

## Internal Functions (50+)

See `../COMPLETE-FUNCTIONS-LIST-2025-10-26.md` for complete list

---

## Migration Reference

**Content should be migrated from:**

- `../COMPLETE-FUNCTIONS-LIST-2025-10-26.md` - All 98 functions
- `../docs/API.md` - API documentation

---

**Maintained By:** Chrome Dev Assist Team

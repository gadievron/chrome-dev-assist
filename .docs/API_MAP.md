# API Reference - Chrome Dev Assist

**Complete API documentation with examples**

**Last Updated:** 2025-10-30
**API Version:** 1.0.0

---

## API Surface

**10 Public Functions:**

| Function                         | Purpose               | Status    |
| -------------------------------- | --------------------- | --------- |
| `reload(id)`                     | Reload extension      | ✅ Stable |
| `reloadAndCapture(id, opts)`     | Reload + capture logs | ✅ Stable |
| `captureLogs(duration)`          | Capture console logs  | ✅ Stable |
| `getAllExtensions()`             | List extensions       | ✅ Stable |
| `getExtensionInfo(id)`           | Get extension details | ✅ Stable |
| `openUrl(url, opts)`             | Open URL in tab       | ✅ Stable |
| `reloadTab(tabId, opts)`         | Reload tab            | ✅ Stable |
| `closeTab(tabId)`                | Close tab             | ✅ Stable |
| `getPageMetadata(tabId)`         | Extract page metadata | ✅ Stable |
| `captureScreenshot(tabId, opts)` | Capture screenshot    | ✅ Stable |

---

## reload(extensionId)

**Purpose:** Reload a Chrome extension

**Parameters:**

- `extensionId` (string): 32-character extension ID

**Returns:** Promise<Object>

```javascript
{
  extensionId: string,
  extensionName: string,
  reloadSuccess: boolean
}
```

**Example:**

```javascript
const chromeDevAssist = require('./claude-code/index.js');

const result = await chromeDevAssist.reload('abcdefghijklmnopqrstuvwxyzabcdef');
console.log(`Reloaded: ${result.extensionName}`);
```

**Errors:**

- Invalid extension ID format → ValidationError
- Extension not found → ExtensionNotFoundError
- Command timeout (30s) → TimeoutError

**Implementation:** `claude-code/index.js:45-78`, `extension/background.js:300-340`
**Tests:** `tests/api/index.test.js`, `tests/integration/complete-system.test.js`

---

## reloadAndCapture(extensionId, options)

**Purpose:** Reload extension AND capture console logs

**Parameters:**

- `extensionId` (string): Extension ID
- `options.duration` (number, optional): Capture duration ms (default: 5000, max: 60000)

**Returns:** Promise<Object>

```javascript
{
  extensionId: string,
  extensionName: string,
  reloadSuccess: boolean,
  consoleLogs: Array<{
    level: string,       // 'log', 'warn', 'error', 'info', 'debug'
    message: string,
    timestamp: number,   // Unix timestamp ms
    source: string,
    url: string,
    tabId: number,
    frameId: number
  }>
}
```

**Example:**

```javascript
const result = await chromeDevAssist.reloadAndCapture('abcdefghijklmnopqrstuvwxyzabcdef', {
  duration: 3000,
});

// Check for errors
const errors = result.consoleLogs.filter(log => log.level === 'error');
if (errors.length > 0) {
  console.error('Extension has errors:', errors);
}
```

**Implementation:** `claude-code/index.js:78-115`

---

## captureLogs(duration)

**Purpose:** Capture console logs WITHOUT reloading

**Parameters:**

- `duration` (number): Capture duration ms (1-60000)

**Returns:** Promise<Object>

```javascript
{
  consoleLogs: Array<{...}>  // Same format as reloadAndCapture
}
```

**Example:**

```javascript
const result = await chromeDevAssist.captureLogs(5000);
console.log(`Captured ${result.consoleLogs.length} logs`);
```

**Implementation:** `claude-code/index.js:115-180`

---

## getAllExtensions()

**Purpose:** List all installed extensions

**Parameters:** None

**Returns:** Promise<Array<Object>>

```javascript
[
  {
    id: string,
    name: string,
    version: string,
    enabled: boolean
  },
  ...
]
```

**Implementation:** `claude-code/index.js:180-200`

---

## getExtensionInfo(extensionId)

**Purpose:** Get details for specific extension

**Parameters:**

- `extensionId` (string): Extension ID

**Returns:** Promise<Object>

```javascript
{
  id: string,
  name: string,
  version: string,
  enabled: boolean,
  description: string
}
```

**Implementation:** `claude-code/index.js:200-225`

---

## openUrl(url, options)

**Purpose:** Open URL in new tab

**Parameters:**

- `url` (string): URL to open
- `options.active` (boolean, optional): Make tab active (default: false)

**Returns:** Promise<Object>

```javascript
{
  tabId: number,
  url: string
}
```

**Implementation:** `claude-code/index.js:225-250`

---

## reloadTab(tabId, options)

**Purpose:** Reload tab by ID

**Parameters:**

- `tabId` (number): Tab ID to reload
- `options.bypassCache` (boolean, optional): Hard reload (default: false)

**Returns:** Promise<Object>

```javascript
{
  tabId: number,
  success: boolean
}
```

**Implementation:** `claude-code/index.js:250-270`

---

## closeTab(tabId)

**Purpose:** Close tab by ID

**Parameters:**

- `tabId` (number): Tab ID to close

**Returns:** Promise<Object>

```javascript
{
  tabId: number,
  success: boolean
}
```

**Implementation:** `claude-code/index.js:270-290`

---

## getPageMetadata(tabId)

**Purpose:** Extract page metadata (data-\* attributes, window.testMetadata)

**Parameters:**

- `tabId` (number): Tab ID

**Returns:** Promise<Object>

```javascript
{
  tabId: number,
  metadata: Object  // Extracted data-* attributes and window.testMetadata
}
```

**Limits:**

- Max 1MB size (DoS prevention - P1-1)
- Circular references handled (P1-2)

**Example:**

```javascript
const result = await chromeDevAssist.getPageMetadata(123);
console.log(result.metadata);
```

**Implementation:** `claude-code/index.js:213-256`, `extension/background.js:656-712`

---

## captureScreenshot(tabId, options)

**Purpose:** Capture screenshot of tab

**Parameters:**

- `tabId` (number): Tab ID
- `options.format` (string, optional): 'png' | 'jpeg' (default: 'png')
- `options.quality` (number, optional): 0-100, JPEG only (default: 90)

**Returns:** Promise<Object>

```javascript
{
  tabId: number,
  dataUrl: string,  // data:image/png;base64,... or data:image/jpeg;base64,...
  format: string,
  quality: number | undefined
}
```

**Validation:**

- Tab ID: Must be positive integer, not NaN/Infinity/float
- Quality: Must be integer 0-100 (P2-2 fix)
- Format: Must be 'png' or 'jpeg'

**Example:**

```javascript
const result = await chromeDevAssist.captureScreenshot(123, {
  format: 'jpeg',
  quality: 80,
});

// Save to file
const fs = require('fs');
const base64Data = result.dataUrl.split(',')[1];
fs.writeFileSync('screenshot.jpg', base64Data, 'base64');
```

**Implementation:** `claude-code/index.js:280-340`, `extension/background.js:820-890`

---

## Error Handling

**All functions can throw:**

- `ValidationError` - Invalid parameters
- `ExtensionNotFoundError` - Extension doesn't exist
- `TimeoutError` - Command timeout (30s)
- `ConnectionError` - Extension not connected

**Example:**

```javascript
try {
  await chromeDevAssist.reload('invalid-id');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid extension ID format');
  }
}
```

---

## Migration from Existing Documentation

**Content migrated from:**

- `../docs/API.md` - Complete API reference
- `../README.md` - Quick start examples

---

**Last Updated:** 2025-10-30
**Maintained By:** Chrome Dev Assist Team

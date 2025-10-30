# Functionality Map - Chrome Dev Assist

**Features → UI → API → Functions → Database**

**Last Updated:** 2025-10-30

---

## Feature: Extension Reload

**User Story:** Developer needs to reload extension after code changes

**Flow:**

```
User Code: chromeDevAssist.reload(extensionId)
  ↓ (claude-code/index.js:45)
API: validateExtensionId()
  ↓ (claude-code/index.js:50)
WebSocket: Send command to server
  ↓ (server/websocket-server.js:150)
Extension: Receive command
  ↓ (extension/background.js:300)
Chrome API: chrome.management.setEnabled(id, false)
  ↓
Chrome API: chrome.management.setEnabled(id, true)
  ↓
Response: {extensionId, extensionName, reloadSuccess: true}
```

**Files:**

- API: `claude-code/index.js:45-78`
- Server: `server/websocket-server.js:150-180`
- Extension: `extension/background.js:300-340`

**Tests:** 63 tests (100% coverage)

---

## Feature: Console Log Capture

**User Story:** Developer needs to see extension console logs programmatically

**Flow:**

```
User Code: chromeDevAssist.captureLogs(5000)
  ↓
API: Register capture
  ↓
Extension: Inject capture script (MAIN world)
  ↓
MAIN World: Intercept console.log
  ↓
Isolated World: Receive via postMessage
  ↓
Extension: Store logs in Map
  ↓ (after duration)
Extension: Return logs array
  ↓
Response: {consoleLogs: [...]}
```

**Architecture:** 3-layer capture (MAIN → ISOLATED → Extension)

**Files:**

- API: `claude-code/index.js:115-180`
- Inject: `extension/inject-console-capture.js`
- Extension: `extension/background.js:750-820`

**Tests:** 85+ tests

---

## Migration Reference

**Content should be migrated from:**

- `../COMPLETE-FUNCTIONALITY-MAP.md` - Complete mappings

---

**Maintained By:** Chrome Dev Assist Team

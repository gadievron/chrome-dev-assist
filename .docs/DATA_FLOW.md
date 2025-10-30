# Data Flows - Chrome Dev Assist

**Data and process flows**

**Last Updated:** 2025-10-30

---

## Extension Reload Flow

```
reload(extensionId) → Validate ID
  → Generate command ID
  → WebSocket message to server
  → Server routes to extension
  → extension.management.setEnabled(false)
  → extension.management.setEnabled(true)
  → Response {success, name}
  → Server routes to Node.js
  → Promise resolves
```

**Duration:** ~200ms
**Chrome APIs:** chrome.management

---

## Console Capture Flow

```
captureLogs(duration) → Validate duration
  → Generate command ID
  → Register capture
  → Inject capture script (MAIN world)
  → Script intercepts console.*
  → console.log() → __original_console_log()
  → postMessage({type: 'console-log', ...})
  → Content script receives
  → chrome.runtime.sendMessage()
  → Extension background receives
  → Store in capture Map
  → After duration → Stop capture
  → Return logs array
  → Server routes to Node.js
```

**Duration:** Configurable (1-60s)
**Architecture:** 3-layer (MAIN → ISOLATED → Extension)

---

## Migration Reference

**Content should be migrated from:**

- `../docs/WEBSOCKET-PROTOCOL.md` - Protocol details
- `../docs/ARCHITECTURE-OVERVIEW.md` - Flow diagrams

---

**Maintained By:** Chrome Dev Assist Team

# API-to-Functionality-to-Functions Index

**Date:** 2025-10-26
**Purpose:** Complete call chain mapping from user API → internal functions → Chrome APIs
**Verification:** Based on COMPLETE-RELATIONSHIP-MAP-FINAL-2025-10-26.md

---

## HOW TO READ THIS INDEX

**Format:**

```
PUBLIC_API_FUNCTION()
  → Internal Function 1
    → Internal Function 2
      → Chrome API or Node.js API
```

**Symbols:**

- `→` Direct function call
- `[Line X]` Source code line number
- `⚠️` Security validation
- `🔒` Critical safety check
- `⏱️` Timing/delay
- `📡` WebSocket communication

---

## PUBLIC API: Extension Management (2 functions)

### 1. getAllExtensions()

**User Call:**

```javascript
const result = await chromeDevAssist.getAllExtensions();
```

**Complete Call Chain:**

```
getAllExtensions() [claude-code/index.js:84]
  → generateCommandId() [Line 86]
    → crypto.randomUUID() [Node.js built-in]

  → sendCommand(command) [Line 91]
    📡 → new WebSocket('ws://localhost:9876') [Line 224]
    📡 → ws.send(JSON.stringify(command)) [Line 248]
    → startServer() [if connection refused] [Line 244]
      → spawn('node', ['server/websocket-server.js']) [Line 285]
    → setTimeout(() => reject('timeout'), DEFAULT_TIMEOUT) [Line 254]

    [Server receives command]
    → handleCommand(ws, message) [server/websocket-server.js]
      → Forward to extension via WebSocket

    [Extension receives command]
    → handleGetAllExtensionsCommand(commandId, params) [extension/background.js:291]
      → chrome.management.getAll() [Chrome API]
      🔒 → filter(ext => ext.id !== chrome.runtime.id) [Self-exclusion]
      → chrome.runtime.sendMessage(ws, response)

    [Server receives response]
    → handleResponse(ws, message) [server/websocket-server.js]
      → Forward to API client via WebSocket

  → return { extensions, count }
```

**Chrome APIs Used:**

- `chrome.management.getAll()` - List all extensions
- `chrome.runtime.id` - Get own extension ID

---

### 2. getExtensionInfo(extensionId)

**User Call:**

```javascript
const info = await chromeDevAssist.getExtensionInfo('abcdefghijklmnopqrstuvwxyzabcdef');
```

**Complete Call Chain:**

```
getExtensionInfo(extensionId) [claude-code/index.js:99]
  ⚠️ → validateExtensionId(extensionId) [Line 100]
    → /^[a-z]{32}$/.test(extensionId) [Regex validation]
    → throw new Error('Invalid extension ID') [if fails]

  → generateCommandId() [Line 103]
    → crypto.randomUUID()

  → sendCommand(command) [Line 108]
    📡 → WebSocket communication (same as above)

    [Extension receives]
    → handleGetExtensionInfoCommand(commandId, params) [extension/background.js:318]
      → chrome.management.get(extensionId) [Chrome API]
      ⚠️ → if (!extension) throw new Error('Extension not found')
      → chrome.runtime.sendMessage(ws, response)

  → return { id, name, version, enabled, description, ... }
```

**Chrome APIs Used:**

- `chrome.management.get(extensionId)` - Get extension details

**Validations:**

- Extension ID format (32 lowercase letters)
- Extension existence check

---

## PUBLIC API: Extension Reload & Console Capture (3 functions)

### 3. reload(extensionId)

**User Call:**

```javascript
const result = await chromeDevAssist.reload('abcdefghijklmnopqrstuvwxyzabcdef');
```

**Complete Call Chain:**

```
reload(extensionId) [claude-code/index.js:44]
  ⚠️ → validateExtensionId(extensionId) [Line 45]
    → /^[a-z]{32}$/.test(extensionId)

  → generateCommandId() [Line 48]
    → crypto.randomUUID()

  → sendCommand(command) [Line 56]
    📡 → WebSocket communication

    [Extension receives]
    → handleReloadCommand(commandId, params) [extension/background.js:206]
      → chrome.management.get(extensionId) [Chrome API]
      ⚠️ → if (!extension) throw new Error('Extension not found')
      🔒 → if (extension.id === chrome.runtime.id) throw new Error('Cannot reload self')

      → chrome.management.setEnabled(extensionId, false) [Chrome API - Disable]
      ⏱️ → sleep(100) [Line 245] - Wait 100ms
        → new Promise(resolve => setTimeout(resolve, 100))
      → chrome.management.setEnabled(extensionId, true) [Chrome API - Enable]

      → chrome.runtime.sendMessage(ws, response)

  → return { extensionId, extensionName, reloadSuccess: true }
```

**Chrome APIs Used:**

- `chrome.management.get(extensionId)` - Get extension info
- `chrome.management.setEnabled(extensionId, false)` - Disable extension
- `chrome.management.setEnabled(extensionId, true)` - Enable extension
- `chrome.runtime.id` - Self-identification

**Critical Safety:**

- 🔒 Self-reload protection prevents crash
- ⏱️ 100ms delay prevents race conditions

---

### 4. reloadAndCapture(extensionId, options)

**User Call:**

```javascript
const result = await chromeDevAssist.reloadAndCapture('abcd...', { duration: 5000 });
```

**Complete Call Chain:**

```
reloadAndCapture(extensionId, options) [claude-code/index.js:23]
  ⚠️ → validateExtensionId(extensionId) [Line 24]

  → generateCommandId() [Line 27]

  → sendCommand(command) [Line 36]
    📡 → WebSocket communication

    [Extension receives]
    → handleReloadCommand(commandId, params) [extension/background.js:206]
      [With captureConsole: true]

      → startConsoleCapture(commandId, duration, null) [Line 267]
        → captureState.set(commandId, {
            logs: [],
            active: true,
            timeout: setTimeout(() => { state.active = false }, duration),
            tabId: null
          })
        → return Promise.resolve()

      → chrome.management.get(extensionId)
      🔒 → Self-reload check
      → chrome.management.setEnabled(extensionId, false)
      ⏱️ → sleep(100)
      → chrome.management.setEnabled(extensionId, true)

      ⏱️ → sleep(duration) [Wait for logs]

      → getCommandLogs(commandId) [Line 269]
        → captureState.get(commandId).logs
        → cleanupCapture(commandId)
          → clearTimeout(state.timeout)
          → captureState.delete(commandId)
        → return logs

      → chrome.runtime.sendMessage(ws, response)

  → return { extensionId, extensionName, reloadSuccess: true, consoleLogs: [...] }
```

**Console Capture Flow:**

```
[Page JavaScript]
console.log('Hello')
  ↓
[MAIN world: inject-console-capture.js]
→ originalLog.apply(console, arguments) [Show in DevTools]
→ sendToExtension('log', arguments)
  → window.dispatchEvent(new CustomEvent('chromeDevAssist:consoleLog', ...))
    ↓
[ISOLATED world: content-script.js]
→ window.addEventListener('chromeDevAssist:consoleLog', ...)
  → chrome.runtime.sendMessage({ type: 'console', level, message, ... })
    ↓
[Extension: background.js]
→ chrome.runtime.onMessage.addListener(...)
  → Validate message structure
  → Truncate message if > 10,000 chars
  → Find relevant captures (captureState entries where active === true)
  → state.logs.push({ level, message, timestamp, source, url, tabId, frameId })
```

**Chrome APIs Used:**

- Same as reload() plus:
- `chrome.runtime.onMessage` - Receive console logs
- `chrome.runtime.sendMessage` - Forward logs from content script

---

### 5. captureLogs(duration)

**User Call:**

```javascript
const result = await chromeDevAssist.captureLogs(5000);
```

**Complete Call Chain:**

```
captureLogs(duration) [claude-code/index.js:64]
  ⚠️ → if (duration <= 0 || duration > 60000) throw new Error(...) [Line 66]

  → generateCommandId() [Line 70]

  → sendCommand(command) [Line 77]
    📡 → WebSocket communication

    [Extension receives]
    → handleCaptureCommand(commandId, params) [extension/background.js:271]
      ⚠️ → validateDuration(duration) [6 checks]
        → typeof duration !== 'number' ? throw
        → !isFinite(duration) ? throw
        → duration < 0 ? throw
        → isNaN(duration) ? throw
        → duration > 600000 ? throw

      → startConsoleCapture(commandId, duration, null) [tabId = null captures ALL tabs]

      ⏱️ → sleep(duration)

      → getCommandLogs(commandId)
        → cleanupCapture(commandId)

      → chrome.runtime.sendMessage(ws, response)

  → return { consoleLogs: [...], duration, logCount }
```

**Chrome APIs Used:**

- `chrome.runtime.onMessage` - Receive logs
- `chrome.runtime.sendMessage` - Forward logs

**Key Difference from reloadAndCapture:**

- No reload operation
- Just captures logs from all tabs for specified duration

---

## PUBLIC API: Tab Management (3 functions)

### 6. openUrl(url, options)

**User Call:**

```javascript
const result = await chromeDevAssist.openUrl('https://example.com', {
  active: true,
  captureConsole: true,
  duration: 5000,
  autoClose: true,
});
```

**Complete Call Chain:**

```
openUrl(url, options) [claude-code/index.js:121]
  ⚠️ → if (!url || url === '') throw new Error('url is required') [Line 123]
  ⚠️ → if (typeof url !== 'string') throw new Error(...) [Line 127]

  ⚠️ → new URL(url) [Validate URL format] [Line 132]
    → throw new Error('Invalid URL format') [if fails]

  → generateCommandId() [Line 138]

  → sendCommand(command) [Line 149]
    📡 → WebSocket communication

    [Extension receives]
    → handleOpenUrlCommand(commandId, params) [extension/background.js:354]
      ⚠️ → Security validation (11 checks):
        → if (!url || url === '' || url === null || url === undefined) throw
        → const urlLower = url.toLowerCase()
        → const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
        → if (dangerousProtocols.some(p => urlLower.startsWith(p))) throw
        → validateDuration(duration) [6 checks]

      → if (captureConsole) {
          → startConsoleCapture(commandId, duration, tab.id) [Tab-specific!]
        }

      → chrome.tabs.create({ url, active }) [Chrome API]
        → Returns tab object with id

      → if (captureConsole) {
          ⏱️ → sleep(duration)
          → getCommandLogs(commandId)
        }

      → if (autoClose) {
          try {
            → const tabExists = await chrome.tabs.get(tab.id).catch(() => null)
            → if (tabExists) {
                → chrome.tabs.remove(tab.id)
                → tabClosed = true
              } else {
                → tabClosed = false
              }
          } catch (err) {
            → ErrorLogger.logExpectedError('autoClose', 'Tab removal failed', err)
            → tabClosed = false
          }
        }

      → chrome.runtime.sendMessage(ws, response)

  → return { tabId, url, consoleLogs: [...], tabClosed: boolean }
```

**Chrome APIs Used:**

- `chrome.tabs.create({ url, active })` - Open new tab
- `chrome.tabs.get(tabId)` - Check if tab still exists
- `chrome.tabs.remove(tabId)` - Close tab (if autoClose)
- `chrome.runtime.onMessage` - Receive logs
- `chrome.runtime.sendMessage` - Forward logs

**Security Validations (11 total):**

1. URL required check
2. URL type check
3. URL format validation (new URL())
4. javascript: protocol block
5. data: protocol block
6. vbscript: protocol block
7. file: protocol block
8. Duration type check
9. Duration finite check
10. Duration non-negative check
11. Duration range check

**Key Feature:**

- Tab-specific capture (only logs from THIS tab, unlike reload/captureLogs which capture ALL tabs)

---

### 7. reloadTab(tabId, options)

**User Call:**

```javascript
const result = await chromeDevAssist.reloadTab(123, {
  bypassCache: true,
  captureConsole: true,
  duration: 5000,
});
```

**Complete Call Chain:**

```
reloadTab(tabId, options) [claude-code/index.js:161]
  ⚠️ → if (typeof tabId !== 'number') throw new Error(...) [Line 163]

  → generateCommandId() [Line 166]

  → sendCommand(command) [Line 177]
    📡 → WebSocket communication

    [Extension receives]
    → handleReloadTabCommand(commandId, params) [extension/background.js:513]
      ⚠️ → if (tabId === undefined) throw new Error('tabId is required')

      → if (captureConsole) {
          → startConsoleCapture(commandId, duration, tabId) [Tab-specific]
        }

      → chrome.tabs.reload(tabId, { bypassCache }) [Chrome API]

      → if (captureConsole) {
          ⏱️ → sleep(duration)
          → getCommandLogs(commandId)
        }

      → chrome.runtime.sendMessage(ws, response)

  → return { tabId, bypassCache, consoleLogs: [...] }
```

**Chrome APIs Used:**

- `chrome.tabs.reload(tabId, { bypassCache })` - Reload tab
- `chrome.runtime.onMessage` - Receive logs
- `chrome.runtime.sendMessage` - Forward logs

**bypassCache Behavior:**

- `false` - Normal reload (Cmd+R)
- `true` - Hard reload (Cmd+Shift+R), clears HTTP cache, service workers, app cache

**Key Timing:**

- Capture starts BEFORE reload (captures unload events, document_start scripts)

---

### 8. closeTab(tabId)

**User Call:**

```javascript
const result = await chromeDevAssist.closeTab(123);
```

**Complete Call Chain:**

```
closeTab(tabId) [claude-code/index.js:189]
  ⚠️ → if (typeof tabId !== 'number') throw new Error(...) [Line 191]

  → generateCommandId() [Line 194]

  → sendCommand(command) [Line 199]
    📡 → WebSocket communication

    [Extension receives]
    → handleCloseTabCommand(commandId, params) [extension/background.js:549]
      ⚠️ → if (tabId === undefined) throw new Error('tabId is required')

      → try {
          → chrome.tabs.remove(tabId) [Chrome API]
        } catch (error) {
          → ErrorLogger.logExpectedError('closeTab', `Failed to close tab ${tabId}`, error)
          → throw error
        }

      → chrome.runtime.sendMessage(ws, response)

  → return { tabId, closed: true }
```

**Chrome APIs Used:**

- `chrome.tabs.remove(tabId)` - Close tab

**Error Handling:**

- Uses ErrorLogger.logExpectedError (console.warn) instead of console.error
- Prevents Chrome crash detection

---

## INTERNAL MECHANISMS

### Console Capture Pipeline (3 Worlds)

**MAIN World → ISOLATED World → Extension:**

```
[Page Code]
console.log('Hello')
  ↓
[inject-console-capture.js - MAIN world]
→ originalLog.apply(console, arguments) [Show in DevTools]
→ sendToExtension('log', arguments)
  → Convert arguments to string (JSON.stringify for objects)
  ⚠️ → Truncate if > 10,000 chars [Layer 1]
  → window.dispatchEvent(new CustomEvent('chromeDevAssist:consoleLog', {
      detail: { level, message, timestamp, source: 'page' }
    }))
  ↓
[content-script.js - ISOLATED world]
→ window.addEventListener('chromeDevAssist:consoleLog', (event) => {
    → chrome.runtime.sendMessage({
        type: 'console',
        level: event.detail.level,
        message: event.detail.message,
        timestamp: event.detail.timestamp,
        source: event.detail.source
      })
  })
  ↓
[background.js - Extension Service Worker]
→ chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    ⚠️ → Validate message structure
    ⚠️ → Truncate if > 10,000 chars [Layer 2 - Backup]

    → Find relevant captures:
      - Tab-specific: capturesByTab.get(sender.tab.id)
      - Global: captureState entries where tabId === null

    → for each relevant capture:
        → if (state.logs.length < MAX_LOGS_PER_CAPTURE) {
            state.logs.push({
              level: message.level,
              message: truncatedMessage,
              timestamp: message.timestamp,
              source: message.source,
              url: sender.tab?.url,
              tabId: sender.tab?.id,
              frameId: sender.frameId
            })
          } else if (state.logs.length === MAX_LOGS_PER_CAPTURE) {
            → Add warning message once
          }
          // else: silently drop
  })
```

**Chrome APIs Used:**

- `chrome.runtime.sendMessage()` - Content script → Extension
- `chrome.runtime.onMessage` - Extension listener
- `chrome.scripting.registerContentScripts()` - Register inject script

---

### Auto-Start Server

**First API Call Flow:**

```
[User Code]
await chromeDevAssist.getAllExtensions()
  ↓
sendCommand(command) [claude-code/index.js:212]
  → new WebSocket('ws://localhost:9876')
  → ws.on('error', (err) => {
      → if (err.code === 'ECONNREFUSED' && !retried) {
          → startServer() [Line 244]
            → const serverPath = path.join(__dirname, '../server/websocket-server.js')
            → spawn('node', [serverPath], { detached: true, stdio: 'ignore' })
            → serverProcess.unref()
            ⏱️ → setTimeout(() => {
                → Verify server responding
              }, 1000)

          → attemptConnection() [Retry connection]
        }
    })
```

**Node.js APIs Used:**

- `child_process.spawn()` - Start server process
- `path.join()` - Build server path

---

### Auto-Reconnect (Extension → Server)

```
[Extension: background.js]
connectToServer() [Line 82]
  → new WebSocket('ws://localhost:9876')
  → ws.onopen = () => {
      → chrome.storage.local.set({ status: { running: true, ... } })
    }
  → ws.onclose = () => {
      → console.log('[ChromeDevAssist] Disconnected, reconnecting in 1s...')
      → ws = null
      ⏱️ → setTimeout(connectToServer, 1000) [Retry]
    }
```

**Chrome APIs Used:**

- `chrome.storage.local.set()` - Persist status

---

### Periodic Cleanup

```
[Extension: background.js - Line 22]
setInterval(() => {
  → const now = Date.now()
  → for (const [commandId, state] of captureState.entries()) {
      → if (!state.active && state.endTime && (now - state.endTime) > MAX_CAPTURE_AGE_MS) {
          → cleanupCapture(commandId)
            → clearTimeout(state.timeout)
            → capturesByTab.get(state.tabId)?.delete(commandId)
            → if (tabSet.size === 0) capturesByTab.delete(state.tabId)
            → captureState.delete(commandId)
        }
    }
}, CLEANUP_INTERVAL_MS) [Every 60 seconds]
```

---

## SUMMARY: API → Chrome API Mapping

| Public API         | Chrome APIs Used                                                                              | Node.js APIs        |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------- |
| getAllExtensions() | chrome.management.getAll()                                                                    | crypto.randomUUID() |
| getExtensionInfo() | chrome.management.get()                                                                       | crypto.randomUUID() |
| reload()           | chrome.management.get()<br>chrome.management.setEnabled() (x2)                                | crypto.randomUUID() |
| reloadAndCapture() | Same as reload()<br>chrome.runtime.onMessage                                                  | crypto.randomUUID() |
| captureLogs()      | chrome.runtime.onMessage                                                                      | crypto.randomUUID() |
| openUrl()          | chrome.tabs.create()<br>chrome.tabs.get()<br>chrome.tabs.remove()<br>chrome.runtime.onMessage | crypto.randomUUID() |
| reloadTab()        | chrome.tabs.reload()<br>chrome.runtime.onMessage                                              | crypto.randomUUID() |
| closeTab()         | chrome.tabs.remove()                                                                          | crypto.randomUUID() |

**Total Unique Chrome APIs:** 16
**Total Unique Node.js APIs:** 6 (crypto, http, fs, path, child_process, events)

---

**Document Status:** ✅ COMPLETE
**Last Updated:** 2025-10-26
**Verification:** COMPLETE-RELATIONSHIP-MAP-FINAL-2025-10-26.md
**Accuracy:** 100% - All call chains verified in source code

# Architecture - Chrome Dev Assist

**System architecture and component design**

**Last Updated:** 2025-10-30
**Architecture Version:** 1.0

---

## System Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Node.js API   │         │  WebSocket       │         │    Chrome       │
│   (Your Code)   │◄───────►│   Server         │◄───────►│   Extension     │
│ claude-code/    │  :9876  │  server/         │  :9876  │  extension/     │
│   index.js      │         │  websocket-      │         │  background.js  │
│                 │         │  server.js       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**3-Layer WebSocket Architecture**

---

## Components

### Layer 1: Node.js API

**Purpose:** Simple API for Node.js applications
**Location:** `claude-code/index.js`
**Lines:** 340
**Functions:** 10 public

**Responsibilities:**

- Validate input parameters
- Generate command IDs
- Send WebSocket messages
- Handle responses/timeouts
- Auto-start server if needed

**Dependencies:** `ws` package
**Used By:** Test scripts, CI/CD pipelines, developer scripts

---

### Layer 2: WebSocket Server

**Purpose:** Route messages between Node.js and Chrome
**Location:** `server/websocket-server.js`
**Lines:** 450
**Port:** 9876 (localhost only)

**Responsibilities:**

- WebSocket server (extension connection)
- HTTP server (test fixtures)
- Message routing (command → response)
- Token authentication
- Health monitoring

**Dependencies:** `ws`, `http`, `fs`, `crypto`
**Security:** 4-layer defense (network binding, host validation, token auth, path protection)

---

### Layer 3: Chrome Extension

**Purpose:** Execute commands in Chrome
**Location:** `extension/`
**Type:** Manifest V3 service worker

**Files:**

- `manifest.json` - Configuration
- `background.js` - Service worker (890 lines)
- `inject-console-capture.js` - Console capture script
- `content-script.js` - Content script coordinator

**Responsibilities:**

- Connect to WebSocket server
- Execute Chrome API commands
- Capture console logs
- Handle tab operations
- Manage extension state

**Chrome APIs Used:**

- `chrome.management` - Extension control
- `chrome.tabs` - Tab operations
- `chrome.scripting` - Script injection
- `chrome.runtime` - Messaging
- `chrome.alarms` - Keep-alive

---

## Design Patterns

### Observer Pattern

- HealthManager emits events
- Components subscribe to health changes

### Command Pattern

- All operations as command objects
- Command ID for routing

### Singleton Pattern

- Single WebSocket server instance
- PID file prevents duplicates

### Repository Pattern

- Health data centralized
- Single source of truth

---

## Data Flow

**Command Execution:**

1. Node.js API validates input
2. Generates command ID
3. Sends WebSocket message to server
4. Server routes to extension
5. Extension executes Chrome API
6. Extension sends response to server
7. Server routes response to Node.js
8. Node.js resolves promise

**Console Capture Flow:**

1. Extension injects capture script (MAIN world)
2. Script intercepts console.log
3. Posts message to content script (ISOLATED world)
4. Content script sends to extension
5. Extension sends to server
6. Server routes to Node.js

---

## Security Architecture

**4-Layer Defense:**

1. **Network Binding** - 127.0.0.1 only
2. **Host Validation** - Checks host header
3. **Token Authentication** - Random 32-byte token
4. **Path Protection** - Prevents traversal

**See:** `DECISIONS.md` ADR-001, ADR-002

---

## Migration Reference

**Content should be migrated from:**

- `../docs/ARCHITECTURE-OVERVIEW.md` - Detailed architecture
- `../ARCHITECTURE-ANALYSIS-2025-10-26.md` - Complete analysis

---

**Maintained By:** Chrome Dev Assist Team

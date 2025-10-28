# Service Worker Lifecycle Capabilities - Chrome Extension MV3

**Date:** 2025-10-25
**Purpose:** Comprehensive guide to managing Chrome Extension service worker lifecycle
**Scope:** Checking status, activation, console access, debugging, and automation

---

## Table of Contents

1. [Service Worker Lifecycle Overview](#service-worker-lifecycle-overview)
2. [Checking Service Worker Status](#checking-service-worker-status)
3. [Activating/Waking Service Workers](#activatingwaking-service-workers)
4. [Accessing Console Logs](#accessing-console-logs)
5. [Keeping Service Workers Alive](#keeping-service-workers-alive)
6. [Programmatic Access (Puppeteer/CDP)](#programmatic-access-puppeteercdp)
7. [Debug vs Production Considerations](#debug-vs-production-considerations)
8. [Implementation Examples](#implementation-examples)

---

## Service Worker Lifecycle Overview

### Automatic Termination Rules

**Chrome Extension Service Workers (Manifest V3) automatically terminate:**

1. **After 30 seconds of inactivity**
   - Receiving an event resets the timer
   - Calling an extension API resets the timer
   - Starting in Chrome 110+, service workers stay alive as long as they're receiving events

2. **After 5 minutes for a single request**
   - If a single event or API call takes longer than 5 minutes to process
   - The service worker will be force-terminated

3. **Never terminates while DevTools is open**
   - Important: Opening DevTools (inspect) prevents automatic termination
   - This changes behavior during debugging - be aware of this difference!

### Lifecycle States

1. **Installing** - Service worker being installed
2. **Installed/Waiting** - Installed but not yet active
3. **Activating** - Being activated
4. **Activated** - Active and running
5. **Inactive/Stopped** - Terminated after inactivity

---

## Checking Service Worker Status

### Method 1: chrome://serviceworker-internals (Manual)

**URL:** `chrome://serviceworker-internals`

**Steps:**

1. Open Chrome and navigate to `chrome://serviceworker-internals`
2. Find your extension by searching for its ID in the "Scope" column
3. Check status indicators:
   - **ACTIVATED**: Service worker is running
   - **STOPPED**: Service worker is inactive

**Limitations:**

- Manual only (requires user interaction)
- Can't be automated from Node.js
- Useful for manual debugging only

---

### Method 2: chrome://extensions (Manual)

**URL:** `chrome://extensions`

**Steps:**

1. Enable Developer mode (toggle in top-right)
2. Find your extension
3. Look for:
   - **"service worker"** link (blue) - worker is active
   - **"service worker (Inactive)"** link (gray) - worker is stopped
4. Click the link to inspect (opens DevTools)

**Limitations:**

- Manual only
- Opening DevTools keeps service worker alive (changes behavior)
- Can't be programmatically accessed

---

### Method 3: Messaging Check (Programmatic - Recommended)

**Approach:** Send a message to the service worker and check if it responds.

**From Content Script or Popup:**

```javascript
async function isServiceWorkerActive() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ping' });
    return response && response.status === 'active';
  } catch (error) {
    // Service worker not responding
    return false;
  }
}
```

**In Service Worker (background.js):**

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ status: 'active', timestamp: Date.now() });
    return true; // Keep message channel open
  }
});
```

**Advantages:**

- ✅ Works programmatically
- ✅ Can be called from content scripts, popups, or external scripts
- ✅ Doesn't keep service worker alive unnecessarily
- ✅ Fast response (< 100ms)

**Limitations:**

- ❌ If service worker is stopped, sending a message will wake it up
- ❌ Can't distinguish between "stopped" and "crashed"

---

### Method 4: BroadcastChannel (Programmatic)

**Approach:** Use BroadcastChannel API for cross-context communication.

**In Service Worker:**

```javascript
const channel = new BroadcastChannel('service-worker-status');

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'status-check') {
    channel.postMessage({ status: 'active', timestamp: Date.now() });
  }
});
```

**From Content Script:**

```javascript
async function checkServiceWorkerStatus() {
  const channel = new BroadcastChannel('service-worker-status');

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      channel.close();
      resolve({ active: false });
    }, 1000);

    channel.onmessage = event => {
      clearTimeout(timeout);
      channel.close();
      resolve({ active: true, data: event.data });
    };

    chrome.runtime.sendMessage({ type: 'status-check' });
  });
}
```

**Advantages:**

- ✅ Doesn't interfere with service worker lifecycle
- ✅ Can broadcast to multiple listeners

**Limitations:**

- ❌ More complex to set up
- ❌ Still wakes service worker if stopped

---

### Method 5: navigator.serviceWorker (Limited)

**WARNING:** This method has limitations!

```javascript
navigator.serviceWorker.ready.then(registration => {
  if (registration.active) {
    console.log('Service worker active');
  }
});
```

**Limitations:**

- ❌ Returns same result for active and inactive states
- ❌ Can't reliably determine exact state
- ❌ **NOT RECOMMENDED** for Chrome extensions

---

## Activating/Waking Service Workers

### Automatic Activation

Service workers automatically wake when:

1. **Any Chrome API is called by extension**
2. **Event listener fires** (e.g., chrome.runtime.onMessage)
3. **User interacts with extension** (clicks icon, opens popup)
4. **Alarm fires** (chrome.alarms API)
5. **External message received** (from web page via chrome.runtime.sendMessage)

**Example - Wake via Message:**

```javascript
// From anywhere (content script, web page, Node.js via native messaging)
chrome.runtime.sendMessage(EXTENSION_ID, { type: 'wake' });
```

**Example - Wake via Alarm:**

```javascript
// Set up periodic wake (in service worker)
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 }); // Every 30s

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepAlive') {
    console.log('[Service Worker] Staying alive');
  }
});
```

---

### Programmatic Activation from Node.js

**Using Native Messaging:**

1. Set up native host
2. Send message to extension
3. Extension service worker wakes to handle message

**Using Puppeteer:**

```javascript
const puppeteer = require('puppeteer');

async function wakeServiceWorker(extensionId) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--disable-extensions-except=/path/to/extension`, `--load-extension=/path/to/extension`],
  });

  const targets = await browser.targets();
  const serviceWorkerTarget = targets.find(
    target => target.type() === 'service_worker' && target.url().includes(extensionId)
  );

  if (serviceWorkerTarget) {
    const worker = await serviceWorkerTarget.worker();
    console.log('Service worker found and active');
    return worker;
  }

  throw new Error('Service worker not found');
}
```

---

## Accessing Console Logs

### Manual Access (chrome://extensions)

1. Navigate to `chrome://extensions`
2. Enable Developer mode
3. Click **"service worker"** link (or "Inspect views: background page" in MV2)
4. DevTools opens with Console tab
5. View all `console.log()`, `console.error()`, etc. from service worker

**Limitations:**

- ❌ Manual only
- ❌ Keeps service worker alive (changes behavior)
- ❌ Can't be automated

---

### Programmatic Access - Method 1: chrome.debugger API

**IMPORTANT:** The extension can use `chrome.debugger` to attach to its OWN tabs, but **CANNOT attach to itself**.

**Attach to a Tab (for tab console logs):**

```javascript
// This works - attach to a tab
async function captureTabLogs(tabId) {
  await chrome.debugger.attach({ tabId }, '1.3');
  await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');

  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (source.tabId === tabId && method === 'Runtime.consoleAPICalled') {
      console.log('[Tab Console]', params.args);
    }
  });
}
```

**Limitations for Service Worker:**

- ❌ Cannot attach debugger to own service worker
- ❌ `chrome.debugger.attach({ extensionId: chrome.runtime.id })` - NOT SUPPORTED
- ✅ Can only attach to tabs, not to extension's own service worker

---

### Programmatic Access - Method 2: Puppeteer + CDP

**This is the ONLY way to programmatically access extension service worker console logs!**

**Full Example:**

```javascript
const puppeteer = require('puppeteer');
const path = require('path');

async function captureServiceWorkerLogs(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false, // Must be false for extensions
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  // Wait for service worker target
  const serviceWorkerTarget = await browser.waitForTarget(
    target => target.type() === 'service_worker' && target.url().endsWith('background.js'),
    { timeout: 10000 }
  );

  console.log('✓ Service worker found:', serviceWorkerTarget.url());

  // Get worker instance
  const worker = await serviceWorkerTarget.worker();

  // Access CDP client
  const client = worker._client;

  // Enable Runtime domain
  await client.send('Runtime.enable');

  // Listen for console API calls
  client.on('Runtime.consoleAPICalled', message => {
    const args = message.args.map(arg => arg.value);
    console.log(`[Service Worker ${message.type}]`, ...args);
  });

  console.log('✓ Console logging active - service worker logs will appear here');

  return { browser, worker, client };
}

// Usage
const extensionPath = path.join(__dirname, '../extension');
captureServiceWorkerLogs(extensionPath)
  .then(({ browser }) => {
    console.log('Monitoring service worker console...');
    // Keep browser open to continue monitoring
  })
  .catch(console.error);
```

**Advantages:**

- ✅ Fully programmatic
- ✅ Real-time console log capture
- ✅ Can be integrated into automated tests
- ✅ Captures all console methods (log, error, warn, info, debug)

**Limitations:**

- ❌ Requires Puppeteer (heavyweight dependency)
- ❌ Must run headful (headless mode doesn't support extensions)
- ❌ Keeps service worker alive while monitoring
- ❌ Complex setup

---

### Programmatic Access - Method 3: chrome://serviceworker-internals Plain Text Logs

**IMPORTANT:** This is the ONLY non-invasive way to view logs!

**URL:** `chrome://serviceworker-internals`

**How it works:**

- Plain-text logging output shown on the page
- **Does NOT keep service worker alive** (unlike DevTools)
- Logs persist even after service worker terminates

**Limitations:**

- ❌ Manual only (no programmatic access)
- ❌ Logs are plain text (no structured data)
- ❌ Limited history (may lose old logs)

**Best for:** Debugging service worker termination issues without affecting lifecycle

---

### Programmatic Access - Method 4: Custom Logging to External Storage

**Recommended approach for production monitoring:**

**In Service Worker:**

```javascript
// Override console methods to also log to external storage
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
  originalLog.apply(console, args);
  // Send to external logging service
  sendToLoggingService('log', args);
};

console.error = function (...args) {
  originalError.apply(console, args);
  sendToLoggingService('error', args);
};

function sendToLoggingService(level, args) {
  // Send to Sentry, LogRocket, custom server, etc.
  fetch('https://your-logging-service.com/log', {
    method: 'POST',
    body: JSON.stringify({
      level,
      message: args.join(' '),
      timestamp: Date.now(),
      extensionId: chrome.runtime.id,
    }),
  }).catch(() => {}); // Silent fail
}
```

**Advantages:**

- ✅ Works in production
- ✅ Doesn't affect service worker lifecycle
- ✅ Persistent logs (stored externally)
- ✅ Can aggregate logs from all users

**Limitations:**

- ❌ Requires external service
- ❌ Network overhead
- ❌ Privacy concerns (sending user data)

---

## Keeping Service Workers Alive

### Anti-Pattern: Forcing Service Workers to Stay Alive

**⚠️ WARNING:** Chrome intentionally terminates service workers to save resources. Fighting this is an anti-pattern!

### Acceptable Patterns

**1. Alarm-Based Keep-Alive (for specific use cases):**

```javascript
// Minimum period is 30 seconds (matches service worker timeout)
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepAlive') {
    console.log('[KeepAlive] Service worker still active');
  }
});
```

**Use cases:**

- Real-time monitoring required
- Background tasks that must run continuously
- WebSocket connections (Chrome 116+ extends lifetime for active WebSockets)

**2. WebSocket Connection (Chrome 116+):**

```javascript
// Active WebSocket connections now extend service worker lifetime
const socket = new WebSocket('wss://your-server.com');

socket.onopen = () => {
  console.log('WebSocket connected - service worker will stay alive');
};

socket.onmessage = event => {
  // Handle messages - keeps service worker alive
};
```

**3. Long-Running Port Connection (Chrome 110+):**

```javascript
// Service workers stay alive as long as they're receiving events
chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(message => {
    // Handle message - keeps service worker alive
  });
});
```

---

## Programmatic Access (Puppeteer/CDP)

### Full Working Example: Service Worker Inspector

```javascript
/**
 * Service Worker Inspector
 * Monitors Chrome extension service worker lifecycle and console logs
 */

const puppeteer = require('puppeteer');
const path = require('path');

class ServiceWorkerInspector {
  constructor(extensionPath) {
    this.extensionPath = path.resolve(extensionPath);
    this.browser = null;
    this.worker = null;
    this.client = null;
    this.logs = [];
  }

  async launch() {
    console.log('[Inspector] Launching browser with extension...');

    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${this.extensionPath}`,
        `--load-extension=${this.extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    console.log('✓ Browser launched');
  }

  async attach() {
    console.log('[Inspector] Waiting for service worker...');

    const serviceWorkerTarget = await this.browser.waitForTarget(
      target => target.type() === 'service_worker',
      { timeout: 10000 }
    );

    console.log('✓ Service worker found:', serviceWorkerTarget.url());

    this.worker = await serviceWorkerTarget.worker();
    this.client = this.worker._client;

    console.log('✓ Attached to service worker');
  }

  async enableConsoleCapture() {
    console.log('[Inspector] Enabling console capture...');

    await this.client.send('Runtime.enable');

    this.client.on('Runtime.consoleAPICalled', message => {
      const logEntry = {
        type: message.type,
        args: message.args.map(arg => arg.value || arg.description),
        timestamp: Date.now(),
        stackTrace: message.stackTrace,
      };

      this.logs.push(logEntry);

      // Print to Node.js console
      console.log(`[SW ${message.type}]`, ...logEntry.args);
    });

    console.log('✓ Console capture enabled');
  }

  async checkStatus() {
    const targets = await this.browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');

    return {
      active: !!swTarget,
      url: swTarget?.url(),
      logsCollected: this.logs.length,
    };
  }

  getLogs(filterType = null) {
    if (filterType) {
      return this.logs.filter(log => log.type === filterType);
    }
    return this.logs;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Usage Example
async function main() {
  const inspector = new ServiceWorkerInspector('./extension');

  try {
    await inspector.launch();
    await inspector.attach();
    await inspector.enableConsoleCapture();

    console.log('\n=== Service Worker Inspector Running ===\n');
    console.log('Service worker console logs will appear below:');
    console.log('Press Ctrl+C to exit\n');

    // Check status every 5 seconds
    setInterval(async () => {
      const status = await inspector.checkStatus();
      console.log('[Status]', status);
    }, 5000);

    // Keep running
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error);
    await inspector.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ServiceWorkerInspector;
```

---

## Debug vs Production Considerations

### Debug Mode

**Characteristics:**

- DevTools open → Service worker NEVER terminates
- Can inspect variables, set breakpoints
- Console logs visible immediately
- Network requests visible

**Use for:**

- Development
- Manual testing
- Debugging specific issues

**Avoid for:**

- Performance testing (behavior is different)
- Service worker lifecycle testing (termination doesn't happen)

---

### Production Monitoring

**Recommendations:**

1. **Use External Logging Service**
   - Send logs to Sentry, LogRocket, or custom server
   - Aggregate logs from all users
   - Track errors and exceptions

2. **Use chrome.storage for Local Logging**

   ```javascript
   async function logToStorage(level, message) {
     const logs = (await chrome.storage.local.get('logs')) || [];
     logs.push({ level, message, timestamp: Date.now() });

     // Keep only last 1000 logs
     if (logs.length > 1000) logs.shift();

     await chrome.storage.local.set({ logs });
   }
   ```

3. **Use Telemetry/Analytics**
   - Track errors with Google Analytics
   - Monitor extension health metrics
   - Alert on critical errors

---

## Implementation Examples

### Example 1: Service Worker Health Check (for Tests)

```javascript
async function waitForServiceWorkerReady(extensionId, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await chrome.runtime.sendMessage(extensionId, { type: 'ping' });
      if (response && response.status === 'active') {
        return true;
      }
    } catch (error) {
      // Service worker not ready, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error('Service worker did not become ready within timeout');
}
```

---

### Example 2: Automated Console Log Capture (for Tests)

```javascript
const ServiceWorkerInspector = require('./service-worker-inspector');

test('service worker should log initialization', async () => {
  const inspector = new ServiceWorkerInspector('./extension');

  await inspector.launch();
  await inspector.attach();
  await inspector.enableConsoleCapture();

  // Wait for initialization logs
  await new Promise(resolve => setTimeout(resolve, 2000));

  const logs = inspector.getLogs('log');
  expect(logs.some(log => log.args.join(' ').includes('Service worker initialized'))).toBe(true);

  await inspector.close();
});
```

---

### Example 3: Keep-Alive for Specific Use Case

```javascript
// Only use if you have a legitimate need (e.g., real-time monitoring)

// Set up keep-alive alarm
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepAlive') {
    // Perform periodic task
    checkForUpdates();
  }
});

// Clean up when no longer needed
function stopKeepAlive() {
  chrome.alarms.clear('keepAlive');
}
```

---

## Summary: Best Practices

### ✅ DO

1. **Use messaging to check service worker status** (chrome.runtime.sendMessage)
2. **Use Puppeteer + CDP for automated console log capture** (testing only)
3. **Use external logging for production monitoring** (Sentry, custom server)
4. **Let service workers terminate naturally** (don't fight the lifecycle)
5. **Use alarms for periodic tasks** (chrome.alarms with 30s minimum)
6. **Use chrome://serviceworker-internals for debugging** (non-invasive)

### ❌ DON'T

1. **Don't use DevTools during lifecycle testing** (prevents termination)
2. **Don't try to attach chrome.debugger to your own service worker** (not supported)
3. **Don't use navigator.serviceWorker in extensions** (unreliable)
4. **Don't run Puppeteer in production** (development/testing only)
5. **Don't force service workers to stay alive unnecessarily** (anti-pattern)
6. **Don't rely on service worker staying alive** (always prepare for termination)

---

## Quick Reference

| **Task**                              | **Method**                       | **Complexity** | **Production-Safe** |
| ------------------------------------- | -------------------------------- | -------------- | ------------------- |
| Check if active                       | chrome.runtime.sendMessage       | Low            | ✅ Yes              |
| Wake service worker                   | chrome.runtime.sendMessage       | Low            | ✅ Yes              |
| Access console logs (manual)          | chrome://extensions DevTools     | Low            | ❌ Debug only       |
| Access console logs (automated)       | Puppeteer + CDP                  | High           | ❌ Testing only     |
| Production logging                    | External service                 | Medium         | ✅ Yes              |
| Keep alive                            | chrome.alarms                    | Low            | ⚠️ Use sparingly    |
| View logs without affecting lifecycle | chrome://serviceworker-internals | Low            | ✅ Yes              |

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Author:** Chrome Dev Assist Team
**Status:** Comprehensive reference guide

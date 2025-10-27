/**
 * Chrome Dev Assist - Background Service Worker
 * Handles native messaging and extension testing operations
 */

// Import ConsoleCapture class for managing console log captures
// Using importScripts() for Chrome service worker compatibility
importScripts('./modules/ConsoleCapture.js');
const consoleCapture = new ConsoleCapture();

// Memory leak prevention
const MAX_LOGS_PER_CAPTURE = 10000; // Maximum logs per command to prevent memory exhaustion
const CLEANUP_INTERVAL_MS = 60000; // Run cleanup every 60 seconds
const MAX_CAPTURE_AGE_MS = 300000; // Keep captures for max 5 minutes after completion

console.log('[ChromeDevAssist] Background service worker started');

// Periodic cleanup of old captures to prevent memory leaks
setInterval(() => {
  const cleanedCount = consoleCapture.cleanupStale(MAX_CAPTURE_AGE_MS);

  if (cleanedCount > 0) {
    const totalCaptures = consoleCapture.getTotalCount();
    console.log(
      `[ChromeDevAssist] Cleaned up ${cleanedCount} old capture(s). Active captures: ${totalCaptures}`
    );
  }
}, CLEANUP_INTERVAL_MS);

// Register console capture script to run in MAIN world at document_start
// This ensures it runs BEFORE page scripts and can intercept console.log
//
// IMPORTANT: Check if already registered to prevent "Duplicate script ID" errors
// Chrome service workers can restart, causing re-registration attempts
async function registerConsoleCaptureScript() {
  try {
    // Check if script is already registered
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const alreadyExists = registered.some(script => script.id === 'console-capture');

    if (alreadyExists) {
      console.log('[ChromeDevAssist] Console capture script already registered, skipping');
      return;
    }

    // Register the script
    await chrome.scripting.registerContentScripts([
      {
        id: 'console-capture',
        matches: ['<all_urls>'],
        js: ['inject-console-capture.js'],
        runAt: 'document_start',
        world: 'MAIN',
        allFrames: true,
      },
    ]);
    console.log('[ChromeDevAssist] Console capture script registered in MAIN world');
  } catch (err) {
    // If duplicate error despite our check, unregister and retry
    if (err.message && err.message.includes('Duplicate')) {
      console.log('[ChromeDevAssist] Duplicate detected, unregistering and retrying...');
      await chrome.scripting.unregisterContentScripts({ ids: ['console-capture'] });
      await chrome.scripting.registerContentScripts([
        {
          id: 'console-capture',
          matches: ['<all_urls>'],
          js: ['inject-console-capture.js'],
          runAt: 'document_start',
          world: 'MAIN',
          allFrames: true,
        },
      ]);
      console.log('[ChromeDevAssist] Console capture script re-registered successfully');
    } else {
      console.error('[ChromeDevAssist] Failed to register console capture script:', err);
    }
  }
}

// Call registration function (only in Chrome extension context)
if (typeof chrome !== 'undefined' && chrome.scripting) {
  registerConsoleCaptureScript();
}

// WebSocket connection to server
let ws = null;

// Self-healing: Automatic reload if connection lost for too long
// If extension can't reconnect to server within 60 seconds, reload itself
const SELF_HEAL_TIMEOUT_MS = 60000; // 60 seconds
const MAX_SELF_HEAL_ATTEMPTS = 3; // Maximum number of self-heal reloads before giving up

// Validate SELF_HEAL_TIMEOUT_MS (must be at least 5 seconds to prevent immediate reload loops)
if (SELF_HEAL_TIMEOUT_MS < 5000) {
  throw new Error(
    `SELF_HEAL_TIMEOUT_MS must be at least 5000ms (5 seconds), got ${SELF_HEAL_TIMEOUT_MS}ms`
  );
}

let selfHealTimer = null;
let selfHealAttempts = 0; // Track reload attempts to prevent infinite loop

function connectToServer() {
  // Clear any existing self-heal timer (we're attempting connection)
  if (selfHealTimer) {
    clearTimeout(selfHealTimer);
    selfHealTimer = null;
    console.log('[ChromeDevAssist] Self-heal timer cancelled (reconnection attempt)');
  }

  ws = new WebSocket('ws://localhost:9876');

  ws.onopen = () => {
    console.log('[ChromeDevAssist] Connected to server');

    // Cancel self-heal timer (reconnection successful)
    if (selfHealTimer) {
      clearTimeout(selfHealTimer);
      selfHealTimer = null;
      console.log('[ChromeDevAssist] Self-heal timer cancelled (reconnection successful)');
    }

    // Reset self-heal attempt counter on successful connection
    selfHealAttempts = 0;

    // Register as extension
    ws.send(
      JSON.stringify({
        type: 'register',
        client: 'extension',
        extensionId: chrome.runtime.id,
      })
    );
  };

  ws.onmessage = async event => {
    const message = JSON.parse(event.data);

    // Only process commands
    if (message.type !== 'command') {
      return;
    }

    console.log('[ChromeDevAssist] Received command:', message.command?.type);

    try {
      // Validate command
      if (!message.command || !message.command.type) {
        throw new Error('Invalid command: missing type');
      }

      let result;

      // Process command based on type
      switch (message.command.type) {
        case 'reload':
          result = await handleReloadCommand(message.id, message.command.params);
          break;

        case 'capture':
          result = await handleCaptureCommand(message.id, message.command.params);
          break;

        case 'getAllExtensions':
          result = await handleGetAllExtensionsCommand(message.id, message.command.params);
          break;

        case 'getExtensionInfo':
          result = await handleGetExtensionInfoCommand(message.id, message.command.params);
          break;

        case 'openUrl':
          result = await handleOpenUrlCommand(message.id, message.command.params);
          break;

        case 'reloadTab':
          result = await handleReloadTabCommand(message.id, message.command.params);
          break;

        case 'closeTab':
          result = await handleCloseTabCommand(message.id, message.command.params);
          break;

        case 'getPageMetadata':
          result = await handleGetPageMetadataCommand(message.id, message.command.params);
          break;

        case 'captureScreenshot':
          result = await handleCaptureScreenshotCommand(message.id, message.command.params);
          break;

        default:
          throw new Error(`Unknown command type: ${message.command.type}`);
      }

      // Send success response
      ws.send(
        JSON.stringify({
          type: 'response',
          id: message.id,
          data: result,
        })
      );
    } catch (error) {
      console.error('[ChromeDevAssist] Command failed:', error);

      // Clean up any capture state on error
      if (message.id) {
        consoleCapture.cleanup(message.id);
      }

      // Send error response ONLY if WebSocket is open
      // (Prevents second error if WebSocket closed during command execution)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'error',
            id: message.id,
            error: {
              message: error.message,
              code: error.code || 'EXTENSION_ERROR',
            },
          })
        );
      } else {
        console.error('[ChromeDevAssist] Cannot send error response: WebSocket not open');
      }
    }
  };

  ws.onerror = err => {
    console.error('[ChromeDevAssist] WebSocket error:', err);
  };

  ws.onclose = () => {
    console.log('[ChromeDevAssist] Disconnected from server, reconnecting in 1s...');
    ws = null;

    // Start self-heal timer if not already running
    // If we can't reconnect within 60 seconds, reload extension (self-healing)
    if (!selfHealTimer) {
      selfHealTimer = setTimeout(() => {
        // Check if we've exceeded max reload attempts
        if (selfHealAttempts >= MAX_SELF_HEAL_ATTEMPTS) {
          console.error(
            `[ChromeDevAssist] Self-healing disabled: Exceeded ${MAX_SELF_HEAL_ATTEMPTS} reload attempts. Server may be permanently down.`
          );
          selfHealTimer = null;
          // Stop trying to reconnect (give up)
          return;
        }

        selfHealAttempts++;
        console.warn(
          `[ChromeDevAssist] Self-healing: No reconnection after 60s, reloading extension (attempt ${selfHealAttempts}/${MAX_SELF_HEAL_ATTEMPTS})...`
        );

        // Check if chrome.runtime.reload is available
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
          chrome.runtime.reload();
        } else {
          console.error(
            '[ChromeDevAssist] Self-healing failed: chrome.runtime.reload not available'
          );
        }
      }, SELF_HEAL_TIMEOUT_MS);

      console.log('[ChromeDevAssist] Self-heal timer started (60s until reload)');
    }

    setTimeout(connectToServer, 1000);
  };
}

// Connect on startup (only in Chrome extension context)
if (typeof chrome !== 'undefined' && typeof WebSocket !== 'undefined') {
  connectToServer();
}

/**
 * Handle reload command
 * Disables and re-enables the target extension, optionally capturing console logs
 */
async function handleReloadCommand(commandId, params) {
  const { extensionId, captureConsole = false, duration = 5000 } = params;

  if (!extensionId) {
    throw new Error('extensionId is required');
  }

  console.log('[ChromeDevAssist] Reloading extension:', extensionId);

  // Get extension info first
  let extension;
  try {
    extension = await chrome.management.get(extensionId);
  } catch (err) {
    throw new Error(`Extension not found: ${extensionId}`);
  }

  if (!extension) {
    throw new Error(`Extension not found: ${extensionId}`);
  }

  // Special handling for self-reload
  if (extension.id === chrome.runtime.id) {
    console.log(
      '[ChromeDevAssist] Self-reload requested via command, using chrome.runtime.reload()'
    );

    // Use chrome.runtime.reload() for self (works correctly)
    // Note: This returns immediately but extension reloads shortly after
    //
    // RACE CONDITION (non-critical, documented):
    // chrome.runtime.reload() is asynchronous - it returns immediately, reload happens later
    // We return response object, then ws.send() sends it (synchronous to socket buffer)
    // Reload happens after response is sent to socket buffer (best effort)
    // Server PROBABLY receives response, but no guarantee if reload is very fast
    // Impact: LOW - Server can detect reconnection even without response
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
      chrome.runtime.reload();

      // Return success (execution continues briefly before reload)
      return {
        extensionId,
        extensionName: extension.name,
        reloadSuccess: true,
        reloadMethod: 'chrome.runtime.reload',
        consoleLogs: [],
      };
    } else {
      throw new Error('chrome.runtime.reload not available');
    }
  }

  // Disable extension
  try {
    await chrome.management.setEnabled(extensionId, false);
  } catch (err) {
    throw new Error(`Failed to disable extension: ${err.message}`);
  }

  // Wait a bit for clean disable
  await sleep(100);

  // Re-enable extension
  try {
    await chrome.management.setEnabled(extensionId, true);
  } catch (err) {
    throw new Error(`Failed to enable extension: ${err.message}`);
  }

  console.log('[ChromeDevAssist] Extension reloaded:', extension.name);

  // Start console capture if requested (captures from ALL tabs since extension reload affects all)
  if (captureConsole) {
    await startConsoleCapture(commandId, duration, null);
  }

  // Get command-specific logs
  const logs = captureConsole ? getCommandLogs(commandId) : [];

  return {
    extensionId,
    extensionName: extension.name,
    reloadSuccess: true,
    consoleLogs: logs,
  };
}

/**
 * Handle capture-only command
 * Captures console logs without reloading any extension
 */
async function handleCaptureCommand(commandId, params) {
  const { duration = 5000 } = params;

  console.log('[ChromeDevAssist] Capturing console logs for', duration, 'ms');

  // Capture from ALL tabs (tabId = null means no filter)
  await startConsoleCapture(commandId, duration, null);

  // Get command-specific logs
  const logs = getCommandLogs(commandId);

  return {
    consoleLogs: logs,
  };
}

/**
 * Handle getAllExtensions command
 * Returns list of all installed extensions (excluding self and apps)
 */
async function handleGetAllExtensionsCommand(commandId, params) {
  console.log('[ChromeDevAssist] Getting all extensions');

  const extensions = await chrome.management.getAll();

  // Filter out self and apps (only return extensions)
  const filtered = extensions
    .filter(ext => ext.type === 'extension' && ext.id !== chrome.runtime.id)
    .map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      enabled: ext.enabled,
      description: ext.description,
      installType: ext.installType,
    }));

  return {
    extensions: filtered,
    count: filtered.length,
  };
}

/**
 * Handle getExtensionInfo command
 * Returns detailed information for a specific extension
 */
async function handleGetExtensionInfoCommand(commandId, params) {
  const { extensionId } = params;

  if (!extensionId) {
    throw new Error('extensionId is required');
  }

  console.log('[ChromeDevAssist] Getting info for extension:', extensionId);

  let extension;
  try {
    extension = await chrome.management.get(extensionId);
  } catch (err) {
    throw new Error(`Extension not found: ${extensionId}`);
  }

  return {
    id: extension.id,
    name: extension.name,
    version: extension.version,
    enabled: extension.enabled,
    description: extension.description,
    permissions: extension.permissions,
    hostPermissions: extension.hostPermissions,
    installType: extension.installType,
    mayDisable: extension.mayDisable,
  };
}

/**
 * Handle openUrl command
 * Opens a URL in a new tab, optionally capturing console logs
 *
 * NEW: Supports autoClose option to automatically close tab after capture
 * This prevents tab leaks in automated testing scenarios
 */
async function handleOpenUrlCommand(commandId, params) {
  // Safe JSON stringify (handles circular references)
  const safeStringify = obj => {
    try {
      const seen = new WeakSet();
      return JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        },
        2
      );
    } catch (err) {
      return '[Unable to stringify]';
    }
  };

  console.log('[ChromeDevAssist] handleOpenUrlCommand called with params:', safeStringify(params));

  const {
    url,
    active = true,
    captureConsole = false,
    duration = 5000,
    autoClose = false, // NEW: Automatic tab cleanup (default: false for backward compatibility)
  } = params;

  console.log('[ChromeDevAssist] Extracted parameters:', {
    url: url ? url.substring(0, 100) : url, // Truncate long URLs in logs
    active,
    captureConsole,
    duration,
    autoClose,
  });

  // Security: Validate URL parameter
  if (!url || url === '' || url === null || url === undefined) {
    throw new Error('url is required');
  }

  // Security: Block dangerous URL protocols
  const urlLower = url.toLowerCase().trim();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousProtocols.some(protocol => urlLower.startsWith(protocol))) {
    throw new Error(`Dangerous URL protocol not allowed: ${urlLower.split(':')[0]}`);
  }

  // Security: Validate duration parameter
  if (typeof duration !== 'number') {
    throw new Error(`Invalid duration type: expected number, got ${typeof duration}`);
  }

  if (!isFinite(duration)) {
    throw new Error('Invalid duration: must be finite');
  }

  if (duration < 0) {
    throw new Error('Invalid duration: must be non-negative');
  }

  if (isNaN(duration)) {
    throw new Error('Invalid duration: NaN not allowed');
  }

  // Security: Reject durations exceeding reasonable maximum (10 minutes)
  const MAX_DURATION = 600000; // 10 minutes
  if (duration > MAX_DURATION) {
    throw new Error(`Invalid duration: exceeds maximum allowed (${MAX_DURATION}ms)`);
  }

  const safeDuration = duration;

  console.log(
    '[ChromeDevAssist] Opening URL:',
    url.substring(0, 100),
    autoClose ? '(will auto-close)' : ''
  );

  // Create new tab (returns immediately with tab.id, page hasn't loaded yet)
  const tab = await chrome.tabs.create({
    url: url,
    active: active,
  });

  let logs = [];
  let tabClosed = false;

  try {
    // Start console capture for this specific tab (if requested)
    // Tab is created but page is still loading, so we'll catch all console logs
    if (captureConsole) {
      await startConsoleCapture(commandId, duration, tab.id);

      // Wait for capture duration
      await sleep(duration);
    }

    // Get captured logs
    logs = captureConsole ? getCommandLogs(commandId) : [];
  } finally {
    // IMPORTANT: Cleanup happens in finally block to ensure it runs even on errors
    console.log('[ChromeDevAssist] Entering finally block, autoClose =', autoClose);

    if (autoClose) {
      console.log('[ChromeDevAssist] Attempting to close tab:', tab.id);

      try {
        // Check if tab still exists before attempting to close
        const tabExists = await chrome.tabs.get(tab.id).catch(() => null);
        console.log('[ChromeDevAssist] Tab exists check:', tabExists ? 'YES' : 'NO');

        if (!tabExists) {
          console.warn('[ChromeDevAssist] Tab already closed:', tab.id);
          tabClosed = false;
        } else {
          // Attempt to remove the tab
          const removeResult = chrome.tabs.remove(tab.id);
          console.log('[ChromeDevAssist] chrome.tabs.remove returned:', typeof removeResult);
          console.log('[ChromeDevAssist] Is Promise?:', removeResult instanceof Promise);

          if (removeResult && typeof removeResult.then === 'function') {
            await removeResult;
            console.log('[ChromeDevAssist] Tab removal awaited successfully');
          } else {
            console.warn('[ChromeDevAssist] chrome.tabs.remove did NOT return Promise!');
          }

          tabClosed = true;
          console.log('[ChromeDevAssist] ✅ Successfully closed tab:', tab.id);
        }
      } catch (err) {
        // Don't silently ignore - log with more detail
        console.error('[ChromeDevAssist] ⚠️ TAB CLEANUP FAILED ⚠️');
        console.error('[ChromeDevAssist] Tab ID:', tab.id);
        console.error('[ChromeDevAssist] Error type:', err.constructor.name);
        console.error('[ChromeDevAssist] Error message:', err.message);
        console.error('[ChromeDevAssist] Error code:', err.code);
        console.error('[ChromeDevAssist] Stack:', err.stack);

        // Keep tabClosed as false to indicate failure
        tabClosed = false;
      }
    } else {
      console.log('[ChromeDevAssist] autoClose=false, skipping tab cleanup');
    }
  }

  // Return after cleanup completes
  return {
    tabId: tab.id,
    url: tab.url,
    consoleLogs: logs,
    tabClosed: tabClosed,
  };
}

/**
 * Handle reloadTab command
 * Reloads a specific tab, optionally with cache bypass (hard reload)
 */
async function handleReloadTabCommand(commandId, params) {
  const { tabId, bypassCache = false, captureConsole = false, duration = 5000 } = params;

  if (tabId === undefined) {
    throw new Error('tabId is required');
  }

  console.log('[ChromeDevAssist] Reloading tab:', tabId, bypassCache ? '(hard reload)' : '');

  // Start console capture for this specific tab (if requested)
  if (captureConsole) {
    await startConsoleCapture(commandId, duration, tabId);
  }

  // Reload tab (console capture script will be auto-injected at document_start)
  await chrome.tabs.reload(tabId, { bypassCache: bypassCache });

  // Wait for capture duration if capturing
  if (captureConsole) {
    await sleep(duration);
  }

  // Get captured logs
  const logs = captureConsole ? getCommandLogs(commandId) : [];

  return {
    tabId: tabId,
    bypassCache: bypassCache,
    consoleLogs: logs,
  };
}

/**
 * Handle closeTab command
 * Closes a specific tab
 */
async function handleCloseTabCommand(commandId, params) {
  const { tabId } = params;

  if (tabId === undefined) {
    throw new Error('tabId is required');
  }

  console.log('[ChromeDevAssist] Closing tab:', tabId);

  await chrome.tabs.remove(tabId);

  return {
    tabId: tabId,
    closed: true,
  };
}

/**
 * Handle getPageMetadata command
 * Extracts DOM metadata from a tab including:
 * - data-* attributes from body element
 * - window.testMetadata object
 * - Basic document properties (title, readyState, URL)
 */
async function handleGetPageMetadataCommand(commandId, params) {
  const { tabId } = params;

  if (tabId === undefined) {
    throw new Error('tabId is required');
  }

  console.log('[ChromeDevAssist] Extracting page metadata from tab:', tabId);

  // Get tab info for URL
  const tab = await chrome.tabs.get(tabId);

  // Execute script to extract metadata from page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      // Extract data-* attributes from body element
      const bodyAttributes = {};
      if (document.body) {
        for (const attr of document.body.attributes) {
          if (attr.name.startsWith('data-')) {
            // Convert data-test-id to testId
            const key = attr.name
              .slice(5)
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            bodyAttributes[key] = attr.value;
          }
        }
      }

      // Extract window.testMetadata if present
      const customMetadata =
        typeof window.testMetadata === 'object' ? window.testMetadata : undefined;

      // Combine all metadata
      const metadata = {
        ...bodyAttributes,
        title: document.title,
        readyState: document.readyState,
        url: document.URL,
      };

      // Add custom metadata if present
      if (customMetadata) {
        metadata.custom = customMetadata;
      }

      return metadata;
    },
  });

  // Get first result (we only execute in main frame)
  const metadata = results && results[0] && results[0].result ? results[0].result : {};

  return {
    tabId: tabId,
    url: tab.url,
    metadata: metadata,
  };
}

/**
 * Handle captureScreenshot command
 * Captures a screenshot of the visible area of a tab
 * @param {string} commandId - Command ID
 * @param {Object} params - { tabId, format, quality }
 * @returns {Promise<Object>} { tabId, dataUrl, format, quality, timestamp }
 */
async function handleCaptureScreenshotCommand(commandId, params) {
  const { tabId, format, quality } = params;

  if (tabId === undefined) {
    throw new Error('tabId is required');
  }

  console.log(
    '[ChromeDevAssist] Capturing screenshot of tab:',
    tabId,
    `format: ${format || 'png'}`
  );

  // Get tab to ensure it exists and get window ID
  const tab = await chrome.tabs.get(tabId);

  if (!tab) {
    throw new Error(`Tab not found: ${tabId}`);
  }

  // Capture visible tab using chrome.tabs.captureVisibleTab
  // This captures the visible area of the specified tab
  const captureOptions = {
    format: format || 'png',
  };

  // Add quality for JPEG
  if (format === 'jpeg' && quality !== undefined) {
    captureOptions.quality = quality;
  }

  // Capture the screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, captureOptions);

  // Build response
  const response = {
    tabId: tabId,
    dataUrl: dataUrl,
    format: format || 'png',
    timestamp: Date.now(),
  };

  // Include quality in response for JPEG
  if (format === 'jpeg') {
    response.quality = quality !== undefined ? quality : 90;
  }

  return response;
}

/**
 * Start capturing console logs for specified duration
 * Each command gets its own isolated log collection
 * Returns immediately - capture runs in background
 *
 * @param {string} commandId - Unique command identifier
 * @param {number} duration - Capture duration in milliseconds
 * @param {number|null} tabId - Tab ID to filter logs (null = capture all tabs)
 */
function startConsoleCapture(commandId, duration, tabId = null) {
  // Delegate to ConsoleCapture class which handles:
  // - State initialization (logs array, active=true, timeout, tabId)
  // - Tab-specific indexing (capturesByTab) for O(1) lookup
  // - Automatic timeout handling
  // - Auto-stop with endTime tracking
  consoleCapture.start(commandId, {
    tabId: tabId,
    maxLogs: MAX_LOGS_PER_CAPTURE,
    duration: duration,
  });

  console.log(
    `[ChromeDevAssist] Console capture started for command ${commandId}${tabId ? ` (tab ${tabId})` : ' (all tabs)'}`
  );

  // Note: Completion logging removed to prevent dangling timeout
  // Logs can be retrieved explicitly via getCommandLogs(commandId)

  return Promise.resolve();
}

/**
 * Get logs for a specific command
 * Returns logs and cleans up completed captures
 */
function getCommandLogs(commandId) {
  const logs = consoleCapture.getLogs(commandId);

  // Clean up after retrieving logs
  consoleCapture.cleanup(commandId);

  return logs;
}

/**
 * Receive console logs from content scripts
 * Content scripts intercept console methods and send logs here
 * Logs are distributed to ALL active captures
 *
 * Only runs in Chrome extension context (not in tests)
 */
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only process console messages
    if (message.type === 'console') {
      // Validate sender - must be from a content script in a tab
      if (!sender.tab) {
        console.warn('[ChromeDevAssist] Rejected console message from non-tab source');
        sendResponse({ received: false });
        return true;
      }

      // Validate message structure - must have required fields
      if (!message.level || !message.message || !message.timestamp) {
        console.warn(
          '[ChromeDevAssist] Rejected malformed console message (missing required fields)'
        );
        sendResponse({ received: false });
        return true;
      }

      // Truncate very long messages to prevent memory exhaustion
      const MAX_MESSAGE_LENGTH = 10000;
      let truncatedMessage = message.message;
      if (typeof message.message === 'string' && message.message.length > MAX_MESSAGE_LENGTH) {
        truncatedMessage = message.message.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
      }

      const logEntry = {
        level: message.level,
        message: truncatedMessage,
        timestamp: message.timestamp,
        source: message.source || 'unknown',
        url: sender.url || 'unknown',
        tabId: sender.tab.id,
        frameId: sender.frameId,
      };

      // Delegate to ConsoleCapture class which handles:
      // - O(1) tab-specific lookup via capturesByTab index
      // - Global capture routing (tabId === null)
      // - Limit enforcement (MAX_LOGS_PER_CAPTURE)
      // - Limit warning message generation
      const tabId = sender.tab.id;
      consoleCapture.addLog(tabId, logEntry);

      sendResponse({ received: true });
    }

    return true; // Keep message channel open for async response
  });
}

/**
 * Utility: sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Set extension status (only in Chrome extension context)
 */
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.set({
    status: {
      running: true,
      version: '1.0.0',
      lastUpdate: new Date().toISOString(),
    },
  });
  console.log('[ChromeDevAssist] Ready for commands');
}

/**
 * Export functions for testing (only in Node.js context)
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleOpenUrlCommand,
    handleReloadTabCommand,
    registerConsoleCaptureScript,
    sleep,
  };
}

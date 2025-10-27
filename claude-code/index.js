/**
 * Chrome Dev Assist - Main API
 * Simple interface for automated Chrome extension testing
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

// Constants
const DEFAULT_DURATION = 5000;
const DEFAULT_TIMEOUT = 30000;
const EXTENSION_ID_LENGTH = 32;

/**
 * Reload extension and optionally capture console logs
 * @param {string} extensionId - Chrome extension ID (32 characters)
 * @param {Object} options - Options
 * @param {number} options.duration - Console capture duration in ms (default: 5000)
 * @returns {Promise<Object>} Result with consoleLogs array and reloadSuccess boolean
 */
async function reloadAndCapture(extensionId, options = {}) {
  validateExtensionId(extensionId);

  const command = {
    id: generateCommandId(),
    type: 'reload',
    params: {
      extensionId,
      captureConsole: true,
      duration: options.duration || DEFAULT_DURATION
    }
  };

  return await sendCommand(command);
}

/**
 * Reload extension without capturing console
 * @param {string} extensionId - Chrome extension ID
 * @returns {Promise<Object>} Result with reloadSuccess boolean
 */
async function reload(extensionId) {
  validateExtensionId(extensionId);

  const command = {
    id: generateCommandId(),
    type: 'reload',
    params: {
      extensionId,
      captureConsole: false
    }
  };

  return await sendCommand(command);
}

/**
 * Capture console logs without reloading
 * @param {number} duration - Duration to capture in ms (default: 5000)
 * @returns {Promise<Object>} Result with consoleLogs array
 */
async function captureLogs(duration = DEFAULT_DURATION) {
  if (duration <= 0 || duration > 60000) {
    throw new Error('Duration must be between 1 and 60000 ms');
  }

  const command = {
    id: generateCommandId(),
    type: 'capture',
    params: {
      duration
    }
  };

  return await sendCommand(command);
}

/**
 * Get all installed extensions
 * @returns {Promise<Object>} Result with extensions array and count
 */
async function getAllExtensions() {
  const command = {
    id: generateCommandId(),
    type: 'getAllExtensions',
    params: {}
  };

  return await sendCommand(command);
}

/**
 * Get information about a specific extension
 * @param {string} extensionId - Chrome extension ID (32 characters)
 * @returns {Promise<Object>} Extension details with permissions
 */
async function getExtensionInfo(extensionId) {
  validateExtensionId(extensionId);

  const command = {
    id: generateCommandId(),
    type: 'getExtensionInfo',
    params: { extensionId }
  };

  return await sendCommand(command);
}

/**
 * Open URL in new tab
 * @param {string} url - URL to open
 * @param {Object} options - Options
 * @param {boolean} options.active - Focus the tab (default: true)
 * @param {boolean} options.captureConsole - Capture console logs (default: false)
 * @param {number} options.duration - Console capture duration ms (default: 5000)
 * @param {boolean} options.autoClose - Automatically close tab after capture completes (default: false)
 * @returns {Promise<Object>} Result with tabId, consoleLogs, and tabClosed
 */
async function openUrl(url, options = {}) {
  if (!url) {
    throw new Error('url is required');
  }

  if (typeof url !== 'string') {
    throw new Error('url must be a string');
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  const command = {
    id: generateCommandId(),
    type: 'openUrl',
    params: {
      url,
      active: options.active !== undefined ? options.active : true,
      captureConsole: options.captureConsole || false,
      duration: options.duration || DEFAULT_DURATION,
      autoClose: options.autoClose || false  // NEW: Automatic tab cleanup for testing
    }
  };

  return await sendCommand(command);
}

/**
 * Reload a tab
 * @param {number} tabId - Tab ID to reload
 * @param {Object} options - Options
 * @param {boolean} options.bypassCache - Hard reload (Cmd+Shift+R) (default: false)
 * @param {boolean} options.captureConsole - Capture console logs (default: false)
 * @param {number} options.duration - Console capture duration ms (default: 5000)
 * @returns {Promise<Object>} Result with tabId and consoleLogs
 */
async function reloadTab(tabId, options = {}) {
  if (tabId === undefined || tabId === null) {
    throw new Error('tabId is required');
  }

  if (typeof tabId !== 'number' || tabId <= 0) {
    throw new Error('tabId must be a positive number');
  }

  const command = {
    id: generateCommandId(),
    type: 'reloadTab',
    params: {
      tabId,
      bypassCache: options.bypassCache || false,
      captureConsole: options.captureConsole || false,
      duration: options.duration || DEFAULT_DURATION
    }
  };

  return await sendCommand(command);
}

/**
 * Close a tab
 * @param {number} tabId - Tab ID to close
 * @returns {Promise<Object>} Result with closed: true
 */
async function closeTab(tabId) {
  if (tabId === undefined || tabId === null) {
    throw new Error('tabId is required');
  }

  if (typeof tabId !== 'number' || tabId <= 0) {
    throw new Error('tabId must be a positive number');
  }

  const command = {
    id: generateCommandId(),
    type: 'closeTab',
    params: { tabId }
  };

  return await sendCommand(command);
}

/**
 * Get page metadata from a tab
 * Extracts DOM metadata including data-* attributes, window.testMetadata, and document properties
 * @param {number} tabId - Tab ID to extract metadata from
 * @returns {Promise<Object>} Result with { tabId, url, metadata }
 */
async function getPageMetadata(tabId) {
  // Validation: tabId is required
  if (tabId === undefined || tabId === null) {
    throw new Error('tabId is required');
  }

  // Validation: tabId must be a number
  if (typeof tabId !== 'number') {
    throw new Error('tabId must be a number');
  }

  // Validation: tabId must not be NaN
  if (Number.isNaN(tabId)) {
    throw new Error('tabId must be a number');
  }

  // Validation: tabId must be finite
  if (!Number.isFinite(tabId)) {
    throw new Error('tabId must be a finite number');
  }

  // Validation: tabId must be an integer
  if (!Number.isInteger(tabId)) {
    throw new Error('tabId must be an integer');
  }

  // Validation: tabId must be positive
  if (tabId <= 0) {
    throw new Error('tabId must be a positive integer');
  }

  // Validation: tabId must be within safe integer range
  if (tabId > Number.MAX_SAFE_INTEGER) {
    throw new Error('tabId exceeds safe integer range');
  }

  const command = {
    id: generateCommandId(),
    type: 'getPageMetadata',
    params: { tabId }
  };

  return await sendCommand(command);
}

/**
 * Capture screenshot of a tab
 * @param {number} tabId - Tab ID to capture
 * @param {Object} options - Options
 * @param {string} options.format - Image format: 'png' or 'jpeg' (default: 'png')
 * @param {number} options.quality - JPEG quality 0-100 (default: 90, ignored for PNG)
 * @returns {Promise<Object>} Result with { tabId, dataUrl, format, quality, timestamp }
 */
async function captureScreenshot(tabId, options = {}) {
  // Validation: tabId is required
  if (tabId === undefined || tabId === null) {
    throw new Error('tabId is required');
  }

  // Validation: tabId must be a number
  if (typeof tabId !== 'number') {
    throw new Error('Tab ID must be a number');
  }

  // Validation: tabId must not be NaN
  if (Number.isNaN(tabId)) {
    throw new Error('Tab ID must be a number');
  }

  // Validation: tabId must be finite
  if (!Number.isFinite(tabId)) {
    throw new Error('Tab ID must be a finite number');
  }

  // Validation: tabId must be an integer
  if (!Number.isInteger(tabId)) {
    throw new Error('Tab ID must be an integer');
  }

  // Validation: tabId must be positive
  if (tabId <= 0) {
    throw new Error('Tab ID must be a positive number');
  }

  // Validation: tabId must be within safe integer range
  if (tabId > Number.MAX_SAFE_INTEGER) {
    throw new Error('Tab ID exceeds safe integer range');
  }

  // Validation: format must be 'png' or 'jpeg'
  const format = options.format || 'png';
  if (format !== 'png' && format !== 'jpeg') {
    throw new Error('Format must be "png" or "jpeg"');
  }

  // Validation: quality must be 0-100 (for JPEG)
  const quality = options.quality !== undefined ? options.quality : 90;
  if (format === 'jpeg' && (quality < 0 || quality > 100)) {
    throw new Error('Quality must be between 0 and 100');
  }

  const command = {
    id: generateCommandId(),
    type: 'captureScreenshot',
    params: {
      tabId,
      format,
      quality: format === 'jpeg' ? quality : undefined
    }
  };

  return await sendCommand(command);
}

/**
 * Send command to extension via WebSocket server
 * Automatically starts server if not running
 * @private
 */
async function sendCommand(command) {
  return new Promise((resolve, reject) => {
    let retried = false;
    let timeout;

    function attemptConnection() {
      const ws = new WebSocket('ws://localhost:9876');

      ws.on('open', () => {
        // Send command to server
        ws.send(JSON.stringify({
          type: 'command',
          id: command.id,
          command: {
            type: command.type,
            params: command.params
          }
        }));

        // Set timeout for response
        timeout = setTimeout(() => {
          ws.close();
          reject(new Error(`Command timeout after ${DEFAULT_TIMEOUT}ms`));
        }, DEFAULT_TIMEOUT);
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());

        if (response.type === 'response' && response.id === command.id) {
          ws.close();
          resolve(response.data);
        } else if (response.type === 'error') {
          ws.close();
          reject(new Error(response.error.message || 'Command failed'));
        }
      });

      ws.on('error', async (err) => {
        clearTimeout(timeout);

        // Auto-start server on connection refused (Persona Requirement #4)
        if (err.code === 'ECONNREFUSED' && !retried) {
          retried = true;
          try {
            await startServer();
            attemptConnection(); // Retry connection
          } catch (startErr) {
            reject(new Error(`Failed to start server: ${startErr.message}`));
          }
        } else if (err.code === 'ECONNREFUSED') {
          // Second attempt failed
          reject(new Error('WebSocket server not running. Try: node server/websocket-server.js'));
        } else {
          reject(err);
        }
      });
    }

    attemptConnection();
  });
}

/**
 * Start WebSocket server in background
 * @private
 */
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../server/websocket-server.js');

    // Spawn server as detached background process
    const serverProcess = spawn('node', [serverPath], {
      detached: true,
      stdio: 'ignore'
    });

    serverProcess.unref();

    // Wait for server to start (1 second)
    setTimeout(() => {
      // Verify server is responding
      const testWs = new WebSocket('ws://localhost:9876');

      testWs.on('open', () => {
        testWs.close();
        resolve();
      });

      testWs.on('error', () => {
        reject(new Error('Server started but not responding'));
      });
    }, 1000);
  });
}

/**
 * Validate extension ID format
 * @private
 */
function validateExtensionId(extensionId) {
  if (!extensionId) {
    throw new Error('extensionId is required');
  }

  if (typeof extensionId !== 'string') {
    throw new Error('extensionId must be a string');
  }

  if (extensionId.length !== EXTENSION_ID_LENGTH) {
    throw new Error(`extensionId must be ${EXTENSION_ID_LENGTH} characters`);
  }

  // Chrome extension IDs are lowercase letters a-p
  if (!/^[a-p]{32}$/.test(extensionId)) {
    throw new Error('Invalid extensionId format (must be 32 lowercase letters a-p)');
  }
}

/**
 * Generate unique command ID
 * @private
 */
function generateCommandId() {
  return `cmd-${crypto.randomUUID()}`;
}

// Export public API
module.exports = {
  reloadAndCapture,
  reload,
  captureLogs,
  getAllExtensions,
  getExtensionInfo,
  openUrl,
  reloadTab,
  closeTab,
  getPageMetadata,
  captureScreenshot
};

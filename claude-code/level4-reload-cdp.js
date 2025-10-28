/**
 * Level 4 Reload - CDP Method
 *
 * Reloads extension code from disk using Chrome DevTools Protocol.
 * Requires Chrome started with --remote-debugging-port=9222
 *
 * Method:
 * 1. Connect to CDP WebSocket (ws://localhost:9222/devtools/browser)
 * 2. Execute chrome.management.setEnabled(id, false) via Runtime.evaluate
 * 3. Wait 200ms
 * 4. Execute chrome.management.setEnabled(id, true) via Runtime.evaluate
 * 5. Return success with timing
 *
 * This is Level 4 reload - loads fresh code from disk.
 */

const WebSocket = require('ws');
const http = require('http');
const { validateExtensionId } = require('../server/validation');

/**
 * Get CDP WebSocket endpoint URL
 * @param {number} port - Debug port (default 9222)
 * @returns {Promise<string>} WebSocket URL
 */
async function getCDPWebSocketURL(port = 9222) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.webSocketDebuggerUrl);
        } catch (err) {
          reject(new Error('Failed to parse CDP version response'));
        }
      });
    });

    req.on('error', err => {
      if (err.code === 'ECONNREFUSED') {
        reject(
          new Error(`CDP not available (Chrome not started with --remote-debugging-port=${port})`)
        );
      } else {
        reject(new Error(`CDP connection failed: ${err.message}`));
      }
    });

    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('CDP connection timeout'));
    });
  });
}

/**
 * Execute JavaScript in browser context via CDP
 * @param {WebSocket} ws - CDP WebSocket connection
 * @param {string} expression - JavaScript code to execute
 * @returns {Promise<any>} Result of execution
 */
async function evaluateExpression(ws, expression) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);

    const handler = data => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);

          if (msg.error) {
            reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        reject(new Error(`Failed to parse CDP response: ${err.message}`));
      }
    };

    ws.on('message', handler);

    ws.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
          expression,
          awaitPromise: true,
          returnByValue: true,
        },
      })
    );

    // Timeout after 10 seconds
    setTimeout(() => {
      ws.off('message', handler);
      reject(new Error('CDP command timeout'));
    }, 10000);
  });
}

/**
 * Reload extension using CDP method
 *
 * @param {string} extensionId - Extension ID to reload
 * @param {Object} options - Options
 * @param {number} options.port - CDP port (default 9222)
 * @param {number} options.delay - Delay between disable/enable (ms, default 200)
 * @returns {Promise<Object>} Result with timing information
 */
async function level4ReloadCDP(extensionId, options = {}) {
  const startTime = Date.now();

  // Validate extension ID
  if (!validateExtensionId(extensionId)) {
    throw new Error('Invalid extension ID format (must be 32 lowercase letters a-z)');
  }

  // Options
  const port = options.port || 9222;
  const delay = options.delay || 200;

  // Validate delay
  if (typeof delay !== 'number' || delay < 50 || delay > 2000) {
    throw new Error('Delay must be between 50 and 2000 milliseconds');
  }

  let ws = null;

  try {
    // Step 1: Get CDP WebSocket URL
    const wsUrl = await getCDPWebSocketURL(port);

    // Step 2: Connect to CDP
    ws = await new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);

      socket.on('open', () => resolve(socket));
      socket.on('error', err => reject(new Error(`CDP WebSocket error: ${err.message}`)));

      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          reject(new Error('CDP WebSocket connection timeout'));
        }
      }, 5000);
    });

    // Step 3: Disable extension
    await evaluateExpression(ws, `chrome.management.setEnabled('${extensionId}', false)`);

    // Step 4: Wait delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Step 5: Enable extension
    await evaluateExpression(ws, `chrome.management.setEnabled('${extensionId}', true)`);

    const completedTime = Date.now();

    // Close WebSocket
    ws.close();

    // Return success with timing
    return {
      reloaded: true,
      method: 'cdp',
      extensionId,
      port,
      timing: {
        started: startTime,
        completed: completedTime,
        duration: completedTime - startTime,
      },
    };
  } catch (err) {
    // Clean up WebSocket on error
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    // Re-throw with context
    throw new Error(`CDP reload failed: ${err.message}`);
  }
}

module.exports = level4ReloadCDP;

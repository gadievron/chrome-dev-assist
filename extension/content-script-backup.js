/**
 * Chrome Dev Assist - Content Script
 * Injects console capture into the page's main world
 */

(function() {
  'use strict';

  // This script runs in the isolated content script world
  // We need to inject into the page's main world to capture console logs

  // Create inline script that will run in the page's main world
  const inlineScript = `
    (function() {
      'use strict';

      // Store original console methods
      const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };

      /**
       * Format console arguments into string
       */
      function formatArgs(args) {
        return Array.from(args).map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (err) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
      }

      /**
       * Get source information from stack trace
       */
      function getSourceInfo() {
        try {
          const stack = new Error().stack;
          if (!stack) return 'unknown';
          const lines = stack.split('\\n');
          if (lines.length > 3) {
            return lines[3].trim();
          }
          return 'unknown';
        } catch (err) {
          return 'unknown';
        }
      }

      /**
       * Send log to extension via custom event
       */
      function sendToExtension(level, message, source) {
        // Dispatch custom event that the content script will catch
        window.dispatchEvent(new CustomEvent('chromeDevAssist:consoleLog', {
          detail: {
            level: level,
            message: message,
            timestamp: new Date().toISOString(),
            source: source
          }
        }));
      }

      /**
       * Wrap a console method
       */
      function wrapConsoleMethod(level) {
        const original = originalConsole[level];

        console[level] = function(...args) {
          // Call original method first
          original.apply(console, args);

          // Format and send to extension
          const message = formatArgs(args);
          const source = getSourceInfo();
          sendToExtension(level, message, source);
        };
      }

      // Wrap all console methods
      ['log', 'error', 'warn', 'info', 'debug'].forEach(wrapConsoleMethod);

      // Signal that capture is initialized (this log will be captured)
      console.log('[ChromeDevAssist] Console capture initialized in main world');
    })();
  `;

  // Inject the script into the page's main world
  const script = document.createElement('script');
  script.textContent = inlineScript;
  (document.head || document.documentElement).appendChild(script);
  script.remove(); // Clean up

  // DEBUG: Log that content script is running
  console.log('[ChromeDevAssist] Content script loaded in isolated world');

  // Listen for console log events from the page's world
  window.addEventListener('chromeDevAssist:consoleLog', (event) => {
    const logData = event.detail;

    // Forward to background script
    try {
      chrome.runtime.sendMessage({
        type: 'console',
        level: logData.level,
        message: logData.message,
        timestamp: logData.timestamp,
        source: logData.source
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension might not be ready - that's okay
          console.warn('[ChromeDevAssist] Failed to send message:', chrome.runtime.lastError.message);
        }
      });
    } catch (err) {
      console.error('[ChromeDevAssist] Exception forwarding message:', err);
    }
  });

})();

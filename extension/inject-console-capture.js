/**
 * Injected script - runs in page's MAIN world
 * This code will have access to the page's real console object
 */

(function() {
  'use strict';

  // Only inject once
  if (window.__chromeDevAssistInjected) {
    return;
  }
  window.__chromeDevAssistInjected = true;

  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  function sendToExtension(level, args) {
    let message = Array.from(args).map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Truncate very long messages at source to prevent memory exhaustion
    // and reduce data sent through CustomEvent bridge
    const MAX_MESSAGE_LENGTH = 10000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
    }

    // Dispatch event for content script to catch
    window.dispatchEvent(new CustomEvent('chromeDevAssist:consoleLog', {
      detail: {
        level: level,
        message: message,
        timestamp: new Date().toISOString(),
        source: 'page-main-world'
      }
    }));
  }

  // Wrap console methods
  console.log = function() {
    originalLog.apply(console, arguments);
    sendToExtension('log', arguments);
  };

  console.error = function() {
    originalError.apply(console, arguments);
    sendToExtension('error', arguments);
  };

  console.warn = function() {
    originalWarn.apply(console, arguments);
    sendToExtension('warn', arguments);
  };

  console.info = function() {
    originalInfo.apply(console, arguments);
    sendToExtension('info', arguments);
  };

  console.debug = function() {
    originalDebug.apply(console, arguments);
    sendToExtension('debug', arguments);
  };

  // Signal that capture is ready
  console.log('[ChromeDevAssist] Console capture initialized in main world');
})();

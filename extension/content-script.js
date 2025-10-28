/**
 * Chrome Dev Assist - Content Script (ISOLATED world)
 *
 * Listens for CustomEvents from the MAIN world script (inject-console-capture.js)
 * and forwards them to the background service worker.
 *
 * NOTE: The MAIN world script is registered via chrome.scripting.registerContentScripts()
 * in background.js, not injected from here.
 */

(function () {
  'use strict';

  // Listen for console log events from MAIN world script
  window.addEventListener('chromeDevAssist:consoleLog', function (event) {
    const logData = event.detail;

    try {
      chrome.runtime.sendMessage({
        type: 'console',
        level: logData.level,
        message: logData.message,
        timestamp: logData.timestamp,
        source: logData.source,
      });
    } catch (err) {
      // Silently fail if extension context is invalidated
    }
  });
})();

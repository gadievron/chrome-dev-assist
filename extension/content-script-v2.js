/**
 * Chrome Dev Assist - Content Script V2
 * Simpler approach without template literal nesting issues
 */

(function () {
  'use strict';

  // Create the inline script as an array of strings to avoid template literal issues
  const scriptLines = [
    '(function() {',
    '  "use strict";',
    '  ',
    '  const originalLog = console.log;',
    '  const originalError = console.error;',
    '  const originalWarn = console.warn;',
    '  const originalInfo = console.info;',
    '  const originalDebug = console.debug;',
    '  ',
    '  function sendToExtension(level, args) {',
    '    const message = Array.from(args).map(arg => {',
    '      if (typeof arg === "object") {',
    '        try { return JSON.stringify(arg); }',
    '        catch (e) { return String(arg); }',
    '      }',
    '      return String(arg);',
    '    }).join(" ");',
    '    ',
    '    window.dispatchEvent(new CustomEvent("chromeDevAssist:consoleLog", {',
    '      detail: {',
    '        level: level,',
    '        message: message,',
    '        timestamp: new Date().toISOString(),',
    '        source: "page"',
    '      }',
    '    }));',
    '  }',
    '  ',
    '  console.log = function() {',
    '    originalLog.apply(console, arguments);',
    '    sendToExtension("log", arguments);',
    '  };',
    '  ',
    '  console.error = function() {',
    '    originalError.apply(console, arguments);',
    '    sendToExtension("error", arguments);',
    '  };',
    '  ',
    '  console.warn = function() {',
    '    originalWarn.apply(console, arguments);',
    '    sendToExtension("warn", arguments);',
    '  };',
    '  ',
    '  console.info = function() {',
    '    originalInfo.apply(console, arguments);',
    '    sendToExtension("info", arguments);',
    '  };',
    '  ',
    '  console.debug = function() {',
    '    originalDebug.apply(console, arguments);',
    '    sendToExtension("debug", arguments);',
    '  };',
    '  ',
    '  console.log("[ChromeDevAssist] Console capture initialized in main world");',
    '})();',
  ];

  const inlineScript = scriptLines.join('\n');

  // Inject script into main world
  try {
    const script = document.createElement('script');
    script.textContent = inlineScript;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (err) {
    console.error('[ChromeDevAssist] Failed to inject script:', err);
  }

  // Listen for events from main world
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
      // Silently fail
    }
  });
})();

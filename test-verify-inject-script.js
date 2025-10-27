#!/usr/bin/env node

/**
 * Verify Inject Script Registration Diagnostic
 *
 * This script checks if inject-console-capture.js is properly registered
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔍 Inject Script Registration Diagnostic');
console.log('═══════════════════════════════════════════════════════════════════\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to extension\n');

  // Create a simple test page that logs to console
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inject Script Test</title>
    </head>
    <body>
      <h1>Inject Script Verification</h1>
      <div id="status">Checking...</div>

      <script>
        // Check if inject script has run
        const status = document.getElementById('status');

        if (window.__chromeDevAssistInjected) {
          status.textContent = '✅ Inject script IS loaded';
          status.style.color = 'green';

          // Test console wrapping
          console.log('[PAGE TEST] This message should be captured');

          // Check if console was wrapped
          if (console.log.toString().includes('originalLog')) {
            status.textContent += ' | ✅ Console IS wrapped';
          } else {
            status.textContent += ' | ❌ Console NOT wrapped';
          }
        } else {
          status.textContent = '❌ Inject script NOT loaded';
          status.style.color = 'red';
        }

        // Also log directly
        console.log('[PAGE TEST] Direct console.log call');
        console.warn('[PAGE TEST] Direct console.warn call');
        console.error('[PAGE TEST] Direct console.error call');
      </script>
    </body>
    </html>
  `;

  const testUrl = 'http://127.0.0.1:9876/fixtures/test-console-simple.html';

  console.log('📂 Opening test page with console capture...');
  console.log(`URL: ${testUrl}\n`);

  const cmdId = 'verify-' + Date.now();

  ws.send(JSON.stringify({
    type: 'command',
    id: cmdId,
    targetExtensionId: EXTENSION_ID,
    command: {
      type: 'openUrl',
      params: {
        url: testUrl,
        captureConsole: true,
        duration: 3000,
        autoClose: false  // Keep tab open so we can inspect
      }
    }
  }));

  console.log('⏳ Waiting for capture to complete (3 seconds)...\n');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'response') {
    const { consoleLogs, tabId } = message.data || {};

    console.log('📥 Capture complete!\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('RESULTS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log(`Tab ID: ${tabId}`);
    console.log(`Console logs captured: ${consoleLogs ? consoleLogs.length : 0}\n`);

    if (consoleLogs && consoleLogs.length > 0) {
      console.log('Captured messages:\n');
      consoleLogs.forEach((log, i) => {
        const prefix = log.message.includes('[PAGE TEST]') ? '📄' :
                      log.message.includes('[ChromeDevAssist]') ? '🔧' : '❓';
        console.log(`${i + 1}. ${prefix} [${log.level}] ${log.message}`);
      });

      const pageMessages = consoleLogs.filter(log => log.message.includes('[PAGE TEST]'));
      const extensionMessages = consoleLogs.filter(log => log.message.includes('[ChromeDevAssist]'));

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('ANALYSIS');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      console.log(`Extension messages: ${extensionMessages.length}`);
      console.log(`Page messages: ${pageMessages.length}\n`);

      if (pageMessages.length > 0) {
        console.log('✅ SUCCESS - Page console messages ARE being captured!');
        console.log('The console capture fix is working!\n');
      } else {
        console.log('❌ FAILURE - Page console messages NOT captured');
        console.log('Only extension messages captured (if any)\n');

        console.log('Possible causes:');
        console.log('1. Inject script not running before page scripts');
        console.log('2. Console wrapper not intercepting page console calls');
        console.log('3. CustomEvent not reaching content script');
        console.log('4. Messages not being sent to background\n');

        console.log('Next steps:');
        console.log(`1. Open Chrome DevTools for tab ${tabId}`);
        console.log('2. Check page console for [ChromeDevAssist] messages');
        console.log('3. Check if window.__chromeDevAssistInjected === true');
        console.log('4. Type: console.log("manual test") and see if it\'s captured');
        console.log('5. Check extension service worker console for errors\n');
      }
    } else {
      console.log('❌ FAILURE - No console logs captured at all\n');

      console.log('Possible causes:');
      console.log('1. Console capture not starting');
      console.log('2. Page not loading');
      console.log('3. Inject script not registered');
      console.log('4. Content script not forwarding messages\n');

      console.log('Next steps:');
      console.log(`1. Open Chrome DevTools for tab ${tabId}`);
      console.log('2. Check if page loaded correctly');
      console.log('3. Check extension service worker console for errors');
      console.log('4. Manually run: chrome.scripting.getRegisteredContentScripts()');
      console.log('   in service worker console to verify inject script is registered\n');
    }

    console.log(`Tab ${tabId} left open for manual inspection.`);
    console.log('Close the tab manually when done.\n');

    setTimeout(() => {
      ws.close();
      process.exit(consoleLogs && consoleLogs.length > 0 ? 0 : 1);
    }, 1000);
  } else if (message.type === 'error') {
    console.error('❌ Command failed:', message.error);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  console.error('\nIs the server running? Try: node server.js\n');
  process.exit(1);
});

ws.on('close', () => {
  console.log('👋 Disconnected\n');
});

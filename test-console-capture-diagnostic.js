#!/usr/bin/env node

/**
 * Console Capture Diagnostic Test
 *
 * Tests console capture with a simple data: URL to eliminate network delays
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔍 Console Capture Diagnostic Test');
console.log('═══════════════════════════════════════════════════════════════════\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to extension\n');

  const commandId = 'diagnostic-' + Date.now();

  // Use data: URL for instant loading (no network delay)
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Diagnostic Test</title></head>
    <body>
      <h1>Console Capture Diagnostic</h1>
      <script>
        console.log('[TEST] Message 1 - Inline script in body');
        console.warn('[TEST] Message 2 - Warning');
        console.error('[TEST] Message 3 - Error');
        console.log('[TEST] Message 4 - Final');
      </script>
    </body>
    </html>
  `;

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

  console.log('📂 Opening data: URL with console capture...\n');

  ws.send(JSON.stringify({
    type: 'command',
    id: commandId,
    targetExtensionId: EXTENSION_ID,
    command: {
      type: 'openUrl',
      params: {
        url: dataUrl,
        captureConsole: true,
        duration: 2000,  // 2 seconds should be plenty
        autoClose: true   // Clean up automatically
      }
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'response') {
    console.log('📥 Response received!\n');

    const { consoleLogs, tabId } = message.data;

    if (!consoleLogs || consoleLogs.length === 0) {
      console.error('❌ No console logs captured!');
      console.error('\nThis indicates console capture is not working.\n');
      ws.close();
      process.exit(1);
    }

    console.log(`📋 Captured ${consoleLogs.length} console messages:\n`);

    consoleLogs.forEach((log, index) => {
      const prefix = log.message.includes('[ChromeDevAssist]') ? '🔧' : '📄';
      console.log(`${index + 1}. ${prefix} [${log.level}] ${log.message.substring(0, 200)}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const extensionMessages = consoleLogs.filter(log =>
      log.message.includes('[ChromeDevAssist]')
    );
    const pageMessages = consoleLogs.filter(log =>
      log.message.includes('[TEST]')
    );
    const debugInjectMessages = consoleLogs.filter(log =>
      log.message.includes('DEBUG INJECT')
    );
    const debugContentMessages = consoleLogs.filter(log =>
      log.message.includes('DEBUG CONTENT')
    );

    console.log(`Extension messages: ${extensionMessages.length}`);
    console.log(`Page messages: ${pageMessages.length} (expected: 4)`);
    console.log(`DEBUG INJECT messages: ${debugInjectMessages.length}`);
    console.log(`DEBUG CONTENT messages: ${debugContentMessages.length}`);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    if (pageMessages.length >= 4) {
      console.log('✅ SUCCESS - Console capture is working!');
      console.log('Race condition fix VERIFIED.\n');
      ws.close();
      process.exit(0);
    } else {
      console.log('❌ FAILURE - Page messages not captured');
      console.log('\nPossible issues:');
      console.log('1. inject-console-capture.js not running');
      console.log('2. Content-script not receiving CustomEvents');
      console.log('3. Messages not being forwarded to background');
      console.log('4. Race condition still exists\n');
      ws.close();
      process.exit(1);
    }

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

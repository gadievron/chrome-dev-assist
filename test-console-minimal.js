#!/usr/bin/env node

/**
 * Minimal Console Capture Diagnostic
 *
 * Opens a page, captures console, shows exactly what was captured
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected\n');

  const html = `
    <!DOCTYPE html>
    <html><head><title>Test</title></head><body>
      <h1>Console Test</h1>
      <script>
        setTimeout(() => {
          console.log('TEST MESSAGE 1');
          console.warn('TEST MESSAGE 2');
          console.error('TEST MESSAGE 3');
        }, 500);
      </script>
    </body></html>
  `;

  const cmdId = 'test-' + Date.now();

  ws.send(
    JSON.stringify({
      type: 'command',
      id: cmdId,
      targetExtensionId: EXTENSION_ID,
      command: {
        type: 'openUrl',
        params: {
          url: 'http://127.0.0.1:9876/fixtures/test-console-simple.html',
          captureConsole: true,
          duration: 3000,
          autoClose: true,
        },
      },
    })
  );

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: 'command',
        id: cmdId + '-status',
        targetExtensionId: EXTENSION_ID,
        command: {
          type: 'ping',
        },
      })
    );
  }, 5000);
});

ws.on('message', data => {
  const message = JSON.parse(data.toString());

  console.log('📨 Message type:', message.type);

  if (message.type === 'response') {
    const { consoleLogs } = message.data || {};

    console.log('\nCapture result:');
    console.log('- consoleLogs exists:', consoleLogs !== undefined);
    console.log('- consoleLogs is array:', Array.isArray(consoleLogs));
    console.log('- consoleLogs length:', consoleLogs ? consoleLogs.length : 'N/A');

    if (consoleLogs && consoleLogs.length > 0) {
      console.log('\nCaptured messages:');
      consoleLogs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.level}] ${log.message}`);
      });
    } else {
      console.log('\n❌ No messages captured');
    }

    setTimeout(() => {
      ws.close();
      process.exit(consoleLogs && consoleLogs.length > 0 ? 0 : 1);
    }, 1000);
  }
});

ws.on('error', err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

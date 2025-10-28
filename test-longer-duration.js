#!/usr/bin/env node
const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9876');

ws.on('open', () => {
  console.log('Testing with 10-second duration...\n');

  ws.send(
    JSON.stringify({
      type: 'command',
      id: 'long-test-' + Date.now(),
      targetExtensionId: 'gnojocphflllgichkehjhkojkihcihfn',
      command: {
        type: 'openUrl',
        params: {
          url: 'http://127.0.0.1:9876/fixtures/test-console-simple.html',
          captureConsole: true,
          duration: 10000, // 10 seconds instead of 3
          autoClose: true,
        },
      },
    })
  );
});

ws.on('message', data => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'response') {
    console.log('\nRESULT:');
    console.log('Console logs captured:', msg.data.consoleLogs?.length || 0);
    if (msg.data.consoleLogs?.length > 0) {
      console.log('\n✅ SUCCESS! Messages captured:');
      msg.data.consoleLogs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.level}] ${log.message}`);
      });
    } else {
      console.log('\n❌ FAILED: 0 logs captured despite longer duration');
    }
    ws.close();
    process.exit(msg.data.consoleLogs?.length > 0 ? 0 : 1);
  }
});

ws.on('error', err => {
  console.error('Error:', err.message);
  process.exit(1);
});

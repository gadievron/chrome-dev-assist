/**
 * Test capture command with real extension
 */
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9876');

ws.on('open', () => {
  console.log('✓ Connected to server');

  // Send capture command
  ws.send(
    JSON.stringify({
      type: 'command',
      id: 'test-capture-123',
      command: {
        type: 'capture',
        params: {
          duration: 2000, // Capture for 2 seconds
        },
      },
    })
  );

  console.log('→ Sent capture command (2 second duration)');
});

ws.on('message', data => {
  const response = JSON.parse(data.toString());

  console.log('\n← Received response:');
  console.log('  Type:', response.type);
  console.log('  Command ID:', response.id);

  if (response.type === 'response') {
    console.log('  Console Logs:', response.data.consoleLogs.length, 'entries');
    console.log('\n✓ SUCCESS - Capture command works!');
  } else if (response.type === 'error') {
    console.log('  Error:', response.error.message);
    console.log('\n✗ FAILED - Got error response');
  }

  ws.close();
});

ws.on('error', err => {
  console.error('✗ Error:', err.message);
});

ws.on('close', () => {
  console.log('\nConnection closed');
  process.exit(0);
});

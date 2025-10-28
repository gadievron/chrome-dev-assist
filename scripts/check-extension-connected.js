/**
 * Check if Chrome Dev Assist extension is connected
 */

const WebSocket = require('ws');

console.log('Checking extension connection...\n');

const ws = new WebSocket('ws://localhost:9876');

ws.on('open', () => {
  console.log('✓ WebSocket server is running on port 9876');

  // Send a ping to check if extension is connected
  const checkMessage = {
    type: 'health-check',
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(checkMessage));

  // Wait for response
  setTimeout(() => {
    ws.close();
    console.log('\n⚠️  Extension may not be connected (no response to ping)');
    console.log('\nTo load the extension:');
    console.log('1. Open Chrome');
    console.log('2. Go to chrome://extensions');
    console.log('3. Enable "Developer mode" (top right)');
    console.log('4. Click "Load unpacked"');
    console.log('5. Select the "extension" folder');
    console.log('6. Verify extension appears and is enabled');
    console.log('7. Re-run tests');
    process.exit(0);
  }, 2000);
});

ws.on('message', data => {
  try {
    const message = JSON.parse(data);
    if (message.type === 'extensionConnected' || message.extensionId) {
      console.log('✓ Extension is connected!');
      console.log('  Extension ID:', message.extensionId || 'unknown');
      ws.close();
      process.exit(0);
    }
  } catch (e) {
    // Ignore parse errors
  }
});

ws.on('error', error => {
  console.log('✗ WebSocket server not running');
  console.log('\nTo start the server:');
  console.log('  node server/websocket-server.js');
  console.log('\nThen load the extension (see steps above)');
  process.exit(1);
});

ws.on('close', () => {
  // Connection closed
});

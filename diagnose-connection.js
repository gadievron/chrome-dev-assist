#!/usr/bin/env node
/**
 * Diagnostic script to check Chrome Dev Assist connection status
 */

const WebSocket = require('ws');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Chrome Dev Assist - Connection Diagnostic');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Step 1: Check if server is running
console.log('1. Checking if WebSocket server is running...');
const ws = new WebSocket('ws://localhost:9876');

ws.on('open', () => {
  console.log('   ✓ Server is running and accepting connections\n');

  console.log('2. Listening for extension registration...');
  console.log('   (This will timeout after 5 seconds if extension not connected)\n');

  // Listen for messages
  let registered = false;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('   Received message:', msg.type);

      if (msg.type === 'register') {
        registered = true;
        console.log('   ✓ Extension registration detected!');
        console.log('   Extension ID:', msg.extensionId);
        ws.close();
        process.exit(0);
      }
    } catch (err) {
      console.log('   ⚠ Could not parse message:', data.toString());
    }
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    if (!registered) {
      console.log('   ✗ TIMEOUT: Extension did not connect in 5 seconds\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DIAGNOSIS: Extension is NOT connected');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('SOLUTION:');
      console.log('1. Open Chrome → chrome://extensions');
      console.log('2. Find "Chrome Dev Assist" extension');
      console.log('3. Click the reload icon (circular arrow)');
      console.log('4. OR click "service worker" link to check console for errors');
      console.log('5. Then re-run this diagnostic\n');
      ws.close();
      process.exit(1);
    }
  }, 5000);
});

ws.on('error', (err) => {
  console.error('   ✗ ERROR: Could not connect to server');
  console.error('  ', err.message, '\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DIAGNOSIS: WebSocket server is NOT running');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('SOLUTION:');
  console.log('Run: node server/websocket-server.js');
  console.log('Or: The server should auto-start when you call the API\n');
  process.exit(1);
});

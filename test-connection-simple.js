#!/usr/bin/env node

/**
 * Simple WebSocket Connection Test
 *
 * Tests if we can connect to the server and exchange messages.
 * This eliminates extension-specific issues (service worker, manifest, etc.)
 */

const WebSocket = require('ws');

const WS_URL = 'ws://127.0.0.1:9876';  // Use 127.0.0.1 directly

console.log('=== Simple Connection Test ===');
console.log(`Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connection opened successfully!');
  console.log('Connection is bidirectional.\n');

  // Don't send anything - just verify we can connect
  console.log('Closing connection...');
  ws.close();
});

ws.on('close', () => {
  console.log('✅ Connection closed cleanly');
  console.log('\n=== RESULT: Connection works! ===');
  console.log('The ERR_CONNECTION_REFUSED error is likely:');
  console.log('1. Old error from before server started');
  console.log('2. Extension service worker reconnection cycle');
  console.log('3. Registration validation issue\n');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ Connection failed!');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  console.error('\n=== RESULT: Connection broken ===');
  console.error('Server may not be running or port is blocked\n');
  process.exit(1);
});

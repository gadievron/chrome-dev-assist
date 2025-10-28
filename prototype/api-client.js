#!/usr/bin/env node

/**
 * PROTOTYPE: API Client
 * Validates WebSocket communication from API to extension
 */

const WebSocket = require('ws');

console.log('[Prototype API] Connecting to server...');

const ws = new WebSocket('ws://localhost:9876');
let timeout;

ws.on('open', () => {
  console.log('[Prototype API] ✓ Connected to server');

  // Send command
  const command = {
    type: 'command',
    id: 'test-' + Date.now(),
    command: {
      type: 'reload',
      params: {
        extensionId: 'test-extension',
        captureConsole: true,
      },
    },
  };

  console.log('[Prototype API] → Sending command:', command.id);
  ws.send(JSON.stringify(command));

  // Set timeout
  timeout = setTimeout(() => {
    console.log('[Prototype API] ✗ Timeout - no response after 5 seconds');
    ws.close();
    process.exit(1);
  }, 5000);
});

ws.on('message', data => {
  clearTimeout(timeout);
  const response = JSON.parse(data.toString());

  console.log('[Prototype API] ← Received response:', response.type);
  console.log('[Prototype API]   Command ID:', response.id);
  console.log('[Prototype API]   Data:', JSON.stringify(response.data, null, 2));
  console.log('[Prototype API] ✓ SUCCESS - WebSocket communication works!');

  ws.close();
  process.exit(0);
});

ws.on('error', err => {
  clearTimeout(timeout);
  console.error('[Prototype API] ✗ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('[Prototype API] Disconnected');
});

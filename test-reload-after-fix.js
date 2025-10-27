#!/usr/bin/env node

/**
 * Reload Extension After Console Capture Fix
 *
 * Uses forceReload command to reload extension with the race condition fix applied.
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔄 Reloading Extension (Console Capture Fix Applied)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to extension\n');

  const commandId = 'reload-fix-' + Date.now();

  console.log('📤 Sending forceReload command...\n');

  ws.send(JSON.stringify({
    type: 'command',
    id: commandId,
    targetExtensionId: EXTENSION_ID,
    command: {
      type: 'forceReload',
      params: {
        extensionId: EXTENSION_ID
      }
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'response') {
    console.log('✅ Extension reloaded successfully!\n');
    console.log('Console capture race condition fix is now active.');
    console.log('Ready to run integration tests.\n');
    ws.close();
  } else if (message.type === 'error') {
    console.error('❌ Reload failed:', message.error);
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

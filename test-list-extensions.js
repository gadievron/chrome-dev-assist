#!/usr/bin/env node

/**
 * Test: List Connected Extensions
 *
 * Sends a listExtensions command to see if the extension is registered.
 * This will tell us if the ESTABLISHED connection we see in lsof is functional.
 */

const WebSocket = require('ws');

const WS_URL = 'ws://127.0.0.1:9876';

console.log('=== List Extensions Test ===');
console.log(`Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to server');
  console.log('Sending listExtensions command...\n');

  // Send listExtensions command
  ws.send(
    JSON.stringify({
      type: 'command',
      id: 'test-list-' + Date.now(),
      command: {
        type: 'listExtensions',
      },
    })
  );
});

ws.on('message', data => {
  const message = JSON.parse(data.toString());

  console.log('📥 Received:', message.type);

  if (message.type === 'response') {
    console.log('✅ Response received!\n');
    console.log(JSON.stringify(message.data, null, 2));

    if (message.data.extensions && message.data.extensions.length > 0) {
      console.log('\n✅ EXTENSION IS REGISTERED!');
      console.log('Extension details:');
      message.data.extensions.forEach(ext => {
        console.log(`  - Name: ${ext.name}`);
        console.log(`  - ID: ${ext.extensionId}`);
        console.log(`  - Version: ${ext.version}`);
        console.log(`  - Capabilities: ${ext.capabilities.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  No extensions registered');
      console.log('The ESTABLISHED connection in lsof might be from a previous test script.');
    }

    ws.close();
  } else if (message.type === 'error') {
    console.error('❌ Error response:', message.error);
    ws.close();
  }
});

ws.on('error', err => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected');
  process.exit(0);
});

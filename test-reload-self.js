#!/usr/bin/env node

/**
 * Test: Reload Extension (Self) with allowSelfReload
 *
 * Reloads the Chrome Dev Assist extension itself with allowSelfReload: true
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  🔄 Reloading Extension (Self) with ErrorLogger                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log(`Extension ID: ${EXTENSION_ID}\n`);

const ws = new WebSocket(WS_URL);

let reloadCommandId = null;

ws.on('open', () => {
  console.log('✅ Connected to server\n');

  reloadCommandId = 'reload-self-' + Date.now();

  console.log('🔄 Sending reload command with allowSelfReload: true...');
  ws.send(JSON.stringify({
    type: 'command',
    id: reloadCommandId,
    targetExtensionId: EXTENSION_ID,
    command: {
      type: 'reload',
      params: {
        extensionId: EXTENSION_ID,
        allowSelfReload: true,  // Allow reloading itself
        captureConsole: false
      }
    }
  }));

  console.log(`📤 Command sent (ID: ${reloadCommandId})\n`);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.id === reloadCommandId) {
    console.log('📥 Response received:');

    if (message.type === 'response') {
      console.log('✅ Extension reload command executed!\n');
      console.log(JSON.stringify(message.data, null, 2));

      console.log('\n' + '═'.repeat(70));
      console.log('🧪 NEXT: Verify ErrorLogger');
      console.log('═'.repeat(70));
      console.log('\n📋 Instructions:');
      console.log('1. Wait 2-3 seconds for extension to reload');
      console.log('2. Go to chrome://extensions/');
      console.log('3. Find "Chrome Dev Assist"');
      console.log('4. Click "service worker" link');
      console.log('5. Paste this test code:\n');
      console.log('─'.repeat(70));
      console.log('if (typeof ErrorLogger !== "undefined") {');
      console.log('  console.log("✅ ErrorLogger loaded");');
      console.log('  ErrorLogger.logExpectedError("test", "Expected error", new Error("Expected"));');
      console.log('  ErrorLogger.logUnexpectedError("test", "Bug found", new Error("Bug"));');
      console.log('  console.log("✅ Check: YELLOW warning + RED error (no stack traces)");');
      console.log('} else {');
      console.log('  console.error("❌ ErrorLogger NOT loaded");');
      console.log('}');
      console.log('─'.repeat(70));

      setTimeout(() => ws.close(), 1000);

    } else if (message.type === 'error') {
      console.error('❌ Reload failed!');
      console.error(JSON.stringify(message.error, null, 2));
      ws.close();
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected\n');
  process.exit(0);
});

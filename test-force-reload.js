#!/usr/bin/env node

/**
 * Test: Force Reload Extension
 *
 * Uses the forceReload command to reload the extension with the bug fix.
 * This reloads the extension service worker using chrome.runtime.reload()
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  🔄 Force Reload Extension (Apply Bug Fix)                       ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const ws = new WebSocket(WS_URL);

let commandId = null;

ws.on('open', () => {
  console.log('✅ Connected to server');

  commandId = 'force-reload-' + Date.now();

  console.log('🔄 Sending forceReload command...');
  ws.send(
    JSON.stringify({
      type: 'command',
      id: commandId,
      targetExtensionId: EXTENSION_ID,
      command: {
        type: 'forceReload',
      },
    })
  );

  console.log(`📤 Command sent (ID: ${commandId})`);
  console.log('\n⏳ Waiting for response (extension will reload)...\n');
});

ws.on('message', data => {
  const message = JSON.parse(data.toString());

  if (message.id === commandId) {
    console.log('📥 Response received:');

    if (message.type === 'response') {
      console.log('✅ Extension is reloading!');
      console.log(JSON.stringify(message.data, null, 2));

      console.log('\n' + '═'.repeat(70));
      console.log('✅ BUG FIX APPLIED');
      console.log('═'.repeat(70));
      console.log('Fixed: options?.allowSelfReload → params?.allowSelfReload');
      console.log('\nThe extension now has the corrected code.');
      console.log('You can now verify ErrorLogger is loaded.\n');

      console.log('═'.repeat(70));
      console.log('🧪 VERIFY ErrorLogger');
      console.log('═'.repeat(70));
      console.log('\n📋 Instructions:');
      console.log('1. Wait 2-3 seconds for extension to finish reloading');
      console.log('2. Go to: chrome://extensions/');
      console.log('3. Find "Chrome Dev Assist"');
      console.log('4. Click "service worker" link');
      console.log('5. Paste this code in the console:\n');
      console.log('─'.repeat(70));
      console.log('if (typeof ErrorLogger !== "undefined") {');
      console.log('  console.log("✅ ErrorLogger is loaded!");');
      console.log('  console.log("");');
      console.log('  // Test expected error (should be YELLOW warning)');
      console.log('  ErrorLogger.logExpectedError(');
      console.log('    "manualTest",');
      console.log('    "Testing expected error handling",');
      console.log('    new Error("This is an expected error")');
      console.log('  );');
      console.log('  console.log("");');
      console.log('  // Test unexpected error (should be RED error)');
      console.log('  ErrorLogger.logUnexpectedError(');
      console.log('    "manualTest",');
      console.log('    "Testing unexpected error (programming bug)",');
      console.log('    new Error("This is a programming bug")');
      console.log('  );');
      console.log('  console.log("");');
      console.log('  console.log("✅ Verify above:");');
      console.log('  console.log("  - Expected: 🟡 YELLOW warning");');
      console.log('  console.log("  - Unexpected: 🔴 RED error");');
      console.log('  console.log("  - NO stack traces in logged data");');
      console.log('} else {');
      console.log('  console.error("❌ ErrorLogger not loaded!");');
      console.log('  console.error("Check: importScripts in background.js line 7");');
      console.log('}');
      console.log('─'.repeat(70));

      setTimeout(() => ws.close(), 1000);
    } else if (message.type === 'error') {
      console.error('❌ Force reload failed:');
      console.error(JSON.stringify(message.error, null, 2));
      ws.close();
    }
  }
});

ws.on('error', err => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected from server\n');
  process.exit(0);
});

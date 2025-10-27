#!/usr/bin/env node

/**
 * Test: Reload Extension and Verify ErrorLogger
 *
 * This script:
 * 1. Sends reload command to extension gnojocphflllgichkehjhkojkihcihfn
 * 2. Waits for reload confirmation
 * 3. Provides instructions to manually verify ErrorLogger in extension console
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 ErrorLogger Reload & Verification Test                       ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log(`Extension ID: ${EXTENSION_ID}`);
console.log(`Server URL: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

let reloadCommandId = null;

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server\n');

  // Send reload command
  reloadCommandId = 'reload-errorlogger-' + Date.now();

  console.log('🔄 Sending reload command to extension...');
  ws.send(JSON.stringify({
    type: 'command',
    id: reloadCommandId,
    targetExtensionId: EXTENSION_ID,
    command: {
      type: 'reload',
      params: {
        extensionId: EXTENSION_ID,
        captureConsole: false
      }
    }
  }));

  console.log(`📤 Command sent (ID: ${reloadCommandId})`);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.id === reloadCommandId) {
    console.log('\n📥 Reload response received:');

    if (message.type === 'response') {
      console.log('✅ Extension reloaded successfully!\n');
      console.log('Reload details:', JSON.stringify(message.data, null, 2));

      // Provide manual verification instructions
      console.log('\n' + '═'.repeat(70));
      console.log('🔍 MANUAL VERIFICATION REQUIRED');
      console.log('═'.repeat(70));
      console.log('\n📋 Instructions to verify ErrorLogger:');
      console.log('\n1. Open Chrome and go to: chrome://extensions/');
      console.log('2. Find "Chrome Dev Assist" extension');
      console.log('3. Click "service worker" link to open DevTools');
      console.log('4. Paste the following code in the console:');
      console.log('\n' + '─'.repeat(70));
      console.log('// Test ErrorLogger');
      console.log('if (typeof ErrorLogger !== "undefined") {');
      console.log('  console.log("✅ ErrorLogger is loaded");');
      console.log('  console.log("");');
      console.log('  ');
      console.log('  // Test expected error (should be YELLOW warning)');
      console.log('  ErrorLogger.logExpectedError("test", "Test expected error", new Error("This is expected"));');
      console.log('  ');
      console.log('  // Test unexpected error (should be RED error)');
      console.log('  ErrorLogger.logUnexpectedError("test", "Test programming bug", new Error("This is a bug"));');
      console.log('  ');
      console.log('  console.log("");');
      console.log('  console.log("✅ Check above for:");');
      console.log('  console.log("  - Expected: YELLOW warning (console.warn)");');
      console.log('  console.log("  - Unexpected: RED error (console.error)");');
      console.log('  console.log("  - Both should have structured data WITHOUT stack traces");');
      console.log('} else {');
      console.log('  console.error("❌ ErrorLogger not found - check importScripts in background.js");');
      console.log('}');
      console.log('─'.repeat(70));
      console.log('\n5. Verify you see:');
      console.log('   ✅ "ErrorLogger is loaded" message');
      console.log('   🟡 YELLOW warning for expected error');
      console.log('   🔴 RED error for unexpected error');
      console.log('   ✅ No stack traces in the logged data');
      console.log('\n6. Report results back so we can proceed with /review\n');

      // Close connection
      setTimeout(() => {
        ws.close();
      }, 1000);

    } else if (message.type === 'error') {
      console.error('❌ Extension reload failed!');
      console.error('Error:', JSON.stringify(message.error, null, 2));
      ws.close();
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('👋 Disconnected from server\n');
  console.log('═'.repeat(70));
  console.log('Test script completed. Please verify ErrorLogger in extension console.');
  console.log('═'.repeat(70));
  process.exit(0);
});

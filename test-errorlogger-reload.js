/**
 * Test Script: Reload Extension and Verify ErrorLogger
 *
 * This script:
 * 1. Connects to WebSocket server
 * 2. Sends reload command to extension (gnojocphflllgichkehjhkojkihcihfn)
 * 3. Verifies ErrorLogger is working
 */

const WebSocket = require('ws');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://localhost:9876';

console.log('=== ErrorLogger Test Script ===');
console.log(`Extension ID: ${EXTENSION_ID}`);
console.log(`Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');

  // Register as test client
  console.log('📝 Registering as test client...');
  ws.send(
    JSON.stringify({
      type: 'register',
      client: 'test-client',
      clientId: 'errorlogger-test-' + Date.now(),
      name: 'ErrorLogger Verification Script',
      capabilities: ['send-commands'],
    })
  );

  // Wait a bit for registration, then send reload command
  setTimeout(() => {
    console.log(`\n🔄 Sending reload command for extension: ${EXTENSION_ID}`);

    ws.send(
      JSON.stringify({
        type: 'command',
        id: 'test-reload-' + Date.now(),
        command: {
          type: 'reload',
          params: {
            extensionId: EXTENSION_ID,
            captureConsole: false,
          },
        },
      })
    );
  }, 1000);
});

ws.on('message', data => {
  const message = JSON.parse(data.toString());

  console.log('\n📥 Received message:', message.type);

  if (message.type === 'response') {
    console.log('✅ Reload response:', JSON.stringify(message.data, null, 2));

    if (message.data.reloadSuccess) {
      console.log('\n✅ Extension reloaded successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Go to chrome://extensions/');
      console.log('2. Find "Chrome Dev Assist"');
      console.log('3. Click "service worker" link');
      console.log('4. Paste this code to test ErrorLogger:');
      console.log('\n--- START CODE ---');
      console.log('if (typeof ErrorLogger !== "undefined") {');
      console.log('  console.log("✅ ErrorLogger loaded");');
      console.log('  ErrorLogger.logExpectedError("test", "Test expected", new Error("Test"));');
      console.log('  ErrorLogger.logUnexpectedError("test", "Test unexpected", new Error("Bug"));');
      console.log('  console.log("✅ Check above: YELLOW + RED");');
      console.log('} else {');
      console.log('  console.error("❌ ErrorLogger not found");');
      console.log('}');
      console.log('--- END CODE ---\n');
    }

    // Close connection after response
    setTimeout(() => {
      console.log('\n👋 Closing connection...');
      ws.close();
    }, 1000);
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
  console.log('\n👋 Disconnected from server');
  console.log('\n=== Test Complete ===');
  process.exit(0);
});

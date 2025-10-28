/**
 * Manual error testing
 */
const WebSocket = require('ws');

async function testInvalidJSON() {
  console.log('\n=== Test 1: Invalid JSON ===');
  const ws = new WebSocket('ws://localhost:9876');

  ws.on('open', () => {
    console.log('Connected, sending invalid JSON...');
    ws.send('this is not json{[');
  });

  ws.on('message', data => {
    console.log('Response:', data.toString());
    ws.close();
  });

  ws.on('error', err => {
    console.error('Error:', err.message);
  });

  await new Promise(resolve => {
    ws.on('close', () => {
      console.log('Connection closed');
      resolve();
    });
  });
}

async function testDuplicateRegistration() {
  console.log('\n=== Test 2: Duplicate Extension Registration ===');

  const ext1 = new WebSocket('ws://localhost:9876');
  const ext2 = new WebSocket('ws://localhost:9876');

  ext1.on('open', () => {
    console.log('Extension 1 connected, registering...');
    ext1.send(JSON.stringify({ type: 'register', client: 'extension' }));
  });

  ext2.on('open', () => {
    console.log('Extension 2 connected, registering...');
    ext2.send(JSON.stringify({ type: 'register', client: 'extension' }));
  });

  ext1.on('message', data => {
    console.log('Extension 1 message:', data.toString());
  });

  ext2.on('message', data => {
    console.log('Extension 2 message:', data.toString());
  });

  ext2.on('close', () => {
    console.log('Extension 2 connection closed (expected - rejected)');
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  ext1.close();
  console.log('Test complete');
}

async function testExtensionNotConnected() {
  console.log('\n=== Test 3: Extension Not Connected ===');

  const api = new WebSocket('ws://localhost:9876');

  api.on('open', () => {
    console.log('API connected, sending command without extension...');
    api.send(
      JSON.stringify({
        type: 'command',
        id: 'test-123',
        command: { type: 'reload', params: {} },
      })
    );
  });

  api.on('message', data => {
    console.log('Response:', data.toString());
    api.close();
  });

  await new Promise(resolve => {
    api.on('close', () => {
      console.log('Connection closed');
      resolve();
    });
  });
}

(async () => {
  try {
    await testInvalidJSON();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testDuplicateRegistration();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testExtensionNotConnected();

    console.log('\n✓ All error tests complete');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();

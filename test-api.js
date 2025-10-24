/**
 * Test the production API
 */
const chromeDevAssist = require('./claude-code/index.js');

async function testAPI() {
  try {
    console.log('=== Testing API ===\n');

    // Test 1: Capture logs
    console.log('Test 1: Capture logs (2 seconds)...');
    const captureResult = await chromeDevAssist.captureLogs(2000);
    console.log('✓ Capture result:', {
      consoleLogs: captureResult.consoleLogs?.length || 0,
      entries: 'entries'
    });

    console.log('\n✓ SUCCESS - API works!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ FAILED:', error.message);
    process.exit(1);
  }
}

testAPI();

/**
 * Test Chrome Dev Assist
 * This tests the basic functionality
 */

const chromeDevAssist = require('./claude-code/index.js');

async function runTest() {
  console.log('='.repeat(60));
  console.log('Testing Chrome Dev Assist');
  console.log('='.repeat(60));

  // Test 1: Reload the Chrome Dev Assist extension itself
  console.log('\nTest 1: Reloading Chrome Dev Assist extension...');
  try {
    const result = await chromeDevAssist.reload('gnojocphflllgichkehjhkojkihcihfn');
    console.log('✓ Extension reloaded successfully!');
    console.log('  Extension name:', result.extensionName);
    console.log('  Reload success:', result.reloadSuccess);
  } catch (err) {
    console.error('✗ Test 1 failed:', err.message);
    return;
  }

  // Test 2: Reload with console capture
  console.log('\nTest 2: Reload with console capture (5 seconds)...');
  console.log('  (Open a webpage in Chrome to generate console logs)');
  try {
    const result = await chromeDevAssist.reloadAndCapture('gnojocphflllgichkehjhkojkihcihfn', {
      duration: 5000,
    });
    console.log('✓ Reload and capture completed!');
    console.log(`  Captured ${result.consoleLogs.length} console logs`);

    if (result.consoleLogs.length > 0) {
      console.log('\n  First 3 logs:');
      result.consoleLogs.slice(0, 3).forEach(log => {
        console.log(`    [${log.level}] ${log.message.substring(0, 80)}`);
        console.log(`      at ${log.url}`);
      });
    }
  } catch (err) {
    console.error('✗ Test 2 failed:', err.message);
    return;
  }

  // Test 3: Just capture console logs (no reload)
  console.log('\nTest 3: Capture console logs only (3 seconds)...');
  console.log('  (Navigate around in Chrome to generate logs)');
  try {
    const result = await chromeDevAssist.captureLogs(3000);
    console.log('✓ Console capture completed!');
    console.log(`  Captured ${result.consoleLogs.length} console logs`);
  } catch (err) {
    console.error('✗ Test 3 failed:', err.message);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ All tests passed!');
  console.log('='.repeat(60));
  console.log('\nChrome Dev Assist is ready to use!');
}

runTest().catch(err => {
  console.error('\n✗ Test failed with error:', err);
  process.exit(1);
});

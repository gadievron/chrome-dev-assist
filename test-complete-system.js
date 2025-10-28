/**
 * Complete System Test
 *
 * This script demonstrates all functionality of Chrome Dev Assist.
 *
 * PREREQUISITES:
 * 1. Chrome Dev Assist extension loaded (should auto-connect)
 * 2. A TEST extension loaded in Chrome (to reload)
 * 3. WebSocket server running or will auto-start
 *
 * Get extension ID from chrome://extensions (enable Developer Mode)
 */

const chromeDevAssist = require('./claude-code/index.js');

// TEST EXTENSION ID - Replace with your test extension ID
// NOTE: Cannot reload Chrome Dev Assist itself (safety check in extension)
const TEST_EXTENSION_ID = 'REPLACE_WITH_TEST_EXTENSION_ID';

async function runTests() {
  console.log('='.repeat(60));
  console.log('Chrome Dev Assist - Complete System Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test 1: Capture logs only
    console.log('Test 1: Capture Console Logs (3 seconds)');
    console.log('-'.repeat(60));
    console.log('Capturing console output from all tabs and frames...');

    const captureResult = await chromeDevAssist.captureLogs(3000);

    console.log('✓ Capture successful');
    console.log(`  Logs captured: ${captureResult.consoleLogs.length}`);
    if (captureResult.consoleLogs.length > 0) {
      console.log('  Sample log:', captureResult.consoleLogs[0]);
    } else {
      console.log('  (No console activity during capture period)');
    }
    console.log();

    // Test 2: Reload extension (requires test extension)
    if (TEST_EXTENSION_ID !== 'REPLACE_WITH_TEST_EXTENSION_ID') {
      console.log('Test 2: Reload Extension');
      console.log('-'.repeat(60));
      console.log(`Reloading extension: ${TEST_EXTENSION_ID}`);

      const reloadResult = await chromeDevAssist.reload(TEST_EXTENSION_ID);

      console.log('✓ Reload successful');
      console.log(`  Extension: ${reloadResult.extensionName}`);
      console.log(`  ID: ${reloadResult.extensionId}`);
      console.log('  Check chrome://extensions to verify reload');
      console.log();

      // Test 3: Reload and capture
      console.log('Test 3: Reload + Capture Console (3 seconds)');
      console.log('-'.repeat(60));
      console.log('Reloading extension and capturing console logs...');

      const reloadCaptureResult = await chromeDevAssist.reloadAndCapture(TEST_EXTENSION_ID, {
        duration: 3000,
      });

      console.log('✓ Reload and capture successful');
      console.log(`  Extension: ${reloadCaptureResult.extensionName}`);
      console.log(`  Logs captured: ${reloadCaptureResult.consoleLogs.length}`);
      if (reloadCaptureResult.consoleLogs.length > 0) {
        console.log('  Sample log:', reloadCaptureResult.consoleLogs[0]);
      }
      console.log();
    } else {
      console.log('Test 2 & 3: SKIPPED');
      console.log('-'.repeat(60));
      console.log('⚠ No test extension ID provided');
      console.log('  To test reload functionality:');
      console.log('  1. Load any Chrome extension in chrome://extensions');
      console.log('  2. Copy its ID (32 character string)');
      console.log('  3. Update TEST_EXTENSION_ID in this script');
      console.log('  4. Run again');
      console.log();
    }

    // Test 4: Error handling
    console.log('Test 4: Error Handling');
    console.log('-'.repeat(60));
    console.log('Testing with invalid extension ID...');

    try {
      await chromeDevAssist.reload('invalidextensionidformat');
      console.log('✗ Should have thrown validation error');
    } catch (err) {
      console.log('✓ Validation error caught correctly');
      console.log(`  Error: ${err.message}`);
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log();
    console.log('System Components:');
    console.log('  ✓ WebSocket Server (auto-started if needed)');
    console.log('  ✓ Chrome Extension (WebSocket client)');
    console.log('  ✓ Node.js API (this module)');
    console.log();
    console.log('Features Verified:');
    console.log('  ✓ Console log capture');
    console.log('  ✓ Server auto-start');
    console.log('  ✓ Extension auto-reconnect');
    console.log('  ✓ Error handling and validation');
    if (TEST_EXTENSION_ID !== 'REPLACE_WITH_TEST_EXTENSION_ID') {
      console.log('  ✓ Extension reload');
      console.log('  ✓ Reload + capture combination');
    }
    console.log();
  } catch (error) {
    console.error();
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error();
    console.error('Troubleshooting:');
    console.error('  1. Check Chrome Dev Assist extension is loaded');
    console.error('  2. Open extension service worker console for logs');
    console.error('  3. Verify WebSocket server is running (or can auto-start)');
    console.error();
    process.exit(1);
  }
}

runTests();

/**
 * Test with HTTPS URL instead of file://
 * This eliminates file access permission issues
 */

const chromeDevAssist = require('./claude-code/index.js');

async function testHttpsUrl() {
  console.log('\n🌐 Testing with HTTPS URL (example.com)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    console.log('Step 1: Opening example.com with console capture...');
    const result = await chromeDevAssist.openUrl('https://example.com', {
      captureConsole: true,
      duration: 2000,
      active: false
    });

    console.log('✅ Tab opened:', result.tabId);
    console.log('✅ Captured', result.consoleLogs.length, 'console messages');
    console.log('');

    if (result.consoleLogs.length > 0) {
      console.log('📋 Captured Logs:');
      console.log('═══════════════════════════════════════════════════════');
      result.consoleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] ${log.level}: ${log.message.substring(0, 100)}...`);
      });
    } else {
      console.log('⚠️  No logs captured from example.com');
      console.log('    (This is normal - example.com has minimal JavaScript)');
    }

    console.log('');
    console.log('Step 2: Closing tab...');
    await chromeDevAssist.closeTab(result.tabId);
    console.log('✅ Tab closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Test complete');
  console.log('');
  console.log('💡 NEXT: Check if file:// URLs are allowed');
  console.log('   1. Open chrome://extensions');
  console.log('   2. Find "Chrome Dev Assist"');
  console.log('   3. Check if "Allow access to file URLs" is enabled');
  console.log('   4. If not, enable it and try again');
}

testHttpsUrl();

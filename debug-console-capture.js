/**
 * Debug script to investigate console capture
 */

const chromeDevAssist = require('./claude-code/index.js');
const path = require('path');

async function debugTest() {
  console.log('\n🔍 DEBUG: Console Capture Test\n');
  console.log('═══════════════════════════════════════════════════════');

  const fixtureUrl = `file://${path.join(__dirname, 'tests/fixtures/basic-test.html')}`;

  console.log('Step 1: Opening test page with console capture...');
  console.log('URL:', fixtureUrl);
  console.log('Options: { captureConsole: true, duration: 3000, active: false }');
  console.log('');

  try {
    const result = await chromeDevAssist.openUrl(fixtureUrl, {
      captureConsole: true,
      duration: 3000,
      active: false
    });

    console.log('✅ Result received');
    console.log('Tab ID:', result.tabId);
    console.log('Console Logs Captured:', result.consoleLogs.length);
    console.log('');

    if (result.consoleLogs.length > 0) {
      console.log('📋 Captured Logs:');
      console.log('═══════════════════════════════════════════════════════');
      result.consoleLogs.forEach((log, index) => {
        console.log(`\n[${index + 1}] Level: ${log.level}`);
        console.log(`    Message: ${log.message}`);
        console.log(`    Timestamp: ${log.timestamp}`);
        console.log(`    URL: ${log.url}`);
      });
      console.log('═══════════════════════════════════════════════════════');
    } else {
      console.log('❌ NO LOGS CAPTURED!');
      console.log('');
      console.log('Expected logs from basic-test.html:');
      console.log('  - Test identification header');
      console.log('  - Test ID: basic-test-001');
      console.log('  - Test Name: Basic Test Page');
      console.log('  - Extension: Chrome Dev Assist');
      console.log('  - Status: READY');
      console.log('  - Initialization complete message');
    }

    console.log('');
    console.log('Step 2: Closing tab...');
    await chromeDevAssist.closeTab(result.tabId);
    console.log('✅ Tab closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Debug test complete');
}

debugTest();

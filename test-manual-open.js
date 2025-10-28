/**
 * Manual test - open fixture and wait for manual inspection
 */

const chromeDevAssist = require('./claude-code/index.js');
const path = require('path');

async function manualTest() {
  const fixtureUrl = `file://${path.join(__dirname, 'tests/fixtures/basic-test.html')}`;

  console.log('\n📝 MANUAL TEST - Opening test page WITHOUT capture');
  console.log('═══════════════════════════════════════════════════════');
  console.log('URL:', fixtureUrl);
  console.log('');
  console.log('INSTRUCTIONS:');
  console.log('1. A tab will open with the test page');
  console.log('2. Open Chrome DevTools (Cmd+Option+I)');
  console.log('3. Check the Console tab');
  console.log('4. Look for test identification logs');
  console.log('5. Press Ctrl+C when done inspecting');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    const result = await chromeDevAssist.openUrl(fixtureUrl, {
      active: true, // Open in foreground for manual inspection
    });

    console.log('✅ Tab opened:', result.tabId);
    console.log('');
    console.log('💡 Check the Chrome console now...');
    console.log('   (Press Ctrl+C when done)');

    // Keep process alive for manual inspection
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manualTest();

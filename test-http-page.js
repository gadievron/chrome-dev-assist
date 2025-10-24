/**
 * Test console capture with HTTP URL
 */

const chromeDevAssist = require('./claude-code/index.js');

async function testHttpPage() {
  console.log('\n🌐 Testing HTTP page with console logs');
  console.log('═══════════════════════════════════════════════════════');
  console.log('URL: http://localhost:8765/test-http-with-logs.html');
  console.log('');

  try {
    const result = await chromeDevAssist.openUrl(
      'http://localhost:8765/test-http-with-logs.html',
      {
        captureConsole: true,
        duration: 2000,
        active: false
      }
    );

    console.log('✅ Page opened, tabId:', result.tabId);
    console.log('✅ Captured', result.consoleLogs.length, 'messages');
    console.log('');

    if (result.consoleLogs.length > 0) {
      console.log('📋 Captured Messages:');
      console.log('═══════════════════════════════════════════════════════');
      result.consoleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] ${log.level}: ${log.message}`);
      });
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      const hasTestLogs = result.consoleLogs.some(l =>
        l.message.includes('HTTP TEST PAGE') || l.message.includes('Message 1')
      );

      if (hasTestLogs) {
        console.log('🎉 SUCCESS! Page logs were captured!');
      } else {
        console.log('⚠️  Only content script logs captured, not page logs');
      }
    } else {
      console.log('❌ NO MESSAGES CAPTURED AT ALL!');
    }

    console.log('');
    await chromeDevAssist.closeTab(result.tabId);
    console.log('✅ Tab closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}

testHttpPage();

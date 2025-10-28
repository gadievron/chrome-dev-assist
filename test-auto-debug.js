/**
 * Automated debug test - checks console.log() is being intercepted
 */

const chromeDevAssist = require('./claude-code/index.js');
const path = require('path');

async function autoDebugTest() {
  console.log('\n🔍 AUTOMATED DEBUG TEST');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing if console.log() interception works...');
  console.log('');

  try {
    // Test 1: Simple HTTPS URL with console.log()
    console.log('Test 1: Opening a page with inline console.log()...');

    // Create a data URL with inline JavaScript
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Debug Test</title></head>
      <body>
        <h1>Debug Test Page</h1>
        <script>
          console.log('TEST MESSAGE 1');
          console.log('TEST MESSAGE 2');
          console.log('TEST MESSAGE 3');
          console.error('TEST ERROR');
          console.warn('TEST WARNING');
        </script>
      </body>
      </html>
    `;

    const dataUrl = 'data:text/html;base64,' + Buffer.from(testHtml).toString('base64');

    const result = await chromeDevAssist.openUrl(dataUrl, {
      captureConsole: true,
      duration: 2000,
      active: false,
    });

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

      // Check if we got the test messages
      const hasTestMsg1 = result.consoleLogs.some(l => l.message.includes('TEST MESSAGE 1'));
      const hasTestMsg2 = result.consoleLogs.some(l => l.message.includes('TEST MESSAGE 2'));
      const hasTestMsg3 = result.consoleLogs.some(l => l.message.includes('TEST MESSAGE 3'));
      const hasError = result.consoleLogs.some(l => l.message.includes('TEST ERROR'));
      const hasWarning = result.consoleLogs.some(l => l.message.includes('TEST WARNING'));

      console.log('✅ Results:');
      console.log('   TEST MESSAGE 1:', hasTestMsg1 ? '✓ CAPTURED' : '✗ MISSING');
      console.log('   TEST MESSAGE 2:', hasTestMsg2 ? '✓ CAPTURED' : '✗ MISSING');
      console.log('   TEST MESSAGE 3:', hasTestMsg3 ? '✓ CAPTURED' : '✗ MISSING');
      console.log('   TEST ERROR:', hasError ? '✓ CAPTURED' : '✗ MISSING');
      console.log('   TEST WARNING:', hasWarning ? '✓ CAPTURED' : '✗ MISSING');

      if (hasTestMsg1 && hasTestMsg2 && hasTestMsg3) {
        console.log('');
        console.log('🎉 SUCCESS! Console interception is WORKING!');
      } else {
        console.log('');
        console.log('❌ FAILURE! Console interception is NOT working properly');
      }
    } else {
      console.log('❌ NO MESSAGES CAPTURED!');
      console.log('');
      console.log('This means:');
      console.log('  1. Content script might not be injecting');
      console.log('  2. Messages not being sent to background');
      console.log('  3. Capture timing issue (already fixed?)');
      console.log('  4. Background script not receiving messages');
    }

    console.log('');
    await chromeDevAssist.closeTab(result.tabId);
    console.log('✅ Tab closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Debug test complete');
  process.exit(0);
}

autoDebugTest();

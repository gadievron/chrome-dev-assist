#!/usr/bin/env node

/**
 * Automated ErrorLogger Verification
 *
 * Uses the extension's openUrl + console capture feature to:
 * 1. Open the ErrorLogger HTML test file
 * 2. Capture console output
 * 3. Verify ErrorLogger is working correctly
 * 4. Report results programmatically
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const EXTENSION_ID = 'gnojocphflllgichkehjhkojkihcihfn';
const WS_URL = 'ws://127.0.0.1:9876';

// Read auth token
const TOKEN_FILE = path.join(__dirname, '.auth-token');
let AUTH_TOKEN = '';
try {
  AUTH_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
} catch (err) {
  console.error('❌ Cannot read auth token:', err.message);
  process.exit(1);
}

const TEST_URL = `http://127.0.0.1:9876/fixtures/test-console-simple.html?token=${AUTH_TOKEN}`;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🧪 AUTOMATED ErrorLogger Verification');
console.log('═══════════════════════════════════════════════════════════════════\n');

const ws = new WebSocket(WS_URL);

let commandId = null;

ws.on('open', () => {
  console.log('✅ Connected to extension\n');

  commandId = 'test-errorlogger-' + Date.now();

  console.log('📂 Opening test file with console capture...');
  console.log(`URL: ${TEST_URL}\n`);

  // Send openUrl command with console capture
  ws.send(
    JSON.stringify({
      type: 'command',
      id: commandId,
      targetExtensionId: EXTENSION_ID,
      command: {
        type: 'openUrl',
        params: {
          url: TEST_URL,
          captureConsole: true,
          duration: 3000, // Capture for 3 seconds
        },
      },
    })
  );

  console.log('📤 Command sent, waiting for console output...\n');
});

ws.on('message', data => {
  const message = JSON.parse(data.toString());

  if (message.id === commandId) {
    if (message.type === 'response') {
      console.log('📥 Response received!\n');

      const { consoleLogs, tabId } = message.data;

      if (!consoleLogs || consoleLogs.length === 0) {
        console.error('❌ No console logs captured!');
        console.error('This might mean:');
        console.error('  1. Test file didnt load');
        console.error('  2. Console capture timed out');
        console.error('  3. ErrorLogger not loaded\n');
        ws.close();
        process.exit(1);
      }

      console.log(`📋 Captured ${consoleLogs.length} console messages:\n`);

      // Analyze console logs
      let errorLoggerFound = false;
      let expectedErrorFound = false;
      let unexpectedErrorFound = false;
      let stackTraceFound = false;

      consoleLogs.forEach((log, index) => {
        const { level, message, args } = log;

        console.log(`${index + 1}. [${level}] ${message}`);

        // Check for ErrorLogger presence
        if (message.includes('ErrorLogger') || message.includes('ChromeDevAssist')) {
          errorLoggerFound = true;
        }

        // Check for expected error (should be warn level)
        if (message.includes('Expected error') || message.includes('handled gracefully')) {
          if (level === 'warn') {
            expectedErrorFound = true;
            console.log('   ✅ Expected error logged as WARNING (correct!)');
          } else {
            console.log(`   ❌ Expected error logged as ${level} (should be warn)`);
          }
        }

        // Check for unexpected error (should be error level)
        if (message.includes('Unexpected error') || message.includes('programming bug')) {
          if (level === 'error') {
            unexpectedErrorFound = true;
            console.log('   ✅ Unexpected error logged as ERROR (correct!)');
          } else {
            console.log(`   ❌ Unexpected error logged as ${level} (should be error)`);
          }
        }

        // Check for stack traces (should NOT exist)
        if (
          message.includes('stack') ||
          message.toLowerCase().includes('at /') ||
          message.includes('at Object.')
        ) {
          stackTraceFound = true;
          console.log('   ❌ Stack trace found in logs (security issue!)');
        }
      });

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('VERIFICATION RESULTS');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      const results = [
        { test: 'ErrorLogger loaded', passed: errorLoggerFound },
        { test: 'Expected errors use console.warn', passed: expectedErrorFound },
        { test: 'Unexpected errors use console.error', passed: unexpectedErrorFound },
        { test: 'No stack traces in logs', passed: !stackTraceFound },
      ];

      results.forEach(({ test, passed }) => {
        console.log(`${passed ? '✅' : '❌'} ${test}`);
      });

      const allPassed = results.every(r => r.passed);

      console.log('\n═══════════════════════════════════════════════════════════════════');
      if (allPassed) {
        console.log('✅ ALL TESTS PASSED - ErrorLogger is working correctly!');
      } else {
        console.log('❌ SOME TESTS FAILED - See results above');
      }
      console.log('═══════════════════════════════════════════════════════════════════\n');

      // Close tab
      console.log(`🧹 Closing test tab (ID: ${tabId})...\n`);
      ws.send(
        JSON.stringify({
          type: 'command',
          id: 'close-tab-' + Date.now(),
          targetExtensionId: EXTENSION_ID,
          command: {
            type: 'closeTab',
            params: { tabId },
          },
        })
      );

      setTimeout(() => ws.close(), 1000);
      process.exit(allPassed ? 0 : 1);
    } else if (message.type === 'error') {
      console.error('❌ Command failed:');
      console.error(JSON.stringify(message.error, null, 2));
      ws.close();
      process.exit(1);
    }
  }
});

ws.on('error', err => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('👋 Disconnected from server\n');
});

#!/usr/bin/env node

/**
 * Check Extension Health
 *
 * Verifies that the Chrome Dev Assist extension:
 * 1. Is loaded in Chrome
 * 2. Has connected to the WebSocket server
 * 3. Can respond to basic API calls
 *
 * Returns exit code 0 if healthy, 1 if unhealthy
 *
 * Usage:
 *   node scripts/check-extension-health.js
 *   node scripts/check-extension-health.js --extension-id abcd1234...
 */

const chromeDevAssist = require('../claude-code/index.js');

const EXTENSION_ID = process.argv.includes('--extension-id')
  ? process.argv[process.argv.indexOf('--extension-id') + 1]
  : 'gnojocphflllgichkehjhkojkihcihfn';

const TIMEOUT_MS = 5000;

async function checkHealth() {
  console.log('🏥 Chrome Extension Health Check\n');
  console.log(`Extension ID: ${EXTENSION_ID}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms\n`);

  const checks = [];

  // Check 1: WebSocket server running
  console.log('1️⃣  Checking WebSocket server...');
  try {
    // Try to get all extensions (requires server connection)
    const result = await Promise.race([
      chromeDevAssist.getAllExtensions(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]);

    console.log('   ✅ Server is running and responding\n');
    checks.push({ name: 'WebSocket Server', status: 'PASS' });
  } catch (err) {
    if (err.message === 'Timeout') {
      console.log('   ❌ Server not responding (timeout)\n');
      checks.push({ name: 'WebSocket Server', status: 'FAIL', error: 'Timeout' });
      return { success: false, checks };
    } else if (err.message.includes('Extension not connected')) {
      console.log('   ⚠️  Server running but extension not connected\n');
      checks.push({ name: 'WebSocket Server', status: 'PASS' });
      checks.push({ name: 'Extension Connection', status: 'FAIL', error: 'Not connected' });
      return { success: false, checks };
    } else {
      console.log(`   ❌ Server error: ${err.message}\n`);
      checks.push({ name: 'WebSocket Server', status: 'FAIL', error: err.message });
      return { success: false, checks };
    }
  }

  // Check 2: Extension loaded
  console.log('2️⃣  Checking if extension is loaded...');
  try {
    const info = await Promise.race([
      chromeDevAssist.getExtensionInfo(EXTENSION_ID),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]);

    console.log(`   ✅ Extension loaded: ${info.name} v${info.version}`);
    console.log(`   ✅ Status: ${info.enabled ? 'Enabled' : 'Disabled'}\n`);
    checks.push({ name: 'Extension Loaded', status: 'PASS', details: info });
  } catch (err) {
    console.log(`   ❌ Extension not found: ${err.message}\n`);
    checks.push({ name: 'Extension Loaded', status: 'FAIL', error: err.message });
    return { success: false, checks };
  }

  // Check 3: Basic API functionality
  console.log('3️⃣  Testing basic API functionality...');
  try {
    const result = await Promise.race([
      chromeDevAssist.getAllExtensions(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]);

    const extensionCount = result.extensions ? result.extensions.length : 0;
    console.log(`   ✅ API responding (found ${extensionCount} extensions)\n`);
    checks.push({ name: 'API Functionality', status: 'PASS', extensionCount });
  } catch (err) {
    console.log(`   ❌ API call failed: ${err.message}\n`);
    checks.push({ name: 'API Functionality', status: 'FAIL', error: err.message });
    return { success: false, checks };
  }

  return { success: true, checks };
}

// Main
async function main() {
  try {
    const result = await checkHealth();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.success) {
      console.log('✅ HEALTH CHECK PASSED\n');
      console.log('Extension is loaded, connected, and responding to API calls.\n');
      console.log('Summary:');
      result.checks.forEach(check => {
        console.log(`  ✅ ${check.name}: ${check.status}`);
      });
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ HEALTH CHECK FAILED\n');
      console.log('Summary:');
      result.checks.forEach(check => {
        const icon = check.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${check.name}: ${check.status}`);
        if (check.error) {
          console.log(`     Error: ${check.error}`);
        }
      });
      console.log('');
      console.log('💡 To fix:');
      console.log('   1. Open Chrome: chrome://extensions');
      console.log('   2. Load extension: extension/ folder');
      console.log('   3. Start server: node server/websocket-server.js');
      console.log('   4. Reload extension if needed');
      console.log('');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ HEALTH CHECK ERROR\n');
    console.error(err.message);
    console.error('');
    process.exit(1);
  }
}

main();

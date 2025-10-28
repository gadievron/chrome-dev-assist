#!/usr/bin/env node
/**
 * Connection Diagnostic Tool
 * Checks server, extension, and API connectivity
 */

const net = require('net');
const chromeDevAssist = require('../claude-code/index.js');

async function diagnose() {
  console.log('🔍 Chrome Dev Assist - Connection Diagnostic\n');
  console.log('═══════════════════════════════════════════════\n');

  let allPassed = true;

  // 1. Check if server is running
  console.log('1️⃣  Checking if WebSocket server is running...');
  const serverRunning = await checkPort(9876);
  if (serverRunning) {
    console.log('   ✅ Server is running on port 9876');
  } else {
    console.log('   ❌ Server is NOT running');
    console.log('\n❌ PROBLEM: WebSocket server is not running');
    console.log('FIX: Run `node server/websocket-server.js`\n');
    allPassed = false;
  }

  // 2. Check if extension is connected
  console.log('\n2️⃣  Testing API connection...');
  try {
    const status = await chromeDevAssist.getTestStatus();
    console.log('   ✅ API connection successful');
    console.log(`   ℹ️  Active test: ${status.activeTest ? status.activeTest.testId : 'none'}`);
  } catch (err) {
    console.log('   ❌ API connection failed:', err.message);
    console.log('\n❌ PROBLEM: Extension not connected or not responding');
    console.log('FIX:');
    console.log('  1. Open Chrome');
    console.log('  2. Go to chrome://extensions');
    console.log('  3. Ensure "Chrome Dev Assist" is enabled');
    console.log('  4. Click reload icon on extension');
    console.log('  5. Check extension service worker console for errors\n');
    allPassed = false;
  }

  // 3. Test basic operations
  console.log('\n3️⃣  Testing basic operations...');
  try {
    await chromeDevAssist.getTestStatus();
    console.log('   ✅ getTestStatus() works');
  } catch (err) {
    console.log('   ❌ getTestStatus() failed:', err.message);
    allPassed = false;
  }

  // 4. Check for common issues
  console.log('\n4️⃣  Checking for common issues...');

  // Check if server process is running
  const { execSync } = require('child_process');
  try {
    const serverProcesses = execSync('ps aux | grep "websocket-server" | grep -v grep', {
      encoding: 'utf-8',
    });
    if (serverProcesses.trim()) {
      console.log('   ✅ Server process found');
      const lines = serverProcesses.trim().split('\n');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        console.log(`      PID: ${pid}`);
      });
    } else {
      console.log('   ⚠️  No server process found (but port may be listening)');
    }
  } catch (err) {
    console.log('   ⚠️  Could not check server process');
  }

  // Check if port is actually listening
  try {
    const portCheck = execSync('lsof -i :9876 2>/dev/null || echo "No process"', {
      encoding: 'utf-8',
    });
    if (portCheck.includes('node')) {
      console.log('   ✅ Port 9876 is listening');
      const lines = portCheck.trim().split('\n').slice(1); // Skip header
      lines.forEach(line => {
        if (line && !line.includes('No process')) {
          const parts = line.trim().split(/\s+/);
          const command = parts[0];
          const pid = parts[1];
          const state = parts[parts.length - 1];
          console.log(`      ${command} (PID ${pid}): ${state}`);
        }
      });
    } else {
      console.log('   ❌ Port 9876 is not listening');
      allPassed = false;
    }
  } catch (err) {
    console.log('   ⚠️  Could not check port status');
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════\n');
  if (allPassed) {
    console.log('✅ All checks passed! Connection is healthy.\n');
    console.log('Your extension is connected and ready to use.');
    console.log(
      '\nTry running: node -e "require(\'./claude-code/index.js\').getTestStatus().then(console.log)"'
    );
  } else {
    console.log('❌ Some checks failed. Please review the errors above.\n');
    process.exit(1);
  }
}

async function checkPort(port) {
  return new Promise(resolve => {
    const socket = new net.Socket();

    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, '127.0.0.1');
  });
}

diagnose().catch(console.error);

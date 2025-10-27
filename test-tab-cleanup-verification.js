#!/usr/bin/env node
/**
 * Tab Cleanup Verification Test
 * Tests if tabs actually close when autoClose=true
 * 
 * This test will:
 * 1. Open a tab with autoClose=true
 * 2. Wait for test to complete
 * 3. Report if tab was closed
 * 4. Check extension console for cleanup logs
 */

const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9876');

let tabId = null;

ws.on('open', () => {
  console.log('🧪 Testing tab cleanup mechanism...\n');

  ws.send(JSON.stringify({
    type: 'command',
    id: 'cleanup-test-' + Date.now(),
    targetExtensionId: 'gnojocphflllgichkehjhkojkihcihfn',
    command: {
      type: 'openUrl',
      params: {
        url: 'http://127.0.0.1:9876/fixtures/test-console-simple.html',
        captureConsole: true,
        duration: 3000,   // 3 seconds
        autoClose: true   // ← CRITICAL: Should close tab
      }
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'response') {
    console.log('\n📊 TEST RESULT:');
    console.log('Tab ID:', msg.data.tabId);
    console.log('Tab Closed:', msg.data.tabClosed);
    console.log('Console logs:', msg.data.consoleLogs?.length || 0);
    
    tabId = msg.data.tabId;
    
    if (msg.data.tabClosed === true) {
      console.log('\n✅ SUCCESS: Extension reported tab was closed');
    } else if (msg.data.tabClosed === false) {
      console.log('\n❌ FAILURE: Extension reported tab was NOT closed');
    } else {
      console.log('\n⚠️ WARNING: Extension did not report tab closure status (tabClosed field missing)');
    }
    
    console.log('\n📝 MANUAL VERIFICATION NEEDED:');
    console.log('1. Check Chrome to see if tab', tabId, 'is still open');
    console.log('2. Check extension service worker console for cleanup logs');
    console.log('   Expected log: [ChromeDevAssist] Auto-closed tab:', tabId);
    console.log('   Or: [ChromeDevAssist] Could not auto-close tab');
    
    ws.close();
    process.exit(msg.data.tabClosed === true ? 0 : 1);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket Error:', err.message);
  process.exit(1);
});

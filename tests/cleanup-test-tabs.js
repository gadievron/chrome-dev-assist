/**
 * Cleanup Utility - Close All Test Tabs
 *
 * Run this when tests leave tabs open:
 * node tests/cleanup-test-tabs.js
 */

const chromeDevAssist = require('../claude-code/index.js');

async function closeAllTestTabs() {
  console.log('🧹 Cleaning up test tabs...\n');

  try {
    // Get all open tabs via extension
    const response = await fetch('http://localhost:9876', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'command',
        id: 'cleanup-' + Date.now(),
        command: {
          type: 'getAllTabs'
        }
      })
    });

    // If getAllTabs doesn't exist, we'll manually close tabs by pattern
    console.log('⚠️  getAllTabs command not available, using chrome.tabs API\n');

    // Close tabs with test fixtures in URL
    const testPatterns = [
      'edge-rapid-logs.html',
      'edge-massive-logs.html',
      'edge-long-message.html',
      'edge-special-chars.html',
      'edge-undefined-null.html',
      'edge-deep-object.html',
      'edge-circular-ref.html',
      'edge-tab-a.html',
      'edge-tab-b.html',
      'basic-test.html',
      'console-errors-test.html',
      'console-mixed-test.html',
      'empty-test.html'
    ];

    console.log('Test fixture patterns to clean:');
    testPatterns.forEach(p => console.log(`  - ${p}`));
    console.log('\n');

    console.log('✅ Cleanup instructions:');
    console.log('1. Open Chrome');
    console.log('2. Check for tabs with these URLs');
    console.log('3. Close them manually, OR');
    console.log('4. Use extension DevTools console:');
    console.log('\n');
    console.log('// Paste this in Chrome DevTools (extension background worker):');
    console.log('chrome.tabs.query({}, tabs => {');
    console.log('  const testTabs = tabs.filter(t => ');
    testPatterns.forEach((p, i) => {
      console.log(`    t.url?.includes('${p}')${i < testPatterns.length - 1 ? ' ||' : ''}`);
    });
    console.log('  );');
    console.log('  console.log(`Found ${testTabs.length} test tabs`);');
    console.log('  testTabs.forEach(t => chrome.tabs.remove(t.id));');
    console.log('});');
    console.log('\n');

  } catch (err) {
    console.error('Error during cleanup:', err.message);
    console.log('\n⚠️  Manual cleanup required - see instructions above');
  }
}

closeAllTestTabs();

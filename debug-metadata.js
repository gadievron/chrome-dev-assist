const chromeDevAssist = require('./claude-code/index.js');
const fs = require('fs');
const path = require('path');

const AUTH_TOKEN = fs.readFileSync(path.join(__dirname, '.auth-token'), 'utf8').trim();

async function debug() {
  try {
    // Open the adversarial security page
    const url = `http://localhost:9876/fixtures/adversarial-security.html?token=${AUTH_TOKEN}`;
    console.log('Opening:', url);

    const result = await chromeDevAssist.openUrl(url, { active: true });
    console.log('Tab opened:', result.tabId);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get metadata
    console.log('\n=== Getting Page Metadata ===');
    const metadata = await chromeDevAssist.getPageMetadata(result.tabId);

    console.log('\n=== Metadata Result ===');
    console.log(JSON.stringify(metadata, null, 2));

    console.log('\n=== Checking for Leaked Data ===');
    console.log('metadata.metadata.secret:', metadata.metadata.secret);
    console.log('metadata.metadata.sandboxed:', metadata.metadata.sandboxed);
    console.log('metadata.metadata.dataUri:', metadata.metadata.dataUri);

    // Close tab
    await chromeDevAssist.closeTab(result.tabId);

    console.log('\n✅ Debug complete');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debug();

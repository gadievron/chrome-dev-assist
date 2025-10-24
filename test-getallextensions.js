/**
 * Quick test for getAllExtensions feature
 */

const chromeDevAssist = require('./claude-code/index.js');

async function test() {
  try {
    console.log('Testing getAllExtensions...\n');

    const result = await chromeDevAssist.getAllExtensions();

    console.log('✅ SUCCESS!');
    console.log('Count:', result.count);
    console.log('Extensions:', JSON.stringify(result.extensions, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
}

test();

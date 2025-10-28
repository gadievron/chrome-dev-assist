#!/usr/bin/env node

/**
 * Integration Test Runner
 *
 * Runs the complete system integration tests with proper setup.
 *
 * PREREQUISITES:
 * 1. Chrome extension must be loaded (chrome://extensions)
 * 2. Set EXTENSION_ID environment variable (or use default)
 *
 * USAGE:
 *   node run-integration-tests.js
 *   EXTENSION_ID=your-id node run-integration-tests.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const EXTENSION_ID = process.env.EXTENSION_ID || 'gnojocphflllgichkehjhkojkihcihfn';

console.log('='.repeat(70));
console.log('CHROME DEV ASSIST - INTEGRATION TEST RUNNER');
console.log('='.repeat(70));
console.log();
console.log('Extension ID:', EXTENSION_ID);
console.log();

// Check prerequisites
console.log('Prerequisites:');
console.log('  ✓ Node.js:', process.version);
console.log('  ✓ Working directory:', process.cwd());
console.log();

console.log('IMPORTANT: Before running tests, ensure:');
console.log('  1. Chrome extension is loaded at chrome://extensions');
console.log('  2. Extension ID matches:', EXTENSION_ID);
console.log('  3. Extension is enabled');
console.log('  4. Extension service worker is running');
console.log();

console.log('To check extension status:');
console.log('  1. Open chrome://extensions in Chrome');
console.log('  2. Find "Chrome Dev Assist"');
console.log("  3. Verify it's enabled and ID matches");
console.log('  4. Click "service worker" to see console');
console.log();

console.log('Press Ctrl+C to cancel, or tests will start in 5 seconds...');
console.log();

setTimeout(() => {
  console.log('Starting tests...');
  console.log('='.repeat(70));
  console.log();

  // Run Jest with the integration test file
  const jest = spawn(
    'npx',
    [
      'jest',
      'tests/integration/complete-system.test.js',
      '--verbose',
      '--runInBand', // Run tests serially for browser operations
      '--detectOpenHandles',
    ],
    {
      env: {
        ...process.env,
        EXTENSION_ID: EXTENSION_ID,
      },
      stdio: 'inherit',
    }
  );

  jest.on('close', code => {
    console.log();
    console.log('='.repeat(70));
    if (code === 0) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('❌ TESTS FAILED');
      console.log();
      console.log('Troubleshooting:');
      console.log('  - Is Chrome extension loaded and enabled?');
      console.log('  - Is extension ID correct?', EXTENSION_ID);
      console.log('  - Check extension service worker console for errors');
      console.log('  - Try reloading the extension manually');
    }
    console.log('='.repeat(70));
    console.log();

    process.exit(code);
  });

  jest.on('error', err => {
    console.error('Failed to start Jest:', err);
    process.exit(1);
  });
}, 5000);

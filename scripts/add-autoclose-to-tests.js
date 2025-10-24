#!/usr/bin/env node
/**
 * Script to add autoClose: true to all openUrl calls in test files
 * Prevents tab leaks in integration tests
 */

const fs = require('fs');
const path = require('path');

const testFiles = [
  'tests/integration/edge-cases.test.js',
  'tests/integration/dogfooding.test.js',
  'tests/integration/phase-1.1.test.js',
  'tests/integration/phase-1.1-medium.test.js'
];

function addAutoCloseToFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let count = 0;

  // Pattern: openUrl(..., { ... captureConsole: true, duration: X })
  // Add: autoClose: true after duration
  const pattern = /(openUrl\([^{]*\{[^}]*captureConsole:\s*true[^}]*duration:\s*\d+)([\s,]*)\}/g;

  content = content.replace(pattern, (match, before, afterDuration) => {
    // Check if autoClose already present
    if (match.includes('autoClose')) {
      return match;
    }

    modified = true;
    count++;

    // Add autoClose before closing brace
    return `${before},\n        autoClose: true // Prevent tab leaks\n      }`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Added autoClose to ${count} openUrl call(s)`);
    return count;
  } else {
    console.log(`  - No changes needed`);
    return 0;
  }
}

// Process all test files
let totalUpdated = 0;
testFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    totalUpdated += addAutoCloseToFile(fullPath);
  } else {
    console.log(`\nSkipping: ${file} (not found)`);
  }
});

console.log(`\n✓ Total: Added autoClose to ${totalUpdated} test case(s)`);

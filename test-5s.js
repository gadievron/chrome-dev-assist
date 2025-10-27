#!/usr/bin/env node
/**
 * Quick 5-second test to verify page loads
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '.auth-token');
const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
const url = `http://localhost:9876/fixtures/boundary-conditions.html?token=${token}`;

console.log('🚀 Opening Chrome for 5 seconds...');
console.log('📄 URL:', url);
console.log('');
console.log('👀 Please check Chrome:');
console.log('   - Does the page load? (not "Unauthorized")');
console.log('   - Does the test run?');
console.log('');

spawn('open', ['-a', 'Google Chrome', url]);

console.log('⏱️  Waiting 5 seconds...');
setTimeout(() => {
  console.log('');
  console.log('✅ Done - Please manually close the tab');
  process.exit(0);
}, 5000);

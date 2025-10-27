#!/usr/bin/env node
/**
 * Test auth token for browser direct access
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '.auth-token');
const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

console.log('Testing auth with token from file:');
console.log('Token:', token);
console.log('Length:', token.length);
console.log('');

const url = `http://localhost:9876/fixtures/index.html?token=${token}`;
console.log('Testing URL:', url);
console.log('');

http.get(url, (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response headers:', res.headers);
  console.log('');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS - Auth worked!');
      console.log('First 200 chars of response:');
      console.log(data.substring(0, 200));
    } else {
      console.log('❌ FAILED - Auth rejected');
      console.log('Response body:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});

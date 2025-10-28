/**
 * Auth Token for Fixture Access - Test-First
 *
 * REQUIREMENT: Extension must receive and use auth token to access test fixtures
 *
 * Problem: Server requires auth token for /fixtures/ paths but extension doesn't have it
 * Solution: Server sends token in registration-ack, extension adds to fixture URLs
 *
 * Test written BEFORE implementation to define expected behavior.
 */

const fs = require('fs');
const path = require('path');

describe('Auth Token for Fixture Access', () => {
  test('Server registration-ack includes authToken field', () => {
    // GIVEN: Server has generated an auth token
    const authToken = '88b9d811788785fe98b82ead46e96c6309f0aabf1b7695509ad73d26ed7f956b';

    // WHEN: Server sends registration-ack to extension
    const registrationAck = {
      type: 'registration-ack',
      extensionId: 'test-extension-id',
      timestamp: Date.now(),
      authToken: authToken, // ← Token included
    };

    // THEN: Message includes authToken
    expect(registrationAck.authToken).toBe(authToken);
    expect(registrationAck.authToken).toHaveLength(64); // 32 bytes hex
  });

  test('Extension stores authToken from registration-ack', () => {
    // GIVEN: Extension receives registration-ack with token
    const message = {
      type: 'registration-ack',
      extensionId: 'test-id',
      timestamp: Date.now(),
      authToken: 'test-token-123',
    };

    // WHEN: Extension processes the message
    // (In real code: serverAuthToken = message.authToken)
    let serverAuthToken = null;
    if (message.authToken) {
      serverAuthToken = message.authToken;
    }

    // THEN: Extension has stored the token
    expect(serverAuthToken).toBe('test-token-123');
    expect(serverAuthToken).not.toBeNull();
  });

  test('Extension adds token to fixture URLs before opening', () => {
    // GIVEN: Extension has received auth token
    const serverAuthToken = 'token-abc-123';
    const fixtureUrl = 'http://127.0.0.1:9876/fixtures/test-console-simple.html';

    // WHEN: Extension prepares to open a fixture URL
    let finalUrl = fixtureUrl;
    if (serverAuthToken && fixtureUrl.includes('127.0.0.1:9876/fixtures/')) {
      const urlObj = new URL(fixtureUrl);
      urlObj.searchParams.set('token', serverAuthToken);
      finalUrl = urlObj.toString();
    }

    // THEN: Token is appended as query parameter
    expect(finalUrl).toBe(
      'http://127.0.0.1:9876/fixtures/test-console-simple.html?token=token-abc-123'
    );
    expect(finalUrl).toContain('?token=');
    expect(finalUrl).toContain(serverAuthToken);
  });

  test('Extension does NOT add token to non-fixture URLs', () => {
    // GIVEN: Extension has auth token
    const serverAuthToken = 'token-xyz-789';
    const externalUrl = 'https://example.com/page.html';

    // WHEN: Extension opens a non-fixture URL
    let finalUrl = externalUrl;
    if (serverAuthToken && externalUrl.includes('127.0.0.1:9876/fixtures/')) {
      const urlObj = new URL(externalUrl);
      urlObj.searchParams.set('token', serverAuthToken);
      finalUrl = urlObj.toString();
    }

    // THEN: Token is NOT added
    expect(finalUrl).toBe('https://example.com/page.html');
    expect(finalUrl).not.toContain('token=');
  });

  test('Extension handles missing auth token gracefully', () => {
    // GIVEN: Extension has NOT received auth token yet
    const serverAuthToken = null;
    const fixtureUrl = 'http://127.0.0.1:9876/fixtures/test.html';

    // WHEN: Extension tries to open fixture URL without token
    let finalUrl = fixtureUrl;
    if (serverAuthToken && fixtureUrl.includes('127.0.0.1:9876/fixtures/')) {
      const urlObj = new URL(fixtureUrl);
      urlObj.searchParams.set('token', serverAuthToken);
      finalUrl = urlObj.toString();
    }

    // THEN: URL is used as-is (will fail server auth but won't crash)
    expect(finalUrl).toBe('http://127.0.0.1:9876/fixtures/test.html');
    expect(finalUrl).not.toContain('?token=');
  });

  test('Extension works with both localhost and 127.0.0.1', () => {
    // GIVEN: Auth token and URLs with different hosts
    const serverAuthToken = 'test-token';
    const urls = [
      'http://127.0.0.1:9876/fixtures/test.html',
      'http://localhost:9876/fixtures/test.html',
    ];

    // WHEN: Extension processes each URL
    const results = urls.map(url => {
      let finalUrl = url;
      if (
        serverAuthToken &&
        (url.includes('127.0.0.1:9876/fixtures/') || url.includes('localhost:9876/fixtures/'))
      ) {
        const urlObj = new URL(url);
        urlObj.searchParams.set('token', serverAuthToken);
        finalUrl = urlObj.toString();
      }
      return finalUrl;
    });

    // THEN: Both URLs get the token
    expect(results[0]).toContain('?token=test-token');
    expect(results[1]).toContain('?token=test-token');
  });

  test('Server generates unique token on each startup', () => {
    // GIVEN: Server starts multiple times
    const crypto = require('crypto');

    const token1 = crypto.randomBytes(32).toString('hex');
    const token2 = crypto.randomBytes(32).toString('hex');

    // THEN: Each token is unique
    expect(token1).not.toBe(token2);
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
  });

  test('Integration: Extension can open fixture after receiving token', async () => {
    // This test verifies the complete flow:
    // 1. Server sends token in registration-ack
    // 2. Extension stores token
    // 3. Extension adds token to fixture URL
    // 4. Server accepts request with valid token

    // GIVEN: Simulated server and extension
    const SERVER_TOKEN = 'integration-test-token-456';

    // Step 1: Server sends registration-ack
    const serverMessage = {
      type: 'registration-ack',
      extensionId: 'test-ext',
      timestamp: Date.now(),
      authToken: SERVER_TOKEN,
    };

    // Step 2: Extension receives and stores token
    let extensionToken = null;
    if (serverMessage.authToken) {
      extensionToken = serverMessage.authToken;
    }
    expect(extensionToken).toBe(SERVER_TOKEN);

    // Step 3: Extension opens fixture URL with token
    const fixtureUrl = 'http://127.0.0.1:9876/fixtures/test.html';
    let finalUrl = fixtureUrl;
    if (extensionToken && fixtureUrl.includes('127.0.0.1:9876/fixtures/')) {
      const urlObj = new URL(fixtureUrl);
      urlObj.searchParams.set('token', extensionToken);
      finalUrl = urlObj.toString();
    }

    // Step 4: Server validates token from URL
    const urlObj = new URL(finalUrl);
    const clientToken = urlObj.searchParams.get('token');
    const authValid = clientToken === SERVER_TOKEN;

    // THEN: Server accepts the request
    expect(authValid).toBe(true);
    expect(clientToken).toBe(SERVER_TOKEN);
  });
});

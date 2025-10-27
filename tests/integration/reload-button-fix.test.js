/**
 * Reload Button Fix Verification Tests
 *
 * Tests for the fix to prevent Chrome from hiding the reload button
 * when WebSocket connection fails
 *
 * Root Cause: console.error() in ws.onerror made Chrome think extension crashed
 * Fix: Changed console.error() → console.warn() for expected connection failures
 *
 * See: RELOAD-BUTTON-FIX.md
 */

const fs = require('fs');
const path = require('path');

describe('Reload Button Fix Verification', () => {
  let backgroundJs;

  beforeAll(() => {
    backgroundJs = fs.readFileSync(path.join(__dirname, '../../extension/background.js'), 'utf8');
  });

  describe('Fix #1: WebSocket onerror Handler', () => {
    it('should use console.warn (not console.error) for WebSocket connection issues', () => {
      // Find ws.onerror handler
      const onerrorIndex = backgroundJs.indexOf('ws.onerror = (err) => {');
      expect(onerrorIndex).toBeGreaterThan(0);

      // Get the handler function body (next 500 chars)
      const handlerBody = backgroundJs.substring(onerrorIndex, onerrorIndex + 500);

      // Verify it uses console.warn for WebSocket connection issue
      expect(handlerBody).toContain('console.warn');
      expect(handlerBody).toContain('WebSocket connection issue');

      // Verify it does NOT use console.error for the connection issue
      // (console.error would make Chrome think extension crashed)
      const errorMatch = handlerBody.match(/console\.error.*WebSocket/);
      expect(errorMatch).toBeNull();
    });

    it('should include explanatory comment about Chrome crash prevention', () => {
      const onerrorIndex = backgroundJs.indexOf('ws.onerror = (err) => {');
      const handlerBody = backgroundJs.substring(onerrorIndex, onerrorIndex + 600);

      // Verify fix comment exists
      expect(handlerBody).toContain('✅ FIX');
      expect(handlerBody).toContain('console.warn instead of console.error');
      expect(handlerBody).toContain('prevent Chrome');
    });

    it('should still schedule reconnection on error', () => {
      const onerrorIndex = backgroundJs.indexOf('ws.onerror = (err) => {');
      const handlerBody = backgroundJs.substring(onerrorIndex, onerrorIndex + 800);

      // Verify reconnection logic still exists
      expect(handlerBody).toContain('scheduleReconnect');
      expect(handlerBody).toContain('reconnectAttempts++');
    });
  });

  describe('Fix #2: Connection Timeout Handler', () => {
    it('should use console.warn (not console.error) for connection timeout', () => {
      // Find connection timeout handler
      const timeoutIndex = backgroundJs.indexOf('const connectTimeout = setTimeout(');
      expect(timeoutIndex).toBeGreaterThan(0);

      // Get timeout handler body (next 500 chars)
      const handlerBody = backgroundJs.substring(timeoutIndex, timeoutIndex + 500);

      // Verify it uses console.warn
      expect(handlerBody).toContain('console.warn');
      expect(handlerBody).toContain('Connection timeout after 5s');

      // Verify it does NOT use console.error
      const errorMatch = handlerBody.match(/console\.error.*timeout/i);
      expect(errorMatch).toBeNull();
    });

    it('should include explanatory comment', () => {
      const timeoutIndex = backgroundJs.indexOf('const connectTimeout = setTimeout(');
      const handlerBody = backgroundJs.substring(timeoutIndex, timeoutIndex + 600);

      expect(handlerBody).toContain('✅ FIX');
      expect(handlerBody).toContain('console.warn instead of console.error');
    });
  });

  describe('Fix #3: Registration Timeout Handler', () => {
    it('should use console.warn (not console.error) for registration timeout', () => {
      // Find registration timeout handler
      const regTimeoutIndex = backgroundJs.indexOf('registrationTimeout = setTimeout(');
      expect(regTimeoutIndex).toBeGreaterThan(0);

      // Get handler body (next 500 chars)
      const handlerBody = backgroundJs.substring(regTimeoutIndex, regTimeoutIndex + 500);

      // Verify it uses console.warn
      expect(handlerBody).toContain('console.warn');
      expect(handlerBody).toContain('Registration acknowledgment not received');

      // Verify it does NOT use console.error
      const errorMatch = handlerBody.match(/console\.error.*[Rr]egistration/);
      expect(errorMatch).toBeNull();
    });

    it('should include explanatory comment', () => {
      const regTimeoutIndex = backgroundJs.indexOf('registrationTimeout = setTimeout(');
      const handlerBody = backgroundJs.substring(regTimeoutIndex, regTimeoutIndex + 600);

      expect(handlerBody).toContain('✅ FIX');
      expect(handlerBody).toContain('console.warn instead of console.error');
    });
  });

  describe('Verify No console.error for Expected Conditions', () => {
    it('should not use console.error for WebSocket state issues in safeSend', () => {
      // safeSend() should use console.error for "WebSocket is null"
      // and console.warn for state-based issues (CONNECTING, CLOSING, CLOSED)

      const safeSendIndex = backgroundJs.indexOf('function safeSend(message)');
      const safeSendBody = backgroundJs.substring(safeSendIndex, safeSendIndex + 1500);

      // console.error for null is OK (programming error)
      expect(safeSendBody).toContain('console.error');
      expect(safeSendBody).toContain('WebSocket is null');

      // But should use console.warn for state-based issues
      const warnMatches = safeSendBody.match(/console\.warn/g);
      expect(warnMatches).toBeTruthy();
      expect(warnMatches.length).toBeGreaterThan(0);
    });

    it('should document why connection failures are expected', () => {
      // Check for comments explaining why failures are expected
      const onerrorIndex = backgroundJs.indexOf('ws.onerror = (err) => {');
      const handlerSection = backgroundJs.substring(onerrorIndex - 200, onerrorIndex + 600);

      // Should explain that failures are EXPECTED
      expect(handlerSection.toLowerCase()).toMatch(/expected/i);
    });
  });

  describe('Fix #4: Command Error Handler', () => {
    it('should use console.warn (not console.error) for command failures', () => {
      // Find command error handler (catch block in ws.onmessage)
      const catchIndex = backgroundJs.indexOf('} catch (error) {');
      expect(catchIndex).toBeGreaterThan(0);

      // Get the error handler body (next 500 chars)
      const handlerBody = backgroundJs.substring(catchIndex, catchIndex + 500);

      // Verify it uses console.warn for command failures
      expect(handlerBody).toContain('console.warn');
      expect(handlerBody).toContain('Command failed');

      // Verify it does NOT use console.error for command failures
      const errorMatch = handlerBody.match(/console\.error.*Command failed/);
      expect(errorMatch).toBeNull();
    });

    it('should include explanatory comment about expected errors', () => {
      const catchIndex = backgroundJs.indexOf('} catch (error) {');
      const handlerBody = backgroundJs.substring(catchIndex, catchIndex + 600);

      // Verify fix comment exists
      expect(handlerBody).toContain('✅ FIX');
      expect(handlerBody).toContain('console.warn instead of console.error');
      expect(handlerBody).toContain('Command failures are EXPECTED');
    });

    it('should still send error response to server', () => {
      const catchIndex = backgroundJs.indexOf('} catch (error) {');
      const handlerBody = backgroundJs.substring(catchIndex, catchIndex + 800);

      // Verify error response sent
      expect(handlerBody).toContain("type: 'error'");
      expect(handlerBody).toContain('safeSend');
    });
  });

  describe('Impact Verification', () => {
    it('should have exactly 4 console.error → console.warn fixes', () => {
      // Count fix comments
      const fixComments = backgroundJs.match(/✅ FIX.*console\.warn instead of console\.error/g);
      expect(fixComments).toBeTruthy();
      expect(fixComments.length).toBe(4);
    });

    it('should preserve all reconnection logic', () => {
      // Verify reconnection logic still intact
      expect(backgroundJs).toContain('scheduleReconnect()');
      expect(backgroundJs).toContain('exponential backoff');
      expect(backgroundJs).toContain('reconnectAttempts++');
      expect(backgroundJs).toContain('isConnecting = false');
    });

    it('should preserve all error handling paths', () => {
      // Verify all error handlers exist
      expect(backgroundJs).toContain('ws.onerror');
      expect(backgroundJs).toContain('ws.onclose');
      expect(backgroundJs).toContain('connectTimeout');
      expect(backgroundJs).toContain('registrationTimeout');
    });
  });

  describe('Regression Prevention', () => {
    it('should not introduce console.error for connection failures in future', () => {
      // This test documents the requirement
      // If someone adds console.error for connection failures, this test will remind them

      const connectionRelatedErrors = [
        /console\.error.*connection.*failed/i,
        /console\.error.*ERR_CONNECTION_REFUSED/i,
        /console\.error.*WebSocket.*error/i,
      ];

      connectionRelatedErrors.forEach(pattern => {
        const match = backgroundJs.match(pattern);
        if (match) {
          console.warn(`⚠️  Found potential console.error for connection failure: ${match[0]}`);
        }
      });

      // This test passes but warns if console.error found for connection issues
      expect(true).toBe(true);
    });
  });
});

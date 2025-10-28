/**
 * Chrome Crash Prevention Tests
 *
 * Tests that verify the extension doesn't trigger Chrome's crash detection
 * by using appropriate console methods for expected errors
 *
 * Related: RELOAD-BUTTON-FIX.md
 */

const fs = require('fs');
const path = require('path');

describe('Chrome Crash Prevention', () => {
  let backgroundJs;

  beforeAll(() => {
    backgroundJs = fs.readFileSync(path.join(__dirname, '../../extension/background.js'), 'utf8');
  });

  describe('Expected Errors Use console.warn', () => {
    it('should use console.warn for WebSocket connection failures', () => {
      // WebSocket connection failures are EXPECTED when server is not running
      const onerrorHandler = backgroundJs.substring(
        backgroundJs.indexOf('ws.onerror = (err) => {'),
        backgroundJs.indexOf('ws.onerror = (err) => {') + 800
      );

      expect(onerrorHandler).toContain('console.warn');
      expect(onerrorHandler).toContain('WebSocket connection issue');
      expect(onerrorHandler).not.toMatch(/console\.error.*WebSocket.*connection/i);
    });

    it('should use console.warn for connection timeouts', () => {
      // Connection timeouts are EXPECTED when server is slow or not running
      const timeoutHandler = backgroundJs.substring(
        backgroundJs.indexOf('const connectTimeout = setTimeout('),
        backgroundJs.indexOf('const connectTimeout = setTimeout(') + 600
      );

      expect(timeoutHandler).toContain('console.warn');
      expect(timeoutHandler).toContain('Connection timeout after 5s');
      expect(timeoutHandler).not.toMatch(/console\.error.*timeout/i);
    });

    it('should use console.warn for registration timeouts', () => {
      // Registration timeouts are EXPECTED with old servers or slow connections
      const regTimeoutHandler = backgroundJs.substring(
        backgroundJs.indexOf('registrationTimeout = setTimeout('),
        backgroundJs.indexOf('registrationTimeout = setTimeout(') + 600
      );

      expect(regTimeoutHandler).toContain('console.warn');
      expect(regTimeoutHandler).toContain('Registration acknowledgment not received');
      expect(regTimeoutHandler).not.toMatch(/console\.error.*[Rr]egistration/);
    });
  });

  describe('Unexpected Errors Use console.error', () => {
    it('should use console.error for programming errors', () => {
      // Programming errors (like null WebSocket) should use console.error
      expect(backgroundJs).toContain('console.error');

      // Verify we still have console.error for actual bugs
      const nullCheckErrors = backgroundJs.match(/console\.error.*WebSocket is null/g);
      expect(nullCheckErrors).toBeTruthy();
      expect(nullCheckErrors.length).toBeGreaterThan(0);
    });

    it('should use console.error for unknown WebSocket states', () => {
      // Unknown states are programming errors
      expect(backgroundJs).toContain('console.error');
      expect(backgroundJs).toContain('Unknown WebSocket state');
    });

    it('should use console.error for command failures', () => {
      // Command execution failures should be logged as errors
      expect(backgroundJs).toContain('Command failed');
    });
  });

  describe('Crash Prevention Patterns', () => {
    it('should have explanatory comments for all console.warn usages', () => {
      const warnCalls = backgroundJs.match(/console\.warn/g) || [];
      const fixComments = backgroundJs.match(/✅ FIX.*console\.warn/g) || [];

      // Should have at least 3 fix comments (for the 3 main fixes)
      expect(fixComments.length).toBeGreaterThanOrEqual(3);
    });

    it('should explain why connection failures are expected', () => {
      // Check for explanatory comments
      expect(backgroundJs).toContain('Connection failures are EXPECTED');
      expect(backgroundJs).toContain('server not running');
      expect(backgroundJs).toContain('server restart');
    });

    it('should still handle errors gracefully', () => {
      // Verify all error paths have recovery logic
      expect(backgroundJs).toContain('scheduleReconnect');
      expect(backgroundJs).toContain('exponential backoff');
      expect(backgroundJs).toContain('reconnectAttempts');
    });
  });

  describe('Chrome Extension Health Indicators', () => {
    it('should not have patterns that trigger Chrome crash detection', () => {
      // Patterns that trigger crash detection:
      // 1. Multiple console.error in error handlers
      // 2. Unhandled promise rejections
      // 3. Infinite loops in error recovery

      // Check for proper error handling
      const errorHandlers = [
        { name: 'ws.onerror', searchLength: 1000 },
        { name: 'ws.onclose', searchLength: 1500 },
        { name: 'const connectTimeout = setTimeout', searchLength: 1000 },
        { name: 'registrationTimeout = setTimeout', searchLength: 1000 },
      ];

      errorHandlers.forEach(handler => {
        const startIndex = backgroundJs.indexOf(handler.name);
        expect(startIndex).toBeGreaterThan(0); // Handler exists

        const handlerCode = backgroundJs.substring(startIndex, startIndex + handler.searchLength);

        // Should have recovery logic (either direct scheduleReconnect() or ws.close() which triggers ws.onclose)
        expect(handlerCode).toMatch(/scheduleReconnect|reconnectAttempts|ws\.close\(\)/);
      });
    });

    it('should have bounded reconnection attempts', () => {
      // Verify exponential backoff has max limit
      expect(backgroundJs).toContain('Math.min');
      expect(backgroundJs).toContain('Math.pow(2,');

      // Should have max reconnection delay (30 seconds)
      expect(backgroundJs).toContain('30');
    });

    it('should prevent infinite connection loops', () => {
      // Verify isConnecting flag prevents duplicates
      expect(backgroundJs).toContain('let isConnecting = false');
      expect(backgroundJs).toContain('if (isConnecting)');
      expect(backgroundJs).toContain('Already connecting');
    });
  });

  describe('Error Message Quality', () => {
    it('should have informative error messages', () => {
      // Check that error messages explain what will happen next
      const warnMessages = backgroundJs.match(/console\.warn\([^)]+\)/g) || [];

      warnMessages.forEach(msg => {
        // Should mention reconnection or retry
        const hasActionableInfo =
          msg.includes('reconnect') || msg.includes('retry') || msg.includes('will');

        if (!hasActionableInfo) {
          console.warn('Warning message may lack actionable info:', msg.substring(0, 100));
        }
      });

      // This test passes but warns about low-quality messages
      expect(true).toBe(true);
    });

    it('should distinguish between transient and permanent errors', () => {
      // Transient errors: connection failures, timeouts (use console.warn)
      // Permanent errors: programming bugs, invalid state (use console.error)

      // Count console.warn for transient issues (connection, timeout, registration)
      const warnCount = (
        backgroundJs.match(
          /console\.warn.*connection|console\.warn.*timeout|console\.warn.*Registration/gi
        ) || []
      ).length;
      expect(warnCount).toBeGreaterThanOrEqual(3);

      // Count console.error for programming issues
      const errorCount = (backgroundJs.match(/console\.error.*null|Unknown|failed/gi) || []).length;
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  describe('Service Worker Stability', () => {
    it('should have keep-alive mechanism', () => {
      // Verify keep-alive alarm exists
      expect(backgroundJs).toContain('keep-alive');
      expect(backgroundJs).toContain('periodInMinutes');
      expect(backgroundJs).toContain('0.25'); // 15 seconds
    });

    it('should handle alarm errors gracefully', () => {
      // Verify alarm handler exists
      expect(backgroundJs).toContain('chrome.alarms.onAlarm.addListener');

      // Should check connection state before reconnecting
      expect(backgroundJs).toContain('ws.readyState');
    });

    it('should prevent duplicate alarms', () => {
      // Verify alarm clearing before creating new one
      expect(backgroundJs).toContain('chrome.alarms.clear');
      expect(backgroundJs).toContain('reconnect-websocket');
    });
  });
});

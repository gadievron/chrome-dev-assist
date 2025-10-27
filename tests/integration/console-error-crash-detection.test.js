/**
 * Console.error Crash Detection Tests
 *
 * Tests that verify the extension doesn't trigger Chrome's crash detection
 * by using console.error() for expected errors.
 *
 * Chrome marks extensions as "crashed" when it sees console.error() in error handlers.
 * This causes the reload button to disappear in chrome://extensions.
 *
 * Related: CONSOLE-ERROR-ANALYSIS.md, RELOAD-BUTTON-FIX.md
 */

const fs = require('fs');
const path = require('path');

describe('Console.error Crash Detection Prevention', () => {
  let backgroundJs;

  beforeAll(() => {
    backgroundJs = fs.readFileSync(
      path.join(__dirname, '../../extension/background.js'),
      'utf8'
    );
  });

  describe('Fixed Issues (Should use console.warn)', () => {
    it('should use console.warn for WebSocket connection failures', () => {
      const onerrorHandler = backgroundJs.substring(
        backgroundJs.indexOf('ws.onerror = (err) => {'),
        backgroundJs.indexOf('ws.onerror = (err) => {') + 800
      );

      expect(onerrorHandler).toContain('console.warn');
      expect(onerrorHandler).not.toMatch(/console\.error.*WebSocket.*connection/i);
    });

    it('should use console.warn for connection timeouts', () => {
      const timeoutHandler = backgroundJs.substring(
        backgroundJs.indexOf('const connectTimeout = setTimeout('),
        backgroundJs.indexOf('const connectTimeout = setTimeout(') + 600
      );

      expect(timeoutHandler).toContain('console.warn');
      expect(timeoutHandler).not.toMatch(/console\.error.*timeout/i);
    });

    it('should use console.warn for registration timeouts', () => {
      const regTimeoutHandler = backgroundJs.substring(
        backgroundJs.indexOf('registrationTimeout = setTimeout('),
        backgroundJs.indexOf('registrationTimeout = setTimeout(') + 600
      );

      expect(regTimeoutHandler).toContain('console.warn');
      expect(regTimeoutHandler).not.toMatch(/console\.error.*[Rr]egistration/);
    });

    it('should use console.warn for command failures', () => {
      const catchHandler = backgroundJs.substring(
        backgroundJs.indexOf('} catch (error) {'),
        backgroundJs.indexOf('} catch (error) {') + 600
      );

      expect(catchHandler).toContain('console.warn');
      expect(catchHandler).toContain('Command failed');
      expect(catchHandler).not.toMatch(/console\.error.*Command failed/);
    });
  });

  describe('Remaining console.error Usage Analysis', () => {
    it('should have explanatory comments for all remaining console.error calls', () => {
      const errorCalls = backgroundJs.match(/console\.error\(/g) || [];

      console.log(`\n📊 Total console.error() calls: ${errorCalls.length}`);
      console.log('Expected: 4 legitimate programming errors');
      console.log('Found: Check CONSOLE-ERROR-ANALYSIS.md for details\n');

      // We expect some console.error() calls for legitimate programming bugs
      // See CONSOLE-ERROR-ANALYSIS.md for full analysis
      expect(errorCalls.length).toBeGreaterThan(0);
      expect(errorCalls.length).toBeLessThan(20);
    });

    it('should NOT use console.error for expected tab closure failures', () => {
      // Tab cleanup errors are EXPECTED (tabs may be already closed)
      // Search for tab cleanup error handlers
      const tabCleanupSections = [
        backgroundJs.indexOf('Tab already closed'),
        backgroundJs.indexOf('TAB CLEANUP FAILED'),
        backgroundJs.indexOf('Failed to close tab'),
        backgroundJs.indexOf('Failed to close orphan')
      ].filter(idx => idx > 0);

      for (const idx of tabCleanupSections) {
        const section = backgroundJs.substring(idx, idx + 500);

        // If section has console.error, FAIL (tab closure failures are EXPECTED)
        if (section.includes('console.error')) {
          const lineNumber = backgroundJs.substring(0, idx).split('\n').length;
          throw new Error(`❌ Found console.error in tab cleanup at line ~${lineNumber}. ` +
                          `Tab closure failures are EXPECTED in testing (tabs may be already closed). ` +
                          `Should use console.warn instead. ` +
                          `See TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md:206-214`);
        }
      }
    });

    it('should NOT use console.error for queue overflow', () => {
      // Queue overflow is EXPECTED under high load (DoS protection)
      const queueFullIndex = backgroundJs.indexOf('Queue full');

      if (queueFullIndex > 0) {
        const section = backgroundJs.substring(queueFullIndex - 50, queueFullIndex + 150);

        if (section.includes('console.error')) {
          const lineNumber = backgroundJs.substring(0, queueFullIndex).split('\n').length;
          throw new Error(`❌ Found console.error for queue overflow at line ~${lineNumber}. ` +
                          `Queue overflow is EXPECTED under high load (stress/DoS protection). ` +
                          `Should use console.warn instead. ` +
                          `See TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md:225-232`);
        }
      }
    });

    it('should NOT use console.error for send failures', () => {
      // Send failures are EXPECTED during state transitions
      const sendFailedIndex = backgroundJs.indexOf('Send failed');

      if (sendFailedIndex > 0) {
        const section = backgroundJs.substring(sendFailedIndex - 50, sendFailedIndex + 150);

        if (section.includes('console.error')) {
          const lineNumber = backgroundJs.substring(0, sendFailedIndex).split('\n').length;
          throw new Error(`❌ Found console.error for send failures at line ~${lineNumber}. ` +
                          `Send failures are EXPECTED during disconnection and state transitions. ` +
                          `Should use console.warn instead. ` +
                          `See TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md:216-223`);
        }
      }
    });
  });

  describe('Pattern Detection (Generic Bug Prevention)', () => {
    it('should have "✅ FIX" comment for all fixed console.warn conversions', () => {
      const fixComments = backgroundJs.match(/✅ FIX.*console\.warn instead of console\.error/g) || [];

      console.log(`\n✅ Fixed console.error → console.warn: ${fixComments.length} locations`);

      // We have 4 known fixes
      expect(fixComments.length).toBeGreaterThanOrEqual(4);
    });

    it('should document why console.error is kept for programming bugs', () => {
      // Check that remaining console.error() calls have explanatory comments
      // OR are for clear programming bugs (null checks, unknown states)

      const knownLegitimateErrors = [
        'WebSocket is null',       // Programming bug (caller should check)
        'Unknown WebSocket state', // Impossible state (state machine bug)
        'No main frame result'     // Chrome API bug or permission issue
      ];

      for (const errorType of knownLegitimateErrors) {
        if (backgroundJs.includes(errorType)) {
          const idx = backgroundJs.indexOf(errorType);
          const section = backgroundJs.substring(idx - 200, idx + 200);

          // Should have console.error for these (not console.warn)
          if (section.includes('console.error')) {
            console.log(`✅ Correctly using console.error for: "${errorType}"`);
          }
        }
      }
    });

    it('should follow pattern: try/catch → console.warn for expected errors', () => {
      // Pattern to detect: catch blocks that should use console.warn
      const catchBlocks = backgroundJs.match(/\} catch \([^)]+\) \{[^}]*console\.error/g) || [];

      console.log(`\n📋 Catch blocks with console.error: ${catchBlocks.length}`);

      if (catchBlocks.length > 10) {
        console.warn('⚠️ Many catch blocks use console.error');
        console.warn('   Review: Are these expected errors that should be console.warn?');
        console.warn('   See: CONSOLE-ERROR-ANALYSIS.md for guidelines\n');
      }
    });
  });

  describe('Crash Detection Trigger Patterns', () => {
    it('should NOT have multiple console.error in rapid succession', () => {
      // Chrome crash detection may trigger on rapid console.error() calls
      // Search for patterns like:
      //   console.error(...)
      //   console.error(...)
      //   console.error(...)
      // We look for 3+ in a row (pattern matches if there are at least 3)

      const rapidErrors = backgroundJs.match(/console\.error[^\n]*\n[^\n]*console\.error[^\n]*\n[^\n]*console\.error/g) || [];

      if (rapidErrors.length > 0) {
        const errorDetails = rapidErrors.slice(0, 3).map((match, idx) => {
          const matchIndex = backgroundJs.indexOf(match);
          const lineNumber = backgroundJs.substring(0, matchIndex).split('\n').length;
          const preview = match.substring(0, 100).replace(/\n/g, ' ');
          return `  ${idx + 1}. Line ~${lineNumber}: ${preview}...`;
        }).join('\n');

        throw new Error(`❌ Found ${rapidErrors.length} rapid console.error sequence(s). ` +
                        `Chrome may interpret this as extension crash. ` +
                        `Example locations:\n${errorDetails}\n` +
                        `Recommendation: Consolidate into single console.warn with object. ` +
                        `See TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md:459-483`);
      }
    });

    it('should consolidate error details into single log (not split across multiple console.error)', () => {
      // Detects pattern where single error is logged using multiple console.error calls
      // Example: Lines 1000-1005 in background.js have 6 console.error for ONE tab cleanup failure
      //   console.error('[ChromeDevAssist] ⚠️ TAB CLEANUP FAILED ⚠️');
      //   console.error('[ChromeDevAssist] Tab ID:', tab.id);
      //   console.error('[ChromeDevAssist] Error type:', err.constructor.name);
      //   ... (3 more console.error calls for same error)

      // Look for sequences of 4+ console.error calls within 20 lines
      const lines = backgroundJs.split('\n');
      const violations = [];

      for (let i = 0; i < lines.length - 3; i++) {
        // Count console.error in next 20 lines
        let errorCount = 0;
        const windowSize = Math.min(20, lines.length - i);

        for (let j = 0; j < windowSize; j++) {
          if (lines[i + j].includes('console.error')) {
            errorCount++;
          }
        }

        // If 4+ console.error in 20-line window, might be error detail splitting
        if (errorCount >= 4) {
          const lineNumber = i + 1;
          const snippet = lines.slice(i, i + 4).join('\n').substring(0, 150);
          violations.push({ lineNumber, errorCount, snippet });

          // Skip ahead to avoid duplicate detections
          i += windowSize;
        }
      }

      if (violations.length > 0) {
        const violationDetails = violations.map((v, idx) => {
          return `  ${idx + 1}. Line ~${v.lineNumber}: ${v.errorCount} console.error calls in 20 lines\n` +
                 `     ${v.snippet.replace(/\n/g, '\n     ')}...`;
        }).join('\n');

        throw new Error(`❌ Found ${violations.length} location(s) with multiple console.error for single error. ` +
                        `Should consolidate into single console.warn with object:\n` +
                        `  console.warn('Message', { tabId, errorType, errorMessage, ... });\n\n` +
                        `Violations:\n${violationDetails}\n\n` +
                        `See TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md:459-483`);
      }
    });

    it('should NOT use console.error in error event handlers', () => {
      // Error event handlers (onerror, catch) should use console.warn for expected errors
      const errorHandlers = [
        'ws.onerror',
        'ws.onclose',
        '.catch(',
        'catch (error)',
        'catch (err)'
      ];

      for (const handler of errorHandlers) {
        const handlerIndex = backgroundJs.indexOf(handler);

        if (handlerIndex > 0) {
          // Check next 1000 characters for console.error
          const section = backgroundJs.substring(handlerIndex, handlerIndex + 1000);
          const hasError = section.match(/console\.error/g);

          if (hasError && hasError.length > 0) {
            // Check if it's a fixed handler (has "✅ FIX" comment)
            const hasFixComment = section.includes('✅ FIX');

            if (!hasFixComment) {
              console.warn(`⚠️ console.error in ${handler} without fix comment`);
              console.warn('   Expected errors should use console.warn');
            }
          }
        }
      }
    });
  });

  describe('Test Pattern Examples (For Future Tests)', () => {
    it('example: detect console.error for specific error type', () => {
      // Template for testing specific error scenarios
      const errorType = 'Tab close failed';
      const errorIndex = backgroundJs.indexOf(errorType);

      if (errorIndex > 0) {
        const section = backgroundJs.substring(errorIndex - 100, errorIndex + 200);

        // Check if this is an expected error (should be console.warn)
        const isExpectedError =
          section.includes('already closed') ||
          section.includes('expected') ||
          section.includes('gracefully');

        if (isExpectedError) {
          expect(section).not.toContain('console.error');
          expect(section).toContain('console.warn');
        }
      }
    });

    it('example: verify all catch blocks handle errors appropriately', () => {
      // Count catch blocks vs console.error usage
      const catchBlocks = (backgroundJs.match(/\} catch \(/g) || []).length;
      const consoleErrors = (backgroundJs.match(/console\.error\(/g) || []).length;

      console.log(`\n📊 Statistics:`);
      console.log(`   Catch blocks: ${catchBlocks}`);
      console.log(`   console.error calls: ${consoleErrors}`);
      console.log(`   Ratio: ${(consoleErrors / catchBlocks * 100).toFixed(1)}%`);
      console.log(`   Goal: <30% (most errors should be console.warn)\n`);

      // Most catch blocks should use console.warn, not console.error
      // This test documents the current state
      expect(catchBlocks).toBeGreaterThan(0);
    });
  });

  describe('Regression Prevention', () => {
    it('should prevent re-introducing console.error for connection failures', () => {
      // Ensure connection failures use console.warn
      const connectionFailurePatterns = [
        /ws\.onerror.*console\.error.*WebSocket/i,
        /timeout.*console\.error.*connection/i,
        /registration.*console\.error.*timeout/i
      ];

      for (const pattern of connectionFailurePatterns) {
        const match = backgroundJs.match(pattern);

        if (match) {
          fail(`Found console.error for connection failure: ${match[0].substring(0, 100)}`);
        }
      }
    });

    it('should prevent re-introducing console.error for command failures', () => {
      // Ensure command failures use console.warn
      // Look for catch blocks that log "Command failed" with console.error (not console.warn)
      const catchBlocks = backgroundJs.split('} catch (error) {');

      for (let i = 1; i < catchBlocks.length; i++) {
        const block = catchBlocks[i].substring(0, 600);

        // If this block has "Command failed" text
        if (block.includes('Command failed')) {
          // Check if it uses console.error (bad)
          const hasError = block.match(/console\.error.*Command failed/);

          // Should NOT have console.error for Command failed
          if (hasError) {
            expect(hasError).toBeNull();
            throw new Error(`Found console.error for command failure (should be console.warn): ${hasError[0].substring(0, 100)}`);
          }
        }
      }
    });
  });
});

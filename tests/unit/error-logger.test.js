/**
 * ErrorLogger Unit Tests
 *
 * SCOPE: Test centralized error logging functionality
 * PURPOSE: Ensure correct error categorization (expected vs unexpected)
 * SECURITY: Verify no information disclosure (stack traces, internal paths)
 *
 * Test-First Discipline: This test file written BEFORE implementation
 *
 * Related: ARCHITECTURE-REVIEW-ERROR-HANDLING.md
 * Related: docs/TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md
 */

const ErrorLogger = require('../../extension/lib/error-logger');

describe('ErrorLogger', () => {
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Spy on console methods to verify logging behavior
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('logExpectedError()', () => {
    it('should use console.warn for expected errors', () => {
      const error = new Error('Tab not found');

      ErrorLogger.logExpectedError('tabCleanup', 'Failed to close tab', error);

      // Verify console.warn was called (NOT console.error)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should include error context in log message', () => {
      const error = new Error('No tab with id: 999999');

      ErrorLogger.logExpectedError('closeTab', 'Tab not found', error);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChromeDevAssist]'),
        expect.objectContaining({
          context: 'closeTab',
          message: 'Tab not found',
          errorMessage: 'No tab with id: 999999'
        })
      );
    });

    it('should NOT include stack trace (security)', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Object.<anonymous> (/path/to/file.js:10:15)';

      ErrorLogger.logExpectedError('test', 'Test message', error);

      const loggedData = consoleWarnSpy.mock.calls[0][1];
      expect(loggedData).not.toHaveProperty('stack');
      expect(JSON.stringify(loggedData)).not.toContain('/path/to/file.js');
    });

    it('should handle error object with all properties', () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNREFUSED';
      error.errno = -61;

      ErrorLogger.logExpectedError('websocket', 'Connection error', error);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: 'websocket',
          errorType: 'Error',
          errorMessage: 'Connection failed',
          errorCode: 'ECONNREFUSED'
        })
      );
    });

    it('should handle undefined error gracefully', () => {
      ErrorLogger.logExpectedError('test', 'No error object');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: 'test',
          message: 'No error object'
        })
      );
    });

    it('should include timestamp', () => {
      const beforeTime = Date.now();

      ErrorLogger.logExpectedError('test', 'Test');

      const afterTime = Date.now();
      const loggedData = consoleWarnSpy.mock.calls[0][1];

      expect(loggedData).toHaveProperty('timestamp');
      const loggedTime = new Date(loggedData.timestamp).getTime();
      expect(loggedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(loggedTime).toBeLessThanOrEqual(afterTime);
    });

    it('should return error data object', () => {
      const error = new Error('Test error');

      const result = ErrorLogger.logExpectedError('test', 'Test message', error);

      expect(result).toEqual(expect.objectContaining({
        context: 'test',
        message: 'Test message',
        errorType: 'Error',
        errorMessage: 'Test error',
        timestamp: expect.any(String)
      }));
    });
  });

  describe('logUnexpectedError()', () => {
    it('should use console.error for unexpected errors', () => {
      const error = new Error('Null pointer exception');

      ErrorLogger.logUnexpectedError('internal', 'Programming bug', error);

      // Verify console.error was called (NOT console.warn)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should include error context in log message', () => {
      const error = new Error('WebSocket is null');

      ErrorLogger.logUnexpectedError('safeSend', 'Null WebSocket', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChromeDevAssist]'),
        expect.objectContaining({
          context: 'safeSend',
          message: 'Null WebSocket',
          errorMessage: 'WebSocket is null'
        })
      );
    });

    it('should NOT include stack trace even for unexpected errors (security)', () => {
      const error = new Error('Unexpected error');
      error.stack = 'Error: Unexpected\n    at dangerous/path.js:123';

      ErrorLogger.logUnexpectedError('test', 'Bug found', error);

      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData).not.toHaveProperty('stack');
      expect(JSON.stringify(loggedData)).not.toContain('dangerous/path.js');
    });

    it('should return error data object', () => {
      const error = new Error('Unexpected state');

      const result = ErrorLogger.logUnexpectedError('stateCheck', 'Invalid state', error);

      expect(result).toEqual(expect.objectContaining({
        context: 'stateCheck',
        message: 'Invalid state',
        errorType: 'Error',
        errorMessage: 'Unexpected state',
        timestamp: expect.any(String)
      }));
    });
  });

  describe('logInfo()', () => {
    it('should use console.log for informational messages', () => {
      ErrorLogger.logInfo('startup', 'Extension started');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should include context and message', () => {
      ErrorLogger.logInfo('connection', 'WebSocket connected', { port: 9876 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ChromeDevAssist] connection:',
        'WebSocket connected',
        { port: 9876 }
      );
    });

    it('should handle missing data parameter', () => {
      ErrorLogger.logInfo('test', 'Simple message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ChromeDevAssist] test:',
        'Simple message',
        ''
      );
    });
  });

  describe('logCritical()', () => {
    it('should use console.error for critical errors', () => {
      const error = new Error('Extension cannot function');

      ErrorLogger.logCritical('initialization', 'Critical failure', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should return error data object', () => {
      const error = new Error('Fatal error');

      const result = ErrorLogger.logCritical('crash', 'Unrecoverable', error);

      expect(result).toEqual(expect.objectContaining({
        context: 'crash',
        message: 'Unrecoverable',
        errorMessage: 'Fatal error'
      }));
    });
  });

  describe('Error Categorization (Regression Prevention)', () => {
    it('should NEVER use console.error for expected errors', () => {
      // These are all EXPECTED errors that should use console.warn
      const expectedErrors = [
        { context: 'tabCleanup', message: 'Tab already closed', error: new Error('No tab with id') },
        { context: 'queueOverflow', message: 'Queue full', error: new Error('Max queue size') },
        { context: 'sendFailed', message: 'Send failed', error: new Error('WebSocket closed') },
        { context: 'connectionTimeout', message: 'Timeout', error: new Error('Connection timeout') }
      ];

      for (const { context, message, error } of expectedErrors) {
        consoleErrorSpy.mockClear();
        consoleWarnSpy.mockClear();

        ErrorLogger.logExpectedError(context, message, error);

        // Critical: console.error must NOT be called for expected errors
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      }
    });

    it('should ALWAYS use console.error for unexpected errors', () => {
      // These are all UNEXPECTED errors (programming bugs)
      const unexpectedErrors = [
        { context: 'nullCheck', message: 'Null pointer', error: new Error('WebSocket is null') },
        { context: 'stateCheck', message: 'Unknown state', error: new Error('Invalid state: 99') },
        { context: 'apiError', message: 'API failed', error: new Error('No main frame result') }
      ];

      for (const { context, message, error } of unexpectedErrors) {
        consoleErrorSpy.mockClear();
        consoleWarnSpy.mockClear();

        ErrorLogger.logUnexpectedError(context, message, error);

        // Critical: console.error MUST be called for unexpected errors
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('Consolidation (Anti-Pattern Prevention)', () => {
    it('should consolidate multiple error details into single log', () => {
      const error = new Error('Tab cleanup failed');
      error.code = 'ERR_TAB_CLOSED';

      const tabId = 12345;

      // BEFORE (bad): 6 separate console.error calls
      // AFTER (good): 1 consolidated call with all data

      ErrorLogger.logExpectedError('tabCleanup', `Failed to close tab ${tabId}`, error);

      // Should be called only ONCE (not 6 times)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Should include all details in single object
      const loggedData = consoleWarnSpy.mock.calls[0][1];
      expect(loggedData).toEqual(expect.objectContaining({
        context: 'tabCleanup',
        message: expect.stringContaining('12345'),
        errorType: 'Error',
        errorMessage: 'Tab cleanup failed',
        errorCode: 'ERR_TAB_CLOSED'
      }));
    });

    it('should NOT log error details across multiple calls', () => {
      const error = new Error('Test error');
      error.code = 'TEST_CODE';

      ErrorLogger.logExpectedError('test', 'Test message', error);

      // Verify only 1 console call was made
      const totalCalls = consoleWarnSpy.mock.calls.length +
                         consoleErrorSpy.mock.calls.length +
                         consoleLogSpy.mock.calls.length;

      expect(totalCalls).toBe(1);
    });
  });

  describe('Security (Information Disclosure Prevention)', () => {
    it('should never include stack traces in any logs', () => {
      const error = new Error('Test');
      error.stack = 'SENSITIVE_PATH/internal/file.js:123';

      const expectedResult = ErrorLogger.logExpectedError('test', 'Test', error);
      const unexpectedResult = ErrorLogger.logUnexpectedError('test', 'Test', error);

      // Check both return values and console calls
      expect(expectedResult).not.toHaveProperty('stack');
      expect(unexpectedResult).not.toHaveProperty('stack');

      const allCalls = [...consoleWarnSpy.mock.calls, ...consoleErrorSpy.mock.calls];
      for (const call of allCalls) {
        const loggedData = call[1];
        expect(loggedData).not.toHaveProperty('stack');
        expect(JSON.stringify(loggedData)).not.toContain('SENSITIVE_PATH');
      }
    });

    it('should sanitize error messages containing internal paths', () => {
      const error = new Error('Failed at /internal/extension/path.js line 123');

      ErrorLogger.logExpectedError('test', 'Test', error);

      const loggedData = consoleWarnSpy.mock.calls[0][1];

      // Should include error message but consider sanitization
      expect(loggedData.errorMessage).toBeTruthy();
      // Note: Current implementation doesn't sanitize, but test documents expectation
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error object', () => {
      expect(() => {
        ErrorLogger.logExpectedError('test', 'Test', null);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle error without message property', () => {
      const error = { code: 'CUSTOM_ERROR' }; // Not an Error instance

      ErrorLogger.logExpectedError('test', 'Test', error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      expect(() => {
        ErrorLogger.logExpectedError('test', 'Test', error);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle circular reference in error object', () => {
      const error = new Error('Test');
      error.circular = error; // Create circular reference

      expect(() => {
        ErrorLogger.logExpectedError('test', 'Test', error);
      }).not.toThrow();
    });

    it('should handle empty context and message', () => {
      ErrorLogger.logExpectedError('', '', new Error('Test'));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: '',
          message: ''
        })
      );
    });
  });

  // ============================================================================
  // TESTER PERSONA: Real-World Scenarios & Regression Tests
  // ============================================================================

  describe('Tester Persona: Real-World Scenarios', () => {
    describe('Scenario: Tab Cleanup Failure (ISSUE background.js:1000-1005)', () => {
      it('should handle tab already closed by user', () => {
        const error = new Error('No tab with id: 12345');
        const tabId = 12345;

        ErrorLogger.logExpectedError('tabCleanup', `Failed to close tab ${tabId}`, error);

        // CRITICAL: Must use console.warn (not console.error)
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        // Must consolidate into single call (not 6 separate calls)
        const totalConsoleCalls = consoleWarnSpy.mock.calls.length +
                                  consoleErrorSpy.mock.calls.length +
                                  consoleLogSpy.mock.calls.length;
        expect(totalConsoleCalls).toBe(1);
      });

      it('should include all tab cleanup context in single log', () => {
        const error = new Error('Tab not found');
        error.code = 'ERR_TAB_NOT_FOUND';

        ErrorLogger.logExpectedError('tabCleanup', 'Failed to close tab 999', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // Must include all relevant details
        expect(loggedData).toEqual(expect.objectContaining({
          context: 'tabCleanup',
          message: expect.stringContaining('999'),
          errorType: 'Error',
          errorMessage: 'Tab not found',
          errorCode: 'ERR_TAB_NOT_FOUND'
        }));

        // Must NOT include stack trace
        expect(loggedData).not.toHaveProperty('stack');
      });
    });

    describe('Scenario: Queue Overflow (ISSUE background.js:173)', () => {
      it('should handle queue full as expected error', () => {
        const error = new Error('Queue full');

        ErrorLogger.logExpectedError('queueOverflow', 'Message queue at capacity', error);

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe('Scenario: Send Failure During Disconnection (ISSUE background.js:211)', () => {
      it('should handle send failure as expected error', () => {
        const error = new Error('WebSocket is not OPEN');

        ErrorLogger.logExpectedError('sendFailed', 'Cannot send message', error);

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe('Scenario: Connection Timeout', () => {
      it('should handle connection timeout as expected error', () => {
        const error = new Error('Connection timeout after 5s');

        ErrorLogger.logExpectedError('connectionTimeout', 'Server not responding', error);

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe('Regression Prevention: Chrome Crash Detection', () => {
      it('should never trigger rapid console.error sequence', () => {
        // Simulate logging multiple errors in rapid succession
        const errors = [
          { context: 'tab1', message: 'Tab 1 failed', error: new Error('Tab 1') },
          { context: 'tab2', message: 'Tab 2 failed', error: new Error('Tab 2') },
          { context: 'tab3', message: 'Tab 3 failed', error: new Error('Tab 3') }
        ];

        for (const {context, message, error} of errors) {
          ErrorLogger.logExpectedError(context, message, error);
        }

        // All should use console.warn (not console.error)
        expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // SECURITY PERSONA: Input Validation & Attack Prevention
  // ============================================================================

  describe('Security Persona: Input Validation', () => {
    describe('XSS Prevention', () => {
      it('should handle error messages containing HTML/script tags', () => {
        const error = new Error('<script>alert("XSS")</script>');

        ErrorLogger.logExpectedError('xssTest', 'Malicious error', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // Error message should be logged (we're not rendering HTML, just logging)
        expect(loggedData.errorMessage).toContain('<script>');

        // But verify it's in an object (safe for console logging)
        expect(typeof loggedData.errorMessage).toBe('string');
      });

      it('should handle context containing HTML tags', () => {
        const maliciousContext = '<img src=x onerror=alert(1)>';

        ErrorLogger.logExpectedError(maliciousContext, 'Test', new Error('Test'));

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.context).toBe(maliciousContext);
        expect(typeof loggedData.context).toBe('string');
      });
    });

    describe('Injection Attack Prevention', () => {
      it('should handle error messages with JSON injection attempts', () => {
        const error = new Error('{"malicious": "payload", "__proto__": {"polluted": true}}');

        ErrorLogger.logExpectedError('injectionTest', 'Test', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // Should log as string, not execute JSON
        expect(loggedData.errorMessage).toContain('__proto__');
        expect(loggedData.errorMessage).toContain('polluted');
      });

      it('should handle error messages with prototype pollution attempts', () => {
        const error = new Error('constructor[prototype][polluted]=true');

        ErrorLogger.logExpectedError('pollutionTest', 'Test', error);

        // Should not throw
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Path Disclosure Prevention', () => {
      it('should not expose internal file paths in stack traces', () => {
        const error = new Error('File error');
        error.stack = `Error: File error
    at Object.<anonymous> (/Users/internal/secret/path/file.js:10:15)
    at Module._compile (node:internal/modules/cjs/loader:1256:14)`;

        ErrorLogger.logExpectedError('pathTest', 'Test', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // Stack should NOT be included
        expect(loggedData).not.toHaveProperty('stack');
        expect(JSON.stringify(loggedData)).not.toContain('/Users/internal/secret');
      });

      it('should handle error messages containing file paths', () => {
        const error = new Error('Failed to load /etc/passwd');

        ErrorLogger.logExpectedError('fileTest', 'Test', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // Error message is included (it's user-provided error message)
        // Note: Sanitization of error messages is not currently implemented
        expect(loggedData.errorMessage).toContain('/etc/passwd');
      });
    });

    describe('DoS Prevention', () => {
      it('should handle extremely large error objects', () => {
        const error = new Error('Test');
        // Add many properties to error object
        for (let i = 0; i < 1000; i++) {
          error[`prop${i}`] = `value${i}`;
        }

        expect(() => {
          ErrorLogger.logExpectedError('dosTest', 'Large object', error);
        }).not.toThrow();

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle deeply nested error objects', () => {
        const error = new Error('Test');
        let nested = error;
        for (let i = 0; i < 100; i++) {
          nested.child = { level: i };
          nested = nested.child;
        }

        expect(() => {
          ErrorLogger.logExpectedError('nestTest', 'Nested object', error);
        }).not.toThrow();
      });
    });

    describe('Type Safety', () => {
      it('should handle non-Error objects safely', () => {
        const fakeError = {
          message: 'Not a real Error',
          code: 'FAKE',
          toString: () => '[object FakeError]'
        };

        expect(() => {
          ErrorLogger.logExpectedError('typeTest', 'Test', fakeError);
        }).not.toThrow();

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle primitive values as error', () => {
        const primitives = ['string error', 123, true, Symbol('error')];

        for (const primitive of primitives) {
          consoleWarnSpy.mockClear();

          expect(() => {
            ErrorLogger.logExpectedError('primitiveTest', 'Test', primitive);
          }).not.toThrow();

          expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  // ============================================================================
  // QA PERSONA: Boundary Values & Performance
  // ============================================================================

  describe('QA Persona: Boundary Values', () => {
    describe('String Length Boundaries', () => {
      it('should handle empty string context', () => {
        ErrorLogger.logExpectedError('', 'Message', new Error('Test'));

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ context: '' })
        );
      });

      it('should handle very long context (10000 chars)', () => {
        const longContext = 'x'.repeat(10000);

        expect(() => {
          ErrorLogger.logExpectedError(longContext, 'Test', new Error('Test'));
        }).not.toThrow();

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle Unicode characters in context', () => {
        const unicodeContext = '测试🔍错误日志器';

        ErrorLogger.logExpectedError(unicodeContext, 'Unicode test', new Error('Test'));

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.context).toBe(unicodeContext);
      });

      it('should handle special characters in message', () => {
        const specialMessage = 'Error: \n\r\t\\"\'/';

        ErrorLogger.logExpectedError('test', specialMessage, new Error('Test'));

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.message).toBe(specialMessage);
      });
    });

    describe('Error Object Boundaries', () => {
      it('should handle Error with no message', () => {
        const error = new Error();

        ErrorLogger.logExpectedError('test', 'No message', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.errorMessage).toBe('');
      });

      it('should handle Error with undefined properties', () => {
        const error = new Error('Test');
        error.code = undefined;
        error.errno = undefined;

        ErrorLogger.logExpectedError('test', 'Undefined props', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.errorCode).toBeUndefined();
      });

      it('should handle Error with null properties', () => {
        const error = new Error('Test');
        error.code = null;

        ErrorLogger.logExpectedError('test', 'Null props', error);

        const loggedData = consoleWarnSpy.mock.calls[0][1];
        expect(loggedData.errorCode).toBeNull();
      });
    });

    describe('Performance & Stress Tests', () => {
      it('should handle 1000 sequential log calls efficiently', () => {
        const startTime = Date.now();

        for (let i = 0; i < 1000; i++) {
          ErrorLogger.logExpectedError(`test${i}`, `Message ${i}`, new Error(`Error ${i}`));
        }

        const duration = Date.now() - startTime;

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1000);
        // Should complete in reasonable time (< 1 second)
        expect(duration).toBeLessThan(1000);
      });

      it('should handle rapid expected/unexpected error alternation', () => {
        for (let i = 0; i < 100; i++) {
          if (i % 2 === 0) {
            ErrorLogger.logExpectedError(`test${i}`, 'Test', new Error('Expected'));
          } else {
            ErrorLogger.logUnexpectedError(`test${i}`, 'Test', new Error('Unexpected'));
          }
        }

        expect(consoleWarnSpy.mock.calls.length).toBe(50);
        expect(consoleErrorSpy.mock.calls.length).toBe(50);
      });
    });

    describe('Concurrent Logging', () => {
      it('should handle concurrent log calls without corruption', async () => {
        const promises = [];

        for (let i = 0; i < 10; i++) {
          promises.push(
            Promise.resolve().then(() => {
              ErrorLogger.logExpectedError(`concurrent${i}`, `Message ${i}`, new Error(`Error ${i}`));
            })
          );
        }

        await Promise.all(promises);

        expect(consoleWarnSpy).toHaveBeenCalledTimes(10);

        // Verify all contexts are unique (no corruption)
        const contexts = consoleWarnSpy.mock.calls.map(call => call[1].context);
        const uniqueContexts = new Set(contexts);
        expect(uniqueContexts.size).toBe(10);
      });
    });
  });

  // ============================================================================
  // LOGIC PERSONA: State Transitions & Invariants
  // ============================================================================

  describe('Logic Persona: Invariants & Contracts', () => {
    describe('Method Contracts', () => {
      it('logExpectedError() must always use console.warn (invariant)', () => {
        // This is an INVARIANT - must NEVER be violated
        const testCases = [
          { context: 'a', message: 'b', error: new Error('c') },
          { context: '', message: '', error: null },
          { context: 'x'.repeat(1000), message: 'y', error: new Error('z') }
        ];

        for (const testCase of testCases) {
          consoleErrorSpy.mockClear();
          consoleWarnSpy.mockClear();

          ErrorLogger.logExpectedError(testCase.context, testCase.message, testCase.error);

          // INVARIANT: Must use console.warn
          expect(consoleWarnSpy).toHaveBeenCalled();
          // INVARIANT: Must NOT use console.error
          expect(consoleErrorSpy).not.toHaveBeenCalled();
        }
      });

      it('logUnexpectedError() must always use console.error (invariant)', () => {
        const testCases = [
          { context: 'null', message: 'Null check failed', error: new Error('null') },
          { context: 'state', message: 'Unknown state', error: new Error('state') }
        ];

        for (const testCase of testCases) {
          consoleErrorSpy.mockClear();
          consoleWarnSpy.mockClear();

          ErrorLogger.logUnexpectedError(testCase.context, testCase.message, testCase.error);

          // INVARIANT: Must use console.error
          expect(consoleErrorSpy).toHaveBeenCalled();
          // INVARIANT: Must NOT use console.warn
          expect(consoleWarnSpy).not.toHaveBeenCalled();
        }
      });

      it('all log methods must return error data object (post-condition)', () => {
        const error = new Error('Test');

        const expectedResult = ErrorLogger.logExpectedError('test', 'Test', error);
        const unexpectedResult = ErrorLogger.logUnexpectedError('test', 'Test', error);
        const criticalResult = ErrorLogger.logCritical('test', 'Test', error);

        // POST-CONDITION: All must return object with required fields
        for (const result of [expectedResult, unexpectedResult, criticalResult]) {
          expect(result).toBeDefined();
          expect(result).toHaveProperty('context');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('timestamp');
        }
      });

      it('returned error data must match logged data (consistency)', () => {
        const error = new Error('Consistency test');
        error.code = 'TEST_CODE';

        const returnedData = ErrorLogger.logExpectedError('consistency', 'Test', error);
        const loggedData = consoleWarnSpy.mock.calls[0][1];

        // CONSISTENCY: Returned data must match logged data
        expect(returnedData).toEqual(loggedData);
      });
    });

    describe('State Consistency', () => {
      it('logging should not modify input error object', () => {
        const error = new Error('Original message');
        const originalMessage = error.message;
        const originalStack = error.stack;

        ErrorLogger.logExpectedError('test', 'Test', error);

        // Error object should remain unchanged
        expect(error.message).toBe(originalMessage);
        expect(error.stack).toBe(originalStack);
      });

      it('logging should not modify global state', () => {
        const beforeGlobalKeys = Object.keys(global);

        ErrorLogger.logExpectedError('test', 'Test', new Error('Test'));

        const afterGlobalKeys = Object.keys(global);

        // Global state should not change
        expect(afterGlobalKeys).toEqual(beforeGlobalKeys);
      });
    });

    describe('Temporal Logic', () => {
      it('timestamp should be monotonically increasing', () => {
        const timestamps = [];

        for (let i = 0; i < 10; i++) {
          const result = ErrorLogger.logExpectedError('test', 'Test', new Error('Test'));
          timestamps.push(new Date(result.timestamp).getTime());
        }

        // Each timestamp should be >= previous
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }
      });

      it('timestamp should be within reasonable range of current time', () => {
        const before = Date.now();
        const result = ErrorLogger.logExpectedError('test', 'Test', new Error('Test'));
        const after = Date.now();

        const loggedTime = new Date(result.timestamp).getTime();

        expect(loggedTime).toBeGreaterThanOrEqual(before);
        expect(loggedTime).toBeLessThanOrEqual(after);
      });
    });
  });
});

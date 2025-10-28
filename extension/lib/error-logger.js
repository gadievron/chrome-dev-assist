/**
 * ErrorLogger - Centralized error logging utility
 *
 * Purpose: Prevent Chrome crash detection by using console.warn for expected errors
 * and console.error only for unexpected programming bugs.
 *
 * Background: Chrome marks extensions as "crashed" when it sees console.error() in
 * error handlers, causing the reload button to disappear in chrome://extensions.
 *
 * Decision Tree:
 * - Is this error EXPECTED in normal operation? → logExpectedError() (uses console.warn)
 * - Is this a programming bug or impossible state? → logUnexpectedError() (uses console.error)
 *
 * Related: TESTER-GUIDE-CONSOLE-ERROR-CRASH-BUG.md, ARCHITECTURE-REVIEW-ERROR-HANDLING.md
 */

class ErrorLogger {
  /**
   * Log an EXPECTED error (network issues, user actions, state transitions)
   * Uses console.warn to avoid Chrome crash detection
   *
   * @param {string} context - Context identifier (e.g., 'tabCleanup', 'wsConnect')
   * @param {string} message - Human-readable error description
   * @param {Error|any} error - Error object or error-like object
   * @returns {Object} Error data object (without stack trace)
   */
  static logExpectedError(context, message, error) {
    const errorData = this._buildErrorData(context, message, error);

    // Use console.warn for expected errors to avoid Chrome crash detection
    console.warn('[ChromeDevAssist] Expected error (handled gracefully):', errorData);

    return errorData;
  }

  /**
   * Log an UNEXPECTED error (programming bugs, impossible states)
   * Uses console.error for genuine programming errors
   *
   * @param {string} context - Context identifier
   * @param {string} message - Human-readable error description
   * @param {Error|any} error - Error object or error-like object
   * @returns {Object} Error data object (without stack trace)
   */
  static logUnexpectedError(context, message, error) {
    const errorData = this._buildErrorData(context, message, error);

    // Use console.error for unexpected programming bugs
    console.error('[ChromeDevAssist] Unexpected error (programming bug):', errorData);

    return errorData;
  }

  /**
   * Log informational message
   *
   * @param {string} context - Context identifier
   * @param {string} message - Information message
   * @param {any} data - Optional additional data
   */
  static logInfo(context, message, data) {
    console.log(`[ChromeDevAssist] ${context}:`, message, data || '');
  }

  /**
   * Log critical error (alias for logUnexpectedError)
   *
   * @param {string} context - Context identifier
   * @param {string} message - Human-readable error description
   * @param {Error|any} error - Error object or error-like object
   * @returns {Object} Error data object (without stack trace)
   */
  static logCritical(context, message, error) {
    return this.logUnexpectedError(context, message, error);
  }

  /**
   * Build error data object (internal helper)
   *
   * Security considerations:
   * - Does NOT include stack traces (prevents path disclosure)
   * - Handles null/undefined gracefully
   * - Prevents circular references
   *
   * @private
   * @param {string} context - Context identifier
   * @param {string} message - Human-readable error description
   * @param {Error|any} error - Error object or error-like object
   * @returns {Object} Error data object
   */
  static _buildErrorData(context, message, error) {
    // Handle null/undefined gracefully
    const safeContext = context ?? 'unknown';
    const safeMessage = message ?? 'No message provided';

    // Extract error details safely
    let errorType = 'unknown';
    let errorMessage = 'No error details';
    let errorCode = undefined;

    if (error) {
      try {
        // Safely extract error type
        errorType = error.constructor?.name ?? typeof error;

        // Safely extract error message
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.toString && typeof error.toString === 'function') {
          errorMessage = error.toString();
        }

        // Safely extract error code
        if (error.code !== undefined) {
          errorCode = error.code;
        }
      } catch (extractError) {
        // If error extraction fails, use safe defaults
        errorMessage = 'Error extraction failed';
      }
    }

    // Build error data object
    const errorData = {
      context: safeContext,
      message: safeMessage,
      errorType,
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    // Only include errorCode if it exists
    if (errorCode !== undefined) {
      errorData.errorCode = errorCode;
    }

    // Security: Explicitly do NOT include stack trace
    // This prevents internal path disclosure and reduces log size

    return errorData;
  }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  // Node.js / Jest environment
  module.exports = ErrorLogger;
}

// Make available globally for Chrome extension
if (typeof window !== 'undefined') {
  window.ErrorLogger = ErrorLogger;
}

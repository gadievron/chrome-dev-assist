/**
 * ConsoleCapture - Minimal Proof of Concept Implementation
 *
 * This is a minimal implementation to validate the class-based approach
 * for console capture management.
 *
 * Features (POC):
 * - Start/stop captures
 * - Add logs with tab filtering
 * - Get logs (returns copy)
 * - Cleanup captures
 * - Auto-stop after duration
 *
 * This POC demonstrates:
 * 1. Separation of concerns (console capture isolated from background.js)
 * 2. Testability (can unit test without Chrome APIs)
 * 3. Clean API design
 * 4. O(1) tab lookup (using capturesByTab index)
 */
class ConsoleCapture {
  constructor() {
    // Main capture storage: Map<captureId, CaptureState>
    this.captures = new Map();

    // Tab index for O(1) lookup: Map<tabId, Set<captureId>>
    this.capturesByTab = new Map();

    // Default configuration (POC uses simple defaults)
    this.config = {
      defaultDuration: 5000,
      defaultMaxLogs: 10000
    };
  }

  /**
   * Start a new capture
   * @param {string} captureId - Unique capture identifier
   * @param {Object} [options] - Capture options
   * @param {number} [options.tabId] - Tab to capture from (null = all tabs)
   * @param {number} [options.duration] - Auto-stop after ms
   * @param {number} [options.maxLogs] - Maximum logs to capture
   */
  start(captureId, options = {}) {
    // Validate captureId doesn't already exist
    if (this.captures.has(captureId)) {
      throw new Error(`Capture ${captureId} already exists`);
    }

    const {
      tabId = null,
      duration = this.config.defaultDuration,
      maxLogs = this.config.defaultMaxLogs
    } = options;

    // Create capture state
    const state = {
      logs: [],
      active: true,
      tabId,
      maxLogs,
      startTime: Date.now(),
      endTime: null,
      timeout: null
    };

    // Set auto-stop timeout
    if (duration > 0) {
      state.timeout = setTimeout(() => {
        this.stop(captureId);
      }, duration);
    }

    // Add to main storage
    this.captures.set(captureId, state);

    // Add to tab index for O(1) lookup
    if (tabId !== null) {
      if (!this.capturesByTab.has(tabId)) {
        this.capturesByTab.set(tabId, new Set());
      }
      this.capturesByTab.get(tabId).add(captureId);
    }
  }

  /**
   * Stop a capture (marks inactive, keeps logs)
   * @param {string} captureId
   */
  stop(captureId) {
    const state = this.captures.get(captureId);
    if (!state) return;  // Idempotent - safe to call multiple times

    state.active = false;
    state.endTime = Date.now();

    // Clear timeout
    if (state.timeout) {
      clearTimeout(state.timeout);
      state.timeout = null;
    }
  }

  /**
   * Add a log entry to relevant captures
   * @param {number} tabId - Tab the log came from
   * @param {Object} logEntry - Log entry object
   */
  addLog(tabId, logEntry) {
    const relevantCaptures = new Set();

    // 1. Find tab-specific captures (O(1) lookup)
    if (this.capturesByTab.has(tabId)) {
      for (const captureId of this.capturesByTab.get(tabId)) {
        relevantCaptures.add(captureId);
      }
    }

    // 2. Find global captures (tabId === null)
    for (const [captureId, state] of this.captures.entries()) {
      if (state.active && state.tabId === null) {
        relevantCaptures.add(captureId);
      }
    }

    // 3. Add log to all relevant captures
    for (const captureId of relevantCaptures) {
      const state = this.captures.get(captureId);

      if (!state || !state.active) continue;

      // Enforce maxLogs limit
      if (state.logs.length < state.maxLogs) {
        state.logs.push(logEntry);
      } else if (state.logs.length === state.maxLogs) {
        // Add warning once when limit reached
        state.logs.push({
          level: 'warn',
          message: `[ChromeDevAssist] Log limit reached (${state.maxLogs}). Further logs will be dropped.`,
          timestamp: new Date().toISOString(),
          source: 'chrome-dev-assist',
          tabId: logEntry.tabId
        });
      }
      // Else: silently drop (already over limit)
    }
  }

  /**
   * Get logs for a capture (returns copy to prevent mutation)
   * @param {string} captureId
   * @returns {Array} Copy of logs array
   */
  getLogs(captureId) {
    const state = this.captures.get(captureId);
    if (!state) return [];

    // Return copy to prevent external mutation
    return [...state.logs];
  }

  /**
   * Remove a capture completely (cleanup)
   * @param {string} captureId
   */
  cleanup(captureId) {
    const state = this.captures.get(captureId);
    if (!state) return;  // Idempotent

    // Clear timeout
    if (state.timeout) {
      clearTimeout(state.timeout);
    }

    // Remove from tab index
    if (state.tabId !== null) {
      const tabSet = this.capturesByTab.get(state.tabId);
      if (tabSet) {
        tabSet.delete(captureId);
        // Clean up empty sets to prevent memory leaks
        if (tabSet.size === 0) {
          this.capturesByTab.delete(state.tabId);
        }
      }
    }

    // Remove from main storage
    this.captures.delete(captureId);
  }

  /**
   * Check if capture is active
   * @param {string} captureId
   * @returns {boolean}
   */
  isActive(captureId) {
    const state = this.captures.get(captureId);
    return state ? state.active : false;
  }

  /**
   * Get capture statistics
   * @param {string} captureId
   * @returns {Object|null} Stats or null if not found
   */
  getStats(captureId) {
    const state = this.captures.get(captureId);
    if (!state) return null;

    return {
      captureId,
      active: state.active,
      tabId: state.tabId,
      maxLogs: state.maxLogs,
      logCount: state.logs.length,
      startTime: state.startTime,
      endTime: state.endTime
    };
  }

  /**
   * Get all capture IDs (for testing/debugging)
   * @returns {Array<string>}
   */
  getAllCaptureIds() {
    return Array.from(this.captures.keys());
  }

  /**
   * Clean up stale (old, inactive) captures
   * @param {number} [thresholdMs] - Max age in ms (default: 5 minutes)
   */
  cleanupStale(thresholdMs = 300000) {
    const now = Date.now();

    for (const [captureId, state] of this.captures.entries()) {
      // Only clean up inactive captures
      if (state.active) continue;

      // Check age
      if (state.endTime && (now - state.endTime) > thresholdMs) {
        this.cleanup(captureId);
      }
    }
  }
}

// Export for use in background.js and tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConsoleCapture;
}

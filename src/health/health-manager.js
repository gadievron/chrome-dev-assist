/**
 * Health Manager - Centralized Health Checks
 *
 * Consolidates all connection health verification and recovery logic
 * that was previously scattered across extension, server, and API.
 *
 * Responsibilities:
 * - Check connection status (extension, server, API)
 * - Provide unified health status
 * - Throw helpful errors when unhealthy
 *
 * @module health-manager
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

/**
 * HealthManager class
 *
 * Centralizes all health checks for the Chrome Dev Assist system.
 * Tracks connection state for extension, server, and API sockets.
 *
 * Extends EventEmitter to provide observability hooks for monitoring.
 *
 * Events:
 * - 'health-changed': Emitted when overall health status changes
 * - 'connection-state-changed': Emitted when connection state changes
 * - 'issues-updated': Emitted when issues array changes
 */
class HealthManager extends EventEmitter {
  /**
   * Create a new HealthManager
   *
   * Initializes state tracking for change detection and event emission.
   */
  constructor() {
    super(); // Initialize EventEmitter

    this.extensionSocket = null;
    this.apiSocket = null;

    // State tracking for change detection
    this.previousState = {
      healthy: null,
      extension: {
        connected: null,
        readyState: null
      },
      issues: []
    };
  }

  /**
   * Set the extension WebSocket for health monitoring
   * @param {WebSocket|null} socket - Extension WebSocket connection
   */
  setExtensionSocket(socket) {
    this.extensionSocket = socket;
  }

  /**
   * Set the API WebSocket for health monitoring
   * @param {WebSocket|null} socket - API WebSocket connection
   */
  setApiSocket(socket) {
    this.apiSocket = socket;
  }

  /**
   * Check if extension is connected and ready
   * @returns {boolean} True if extension socket is OPEN
   */
  isExtensionConnected() {
    // Check if socket exists and is OPEN
    if (!this.extensionSocket) {
      return false;
    }

    // Check if socket has readyState property
    if (typeof this.extensionSocket.readyState === 'undefined') {
      return false;
    }

    // Only consider OPEN as connected
    return this.extensionSocket.readyState === WebSocket.OPEN;
  }

  /**
   * Get overall health status
   *
   * Detects state changes and emits events for observers.
   *
   * @returns {Object} Health status with details
   * @emits health-changed When overall health status changes
   * @emits connection-state-changed When connection state changes
   * @emits issues-updated When issues array changes
   */
  getHealthStatus() {
    const issues = [];
    let extensionConnected = false;
    let extensionReadyState = null;

    // Check extension connection
    if (!this.extensionSocket) {
      issues.push('Extension not connected');
    } else {
      extensionReadyState = this.extensionSocket.readyState;
      extensionConnected = extensionReadyState === WebSocket.OPEN;

      if (!extensionConnected) {
        // Add helpful context based on state
        switch (extensionReadyState) {
          case WebSocket.CONNECTING:
            issues.push('Extension is still connecting. Please wait...');
            break;
          case WebSocket.CLOSING:
            issues.push('Extension connection is closing. Will reconnect automatically.');
            break;
          case WebSocket.CLOSED:
            issues.push('Extension disconnected. Waiting for reconnection...');
            break;
          default:
            issues.push(`Extension connection in unknown state: ${extensionReadyState}`);
        }
      }
    }

    // Check API connection (optional for MVP)
    if (this.apiSocket === null) {
      // API socket being null is common (not persistent connection)
      // Only flag if explicitly set to something that's not OPEN
    }

    const healthy = issues.length === 0;

    const currentState = {
      healthy,
      extension: {
        connected: extensionConnected,
        readyState: extensionReadyState
      },
      issues
    };

    // Detect and emit state changes
    this._detectAndEmitChanges(currentState);

    // Update previous state
    this.previousState = {
      healthy: currentState.healthy,
      extension: {
        connected: currentState.extension.connected,
        readyState: currentState.extension.readyState
      },
      issues: [...currentState.issues] // Deep copy
    };

    return currentState;
  }

  /**
   * Ensure system is healthy, throw if not
   * @throws {Error} If system is not healthy
   */
  async ensureHealthy() {
    const status = this.getHealthStatus();

    if (!status.healthy) {
      // Build detailed error message
      let errorMessage;

      if (!this.extensionSocket) {
        errorMessage = 'Extension not connected. Please ensure Chrome Dev Assist extension is loaded and running.';
      } else {
        const state = this.extensionSocket.readyState;
        const stateName = this.getReadyStateName(state);
        errorMessage = `Extension connection is ${stateName}. ${status.issues.join(' ')}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Get human-readable name for WebSocket readyState
   * @private
   * @param {number} readyState - WebSocket.readyState value
   * @returns {string} State name
   */
  getReadyStateName(readyState) {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return `UNKNOWN(${readyState})`;
    }
  }

  /**
   * Detect state changes and emit appropriate events
   *
   * Compares current state with previous state and emits events
   * only when actual changes occur. This prevents noisy events.
   *
   * @private
   * @param {Object} currentState - Current health status
   */
  _detectAndEmitChanges(currentState) {
    const prev = this.previousState;
    const curr = currentState;

    // Skip if this is the first check (prev.healthy is null)
    if (prev.healthy === null) {
      return;
    }

    // 1. Detect overall health change
    if (prev.healthy !== curr.healthy) {
      this.emit('health-changed', {
        previous: {
          healthy: prev.healthy,
          extension: { ...prev.extension },
          issues: [...prev.issues]
        },
        current: {
          healthy: curr.healthy,
          extension: { ...curr.extension },
          issues: [...curr.issues]
        },
        timestamp: Date.now()
      });
    }

    // 2. Detect extension connection state change
    const extensionChanged =
      prev.extension.connected !== curr.extension.connected ||
      prev.extension.readyState !== curr.extension.readyState;

    if (extensionChanged) {
      this.emit('connection-state-changed', {
        connection: 'extension',
        previous: {
          connected: prev.extension.connected,
          readyState: prev.extension.readyState
        },
        current: {
          connected: curr.extension.connected,
          readyState: curr.extension.readyState
        },
        timestamp: Date.now()
      });
    }

    // 3. Detect issues array change (deep comparison)
    const issuesChanged = !this._arraysEqual(prev.issues, curr.issues);

    if (issuesChanged) {
      this.emit('issues-updated', {
        previous: [...prev.issues],
        current: [...curr.issues],
        timestamp: Date.now()
      });
    }
  }

  /**
   * Compare two arrays for equality
   *
   * @private
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {boolean} True if arrays are equal
   */
  _arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }

    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }

    return true;
  }
}

module.exports = HealthManager;

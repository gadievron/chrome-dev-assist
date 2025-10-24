/**
 * TypeScript type definitions for HealthManager
 *
 * Provides type safety for TypeScript consumers while keeping
 * implementation in JavaScript.
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

/**
 * Health status object returned by getHealthStatus()
 */
export interface HealthStatus {
  /** Overall system health */
  healthy: boolean;

  /** Extension connection details */
  extension: {
    /** Whether extension socket is OPEN */
    connected: boolean;
    /** WebSocket readyState (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED) */
    readyState: number | null;
  };

  /** Array of health issues (empty if healthy) */
  issues: string[];
}

/**
 * Event payload for 'health-changed' event
 */
export interface HealthChangedEvent {
  /** Previous health status */
  previous: HealthStatus;
  /** Current health status */
  current: HealthStatus;
  /** Timestamp when change occurred */
  timestamp: number;
}

/**
 * Event payload for 'connection-state-changed' event
 */
export interface ConnectionStateChangedEvent {
  /** Which connection changed ('extension' or 'api') */
  connection: 'extension' | 'api';
  /** Previous connection state */
  previous: {
    connected: boolean;
    readyState: number | null;
  };
  /** Current connection state */
  current: {
    connected: boolean;
    readyState: number | null;
  };
  /** Timestamp when change occurred */
  timestamp: number;
}

/**
 * Event payload for 'issues-updated' event
 */
export interface IssuesUpdatedEvent {
  /** Previous issues array */
  previous: string[];
  /** Current issues array */
  current: string[];
  /** Timestamp when change occurred */
  timestamp: number;
}

/**
 * Health Manager - Centralized Health Checks
 *
 * Centralizes all health checks for the Chrome Dev Assist system.
 * Tracks connection state for extension, server, and API sockets.
 *
 * Extends EventEmitter to provide observability hooks for monitoring.
 *
 * @example
 * ```typescript
 * import HealthManager from './src/health/health-manager';
 *
 * const health = new HealthManager();
 *
 * // Set extension socket
 * health.setExtensionSocket(extensionSocket);
 *
 * // Listen for health changes
 * health.on('health-changed', (event) => {
 *   console.log('Health changed:', event.current.healthy);
 * });
 *
 * // Check health
 * const status = health.getHealthStatus();
 * if (!status.healthy) {
 *   console.error('Issues:', status.issues);
 * }
 *
 * // Ensure healthy (throws if not)
 * await health.ensureHealthy();
 * ```
 */
declare class HealthManager extends EventEmitter {
  /**
   * Extension WebSocket connection
   */
  extensionSocket: WebSocket | null;

  /**
   * API WebSocket connection
   */
  apiSocket: WebSocket | null;

  /**
   * Create a new HealthManager
   *
   * Initializes state tracking for change detection and event emission.
   */
  constructor();

  /**
   * Set the extension WebSocket for health monitoring
   * @param socket - Extension WebSocket connection (or null to clear)
   */
  setExtensionSocket(socket: WebSocket | null): void;

  /**
   * Set the API WebSocket for health monitoring
   * @param socket - API WebSocket connection (or null to clear)
   */
  setApiSocket(socket: WebSocket | null): void;

  /**
   * Check if extension is connected and ready
   * @returns True if extension socket is OPEN
   */
  isExtensionConnected(): boolean;

  /**
   * Get overall health status
   *
   * Detects state changes and emits events for observers.
   *
   * @returns Health status with details
   * @emits health-changed When overall health status changes
   * @emits connection-state-changed When connection state changes
   * @emits issues-updated When issues array changes
   */
  getHealthStatus(): HealthStatus;

  /**
   * Ensure system is healthy, throw if not
   * @throws {Error} If system is not healthy (with descriptive message)
   */
  ensureHealthy(): Promise<void>;

  /**
   * Get human-readable name for WebSocket readyState
   * @param readyState - WebSocket.readyState value
   * @returns State name ('CONNECTING', 'OPEN', 'CLOSING', 'CLOSED', or 'UNKNOWN(n)')
   * @private
   */
  getReadyStateName(readyState: number): string;

  // EventEmitter overrides for type safety

  /**
   * Add event listener
   */
  on(event: 'health-changed', listener: (event: HealthChangedEvent) => void): this;
  on(event: 'connection-state-changed', listener: (event: ConnectionStateChangedEvent) => void): this;
  on(event: 'issues-updated', listener: (event: IssuesUpdatedEvent) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;

  /**
   * Add one-time event listener
   */
  once(event: 'health-changed', listener: (event: HealthChangedEvent) => void): this;
  once(event: 'connection-state-changed', listener: (event: ConnectionStateChangedEvent) => void): this;
  once(event: 'issues-updated', listener: (event: IssuesUpdatedEvent) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;

  /**
   * Remove event listener
   */
  off(event: 'health-changed', listener: (event: HealthChangedEvent) => void): this;
  off(event: 'connection-state-changed', listener: (event: ConnectionStateChangedEvent) => void): this;
  off(event: 'issues-updated', listener: (event: IssuesUpdatedEvent) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;

  /**
   * Remove all event listeners
   */
  removeAllListeners(event?: 'health-changed' | 'connection-state-changed' | 'issues-updated' | string): this;
}

export default HealthManager;

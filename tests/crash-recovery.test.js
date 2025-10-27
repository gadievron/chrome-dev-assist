/**
 * Crash Recovery Tests
 * Tests graceful state recovery after service worker crashes
 */

describe('Crash Recovery', () => {
  describe('Crash Detection', () => {
    test('should detect crash when lastShutdown is null', async () => {
      // Simulate crash scenario: previous session exists without clean shutdown
      const mockPreviousSession = {
        startupTime: Date.now() - 60000, // 1 minute ago
        lastShutdown: null, // No clean shutdown
        recoveryCount: 0,
        crashDetected: false
      };

      // Mock chrome.storage.session.get
      global.chrome = {
        storage: {
          session: {
            get: jest.fn().mockResolvedValue({
              sessionMetadata: mockPreviousSession
            }),
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      // Import and test detectCrash function
      const { detectCrash } = require('../extension/background.js');
      const crashDetected = await detectCrash();

      expect(crashDetected).toBe(true);
      expect(chrome.storage.session.get).toHaveBeenCalledWith(['sessionMetadata', 'testState', 'captureState']);
    });

    test('should NOT detect crash when clean shutdown occurred', async () => {
      const mockPreviousSession = {
        startupTime: Date.now() - 60000,
        lastShutdown: Date.now() - 30000, // Clean shutdown 30 seconds ago
        recoveryCount: 0,
        crashDetected: false
      };

      global.chrome = {
        storage: {
          session: {
            get: jest.fn().mockResolvedValue({
              sessionMetadata: mockPreviousSession
            }),
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      const { detectCrash } = require('../extension/background.js');
      const crashDetected = await detectCrash();

      expect(crashDetected).toBe(false);
    });
  });

  describe('State Recovery', () => {
    test('should restore active test state after crash', async () => {
      const mockTestState = {
        activeTestId: 'test-123',
        trackedTabs: [100, 101, 102],
        startTime: Date.now() - 30000,
        autoCleanup: true
      };

      // Mock chrome APIs
      global.chrome = {
        storage: {
          session: {
            get: jest.fn().mockResolvedValue({
              testState: mockTestState,
              captureState: []
            }),
            set: jest.fn().mockResolvedValue()
          }
        },
        tabs: {
          get: jest.fn().mockResolvedValue({ id: 100 }) // Tabs still exist
        }
      };

      const { restoreState } = require('../extension/background.js');
      await restoreState();

      // Verify test state was restored
      expect(chrome.storage.session.get).toHaveBeenCalledWith(['testState', 'captureState']);
    });

    test('should remove orphaned tabs during recovery', async () => {
      const mockTestState = {
        activeTestId: 'test-456',
        trackedTabs: [200, 201, 202], // Tab 201 will be orphaned
        startTime: Date.now() - 30000,
        autoCleanup: true
      };

      let tabsGetCallCount = 0;
      global.chrome = {
        storage: {
          session: {
            get: jest.fn().mockResolvedValue({
              testState: mockTestState,
              captureState: []
            }),
            set: jest.fn().mockResolvedValue()
          }
        },
        tabs: {
          get: jest.fn((tabId) => {
            tabsGetCallCount++;
            // Tab 201 doesn't exist (orphaned)
            if (tabId === 201) {
              return Promise.reject(new Error('Tab not found'));
            }
            return Promise.resolve({ id: tabId });
          })
        }
      };

      const { restoreState } = require('../extension/background.js');
      await restoreState();

      // Should have checked all 3 tabs
      expect(chrome.tabs.get).toHaveBeenCalledTimes(3);
    });

    test('should restore active console captures after crash', async () => {
      const now = Date.now();
      const mockCaptureState = [
        ['cmd-123', {
          logs: [{ level: 'log', message: 'test log' }],
          active: true,
          tabId: null,
          endTime: now + 3000 // 3 seconds remaining
        }],
        ['cmd-456', {
          logs: [],
          active: true,
          tabId: 100,
          endTime: now - 1000 // Expired, should NOT be restored
        }]
      ];

      global.chrome = {
        storage: {
          session: {
            get: jest.fn().mockResolvedValue({
              testState: {},
              captureState: mockCaptureState
            }),
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      // Mock setTimeout to track timeout creation
      const timeouts = [];
      global.setTimeout = jest.fn((fn, delay) => {
        const timeoutId = Date.now();
        timeouts.push({ fn, delay, timeoutId });
        return timeoutId;
      });

      const { restoreState } = require('../extension/background.js');
      await restoreState();

      // Should restore only the non-expired capture
      expect(timeouts.length).toBe(1);
      expect(timeouts[0].delay).toBeGreaterThan(2000); // ~3 seconds remaining
    });
  });

  describe('State Persistence', () => {
    test('should persist state periodically', async () => {
      global.chrome = {
        storage: {
          session: {
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      const { persistState } = require('../extension/background.js');
      await persistState();

      expect(chrome.storage.session.set).toHaveBeenCalledWith(
        expect.objectContaining({
          testState: expect.any(Object),
          captureState: expect.any(Array),
          sessionMetadata: expect.any(Object)
        })
      );
    });

    test('should serialize capture state correctly', async () => {
      // Create a Map with capture state
      const captureState = new Map([
        ['cmd-789', {
          logs: [{ level: 'info', message: 'test' }],
          active: true,
          tabId: 300,
          endTime: Date.now() + 5000
        }]
      ]);

      global.chrome = {
        storage: {
          session: {
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      const { persistState } = require('../extension/background.js');
      await persistState();

      const savedData = chrome.storage.session.set.mock.calls[0][0];
      expect(savedData.captureState).toBeInstanceOf(Array);
      expect(savedData.captureState[0][0]).toBe('cmd-789');
      expect(savedData.captureState[0][1]).toHaveProperty('logs');
      expect(savedData.captureState[0][1]).toHaveProperty('active', true);
    });
  });

  describe('Recovery Notification', () => {
    test('should send recovery metadata on WebSocket connection', async () => {
      const mockSocket = {
        send: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null
      };

      global.WebSocket = jest.fn(() => mockSocket);
      global.chrome = {
        runtime: {
          id: 'test-extension-id'
        },
        alarms: {
          create: jest.fn()
        }
      };

      // Simulate crash recovery scenario
      const sessionMetadata = {
        crashDetected: true,
        recoveryCount: 2,
        startupTime: Date.now()
      };

      const testState = {
        activeTestId: 'test-recovery',
        trackedTabs: [400, 401]
      };

      const { connectToServer } = require('../extension/background.js');
      connectToServer();

      // Simulate WebSocket open event
      mockSocket.onopen();

      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('recovery')
      );

      const sentData = JSON.parse(mockSocket.send.mock.calls[0][0]);
      expect(sentData.recovery).toBeDefined();
      expect(sentData.recovery.crashDetected).toBe(true);
    });
  });

  describe('Clean Shutdown', () => {
    test('should mark clean shutdown timestamp', async () => {
      global.chrome = {
        storage: {
          session: {
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      const { markCleanShutdown } = require('../extension/background.js');
      const beforeTime = Date.now();
      await markCleanShutdown();
      const afterTime = Date.now();

      expect(chrome.storage.session.set).toHaveBeenCalled();
      const savedData = chrome.storage.session.set.mock.calls[0][0];
      expect(savedData.sessionMetadata.lastShutdown).toBeGreaterThanOrEqual(beforeTime);
      expect(savedData.sessionMetadata.lastShutdown).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Server Recovery Logging', () => {
    test('server should log recovery metadata from extension', () => {
      const mockSocket = {
        send: jest.fn(),
        readyState: 1 // WebSocket.OPEN
      };

      const mockRecoveryMessage = {
        type: 'register',
        client: 'extension',
        extensionId: 'abcd'.repeat(8),
        name: 'Test Extension',
        version: '1.0.0',
        recovery: {
          crashDetected: true,
          recoveryCount: 1,
          sessionStartTime: Date.now(),
          hasActiveTest: true,
          activeTestId: 'test-999',
          trackedTabs: [500, 501],
          activeCapturesCount: 2
        }
      };

      // Mock console.log to capture server logs
      const logs = [];
      const originalLog = console.log;
      console.log = jest.fn((...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      });

      const { handleRegister } = require('../server/websocket-server.js');
      handleRegister(mockSocket, mockRecoveryMessage);

      // Restore console.log
      console.log = originalLog;

      // Verify recovery was logged
      const recoveryLog = logs.find(log => log.includes('CRASH RECOVERY DETECTED'));
      expect(recoveryLog).toBeDefined();

      const testRecoveredLog = logs.find(log => log.includes('Active test recovered'));
      expect(testRecoveredLog).toBeDefined();
    });
  });
});

/**
 * WebSocket Server - Health Manager Integration Tests
 *
 * Test-First: These tests define how the server should use HealthManager
 * for connection health checks instead of scattered manual checks.
 *
 * Tests written BEFORE integration to define expected behavior.
 */

const WebSocket = require('ws');
const http = require('http');
const HealthManager = require('../../src/health/health-manager');

describe('WebSocket Server - HealthManager Integration', () => {
  let server;
  let wsServer;
  let healthManager;

  beforeEach(() => {
    // Create HTTP server for WebSocket
    server = http.createServer();

    // Note: Actual server would create healthManager internally
    // For testing, we'll verify the pattern works
    healthManager = new HealthManager();
  });

  afterEach(done => {
    if (wsServer) {
      wsServer.close(() => {
        if (server) {
          server.close(done);
        } else {
          done();
        }
      });
    } else if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test('server should use healthManager.isExtensionConnected() for health checks', done => {
    wsServer = new WebSocket.Server({ server });
    let extensionSocket = null;

    wsServer.on('connection', (socket, req) => {
      const url = new URL(req.url, 'ws://localhost');
      const role = url.searchParams.get('role');

      if (role === 'extension') {
        extensionSocket = socket;
        healthManager.setExtensionSocket(socket);

        // Verify health check works
        expect(healthManager.isExtensionConnected()).toBe(true);

        socket.on('message', data => {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'register') {
            socket.send(
              JSON.stringify({
                type: 'registered',
                message: 'Extension registered',
              })
            );
          }
        });
      }

      if (role === 'api') {
        // Simulate API command routing
        socket.on('message', data => {
          const msg = JSON.parse(data.toString());

          // Use healthManager instead of manual check
          if (!healthManager.isExtensionConnected()) {
            socket.send(
              JSON.stringify({
                type: 'error',
                id: msg.id,
                error: {
                  message: 'Extension not connected',
                  code: 'EXTENSION_NOT_CONNECTED',
                },
              })
            );
            return;
          }

          // Would route to extension here
          socket.send(
            JSON.stringify({
              type: 'success',
              id: msg.id,
            })
          );
        });
      }
    });

    server.listen(0, () => {
      const port = server.address().port;

      // Connect extension
      const extClient = new WebSocket(`ws://localhost:${port}?role=extension`);

      extClient.on('open', () => {
        extClient.send(
          JSON.stringify({
            type: 'register',
            role: 'extension',
          })
        );
      });

      extClient.on('message', data => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'registered') {
          // Extension registered, now test API command
          const apiClient = new WebSocket(`ws://localhost:${port}?role=api`);

          apiClient.on('open', () => {
            apiClient.send(
              JSON.stringify({
                id: 'test-123',
                type: 'test-command',
              })
            );
          });

          apiClient.on('message', data => {
            const response = JSON.parse(data.toString());

            // Should succeed because extension is connected
            expect(response.type).toBe('success');
            expect(response.id).toBe('test-123');

            extClient.close();
            apiClient.close();
            done();
          });
        }
      });
    });
  }, 5000);

  test('server should detect extension disconnection via healthManager', done => {
    wsServer = new WebSocket.Server({ server });
    let extensionSocket = null;

    wsServer.on('connection', (socket, req) => {
      const url = new URL(req.url, 'ws://localhost');
      const role = url.searchParams.get('role');

      if (role === 'extension') {
        extensionSocket = socket;
        healthManager.setExtensionSocket(socket);

        socket.on('close', () => {
          // Health manager should detect disconnection
          expect(healthManager.isExtensionConnected()).toBe(false);
          done();
        });
      }
    });

    server.listen(0, () => {
      const port = server.address().port;
      const extClient = new WebSocket(`ws://localhost:${port}?role=extension`);

      extClient.on('open', () => {
        // Verify connected
        expect(healthManager.isExtensionConnected()).toBe(true);

        // Disconnect
        extClient.close();
      });
    });
  }, 5000);

  test('server should reject API commands when extension disconnected', done => {
    wsServer = new WebSocket.Server({ server });

    wsServer.on('connection', (socket, req) => {
      const url = new URL(req.url, 'ws://localhost');
      const role = url.searchParams.get('role');

      if (role === 'api') {
        socket.on('message', data => {
          const msg = JSON.parse(data.toString());

          // Extension not connected (healthManager.extensionSocket is null)
          if (!healthManager.isExtensionConnected()) {
            socket.send(
              JSON.stringify({
                type: 'error',
                id: msg.id,
                error: {
                  message: 'Extension not connected',
                  code: 'EXTENSION_NOT_CONNECTED',
                },
              })
            );
            return;
          }
        });
      }
    });

    server.listen(0, () => {
      const port = server.address().port;

      // Connect API without extension
      const apiClient = new WebSocket(`ws://localhost:${port}?role=api`);

      apiClient.on('open', () => {
        apiClient.send(
          JSON.stringify({
            id: 'test-456',
            type: 'test-command',
          })
        );
      });

      apiClient.on('message', data => {
        const response = JSON.parse(data.toString());

        // Should get error
        expect(response.type).toBe('error');
        expect(response.error.code).toBe('EXTENSION_NOT_CONNECTED');

        apiClient.close();
        done();
      });
    });
  }, 5000);
});

describe('HealthManager - Standalone Behavior (Used by Server)', () => {
  test('server should use healthManager for consistent error messages', () => {
    const healthManager = new HealthManager();

    // Extension not connected
    healthManager.setExtensionSocket(null);

    const status = healthManager.getHealthStatus();

    expect(status.healthy).toBe(false);
    expect(status.issues).toContain('Extension not connected');

    // Same message server would use
    expect(status.issues[0]).toBe('Extension not connected');
  });

  test('server should update healthManager when extension socket changes', () => {
    const healthManager = new HealthManager();

    const socket1 = { readyState: WebSocket.OPEN };
    const socket2 = { readyState: WebSocket.CLOSED };

    // Set first socket
    healthManager.setExtensionSocket(socket1);
    expect(healthManager.isExtensionConnected()).toBe(true);

    // Update to second socket
    healthManager.setExtensionSocket(socket2);
    expect(healthManager.isExtensionConnected()).toBe(false);

    // Clear socket
    healthManager.setExtensionSocket(null);
    expect(healthManager.isExtensionConnected()).toBe(false);
  });
});

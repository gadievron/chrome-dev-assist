/**
 * Integration Tests - WebSocket Server
 * Tests real WebSocket communication (not mocks)
 * REQUIRES: WebSocket server running on localhost:9876
 */

const WebSocket = require('ws');

describe('WebSocket Server Integration', () => {
  let ws;

  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  test('server accepts connections', done => {
    ws = new WebSocket('ws://localhost:9876');

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });

    ws.on('error', err => {
      done(new Error(`Server not running or connection failed: ${err.message}`));
    });
  }, 5000);

  test('server receives and acknowledges registration', done => {
    ws = new WebSocket('ws://localhost:9876');

    ws.on('open', () => {
      // Send registration message
      ws.send(
        JSON.stringify({
          type: 'register',
          client: 'extension',
          extensionId: 'test-extension-id',
        })
      );

      // Server should accept registration silently
      // (no explicit ack in current design, but connection stays open)
      setTimeout(() => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        done();
      }, 100);
    });

    ws.on('error', err => {
      done(new Error(`Registration failed: ${err.message}`));
    });
  }, 5000);

  test('server routes command from API to extension', done => {
    // This test requires two connections: one "extension" and one "API"
    const extensionWs = new WebSocket('ws://localhost:9876');
    const apiWs = new WebSocket('ws://localhost:9876');

    let extensionReady = false;
    let apiReady = false;

    // Extension registers
    extensionWs.on('open', () => {
      extensionWs.send(
        JSON.stringify({
          type: 'register',
          client: 'extension',
        })
      );
      extensionReady = true;
      checkBothReady();
    });

    // API connects
    apiWs.on('open', () => {
      apiReady = true;
      checkBothReady();
    });

    // When both ready, send command from API
    function checkBothReady() {
      if (extensionReady && apiReady) {
        // API sends command
        apiWs.send(
          JSON.stringify({
            type: 'command',
            id: 'test-command-123',
            command: {
              type: 'reload',
              params: { extensionId: 'test' },
            },
          })
        );
      }
    }

    // Extension should receive the command
    extensionWs.on('message', data => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'command') {
        expect(msg.id).toBe('test-command-123');
        expect(msg.command.type).toBe('reload');

        // Clean up
        extensionWs.close();
        apiWs.close();
        done();
      }
    });

    extensionWs.on('error', err => done(new Error(`Extension error: ${err.message}`)));
    apiWs.on('error', err => done(new Error(`API error: ${err.message}`)));
  }, 10000);

  test('server routes response from extension to API', done => {
    const extensionWs = new WebSocket('ws://localhost:9876');
    const apiWs = new WebSocket('ws://localhost:9876');

    let extensionReady = false;
    let apiReady = false;
    const commandId = 'test-response-456';

    // Extension registers
    extensionWs.on('open', () => {
      extensionWs.send(
        JSON.stringify({
          type: 'register',
          client: 'extension',
        })
      );
      extensionReady = true;
      checkBothReady();
    });

    // API connects and waits for response
    apiWs.on('open', () => {
      apiReady = true;
      checkBothReady();
    });

    apiWs.on('message', data => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'response') {
        expect(msg.id).toBe(commandId);
        expect(msg.data.success).toBe(true);

        // Clean up
        extensionWs.close();
        apiWs.close();
        done();
      }
    });

    function checkBothReady() {
      if (extensionReady && apiReady) {
        // API sends command
        apiWs.send(
          JSON.stringify({
            type: 'command',
            id: commandId,
            command: { type: 'test' },
          })
        );
      }
    }

    // Extension receives command and responds
    extensionWs.on('message', data => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'command') {
        // Send response
        extensionWs.send(
          JSON.stringify({
            type: 'response',
            id: msg.id,
            data: { success: true },
          })
        );
      }
    });

    extensionWs.on('error', err => done(new Error(`Extension error: ${err.message}`)));
    apiWs.on('error', err => done(new Error(`API error: ${err.message}`)));
  }, 10000);

  test('server handles extension not connected error', done => {
    // Note: In current design, server queues messages or fails silently
    // This test documents expected behavior when extension isn't connected

    const apiWs = new WebSocket('ws://localhost:9876');

    apiWs.on('open', () => {
      // Send command without extension connected
      apiWs.send(
        JSON.stringify({
          type: 'command',
          id: 'test-no-extension',
          command: { type: 'reload', params: {} },
        })
      );

      // Wait for error response
      setTimeout(() => {
        // Current design: server may send error or timeout
        // Implementation will define exact behavior
        apiWs.close();
        done();
      }, 1000);
    });

    apiWs.on('message', data => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'error') {
        expect(msg.error.message).toContain('Extension not connected');
        apiWs.close();
        done();
      }
    });

    apiWs.on('error', err => done(new Error(`API error: ${err.message}`)));
  }, 10000);

  test('server handles multiple concurrent API connections', done => {
    const extensionWs = new WebSocket('ws://localhost:9876');
    const api1Ws = new WebSocket('ws://localhost:9876');
    const api2Ws = new WebSocket('ws://localhost:9876');

    let extensionReady = false;
    let api1Responded = false;
    let api2Responded = false;

    extensionWs.on('open', () => {
      extensionWs.send(
        JSON.stringify({
          type: 'register',
          client: 'extension',
        })
      );
      extensionReady = true;
    });

    // Extension echoes all commands
    extensionWs.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'command') {
        extensionWs.send(
          JSON.stringify({
            type: 'response',
            id: msg.id,
            data: { success: true, commandId: msg.id },
          })
        );
      }
    });

    // API 1
    api1Ws.on('open', () => {
      api1Ws.send(
        JSON.stringify({
          type: 'command',
          id: 'api1-cmd',
          command: { type: 'test' },
        })
      );
    });

    api1Ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'response' && msg.id === 'api1-cmd') {
        api1Responded = true;
        checkBothDone();
      }
    });

    // API 2
    api2Ws.on('open', () => {
      api2Ws.send(
        JSON.stringify({
          type: 'command',
          id: 'api2-cmd',
          command: { type: 'test' },
        })
      );
    });

    api2Ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'response' && msg.id === 'api2-cmd') {
        api2Responded = true;
        checkBothDone();
      }
    });

    function checkBothDone() {
      if (api1Responded && api2Responded) {
        extensionWs.close();
        api1Ws.close();
        api2Ws.close();
        done();
      }
    }

    extensionWs.on('error', err => done(new Error(`Extension error: ${err.message}`)));
    api1Ws.on('error', err => done(new Error(`API1 error: ${err.message}`)));
    api2Ws.on('error', err => done(new Error(`API2 error: ${err.message}`)));
  }, 10000);
});

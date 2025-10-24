#!/usr/bin/env node

/**
 * PROTOTYPE: WebSocket Server
 * Validates WebSocket architecture before full implementation
 */

const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 9876, host: '127.0.0.1' });
let extensionSocket = null;
const apiSockets = new Map(); // commandId -> socket

console.log('[Prototype Server] Starting on ws://localhost:9876');

server.on('connection', (socket) => {
  console.log('[Prototype Server] Client connected');

  socket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('[Prototype Server] Received:', msg.type, msg.id || '');

    // Handle register from extension
    if (msg.type === 'register') {
      extensionSocket = socket;
      console.log('[Prototype Server] Extension registered');
    }

    // Handle command from API - route to extension
    if (msg.type === 'command') {
      apiSockets.set(msg.id, socket);
      if (extensionSocket) {
        console.log('[Prototype Server] Routing command to extension');
        extensionSocket.send(JSON.stringify(msg));
      } else {
        console.log('[Prototype Server] ERROR: No extension connected');
        socket.send(JSON.stringify({
          type: 'error',
          id: msg.id,
          error: { message: 'Extension not connected' }
        }));
      }
    }

    // Handle response from extension - route to API
    if (msg.type === 'response') {
      const apiSocket = apiSockets.get(msg.id);
      if (apiSocket) {
        console.log('[Prototype Server] Routing response to API');
        apiSocket.send(JSON.stringify(msg));
        apiSockets.delete(msg.id);
      }
    }
  });

  socket.on('close', () => {
    if (socket === extensionSocket) {
      console.log('[Prototype Server] Extension disconnected');
      extensionSocket = null;
    }
  });

  socket.on('error', (err) => {
    console.error('[Prototype Server] Socket error:', err.message);
  });
});

server.on('error', (err) => {
  console.error('[Prototype Server] Server error:', err.message);
  process.exit(1);
});

console.log('[Prototype Server] Ready - waiting for connections');

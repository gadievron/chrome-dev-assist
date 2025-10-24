#!/usr/bin/env node

/**
 * Chrome Dev Assist - WebSocket Server + HTTP Static File Server
 * Routes messages between Chrome extension and Node.js API
 * Serves test fixtures over HTTP for reliable testing
 *
 * Persona Requirements Implemented:
 * - JSON validation (Persona 6)
 * - Duplicate extension registration (Persona 3, 6)
 * - Clear error messages (Persona 5, 6)
 * - Debug logging (Persona 4)
 *
 * HTTP Server Features:
 * - Serves test fixtures from /fixtures path
 * - CORS enabled for extension access
 * - Same port as WebSocket (9876)
 *
 * Security Documentation:
 * - Architecture: docs/SECURITY.md
 * - Decisions: docs/decisions/README.md
 * - Why HTTP (not HTTPS): docs/decisions/002-http-vs-https-for-localhost.md
 * - Token Auth: docs/decisions/001-test-infrastructure-authentication.md
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const HealthManager = require('../src/health/health-manager');

const PORT = 9876;
const HOST = '127.0.0.1'; // localhost only for security
const DEBUG = process.env.DEBUG === 'true';

// Path to test fixtures
const FIXTURES_PATH = path.join(__dirname, '../tests/fixtures');

// BUG #3 FIX: Prevent multiple server instances
// PID file for single-instance enforcement
const PID_FILE = path.join(__dirname, '../.server-pid');

/**
 * Check if another server instance is running and handle it
 * Auto-recovery: Kills stale instances before starting new one
 */
function ensureSingleInstance() {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);

    // Check if process is still running
    try {
      process.kill(oldPid, 0); // Signal 0 = just check if process exists

      // Process exists - kill it
      console.log(`[Server] Detected existing server instance (PID ${oldPid})`);
      console.log(`[Server] Killing old instance to prevent port conflict...`);

      try {
        process.kill(oldPid, 'SIGTERM');
        // Wait a moment for graceful shutdown
        const start = Date.now();
        while (Date.now() - start < 1000) {
          try {
            process.kill(oldPid, 0);
            // Still running, wait a bit
          } catch {
            // Process died, good
            break;
          }
        }

        // If still alive, force kill
        try {
          process.kill(oldPid, 0);
          console.log(`[Server] Forcing kill of old instance...`);
          process.kill(oldPid, 'SIGKILL');
        } catch {
          // Already dead
        }

        console.log(`[Server] Old instance terminated successfully`);
      } catch (err) {
        console.log(`[Server] Could not kill old instance: ${err.message}`);
        console.log(`[Server] Cleaning up stale PID file`);
      }
    } catch {
      // Process doesn't exist - stale PID file
      console.log(`[Server] Removing stale PID file (process ${oldPid} not running)`);
    }

    // Remove old PID file
    try {
      fs.unlinkSync(PID_FILE);
    } catch (err) {
      console.error(`[Server] Failed to remove PID file: ${err.message}`);
    }
  }

  // Write our PID
  try {
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
    console.log(`[Server] PID ${process.pid} written to ${PID_FILE}`);
  } catch (err) {
    console.error(`[Server] Failed to write PID file: ${err.message}`);
    process.exit(1);
  }
}

// Enforce single instance before doing anything else
ensureSingleInstance();

// Authentication token (generated at startup for defense-in-depth)
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
const TOKEN_FILE = path.join(__dirname, '../.auth-token');

// Write auth token to file for client access
try {
  fs.writeFileSync(TOKEN_FILE, AUTH_TOKEN, 'utf8');
  console.log(`[Server] Auth token generated and saved to ${TOKEN_FILE}`);
} catch (err) {
  console.error(`[Server] Failed to write auth token: ${err.message}`);
  process.exit(1);
}

// State
let extensionSocket = null;
const apiSockets = new Map(); // commandId -> socket
const healthManager = new HealthManager();

// Logging helper
function log(...args) {
  if (DEBUG) {
    console.log('[Server]', ...args);
  }
}

function logError(...args) {
  console.error('[Server ERROR]', ...args);
}

/**
 * Handle HTTP requests - serve static files from /fixtures path
 * This allows tests to load fixtures via HTTP instead of file:// URLs
 *
 * Security:
 * - Server bound to 127.0.0.1 (localhost only)
 * - Validates Host header for additional protection
 * - Directory traversal protection on file paths
 */
function handleHttpRequest(req, res) {
  log(`HTTP ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  // Security Layer 1: Validate Host header (defense-in-depth)
  // Even though server is bound to 127.0.0.1, validate the Host header
  const host = req.headers.host || '';
  const isLocalhost = host.startsWith('localhost:') ||
                      host.startsWith('127.0.0.1:') ||
                      host === 'localhost' ||
                      host === '127.0.0.1';

  if (!isLocalhost) {
    logError(`Rejected request from non-localhost Host: ${host}`);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Server only accepts localhost connections');
    return;
  }

  // Security Layer 2: Validate auth token (defense-in-depth)
  // Prevents other localhost applications from accessing the server
  let clientToken = req.headers['x-auth-token'];
  if (!clientToken && req.url.includes('?token=')) {
    const url = new URL(req.url, `http://${host}`);
    clientToken = url.searchParams.get('token');
  }

  // Allow root path without auth (for debugging/listing)
  const requiresAuth = req.url.startsWith('/fixtures/');

  if (requiresAuth && clientToken !== AUTH_TOKEN) {
    logError(`Rejected request with invalid auth token from ${req.socket.remoteAddress}`);
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized: Invalid or missing auth token');
    return;
  }

  // Enable CORS for extension access (localhost only)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Serve test fixtures from /fixtures path
  if (req.url.startsWith('/fixtures/')) {
    // Parse URL to remove query parameters
    const url = new URL(req.url, `http://${host}`);
    const filename = url.pathname.substring('/fixtures/'.length);
    const filepath = path.join(FIXTURES_PATH, filename);

    // Security: prevent directory traversal
    if (!filepath.startsWith(FIXTURES_PATH)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // Check if file exists
    fs.stat(filepath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // Determine content type
      const ext = path.extname(filepath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.txt': 'text/plain'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      // Serve file
      fs.readFile(filepath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        log(`Served ${filename} (${data.length} bytes)`);
      });
    });
    return;
  }

  // Root path - show available fixtures
  if (req.url === '/' || req.url === '/fixtures') {
    fs.readdir(FIXTURES_PATH, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading fixtures directory');
        return;
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Chrome Dev Assist - Test Fixtures</title>
  <style>
    body { font-family: system-ui; margin: 40px; }
    h1 { color: #1a73e8; }
    ul { line-height: 1.8; }
    a { color: #1a73e8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Chrome Dev Assist - Test Fixtures</h1>
  <p>Available test fixtures:</p>
  <ul>
    ${files.filter(f => f.endsWith('.html')).map(f =>
      `<li><a href="/fixtures/${f}">${f}</a></li>`
    ).join('\n    ')}
  </ul>
  <hr>
  <p><small>Server: ${HOST}:${PORT}</small></p>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    return;
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

// Create HTTP server first
const httpServer = http.createServer((req, res) => {
  handleHttpRequest(req, res);
});

// Attach WebSocket server to HTTP server
const server = new WebSocket.Server({ server: httpServer });

// Start HTTP server
httpServer.listen(PORT, HOST, () => {
  console.log(`[Server] HTTP server on http://${HOST}:${PORT}`);
  console.log(`[Server] WebSocket server on ws://${HOST}:${PORT}`);
  console.log(`[Server] Test fixtures at http://${HOST}:${PORT}/fixtures/`);
});

server.on('connection', (socket) => {
  log('Client connected');

  socket.on('message', (data) => {
    // REQUIREMENT #1: JSON validation (Persona 6)
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      logError('Invalid JSON received:', err.message);
      socket.send(JSON.stringify({
        type: 'error',
        error: {
          message: 'Invalid JSON',
          code: 'PARSE_ERROR'
        }
      }));
      return;
    }

    // Validate message has type field
    if (!msg.type) {
      logError('Message missing type field:', msg);
      socket.send(JSON.stringify({
        type: 'error',
        error: {
          message: 'Message must have type field',
          code: 'INVALID_MESSAGE'
        }
      }));
      return;
    }

    log('Received:', msg.type, msg.id || '');

    // Handle different message types
    if (msg.type === 'register') {
      handleRegister(socket, msg);
    } else if (msg.type === 'command') {
      handleCommand(socket, msg);
    } else if (msg.type === 'response' || msg.type === 'error') {
      handleResponse(socket, msg);
    } else {
      logError('Unknown message type:', msg.type);
      socket.send(JSON.stringify({
        type: 'error',
        error: {
          message: `Unknown message type: ${msg.type}`,
          code: 'UNKNOWN_MESSAGE_TYPE'
        }
      }));
    }
  });

  socket.on('close', () => {
    // Clean up on disconnect
    if (socket === extensionSocket) {
      log('Extension disconnected');
      extensionSocket = null;
      healthManager.setExtensionSocket(null);
    }

    // Remove from API sockets
    for (const [commandId, apiSocket] of apiSockets.entries()) {
      if (apiSocket === socket) {
        apiSockets.delete(commandId);
        log(`API client disconnected (command ${commandId})`);
      }
    }
  });

  socket.on('error', (err) => {
    logError('Socket error:', err.message);
  });
});

// REQUIREMENT #3: Port conflict handling (Persona 5)
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('ERROR: Port 9876 is already in use.');
    console.error('');
    console.error('This usually means:');
    console.error('  1. The server is already running (check other terminals)');
    console.error('  2. Another application is using port 9876');
    console.error('');
    console.error('To fix:');
    console.error('  - Stop the other process using port 9876');
    console.error('  - Or kill existing server: pkill -f websocket-server');
    console.error('');
    process.exit(1);
  } else {
    logError('Server error:', err);
    process.exit(1);
  }
});

// WebSocket server error handling
server.on('error', (err) => {
  logError('WebSocket error:', err);
});

console.log('[Server] Ready - waiting for connections');
if (DEBUG) {
  console.log('[Server] Debug logging enabled');
}

/**
 * Handle extension registration
 */
function handleRegister(socket, msg) {
  // REQUIREMENT #2: Duplicate extension registration (Persona 3, 6)
  if (extensionSocket !== null && extensionSocket !== socket) {
    logError('Extension already registered, rejecting duplicate');
    socket.send(JSON.stringify({
      type: 'error',
      error: {
        message: 'Extension already registered. Only one extension can connect at a time.',
        code: 'DUPLICATE_REGISTRATION'
      }
    }));
    socket.close();
    return;
  }

  extensionSocket = socket;
  healthManager.setExtensionSocket(socket);
  log('Extension registered:', msg.extensionId || '(no ID provided)');
}

/**
 * Handle command from API - route to extension
 */
function handleCommand(socket, msg) {
  // Validate command has ID
  if (!msg.id) {
    logError('Command missing ID field');
    socket.send(JSON.stringify({
      type: 'error',
      error: {
        message: 'Command must have id field',
        code: 'INVALID_COMMAND'
      }
    }));
    return;
  }

  // Store API socket for response routing
  apiSockets.set(msg.id, socket);
  log(`Command ${msg.id} from API`);

  // Check if extension is connected (using health-manager)
  if (!healthManager.isExtensionConnected()) {
    logError('Extension not connected, cannot route command');
    const healthStatus = healthManager.getHealthStatus();
    socket.send(JSON.stringify({
      type: 'error',
      id: msg.id,
      error: {
        message: healthStatus.issues.join(' ') || 'Extension not connected. Please ensure Chrome Dev Assist extension is loaded and running.',
        code: 'EXTENSION_NOT_CONNECTED'
      }
    }));
    apiSockets.delete(msg.id);
    return;
  }

  // Route command to extension
  log(`Routing command ${msg.id} to extension`);
  try {
    extensionSocket.send(JSON.stringify(msg));
  } catch (err) {
    logError(`Failed to send to extension:`, err.message);
    socket.send(JSON.stringify({
      type: 'error',
      id: msg.id,
      error: {
        message: 'Failed to send command to extension',
        code: 'SEND_FAILED'
      }
    }));
    apiSockets.delete(msg.id);
  }
}

/**
 * Handle response from extension - route to API
 */
function handleResponse(socket, msg) {
  // Validate response has ID
  if (!msg.id) {
    logError('Response missing ID field');
    return;
  }

  log(`Response ${msg.id} from extension`);

  // Find API socket for this command
  const apiSocket = apiSockets.get(msg.id);

  if (!apiSocket) {
    logError(`No API socket found for command ${msg.id}`);
    return;
  }

  if (apiSocket.readyState !== WebSocket.OPEN) {
    logError(`API socket for command ${msg.id} is closed`);
    apiSockets.delete(msg.id);
    return;
  }

  // Route response to API
  log(`Routing response ${msg.id} to API`);
  try {
    apiSocket.send(JSON.stringify(msg));
    apiSockets.delete(msg.id); // Clean up
  } catch (err) {
    logError(`Failed to send to API:`, err.message);
    apiSockets.delete(msg.id);
  }
}

// Graceful shutdown
function cleanup() {
  // Remove PID file (Bug #3 fix)
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
      console.log('[Server] PID file removed');
    }
  } catch (err) {
    console.error('[Server] Failed to remove PID file:', err.message);
  }

  // Remove auth token file on shutdown (security cleanup)
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
      console.log('[Server] Auth token file removed');
    }
  } catch (err) {
    console.error('[Server] Failed to remove auth token:', err.message);
  }
}

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  server.close(() => {
    httpServer.close(() => {
      cleanup();
      console.log('[Server] Closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  server.close(() => {
    httpServer.close(() => {
      cleanup();
      console.log('[Server] Closed');
      process.exit(0);
    });
  });
});

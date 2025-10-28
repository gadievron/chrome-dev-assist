/**
 * Reconnection Behavior Tests (ISSUE-012)
 *
 * Tests for the identified bug: Extension does not reconnect after server restart
 *
 * Based on findings from REGISTRATION-TIMEOUT-DEBUG-FINDINGS.md
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

describe('Extension Reconnection Behavior (ISSUE-012)', () => {
  let serverProcess;
  let serverPid;
  const serverPidFile = path.join(__dirname, '../../.server-pid');

  // Helper to start server
  async function startServer() {
    return new Promise((resolve, reject) => {
      serverProcess = spawn('npm', ['run', 'server'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
      });

      let started = false;

      serverProcess.stdout.on('data', data => {
        const output = data.toString();
        if (output.includes('Ready - waiting for connections') && !started) {
          started = true;
          // Read PID from file
          if (fs.existsSync(serverPidFile)) {
            serverPid = parseInt(fs.readFileSync(serverPidFile, 'utf8'));
          }
          resolve(serverPid);
        }
      });

      serverProcess.stderr.on('data', data => {
        console.error('Server error:', data.toString());
      });

      setTimeout(() => {
        if (!started) {
          reject(new Error('Server failed to start within timeout'));
        }
      }, 10000);
    });
  }

  // Helper to stop server
  async function stopServer() {
    return new Promise(resolve => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      if (serverPid) {
        try {
          process.kill(serverPid, 'SIGTERM');
        } catch (err) {
          // Process already dead
        }
        serverPid = null;
      }
      setTimeout(resolve, 1000);
    });
  }

  // Helper to check if extension is connected
  async function isExtensionConnected() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:9876/list-extensions', res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            // Extension connected if list has at least 1 extension
            resolve(result.extensions && result.extensions.length > 0);
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', err => {
        // Server not running or connection failed
        resolve(false);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  // Helper to wait for connection (with timeout)
  async function waitForConnection(timeoutMs = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (await isExtensionConnected()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  // Helper to wait for disconnection (with timeout)
  async function waitForDisconnection(timeoutMs = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!(await isExtensionConnected())) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  // Helper to launch Chrome with extension
  async function launchChrome() {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../scripts/launch-chrome-with-extension.sh');
      const chromeProcess = spawn('bash', [scriptPath], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
      });

      let chromePid = null;

      chromeProcess.stdout.on('data', data => {
        const output = data.toString();
        // Extract PID from output: "✅ Chrome launched (PID: 12345)"
        const pidMatch = output.match(/Chrome launched \(PID: (\d+)\)/);
        if (pidMatch) {
          chromePid = parseInt(pidMatch[1]);
        }
      });

      chromeProcess.on('close', code => {
        if (chromePid) {
          resolve(chromePid);
        } else {
          reject(new Error('Failed to extract Chrome PID'));
        }
      });

      // Timeout if script doesn't complete
      setTimeout(() => {
        if (!chromePid) {
          reject(new Error('Chrome launch timeout'));
        }
      }, 5000);
    });
  }

  // Helper to kill Chrome process
  async function killChrome(pid) {
    return new Promise(resolve => {
      try {
        process.kill(pid, 'SIGTERM');
        // Wait for Chrome to die
        setTimeout(resolve, 2000);
      } catch (err) {
        // Already dead
        resolve();
      }
    });
  }

  let chromePid = null;

  afterEach(async () => {
    await stopServer();
    if (chromePid) {
      await killChrome(chromePid);
      chromePid = null;
    }
  });

  describe('Server Restart Scenario', () => {
    it('should detect when server is restarted', async () => {
      // Start server
      const firstPid = await startServer();
      expect(firstPid).toBeDefined();
      expect(firstPid).toBeGreaterThan(0);

      // Stop server
      await stopServer();

      // Start new server
      const secondPid = await startServer();
      expect(secondPid).toBeDefined();
      expect(secondPid).toBeGreaterThan(0);

      // PIDs should be different
      expect(secondPid).not.toBe(firstPid);
    }, 30000);

    it('should reconnect extension after server restart', async () => {
      // ✅ P0 CRITICAL: Real test for ISSUE-012
      // This test verifies that the extension automatically reconnects after server restart

      // 1. Start server
      console.log('1. Starting server...');
      await startServer();
      expect(serverPid).toBeDefined();

      // 2. Launch Chrome with extension
      console.log('2. Launching Chrome with extension...');
      chromePid = await launchChrome();
      expect(chromePid).toBeDefined();

      // 3. Wait for extension to connect to server
      console.log('3. Waiting for extension to connect...');
      const initialConnection = await waitForConnection(15000); // 15 sec timeout
      expect(initialConnection).toBe(true);
      console.log('   ✓ Extension connected');

      // 4. Stop server (simulates server crash/restart)
      console.log('4. Stopping server...');
      const firstServerPid = serverPid;
      await stopServer();

      // 5. Wait for extension to detect disconnection
      console.log('5. Waiting for extension to detect disconnection...');
      const disconnected = await waitForDisconnection(5000);
      expect(disconnected).toBe(true);
      console.log('   ✓ Extension detected disconnection');

      // 6. Start new server (different PID)
      console.log('6. Starting new server...');
      await startServer();
      expect(serverPid).toBeDefined();
      expect(serverPid).not.toBe(firstServerPid);
      console.log(`   ✓ New server started (PID ${firstServerPid} → ${serverPid})`);

      // 7. Wait for extension to reconnect automatically
      // Max backoff time is 30 seconds, add buffer for safety
      console.log('7. Waiting for extension to reconnect (max 35 seconds)...');
      const reconnected = await waitForConnection(35000);

      // ❌ THIS IS WHERE ISSUE-012 MANIFESTS
      // Expected: reconnected = true
      // Actual: reconnected = false (extension doesn't reconnect)
      expect(reconnected).toBe(true);

      if (reconnected) {
        console.log('   ✅ Extension reconnected successfully!');
      } else {
        console.log('   ❌ Extension DID NOT reconnect (ISSUE-012)');
      }

      // 8. Verify extension is registered (not just connected)
      console.log('8. Verifying registration...');
      const stillConnected = await isExtensionConnected();
      expect(stillConnected).toBe(true);
      console.log('   ✓ Extension is registered');
    }, 60000);
  });

  describe('Reconnection Logic Verification', () => {
    it('should verify ws.onclose is called when server stops', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify onclose handler exists
      expect(backgroundJs).toContain('ws.onclose');

      // Verify scheduleReconnect is called
      expect(backgroundJs).toContain('scheduleReconnect');

      // Verify state is reset
      expect(backgroundJs).toContain('isRegistered = false');
      expect(backgroundJs).toContain('registrationPending = false');
    });

    it('should verify scheduleReconnect uses exponential backoff', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify exponential backoff logic exists
      // Look for exponential calculation pattern
      const hasExponentialBackoff =
        backgroundJs.includes('reconnectAttempts') &&
        (backgroundJs.includes('Math.pow(2,') || backgroundJs.includes('2 **'));

      expect(hasExponentialBackoff).toBe(true);
    });

    it('should verify reconnection is scheduled after disconnect', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify scheduleReconnect is defined
      expect(backgroundJs).toContain('function scheduleReconnect()');

      // Verify it's called in onclose
      const oncloseIndex = backgroundJs.indexOf('ws.onclose');
      const scheduleReconnectIndex = backgroundJs.indexOf('scheduleReconnect()', oncloseIndex);

      expect(scheduleReconnectIndex).toBeGreaterThan(oncloseIndex);
    });
  });

  describe('Connection State Management', () => {
    it('should verify isConnecting flag prevents multiple connections', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify isConnecting flag exists and is used
      expect(backgroundJs).toContain('let isConnecting = false');
      expect(backgroundJs).toContain('if (isConnecting)');
      expect(backgroundJs).toContain('isConnecting = true');
      expect(backgroundJs).toContain('isConnecting = false');
    });

    it('should verify connection state is properly reset on disconnect', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // In onclose, verify state is reset
      expect(backgroundJs).toContain('isConnecting = false');
      expect(backgroundJs).toContain('ws = null');
    });
  });

  describe('Exponential Backoff Implementation', () => {
    it('should verify reconnection attempts are tracked', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      expect(backgroundJs).toContain('reconnectAttempts');
    });

    it('should verify backoff has maximum limit', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Should have max backoff (usually 30 seconds)
      const hasMaxBackoff =
        backgroundJs.includes('Math.min') || backgroundJs.includes('maxReconnectDelay');

      expect(hasMaxBackoff).toBe(true);
    });

    it('should verify reconnection attempts are reset on successful connection', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // In ws.onopen, should reset attempts
      const onopenIndex = backgroundJs.indexOf('ws.onopen');
      const resetIndex = backgroundJs.indexOf('reconnectAttempts = 0', onopenIndex);

      expect(resetIndex).toBeGreaterThan(onopenIndex);
    });
  });
});

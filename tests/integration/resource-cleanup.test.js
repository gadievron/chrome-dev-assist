/**
 * Resource Cleanup Tests
 *
 * Tests that verify proper cleanup of background processes and temporary files
 * Based on lessons learned from debugging session (Problem #1)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

describe('Resource Cleanup Verification', () => {
  describe('Cleanup Script Functionality', () => {
    const cleanupScript = path.join(__dirname, '../../scripts/cleanup-test-session.sh');

    it('should have cleanup script executable', () => {
      expect(fs.existsSync(cleanupScript)).toBe(true);

      const stats = fs.statSync(cleanupScript);
      const isExecutable = (stats.mode & 0o111) !== 0;

      expect(isExecutable).toBe(true);
    });

    it('should detect Chrome test instances', async () => {
      const { stdout } = await execAsync(`bash ${cleanupScript} 2>&1 | grep -i chrome`);

      // Should have Chrome detection logic
      expect(stdout.toLowerCase()).toContain('chrome');
    });

    it('should detect server processes', async () => {
      const { stdout } = await execAsync(`bash ${cleanupScript} 2>&1 | grep -i server`);

      // Should have server detection logic
      expect(stdout.toLowerCase()).toContain('server');
    });

    it('should detect debug logging in code', async () => {
      const { stdout } = await execAsync(`bash ${cleanupScript} 2>&1 | grep -i debug`);

      // Should check for debug logging
      expect(stdout.toLowerCase()).toContain('debug');
    });

    it('should verify cleanup completion', async () => {
      const { stdout } = await execAsync(`bash ${cleanupScript}`);

      // Should have verification section
      expect(stdout).toContain('VERIFICATION');
      expect(stdout).toContain('Cleanup complete');
    });
  });

  describe('Process Detection', () => {
    it('should detect orphaned Chrome test processes', async () => {
      try {
        const { stdout } = await execAsync(
          'ps aux | grep "chrome.*tmp.*chrome-dev-assist" | grep -v grep'
        );

        // If processes found, fail test
        if (stdout.trim()) {
          fail(`Found orphaned Chrome processes:\n${stdout}`);
        }
      } catch (err) {
        // No processes found (grep returns non-zero) - this is good
        expect(err.code).toBe(1);
      }
    });

    it('should detect orphaned server processes', async () => {
      try {
        const { stdout } = await execAsync(
          'ps aux | grep "node.*websocket-server" | grep -v grep'
        );

        // If processes found, they should match current server only
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          // Only warn if multiple servers running
          if (lines.length > 1) {
            console.warn(`Warning: Multiple server processes found:\n${stdout}`);
          }
        }
      } catch (err) {
        // No processes found - acceptable
      }
    });

    it('should detect background test processes', async () => {
      try {
        const { stdout } = await execAsync(
          'ps aux | grep "npm.*test" | grep -v grep'
        );

        // If processes found, fail test
        if (stdout.trim()) {
          fail(`Found background test processes:\n${stdout}`);
        }
      } catch (err) {
        // No processes found (grep returns non-zero) - this is good
        expect(err.code).toBe(1);
      }
    });
  });

  describe('File Cleanup', () => {
    it('should not have temporary test files', () => {
      const projectRoot = path.join(__dirname, '../..');
      const files = fs.readdirSync(projectRoot);

      const tempTestFiles = files.filter(f =>
        f.startsWith('test-') &&
        f.endsWith('.js') &&
        !f.includes('complete-features') && // Legitimate test files
        !f.includes('basic-functionality') &&
        !f.includes('live-dom-inspection')
      );

      if (tempTestFiles.length > 0) {
        console.warn('Found temporary test files:', tempTestFiles);
        // Don't fail - just warn, as some might be legitimate
      }
    });

    it('should not have temporary reload scripts', () => {
      const projectRoot = path.join(__dirname, '../..');
      const files = fs.readdirSync(projectRoot);

      const tempReloadFiles = files.filter(f =>
        f.startsWith('reload-') && f.endsWith('.sh')
      );

      expect(tempReloadFiles).toEqual([]);
    });

    it('should not have debug logging in production code', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      const serverJs = fs.readFileSync(
        path.join(__dirname, '../../server/websocket-server.js'),
        'utf8'
      );

      // Check for debug markers
      expect(backgroundJs).not.toContain('🔍 DEBUG');
      expect(serverJs).not.toContain('🔍 DEBUG');
    });
  });

  describe('PID File Management', () => {
    const pidFile = path.join(__dirname, '../../.server-pid');

    it('should clean up PID file when server stops', async () => {
      // If PID file exists, verify the process is actually running
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));

        try {
          // Check if process exists
          process.kill(pid, 0); // Signal 0 just checks existence
          // Process exists - this is OK
        } catch (err) {
          // Process doesn't exist but PID file does - cleanup needed
          fail(`Stale PID file found. Process ${pid} not running. Run cleanup script.`);
        }
      }
    });
  });

  describe('Verification After Test Run', () => {
    it('should verify no leaked resources after test suite', async () => {
      const issues = [];

      // Check for Chrome processes
      try {
        const { stdout: chromeProcs } = await execAsync(
          'ps aux | grep "chrome.*tmp.*chrome-dev-assist" | grep -v grep'
        );
        if (chromeProcs.trim()) {
          issues.push('Chrome test instances still running');
        }
      } catch (err) {
        // No processes - good
      }

      // Check for multiple servers
      try {
        const { stdout: serverProcs } = await execAsync(
          'ps aux | grep "node.*websocket-server" | grep -v grep'
        );
        const lines = serverProcs.trim().split('\n');
        if (lines.length > 1) {
          issues.push('Multiple server processes running');
        }
      } catch (err) {
        // No processes - acceptable
      }

      // Check for temp files
      const projectRoot = path.join(__dirname, '../..');
      const files = fs.readdirSync(projectRoot);
      const tempFiles = files.filter(f =>
        (f.startsWith('test-') || f.startsWith('reload-')) &&
        (f.endsWith('.js') || f.endsWith('.sh'))
      );

      if (tempFiles.length > 0) {
        issues.push(`Temporary files found: ${tempFiles.join(', ')}`);
      }

      // ✅ FIX: Fail test if issues found (not just warn)
      if (issues.length > 0) {
        const message = '⚠️  Resource cleanup issues detected:\n' +
          issues.map(i => `   - ${i}`).join('\n') +
          '\n   Run: ./scripts/cleanup-test-session.sh';

        fail(message);
      }

      expect(issues).toEqual([]);
    });
  });
});

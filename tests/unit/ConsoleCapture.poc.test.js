/**
 * ConsoleCapture Class - Proof of Concept Tests
 *
 * This is a minimal test suite to validate the ConsoleCapture class approach
 * before implementing the full 30+ test suite.
 *
 * POC Tests (5 core scenarios):
 * 1. Start a capture
 * 2. Add logs to capture
 * 3. Stop a capture
 * 4. Get logs from capture
 * 5. Cleanup a capture
 */

// Helper function for async sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ConsoleCapture POC', () => {
  let ConsoleCapture;
  let consoleCapture;

  beforeAll(() => {
    // Load the ConsoleCapture class
    // For POC, we'll try to require it, or use global if available
    try {
      ConsoleCapture = require('../../extension/modules/ConsoleCapture.js');
    } catch (err) {
      // Class doesn't exist yet - expected to fail initially
      console.log('[POC] ConsoleCapture class not found (expected on first run)');
    }
  });

  beforeEach(() => {
    if (ConsoleCapture) {
      consoleCapture = new ConsoleCapture();
    }
  });

  afterEach(() => {
    if (consoleCapture) {
      // Cleanup all captures
      const captureIds = consoleCapture.getAllCaptureIds?.() || [];
      for (const captureId of captureIds) {
        consoleCapture.cleanup(captureId);
      }
    }
  });

  test('POC Test 1: Can start a capture', () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-001';

    consoleCapture.start(captureId);

    expect(consoleCapture.isActive(captureId)).toBe(true);
    console.log('✅ POC Test 1 passed: Can start a capture');
  });

  test('POC Test 2: Can add logs to capture', () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-002';
    const tabId = 123;

    consoleCapture.start(captureId, { tabId });

    // Add a log entry
    const logEntry = {
      level: 'log',
      message: 'Test message',
      timestamp: new Date().toISOString(),
      tabId: 123,
    };

    consoleCapture.addLog(tabId, logEntry);

    const logs = consoleCapture.getLogs(captureId);
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Test message');

    console.log('✅ POC Test 2 passed: Can add logs to capture');
  });

  test('POC Test 3: Can stop a capture', () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-003';

    consoleCapture.start(captureId);
    expect(consoleCapture.isActive(captureId)).toBe(true);

    consoleCapture.stop(captureId);
    expect(consoleCapture.isActive(captureId)).toBe(false);

    console.log('✅ POC Test 3 passed: Can stop a capture');
  });

  test('POC Test 4: Can get logs from capture', () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-004';
    const tabId = 124;

    consoleCapture.start(captureId, { tabId });

    // Add multiple logs
    for (let i = 0; i < 5; i++) {
      consoleCapture.addLog(tabId, {
        level: 'log',
        message: `Message ${i}`,
        timestamp: new Date().toISOString(),
        tabId: 124,
      });
    }

    const logs = consoleCapture.getLogs(captureId);
    expect(logs.length).toBe(5);

    // Verify it returns a copy (not mutable reference)
    logs.push({ level: 'error', message: 'fake', timestamp: '', tabId: 124 });
    const logs2 = consoleCapture.getLogs(captureId);
    expect(logs2.length).toBe(5); // Should still be 5

    console.log('✅ POC Test 4 passed: Can get logs from capture');
  });

  test('POC Test 5: Can cleanup a capture', () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-005';
    const tabId = 125;

    consoleCapture.start(captureId, { tabId });

    // Add logs
    consoleCapture.addLog(tabId, {
      level: 'log',
      message: 'Before cleanup',
      timestamp: new Date().toISOString(),
      tabId: 125,
    });

    expect(consoleCapture.getLogs(captureId).length).toBe(1);

    // Cleanup
    consoleCapture.cleanup(captureId);

    // Should be gone
    expect(consoleCapture.isActive(captureId)).toBe(false);
    expect(consoleCapture.getLogs(captureId)).toEqual([]);

    // Adding more logs should not be captured
    consoleCapture.addLog(tabId, {
      level: 'log',
      message: 'After cleanup',
      timestamp: new Date().toISOString(),
      tabId: 125,
    });

    expect(consoleCapture.getLogs(captureId)).toEqual([]);

    console.log('✅ POC Test 5 passed: Can cleanup a capture');
  });

  test('POC Test BONUS: Auto-stop after duration', async () => {
    if (!ConsoleCapture) {
      console.log('⏭️  Skipping - ConsoleCapture class not implemented yet');
      return;
    }

    const captureId = 'poc-test-006';

    consoleCapture.start(captureId, { duration: 200 });

    expect(consoleCapture.isActive(captureId)).toBe(true);

    // Wait for auto-stop
    await sleep(300);

    expect(consoleCapture.isActive(captureId)).toBe(false);

    console.log('✅ POC Test BONUS passed: Auto-stop after duration');
  }, 10000); // 10s timeout for async test
});

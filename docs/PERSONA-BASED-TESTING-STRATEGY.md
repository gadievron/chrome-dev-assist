# 🎭 Persona-Based Testing Strategy

## Going Deep AND Wide - Multi-Perspective QA Approach

**Date**: 2025-10-24
**Purpose**: Prevent bugs like fake tests from happening again
**Approach**: Each QA persona explores system from unique angle

---

## 🎯 The Problem This Solves

**What Went Wrong:**

- Tab cleanup bug existed despite "passing tests"
- Tests were fake (tested mock functions, not real code)
- Traditional testing missed critical quality issues

**What We Need:**

- **DEEP**: Exhaustive testing of individual components
- **WIDE**: Cross-cutting concerns (security, performance, UX, chaos)
- **PERSONAS**: Different expert perspectives catching different bug classes

---

## 👥 The 8 QA Personas

### 1. 🔒 **Security Tester** - "Trust No Input"

**Mindset**: Assume all inputs are malicious
**Focus**: Input validation, injection attacks, privilege escalation
**Question**: "How can this be exploited?"

### 2. 💥 **Chaos Engineer** - "Break Everything"

**Mindset**: Murphy's law in action
**Focus**: Failure modes, race conditions, resource exhaustion
**Question**: "What's the worst that could happen?"

### 3. ⚡ **Performance Engineer** - "Make It Fast"

**Mindset**: Optimize for speed and efficiency
**Focus**: Latency, throughput, memory usage, scalability
**Question**: "Where are the bottlenecks?"

### 4. 🎨 **UX Tester** - "User Experience Matters"

**Mindset**: Think like end user
**Focus**: Usability, error messages, edge cases in UI
**Question**: "Will users understand this?"

### 5. 🔬 **Integration Tester** - "Components Must Work Together"

**Mindset**: Test real flows end-to-end
**Focus**: Cross-component interactions, integration points
**Question**: "Does the whole system work?"

### 6. 🐛 **Boundary Tester** - "Test The Edges"

**Mindset**: Extremes and boundaries reveal bugs
**Focus**: Min/max values, empty inputs, overflow conditions
**Question**: "What happens at the limits?"

### 7. 🔁 **State Machine Tester** - "All Paths Matter"

**Mindset**: Every state transition must be tested
**Focus**: State transitions, invalid states, state corruption
**Question**: "Can we reach invalid states?"

### 8. 📊 **Data Quality Tester** - "Garbage In, Garbage Out"

**Mindset**: Data integrity is critical
**Focus**: Data validation, corruption, consistency
**Question**: "Is the data trustworthy?"

### 9. 🧪 **Testing Expert** - "Test The Tests"

**Mindset**: Tests themselves must be high quality
**Focus**: Test effectiveness, fake tests, test coverage, test maintainability
**Question**: "Do these tests actually catch bugs?"

**Key Responsibilities:**

- Detect fake tests (tests that don't test real code)
- Verify test effectiveness (can tests fail?)
- Ensure test coverage is meaningful (not just high percentage)
- Prevent flaky tests
- Maintain test quality standards

---

## 🔒 Persona 1: Security Tester

### Tab Cleanup Security Tests

```javascript
describe('Security: Tab Cleanup', () => {
  test('should not allow JavaScript injection via URL parameter', async () => {
    const maliciousUrl = 'javascript:alert(document.cookie)';

    // Should reject javascript: URLs
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: maliciousUrl,
        autoClose: true,
      })
    ).rejects.toThrow();
  });

  test('should sanitize tab IDs to prevent prototype pollution', async () => {
    // Attempt prototype pollution via __proto__
    const maliciousParams = {
      url: 'https://example.com',
      __proto__: { autoClose: false },
    };

    const result = await handleOpenUrlCommand('cmd-1', maliciousParams);

    // Should not pollute Object.prototype
    expect(Object.prototype.autoClose).toBeUndefined();
  });

  test('should limit URL length to prevent memory exhaustion', async () => {
    const veryLongUrl = 'https://example.com/' + 'a'.repeat(100000);

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: veryLongUrl,
        autoClose: true,
      })
    ).rejects.toThrow(/URL too long/i);
  });

  test('should validate duration parameter to prevent DoS', async () => {
    // Extremely long duration could DoS the extension
    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: Number.MAX_SAFE_INTEGER,
      autoClose: true,
    });

    // Should cap duration at reasonable max
    expect(result.duration).toBeLessThan(60000); // Max 1 minute
  });
});
```

### WebSocket Security Tests

```javascript
describe('Security: WebSocket Server', () => {
  test('should reject messages larger than max size', async () => {
    const hugeMessage = {
      type: 'openUrl',
      id: 'cmd-1',
      url: 'https://example.com',
      payload: 'x'.repeat(10 * 1024 * 1024), // 10MB
    };

    // Should reject without processing
    expect(server.handleMessage(hugeMessage)).rejects.toThrow(/message too large/i);
  });

  test('should rate-limit rapid command requests', async () => {
    const requests = Array(1000)
      .fill()
      .map((_, i) => ({
        type: 'openUrl',
        id: `cmd-${i}`,
        url: 'https://example.com',
      }));

    // Should reject after rate limit exceeded
    const results = await Promise.allSettled(requests.map(req => server.handleMessage(req)));

    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });

  test('should validate command IDs to prevent injection', async () => {
    const maliciousId = '"; DROP TABLE commands; --';

    await expect(
      server.handleMessage({
        type: 'openUrl',
        id: maliciousId,
        url: 'https://example.com',
      })
    ).rejects.toThrow(/invalid command id/i);
  });
});
```

---

## 💥 Persona 2: Chaos Engineer

### Chaos Tests: Network Failures

```javascript
describe('Chaos: Network Failures', () => {
  test('should handle WebSocket disconnect during command execution', async () => {
    // Start command
    const commandPromise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 5000,
      autoClose: true,
    });

    // Simulate WebSocket disconnect mid-execution
    setTimeout(() => {
      ws.close();
    }, 100);

    // Should complete gracefully
    const result = await commandPromise;
    expect(result.tabId).toBeDefined();
    expect(result.tabClosed).toBe(true); // Cleanup should still happen
  });

  test('should handle server restart during active capture', async () => {
    // Start capture
    await server.start();
    const client = new ApiClient('ws://localhost:9876');
    await client.connect();

    const promise = client.openUrl('https://example.com', {
      captureConsole: true,
      duration: 5000,
    });

    // Kill and restart server mid-capture
    await server.stop();
    await sleep(100);
    await server.start();

    // Client should reconnect and handle gracefully
    await expect(promise).resolves.toBeDefined();
  });
});
```

### Chaos Tests: Resource Exhaustion

```javascript
describe('Chaos: Resource Exhaustion', () => {
  test('should handle 100 concurrent tab opens', async () => {
    const promises = Array(100)
      .fill()
      .map((_, i) =>
        handleOpenUrlCommand(`cmd-${i}`, {
          url: `https://example.com/${i}`,
          autoClose: true,
        })
      );

    const results = await Promise.allSettled(promises);

    // All should either succeed or fail gracefully
    results.forEach(result => {
      if (result.status === 'rejected') {
        expect(result.reason.message).toMatch(/too many tabs|rate limit/i);
      }
    });

    // All tabs should be cleaned up
    const openTabs = await chrome.tabs.query({});
    expect(openTabs.length).toBeLessThan(10); // Most should be closed
  });

  test('should handle memory pressure during console capture', async () => {
    // Generate massive console output
    mockChrome.runtime.onMessage.addListener(msg => {
      if (msg.type === 'generateLoad') {
        for (let i = 0; i < 100000; i++) {
          handleConsoleMessage({
            type: 'console',
            level: 'log',
            message: 'x'.repeat(1000),
            timestamp: Date.now(),
          });
        }
      }
    });

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 1000,
      autoClose: true,
    });

    // Should cap logs, not crash
    expect(result.consoleLogs.length).toBeLessThanOrEqual(MAX_LOGS_PER_CAPTURE);
  });
});
```

---

## ⚡ Persona 3: Performance Engineer

### Performance Tests: Latency

```javascript
describe('Performance: Latency', () => {
  test('tab cleanup should complete in <50ms', async () => {
    const start = performance.now();

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
      captureConsole: false,
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  test('WebSocket message routing should be <10ms', async () => {
    const start = performance.now();

    await server.routeMessage({
      type: 'ping',
      id: 'ping-1',
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });
});
```

### Performance Tests: Throughput

```javascript
describe('Performance: Throughput', () => {
  test('should handle 1000 commands/second', async () => {
    const commands = 1000;
    const start = performance.now();

    const promises = Array(commands)
      .fill()
      .map((_, i) =>
        server.handleCommand({
          type: 'openUrl',
          id: `cmd-${i}`,
          url: 'https://example.com',
        })
      );

    await Promise.all(promises);
    const duration = (performance.now() - start) / 1000; // seconds

    const throughput = commands / duration;
    expect(throughput).toBeGreaterThan(1000);
  });
});
```

### Performance Tests: Memory

```javascript
describe('Performance: Memory', () => {
  test('should not leak memory during 10000 tab operations', async () => {
    if (global.gc) global.gc(); // Force GC
    const baseline = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10000; i++) {
      await handleOpenUrlCommand(`cmd-${i}`, {
        url: 'https://example.com',
        autoClose: true,
      });
    }

    if (global.gc) global.gc();
    const final = process.memoryUsage().heapUsed;
    const increase = (final - baseline) / 1024 / 1024; // MB

    // Should not grow more than 10MB
    expect(increase).toBeLessThan(10);
  });
});
```

---

## 🎨 Persona 4: UX Tester

### UX Tests: Error Messages

```javascript
describe('UX: Error Messages', () => {
  test('should provide helpful error when URL missing', async () => {
    await expect(handleOpenUrlCommand('cmd-1', {})).rejects.toThrow('url is required');

    // Should suggest fix
    await expect(handleOpenUrlCommand('cmd-1', {})).rejects.toThrow(/provide a url parameter/i);
  });

  test('should explain why tab cleanup failed', async () => {
    mockChrome.tabs.remove.mockRejectedValue(new Error('No tab with id: 123'));

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      autoClose: true,
    });

    expect(result.error).toMatch(/tab may have been closed manually/i);
  });
});
```

### UX Tests: Progress Feedback

```javascript
describe('UX: Progress Feedback', () => {
  test('should emit progress events during long capture', async () => {
    const events = [];
    healthManager.on('capture-progress', evt => events.push(evt));

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 5000,
      autoClose: true,
    });

    // Should have emitted progress updates
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('progress');
    expect(events[0]).toHaveProperty('remaining');
  });
});
```

---

## 🔬 Persona 5: Integration Tester

### Integration Tests: Full E2E Flows

```javascript
describe('Integration: Full E2E', () => {
  test('API → Server → Extension → Tab → Console → Cleanup', async () => {
    // 1. Start server
    await server.start();

    // 2. Connect API client
    const apiClient = new ApiClient('ws://localhost:9876');
    await apiClient.connect();

    // 3. Connect extension
    const extension = await loadExtension('./extension');
    await extension.connect('ws://localhost:9876');

    // 4. API client sends command
    const result = await apiClient.openUrl('https://example.com', {
      captureConsole: true,
      duration: 1000,
      autoClose: true,
    });

    // 5. Verify full flow
    expect(result.tabId).toBeDefined();
    expect(result.consoleLogs).toBeInstanceOf(Array);
    expect(result.tabClosed).toBe(true);

    // 6. Verify tab actually closed
    const tabs = await extension.getAllTabs();
    expect(tabs.find(t => t.id === result.tabId)).toBeUndefined();
  });
});
```

---

## 🐛 Persona 6: Boundary Tester

### Boundary Tests: Input Limits

```javascript
describe('Boundary: Input Limits', () => {
  test('URL length boundaries', async () => {
    const tests = [
      { url: '', shouldFail: true, reason: 'empty' },
      { url: 'a', shouldFail: true, reason: 'too short' },
      { url: 'https://a.com', shouldFail: false, reason: 'min valid' },
      { url: 'https://example.com/' + 'a'.repeat(2048), shouldFail: false, reason: 'max valid' },
      { url: 'https://example.com/' + 'a'.repeat(2049), shouldFail: true, reason: 'too long' },
    ];

    for (const test of tests) {
      if (test.shouldFail) {
        await expect(handleOpenUrlCommand('cmd-1', { url: test.url })).rejects.toThrow();
      } else {
        await expect(handleOpenUrlCommand('cmd-1', { url: test.url })).resolves.toBeDefined();
      }
    }
  });

  test('duration boundaries', async () => {
    const tests = [
      { duration: -1, shouldFail: true },
      { duration: 0, shouldFail: false },
      { duration: 100, shouldFail: false },
      { duration: 60000, shouldFail: false },
      { duration: 60001, shouldFail: true },
      { duration: Infinity, shouldFail: true },
      { duration: NaN, shouldFail: true },
    ];

    for (const test of tests) {
      if (test.shouldFail) {
        await expect(
          handleOpenUrlCommand('cmd-1', {
            url: 'https://example.com',
            duration: test.duration,
          })
        ).rejects.toThrow();
      } else {
        await expect(
          handleOpenUrlCommand('cmd-1', {
            url: 'https://example.com',
            duration: test.duration,
          })
        ).resolves.toBeDefined();
      }
    }
  });
});
```

---

## 🔁 Persona 7: State Machine Tester

### State Tests: Capture Lifecycle

```javascript
describe('State: Capture Lifecycle', () => {
  test('should handle all valid state transitions', async () => {
    const states = [];

    // Track state changes
    healthManager.on('capture-state-changed', evt => {
      states.push(evt.state);
    });

    await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 1000,
      autoClose: true,
    });

    // Should transition: idle → starting → capturing → completing → cleanup → idle
    expect(states).toEqual(['idle', 'starting', 'capturing', 'completing', 'cleanup', 'idle']);
  });

  test('should prevent invalid state transitions', async () => {
    // Start capture
    const promise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 5000,
    });

    // Try to start another capture for same command
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com',
        captureConsole: true,
      })
    ).rejects.toThrow(/capture already active/i);

    await promise;
  });
});
```

---

## 📊 Persona 8: Data Quality Tester

### Data Quality Tests: Console Logs

```javascript
describe('Data Quality: Console Logs', () => {
  test('should preserve log order across rapid messages', async () => {
    const messages = Array(1000)
      .fill()
      .map((_, i) => ({
        type: 'console',
        level: 'log',
        message: `Log ${i}`,
        timestamp: Date.now() + i,
      }));

    messages.forEach(msg => handleConsoleMessage(msg));

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 100,
    });

    // Should be in order
    for (let i = 1; i < result.consoleLogs.length; i++) {
      expect(result.consoleLogs[i].timestamp).toBeGreaterThanOrEqual(
        result.consoleLogs[i - 1].timestamp
      );
    }
  });

  test('should validate console message structure', async () => {
    const invalidMessages = [
      { type: 'console' }, // Missing fields
      { type: 'console', level: 'log' }, // Missing message
      { type: 'console', message: 'test' }, // Missing level
      { level: 'log', message: 'test' }, // Missing type
    ];

    invalidMessages.forEach(msg => {
      expect(() => handleConsoleMessage(msg)).toThrow(/invalid console message/i);
    });
  });
});
```

---

## 📋 Implementation Priority

### Phase 1: Critical Security & Integration (Week 1)

- [x] Security: Input validation tests
- [x] Security: Injection prevention tests
- [ ] Integration: Full E2E flow tests
- [ ] Chaos: Resource exhaustion tests

### Phase 2: Performance & UX (Week 2)

- [ ] Performance: Latency benchmarks
- [ ] Performance: Memory leak detection
- [ ] UX: Error message quality tests
- [ ] Boundary: Input limit tests

### Phase 3: Deep Dive (Week 3-4)

- [ ] Chaos: Network failure scenarios
- [ ] State: All state transition tests
- [ ] Data Quality: Message validation
- [ ] All remaining persona tests

---

## 🎯 Success Metrics

**Coverage Goals:**

- Security: 100% attack vectors covered
- Chaos: 90% failure modes tested
- Performance: All critical paths benchmarked
- Integration: 100% user flows tested
- Boundary: All limits tested
- State: All transitions tested
- Data Quality: All data validated

**Quality Gates:**

- No fake tests (all tests import real code)
- Every test can fail (verified by breaking implementation)
- E2E tests run against real components
- Security tests use actual attack vectors
- Performance tests have measurable SLAs

---

## 🚫 Preventing Fake Tests

**Checklist for Every New Test:**

1. ✅ Does test import real implementation?

   ```javascript
   // GOOD
   const { handleOpenUrlCommand } = require('../../extension/background');

   // BAD
   const handleOpenUrlCommand = () => {
     /* mock */
   };
   ```

2. ✅ Does test use real objects (not all mocks)?

   ```javascript
   // GOOD - Mock only external dependencies
   global.chrome = mockChrome; // External
   const result = await handleOpenUrlCommand(); // Real

   // BAD - Mock the thing we're testing
   const mockHandler = jest.fn();
   ```

3. ✅ If I break implementation, does test fail?

   ```javascript
   // Test this by commenting out real code:
   // if (autoClose) {
   //   await chrome.tabs.remove(tab.id);
   // }
   // Test MUST fail
   ```

4. ✅ Does test cover a real user scenario?

   ```javascript
   // GOOD
   test('tab closes when autoClose=true', ...)

   // BAD
   test('mock function returns true', ...)
   ```

---

## 🧪 Persona 9: Testing Expert

### Meta-Tests: Test Quality Validation

```javascript
describe('Testing Expert: Verify Test Quality', () => {
  test('all tests should import real implementations', () => {
    const testFiles = glob.sync('tests/**/*.test.js');
    const fakeTests = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Check for fake test patterns
      const definesFunctionsInTest = /const \w+\s*=\s*async\s*\([^)]*\)\s*=>/.test(content);
      const importsRealCode = /require\(['"]\.\.\//.test(content);

      if (definesFunctionsInTest && !importsRealCode) {
        fakeTests.push(file);
      }
    });

    expect(fakeTests).toEqual([]);
  });

  test('all tests must be able to fail', async () => {
    // Meta-test: Temporarily break implementation, verify tests fail
    const originalImplementation = handleOpenUrlCommand.toString();

    // Break it
    handleOpenUrlCommand = async () => ({ tabClosed: false });

    // Run tests
    const result = await runTests('tab-cleanup.test.js');

    // Restore
    eval(originalImplementation);

    // Tests MUST have failed
    expect(result.failed).toBeGreaterThan(0);
  });
});
```

---

## 🎪 Creative Edge Cases & Stress Tests

### 1. 🌀 **Interconnection Tests** - Dependencies Matter

```javascript
describe('Interconnections: Cross-Component Dependencies', () => {
  test('tab cleanup should wait for console capture to complete', async () => {
    let captureCompleted = false;

    mockChrome.scripting.executeScript.mockImplementation(async () => {
      await sleep(1000);
      captureCompleted = true;
      return [];
    });

    const start = Date.now();

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 500,
      autoClose: true,
    });

    const elapsed = Date.now() - start;

    // Should wait for capture before closing
    expect(captureCompleted).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(500);
    expect(result.tabClosed).toBe(true);
  });

  test('WebSocket reconnect should preserve pending commands', async () => {
    // Send command
    const promise = client.openUrl('https://example.com');

    // WebSocket dies mid-command
    ws.close();

    // Client reconnects
    await sleep(100);
    await client.connect();

    // Command should complete after reconnect
    const result = await promise;
    expect(result.tabId).toBeDefined();
  });

  test('health manager state should sync with actual WebSocket state', async () => {
    // Health manager thinks connected
    healthManager.setExtensionSocket({ readyState: WebSocket.OPEN });

    // But socket actually closed
    extensionSocket.close();

    // System should detect mismatch and resync
    await sleep(100);

    expect(healthManager.isExtensionConnected()).toBe(false);
  });

  test('concurrent captures on same tab should NOT interfere', async () => {
    const tab = await chrome.tabs.create({ url: 'https://example.com' });

    // Start two captures on same tab simultaneously
    const [result1, result2] = await Promise.all([
      handleConsoleCapture('cmd-1', 1000, tab.id),
      handleConsoleCapture('cmd-2', 1000, tab.id),
    ]);

    // Both should succeed with independent logs
    expect(result1.logs).toBeDefined();
    expect(result2.logs).toBeDefined();
    expect(result1.logs).not.toBe(result2.logs); // Different arrays
  });

  test('server routing should preserve message order under load', async () => {
    const messages = Array(1000)
      .fill()
      .map((_, i) => ({
        type: 'test',
        id: `msg-${i}`,
        sequence: i,
      }));

    const received = [];

    messages.forEach(msg => {
      server.route(msg).then(result => received.push(result));
    });

    await sleep(500);

    // Should be in order
    for (let i = 1; i < received.length; i++) {
      expect(received[i].sequence).toBeGreaterThan(received[i - 1].sequence);
    }
  });
});
```

### 2. ⛔ **Mutual Exclusion Tests** - Things That Shouldn't Run Together

```javascript
describe('Mutual Exclusion: Conflicting Operations', () => {
  test('should prevent tab close while console capture active', async () => {
    const tab = await chrome.tabs.create({ url: 'https://example.com' });

    // Start long capture
    const capturePromise = handleConsoleCapture('cmd-1', 5000, tab.id);

    // Try to close tab mid-capture
    await expect(chrome.tabs.remove(tab.id)).rejects.toThrow(/capture in progress/i);

    await capturePromise;

    // Now should be able to close
    await expect(chrome.tabs.remove(tab.id)).resolves.toBeUndefined();
  });

  test('should prevent multiple handleOpenUrlCommand for same command ID', async () => {
    const promise1 = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      duration: 2000,
    });

    // Try to run same command ID again
    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://different.com',
      })
    ).rejects.toThrow(/command already running/i);

    await promise1;
  });

  test('should prevent server shutdown while commands pending', async () => {
    // Start long-running command
    const commandPromise = server.handleCommand({
      type: 'openUrl',
      id: 'cmd-1',
      url: 'https://example.com',
      duration: 5000,
    });

    // Try to shutdown server
    await expect(server.shutdown()).rejects.toThrow(/pending commands/i);

    await commandPromise;

    // Now shutdown should work
    await expect(server.shutdown()).resolves.toBeUndefined();
  });

  test('should prevent extension reload while captures active', async () => {
    // Start capture
    const capturePromise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 3000,
    });

    // Try to reload extension
    await expect(chrome.management.setEnabled(extensionId, false)).rejects.toThrow(
      /active captures/i
    );

    await capturePromise;
  });
});
```

### 3. 🌪️ **Chaos + Creative Edge Cases**

```javascript
describe('Creative Edge Cases: Weird Scenarios', () => {
  test('tab deleted by user during capture should handle gracefully', async () => {
    const promise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 2000,
      autoClose: true,
    });

    // User manually closes tab mid-capture
    setTimeout(async () => {
      const tabs = await chrome.tabs.query({});
      await chrome.tabs.remove(tabs[0].id);
    }, 500);

    // Should complete without crash
    const result = await promise;
    expect(result.consoleLogs).toBeDefined(); // Got some logs before close
    expect(result.tabClosed).toBe(false); // Already closed by user
  });

  test('system clock change during capture should not break timers', async () => {
    const start = Date.now();

    // Mock Date.now() to jump forward
    const originalNow = Date.now;
    setTimeout(() => {
      Date.now = () => originalNow() + 3600000; // Jump 1 hour
    }, 100);

    const result = await handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 1000,
      autoClose: true,
    });

    // Restore
    Date.now = originalNow;

    // Should complete based on real time, not Date.now()
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(elapsed).toBeLessThan(2000);
  });

  test('Chrome extension context invalidated mid-command', async () => {
    const promise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 2000,
    });

    // Simulate context invalidation
    setTimeout(() => {
      chrome = undefined;
    }, 500);

    // Should fail gracefully with clear error
    await expect(promise).rejects.toThrow(/extension context invalidated/i);
  });

  test('recursive tab creation (tab opens tab) should not cause stack overflow', async () => {
    let createCount = 0;

    mockChrome.tabs.create.mockImplementation(async ({ url }) => {
      createCount++;

      if (createCount > 100) {
        throw new Error('Too many tabs');
      }

      // Recursive tab creation
      if (createCount < 5) {
        await handleOpenUrlCommand(`cmd-${createCount}`, {
          url: `https://example.com/${createCount}`,
        });
      }

      return { id: createCount, url };
    });

    await expect(
      handleOpenUrlCommand('cmd-1', {
        url: 'https://example.com/1',
      })
    ).resolves.toBeDefined();

    expect(createCount).toBeLessThan(100);
  });

  test('tab navigates to different URL during capture', async () => {
    const promise = handleOpenUrlCommand('cmd-1', {
      url: 'https://example.com',
      captureConsole: true,
      duration: 2000,
      autoClose: true,
    });

    // Tab navigates to different page
    setTimeout(async () => {
      const tabs = await chrome.tabs.query({});
      await chrome.tabs.update(tabs[0].id, { url: 'https://different.com' });
    }, 500);

    const result = await promise;

    // Should capture logs from both pages
    expect(result.consoleLogs).toBeDefined();
    expect(result.tabClosed).toBe(true);
  });

  test('WebSocket message larger than max buffer size', async () => {
    const huge = {
      type: 'openUrl',
      id: 'cmd-1',
      url: 'https://example.com',
      data: 'x'.repeat(100 * 1024 * 1024), // 100MB
    };

    // Should reject before attempting to process
    await expect(server.handleMessage(huge)).rejects.toThrow(/message too large/i);

    // Server should still be responsive
    await expect(server.handleMessage({ type: 'ping' })).resolves.toBeDefined();
  });

  test('circular reference in message should not cause serialization hang', async () => {
    const message = {
      type: 'openUrl',
      id: 'cmd-1',
      url: 'https://example.com',
    };

    message.self = message; // Circular reference

    await expect(server.handleMessage(message)).rejects.toThrow(/circular|serialize/i);
  });

  test('tab ID collision (reused ID)', async () => {
    // Create and close tab
    const tab1 = await chrome.tabs.create({ url: 'https://example.com' });
    await chrome.tabs.remove(tab1.id);

    // New tab reuses same ID (can happen in Chrome)
    mockChrome.tabs.create.mockResolvedValue({ id: tab1.id, url: 'https://new.com' });

    const tab2 = await chrome.tabs.create({ url: 'https://new.com' });

    // Should not mix up tabs
    expect(tab2.id).toBe(tab1.id);
    expect(tab2.url).toBe('https://new.com');
  });
});
```

### 4. 🔥 **Extreme Stress Tests**

```javascript
describe('Stress Tests: System Limits', () => {
  test('10,000 tabs opened and closed sequentially', async () => {
    const results = [];

    for (let i = 0; i < 10000; i++) {
      const result = await handleOpenUrlCommand(`cmd-${i}`, {
        url: `https://example.com/${i}`,
        autoClose: true,
      });
      results.push(result);

      // Verify tab was closed
      expect(result.tabClosed).toBe(true);
    }

    // All should succeed
    expect(results.length).toBe(10000);

    // Memory should not have grown excessively
    if (global.gc) global.gc();
    const mem = process.memoryUsage().heapUsed / 1024 / 1024;
    expect(mem).toBeLessThan(100); // <100MB
  }, 120000);

  test('1000 concurrent WebSocket connections', async () => {
    const clients = Array(1000)
      .fill()
      .map(() => new ApiClient('ws://localhost:9876'));

    await Promise.all(clients.map(c => c.connect()));

    // All should be connected
    expect(server.getConnectionCount()).toBe(1000);

    // Send message from each
    const promises = clients.map((c, i) =>
      c.openUrl(`https://example.com/${i}`, { autoClose: true })
    );

    const results = await Promise.allSettled(promises);

    // Most should succeed (some might hit rate limits)
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(900);

    // Cleanup
    await Promise.all(clients.map(c => c.disconnect()));
  }, 60000);

  test('sustained load: 100 req/sec for 60 seconds', async () => {
    const startTime = Date.now();
    const targetDuration = 60000; // 60 seconds
    const rps = 100;

    let requestCount = 0;
    let errorCount = 0;

    const interval = setInterval(async () => {
      for (let i = 0; i < rps; i++) {
        try {
          await server.handleCommand({
            type: 'openUrl',
            id: `cmd-${requestCount}`,
            url: 'https://example.com',
            autoClose: true,
          });
          requestCount++;
        } catch (err) {
          errorCount++;
        }
      }
    }, 1000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, targetDuration));
    clearInterval(interval);

    const elapsed = Date.now() - startTime;

    // Should have processed ~6000 requests
    expect(requestCount).toBeGreaterThan(5000);

    // Error rate should be low
    const errorRate = errorCount / requestCount;
    expect(errorRate).toBeLessThan(0.05); // <5% errors

    // Average latency should be reasonable
    const avgLatency = elapsed / requestCount;
    expect(avgLatency).toBeLessThan(50); // <50ms per request
  }, 70000);

  test('memory leak test: 1M console messages', async () => {
    if (global.gc) global.gc();
    const baseline = process.memoryUsage().heapUsed;

    for (let i = 0; i < 1000000; i++) {
      handleConsoleMessage({
        type: 'console',
        level: 'log',
        message: `Message ${i}`,
        timestamp: Date.now(),
        tabId: 123,
      });

      // Force periodic GC
      if (i % 10000 === 0 && global.gc) {
        global.gc();
      }
    }

    if (global.gc) global.gc();
    const final = process.memoryUsage().heapUsed;
    const growth = (final - baseline) / 1024 / 1024;

    // Should not grow more than 50MB
    expect(growth).toBeLessThan(50);
  }, 60000);

  test('CPU intensive: parse and validate 10K complex messages', async () => {
    const messages = Array(10000)
      .fill()
      .map((_, i) => ({
        type: 'openUrl',
        id: `cmd-${i}`,
        url: `https://example.com/${i}`,
        params: {
          autoClose: i % 2 === 0,
          captureConsole: i % 3 === 0,
          duration: Math.floor(Math.random() * 5000),
          metadata: {
            timestamp: Date.now(),
            user: `user-${i}`,
            tags: Array(10)
              .fill()
              .map((_, j) => `tag-${j}`),
          },
        },
      }));

    const start = Date.now();

    await Promise.all(messages.map(msg => server.validateAndRoute(msg)));

    const elapsed = Date.now() - start;
    const throughput = messages.length / (elapsed / 1000);

    // Should process >1000 messages/sec
    expect(throughput).toBeGreaterThan(1000);
  });

  test('rapid connect/disconnect cycles', async () => {
    for (let i = 0; i < 1000; i++) {
      const client = new ApiClient('ws://localhost:9876');
      await client.connect();
      await client.disconnect();
    }

    // Server should still be responsive
    const finalClient = new ApiClient('ws://localhost:9876');
    await expect(finalClient.connect()).resolves.toBeUndefined();

    const result = await finalClient.openUrl('https://example.com', {
      autoClose: true,
    });

    expect(result.tabId).toBeDefined();
  }, 30000);
});
```

### 5. 🔗 **Dependency Chain Tests**

```javascript
describe('Dependency Chains: Multi-Step Failures', () => {
  test('API → Server → Extension chain: each step failure handled', async () => {
    // Test 1: API client disconnects
    const client1 = new ApiClient('ws://localhost:9876');
    await client1.connect();
    const promise1 = client1.openUrl('https://example.com');
    client1.disconnect(); // Disconnect mid-request

    await expect(promise1).rejects.toThrow(/disconnected/i);

    // Test 2: Server crashes
    const client2 = new ApiClient('ws://localhost:9876');
    await client2.connect();
    const promise2 = client2.openUrl('https://example.com');
    await server.crash(); // Simulate crash

    await expect(promise2).rejects.toThrow(/server/i);

    // Test 3: Extension disconnects
    await server.restart();
    const client3 = new ApiClient('ws://localhost:9876');
    await client3.connect();
    extensionSocket.close(); // Extension gone

    await expect(client3.openUrl('https://example.com')).rejects.toThrow(
      /extension not connected/i
    );
  });

  test('cascading timeouts: each layer respects parent timeout', async () => {
    // API client timeout: 5s
    client.setTimeout(5000);

    // Server timeout: 10s (longer than client)
    server.setTimeout(10000);

    // Extension timeout: 15s (longest)
    extension.setTimeout(15000);

    // Start long operation
    const promise = client.openUrl('https://example.com', {
      duration: 20000, // Longer than all timeouts
    });

    // Should timeout at client level (5s)
    const start = Date.now();
    await expect(promise).rejects.toThrow(/timeout/i);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(4900);
    expect(elapsed).toBeLessThan(6000);
  });

  test('circular dependency detection: prevent infinite loops', async () => {
    // Command A depends on B
    // Command B depends on C
    // Command C depends on A (cycle!)

    server.registerDependency('cmd-A', ['cmd-B']);
    server.registerDependency('cmd-B', ['cmd-C']);
    server.registerDependency('cmd-C', ['cmd-A']); // Cycle

    await expect(server.executeCommand('cmd-A')).rejects.toThrow(/circular dependency/i);
  });
});
```

---

## 📝 Summary

**9 Personas × Deep + Wide Testing = Comprehensive Coverage**

Each persona brings unique perspective:

- 🔒 Security → Finds vulnerabilities
- 💥 Chaos → Finds brittleness
- ⚡ Performance → Finds bottlenecks
- 🎨 UX → Finds confusion
- 🔬 Integration → Finds disconnects
- 🐛 Boundary → Finds edge cases
- 🔁 State → Finds invalid states
- 📊 Data Quality → Finds corruption
- 🧪 Testing Expert → Finds fake tests

**Additional Coverage:**

- 🌀 Interconnections → Cross-component dependencies
- ⛔ Mutual Exclusions → Conflicting operations
- 🌪️ Creative Edge Cases → Weird scenarios
- 🔥 Stress Tests → System limits
- 🔗 Dependency Chains → Multi-step failures

**Result**: Bugs have nowhere to hide.

**Next Steps**:

1. Implement Phase 1 tests (security + integration)
2. Set up CI/CD to run all persona tests
3. Add persona-based code review checklist
4. Train team on persona-based testing approach

---

## 🏆 Expected Outcomes

**Before (with fake tests):**

- ❌ Tab cleanup broken, tests pass
- ❌ False confidence
- ❌ Bugs in production

**After (with persona-based testing):**

- ✅ All test scenarios covered
- ✅ Real bugs caught early
- ✅ True confidence
- ✅ Production quality code

**The Goal**: Make it impossible for bugs to slip through.

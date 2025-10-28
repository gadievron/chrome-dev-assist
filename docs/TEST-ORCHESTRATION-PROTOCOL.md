# Test Orchestration Protocol

**Version**: 1.0.0
**Purpose**: Enable safe, coordinated test execution between Claude and Chrome Dev Assist extension

---

## Overview

The Test Orchestration Protocol ensures Claude can safely run tests with:

- Clear test identification (project name, test ID, version)
- State tracking (prevent overlapping tests)
- Resource management (detect orphaned tabs)
- Communication protocol (test lifecycle events)

---

## Protocol Messages

### 1. Start Test

**Direction**: Claude → Extension

**Command**: `startTest`

**Parameters**:

```javascript
{
  projectName: string,      // e.g., "chrome-dev-assist"
  testName: string,         // e.g., "DOM Inspection Basic"
  testId: string,           // e.g., "dom-001"
  version: string,          // e.g., "1.0.0"
  expectedTabs: number,     // Expected number of tabs to create
  expectedDuration: number, // Expected test duration (ms)
  autoCleanup: boolean      // Auto-cleanup on completion (default: true)
}
```

**Response**:

```javascript
{
  testId: string,
  status: "started",
  timestamp: number,
  state: {
    activeTest: testId,
    tabsCreated: [],
    startTime: timestamp
  }
}
```

### 2. End Test

**Direction**: Claude → Extension

**Command**: `endTest`

**Parameters**:

```javascript
{
  testId: string,
  result: "passed" | "failed" | "aborted",
  message: string (optional)
}
```

**Response**:

```javascript
{
  testId: string,
  status: "ended",
  cleanup: {
    tabsClosed: number[],
    orphansDetected: number[],
    cleanupSuccess: boolean
  },
  duration: number  // Actual test duration
}
```

### 3. Get Test Status

**Direction**: Claude → Extension

**Command**: `getTestStatus`

**Parameters**: (none)

**Response**:

```javascript
{
  activeTest: {
    testId: string,
    projectName: string,
    testName: string,
    startTime: number,
    elapsedTime: number,
    tabsCreated: number[],
    expectedTabs: number
  } | null,

  history: [
    {
      testId: string,
      result: "passed" | "failed" | "aborted",
      duration: number,
      timestamp: number
    }
  ]
}
```

### 4. Abort Test

**Direction**: Claude → Extension

**Command**: `abortTest`

**Parameters**:

```javascript
{
  testId: string,
  reason: string
}
```

**Response**:

```javascript
{
  testId: string,
  status: "aborted",
  cleanup: {
    tabsClosed: number[],
    orphansDetected: number[],
    cleanupSuccess: boolean
  }
}
```

### 5. Verify Cleanup

**Direction**: Claude → Extension

**Command**: `verifyCleanup`

**Parameters**:

```javascript
{
  expectedClosedTabs: number[]  // Tabs that should be closed
}
```

**Response**:

```javascript
{
  verified: boolean,
  orphans: number[],  // Tabs still open that should be closed
  autoCleanedUp: boolean  // Whether orphans were automatically closed
}
```

---

## Test Lifecycle State Machine

```
IDLE
  ↓ startTest()
RUNNING
  ↓ endTest(passed) → CLEANUP → IDLE
  ↓ endTest(failed) → CLEANUP → IDLE
  ↓ abortTest() → EMERGENCY_CLEANUP → IDLE
```

**State Transitions**:

- Only one test can run at a time
- Starting a new test while one is active → Error (must abort or end first)
- Ending a test triggers automatic cleanup (if autoCleanup: true)
- Aborting a test triggers emergency cleanup (closes all tracked tabs)

---

## Visual Test Fixture Template

Every test HTML page should include:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Test: {testName}</title>

    <!-- Test Metadata (machine-readable) -->
    <meta name="test-project" content="{projectName}" />
    <meta name="test-id" content="{testId}" />
    <meta name="test-version" content="{version}" />
    <meta name="test-name" content="{testName}" />
  </head>
  <body>
    <!-- Visual Test Banner (human-readable) -->
    <div
      id="test-banner"
      style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10000;
    display: flex;
    justify-content: space-between;
    align-items: center;
  "
    >
      <div>
        <div style="font-size: 14px; font-weight: 600;">🧪 {projectName} Test Suite</div>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
          {testName} (ID: {testId}) • v{version}
        </div>
      </div>
      <div
        id="test-status"
        style="
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    "
      >
        ⏳ RUNNING
      </div>
    </div>

    <!-- Test Content (offset to avoid banner overlap) -->
    <div style="margin-top: 80px; padding: 20px;">
      <!-- Your test content here -->
    </div>

    <!-- Test Metadata (for getPageMetadata API) -->
    <script>
      window.testMetadata = {
        projectName: '{projectName}',
        testName: '{testName}',
        testId: '{testId}',
        version: '{version}',
        startTime: Date.now(),
        status: 'running',
      };

      // Helper: Update test status visually
      window.updateTestStatus = function (status) {
        const statusEl = document.getElementById('test-status');
        const statusMap = {
          running: { text: '⏳ RUNNING', color: 'rgba(255,255,255,0.2)' },
          passed: { text: '✅ PASSED', color: 'rgba(76,175,80,0.9)' },
          failed: { text: '❌ FAILED', color: 'rgba(244,67,54,0.9)' },
        };

        const config = statusMap[status] || statusMap.running;
        statusEl.textContent = config.text;
        statusEl.style.background = config.color;
        window.testMetadata.status = status;
      };
    </script>
  </body>
</html>
```

---

## Usage Example

### Claude Test Script

```javascript
const chromeDevAssist = require('./claude-code/index.js');

async function runDOMInspectionTest() {
  let testContext;

  try {
    // 1. START TEST (tells extension what's running)
    testContext = await chromeDevAssist.startTest({
      projectName: 'chrome-dev-assist',
      testName: 'DOM Inspection Basic',
      testId: 'dom-001',
      version: '1.0.0',
      expectedTabs: 1,
      expectedDuration: 5000,
      autoCleanup: true,
    });

    console.log(`✓ Test started: ${testContext.testId}`);

    // 2. RUN TEST OPERATIONS
    const result = await chromeDevAssist.openUrl('http://localhost:9876/fixtures/dom-001.html');

    const tabId = result.tabId;

    const metadata = await chromeDevAssist.getPageMetadata(tabId);

    // Verify test identification
    expect(metadata.metadata.testId).toBe('dom-001');
    expect(metadata.metadata.projectName).toBe('chrome-dev-assist');

    // 3. END TEST (triggers cleanup)
    await chromeDevAssist.endTest(testContext.testId, {
      result: 'passed',
      message: 'All checks passed',
    });

    console.log('✓ Test completed and cleaned up');
  } catch (error) {
    console.error('Test failed:', error);

    // 4. ABORT TEST (emergency cleanup)
    if (testContext) {
      await chromeDevAssist.abortTest(testContext.testId, {
        reason: error.message,
      });
    }

    throw error;
  }
}
```

### Safety Checks

```javascript
// Before running next test, verify cleanup
const status = await chromeDevAssist.getTestStatus();

if (status.activeTest) {
  console.warn('Test still running:', status.activeTest.testId);

  // Option 1: Wait for it to complete
  // Option 2: Abort it
  await chromeDevAssist.abortTest(status.activeTest.testId, {
    reason: 'Starting new test',
  });
}

// Verify no orphaned tabs
const cleanup = await chromeDevAssist.verifyCleanup({
  expectedClosedTabs: [tabId1, tabId2],
});

if (cleanup.orphans.length > 0) {
  console.warn('Orphaned tabs detected:', cleanup.orphans);
  console.log('Auto-cleaned:', cleanup.autoCleanedUp);
}
```

---

## Benefits

### 1. **Clear Test Identification**

- Every test page visually shows project name, test ID, version
- Prevents confusion about what's being tested
- Easy to debug by looking at browser tabs

### 2. **State Tracking**

- Extension knows what test is active
- Prevents overlapping tests
- Tracks resources (tabs) per test

### 3. **Resource Safety**

- Automatic cleanup on test end
- Orphan detection (tabs not cleaned up)
- Emergency abort capability

### 4. **Communication Protocol**

- Claude tells extension: "Test X is starting"
- Extension confirms: "Test X started, tracking resources"
- Claude signals: "Test X done"
- Extension responds: "Cleaned up N tabs, 0 orphans"

### 5. **Mistake Prevention**

- Can't start test while another is running
- Can't close tabs prematurely (tracked by test context)
- Can verify cleanup before next test
- Clear error messages if protocol violated

---

## Extension State Management

**Storage**:

```javascript
// In extension background.js
let testState = {
  activeTest: null, // Current test or null
  history: [], // Last 10 tests
  resources: {
    tabs: [], // Tab IDs created during test
  },
};
```

**State Updates**:

- `startTest()` → Set activeTest, reset resources
- Tab created → Add to resources.tabs
- Tab closed → Remove from resources.tabs
- `endTest()` → Close remaining tabs, move to history, clear activeTest
- `abortTest()` → Close all tracked tabs, clear activeTest

---

## Error Handling

### Overlapping Tests

```javascript
// Request
startTest({ testId: 'dom-002', ... })

// Response (if test already running)
{
  error: {
    code: 'TEST_ALREADY_RUNNING',
    message: 'Test dom-001 is still active. Call endTest() or abortTest() first.',
    activeTest: { testId: 'dom-001', ... }
  }
}
```

### Orphaned Resources

```javascript
// After test ends with orphaned tabs
{
  testId: 'dom-001',
  status: 'ended',
  cleanup: {
    tabsClosed: [123, 456],
    orphansDetected: [789],  // Tab 789 should be closed but wasn't
    cleanupSuccess: false
  },
  warning: 'Some resources were not properly cleaned up'
}
```

### Test Timeout

```javascript
// If test exceeds expectedDuration by 2x
{
  testId: 'dom-001',
  status: 'timeout_warning',
  message: 'Test exceeded expected duration (10000ms > 5000ms expected)',
  suggestion: 'Consider calling abortTest() if test is hung'
}
```

---

## Implementation Checklist

- [ ] Add `startTest()` API function
- [ ] Add `endTest()` API function
- [ ] Add `getTestStatus()` API function
- [ ] Add `abortTest()` API function
- [ ] Add `verifyCleanup()` API function
- [ ] Add extension handlers for all commands
- [ ] Implement state machine in background.js
- [ ] Create test fixture template generator
- [ ] Add resource tracking (tabs)
- [ ] Add automatic cleanup on endTest()
- [ ] Add orphan detection
- [ ] Write comprehensive tests
- [ ] Update documentation

---

**Status**: Design Complete, Ready for Implementation
**Next**: Implement API functions in claude-code/index.js

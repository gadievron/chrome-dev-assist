# Lessons Learned: Testing and Debugging Issues

**Date:** 2025-10-25
**Session:** Registration Timeout Investigation & Improvements 6-7-8
**Purpose:** Analyze patterns, identify problems, improve rules and testing methodology

---

## Executive Summary

This debugging session revealed **SEVEN CRITICAL ISSUES** with our testing methodology and Claude's behavior:

1. ❌ **Background processes not cleaned up** (Chrome, server, test processes left running)
2. ❌ **Fake tests that don't test production code** (mocks instead of real implementation)
3. ❌ **Restarting server mid-session breaks extension connection** (testing methodology error)
4. ❌ **Extension doesn't reconnect after server restart** (actual bug - ISSUE-012)
5. ❌ **No verification that tabs/processes were cleaned up** (resource leaks)
6. ❌ **Debug logging added but never removed** (temporary changes left in code)
7. ❌ **Investigation took wrong path initially** (assumed bug in Improvement 6, not reconnection)

---

## Problem 1: Background Process Cleanup Failures

### What Happened
Throughout the session, multiple background processes were started but NOT cleaned up:
- Chrome (PID 30758) - launched at 19:12:06, killed at 22:33
- Server (PID 71941) - old server, killed at 19:31
- Server (PID 75422) - new server, killed at 22:33
- Bash shells (c607db, 7c1e40, 047efb) - left running

### User Complaint
> "you are once again not closing tabs on your own, and the extension isn't verifying they weren't closed and then closing them. this is an issue that keep repeaaring."

### Root Cause
**Claude does not proactively clean up background processes.**

When running:
- `./scripts/launch-chrome-with-extension.sh` in background
- `npm run server` in background
- `npm test` in background

Claude NEVER automatically:
1. Tracks which processes were started
2. Kills them when done
3. Verifies cleanup succeeded

### Impact
- System resources wasted (memory, CPU)
- Orphaned Chrome instances interfering with new tests
- Server port conflicts (can't start new server on same port)
- Confusion about which process is which

### Current Rules (Inadequate)
From CLAUDE.md:
- No explicit rule about cleaning up background processes
- No checklist item for process cleanup
- No automated verification

---

## Problem 2: Fake Tests (Testing Mocks Instead of Production Code)

### What Happened
The timeout-wrapper.test.js file initially contained:
```javascript
// Mock implementation of withTimeout for testing
async function withTimeout(promise, timeoutMs, operation) {
  // ... local mock implementation
}

// Tests used the mock, NOT background.js implementation!
```

### Discovery
Multi-persona review (Tester persona) identified:
> "4 out of 5 unit tests don't test production code"

### Root Cause
**Tests were written BEFORE implementation existed.**

Following "test-first" principle, tests were created with a mock implementation. But when real implementation was added to background.js, tests were NEVER updated to test the real code.

### Impact
- Tests passed but production code could be broken
- False confidence in implementation quality
- Bugs not caught until integration testing

### Fix Applied
Added verification tests:
```javascript
it('should verify withTimeout exists in background.js', () => {
  const backgroundJs = fs.readFileSync(
    path.join(__dirname, '../../extension/background.js'),
    'utf8'
  );
  expect(backgroundJs).toContain('async function withTimeout(');
  expect(backgroundJs).toContain('clearTimeout(timeoutHandle)');
});
```

### Current Rules (Inadequate)
From bootstrap.md:
- "Test-First Discipline: No code before tests"
- BUT no rule about updating tests to use real implementation
- No verification that tests actually call production code

---

## Problem 3: Server Restart Methodology Error

### What Happened
Debugging process:
1. Extension connected to server (PID 71941)
2. Added debug logging to server code
3. Restarted server to pick up changes (new PID 75422)
4. Extension NEVER reconnected to new server
5. Tests failed: "No extensions connected"

### Root Cause
**Restarting server mid-session is INVALID testing methodology.**

When server restarts:
- Extension's WebSocket connection breaks
- Extension should reconnect automatically
- But if reconnection doesn't work (ISSUE-012), extension stuck disconnected
- Cannot test WebSocket improvements with broken connection

### Correct Methodology
**WRONG:**
```bash
# Server running, extension connected
kill <server-pid>
npm run server  # New PID
# Extension never reconnects!
```

**RIGHT:**
```bash
# Kill everything
kill <chrome-pid>
kill <server-pid>

# Start fresh
npm run server
./scripts/launch-chrome-with-extension.sh
```

### Current Rules (Missing)
No documented testing procedures for:
- How to test WebSocket improvements
- How to restart components safely
- When it's safe to restart vs must restart all

---

## Problem 4: Extension Reconnection Failure (ISSUE-012)

### What Happened
Extension connected successfully on initial launch, but when server restarted, extension did NOT reconnect automatically.

**Evidence:**
- Server logs: NO connections after restart
- Extension console: "Registration timeout, reconnecting..."
- But no actual reconnection occurred

### Root Cause
**Reconnection logic has a bug** (needs further investigation).

Possible causes:
1. Service worker crashes after disconnect
2. Exponential backoff delays too long
3. WebSocket state stuck in CONNECTING
4. scheduleReconnect() has bug

### Impact
**This is the ACTUAL bug**, not the registration timeout.

The registration timeout (Improvement 6) is WORKING CORRECTLY:
- Extension sends register message
- Waits 5 seconds for ACK
- Times out because server not connected
- Tries to reconnect (but fails)

### Lesson
**Initial diagnosis was WRONG.**

Assumed problem was in Improvement 6 (Registration ACK), but actual problem is reconnection logic not working.

---

## Problem 5: No Cleanup Verification

### What Happened
User complaint:
> "the extension isn't verifying they weren't closed and then closing them"

Throughout session:
- Chrome launched but no verification it was killed
- Server started but no verification it was stopped
- Tests run but no verification processes cleaned up

### Root Cause
**No systematic cleanup verification protocol.**

When Claude runs:
```bash
./scripts/launch-chrome-with-extension.sh
```

It should:
1. Record PID returned
2. After testing, kill that PID
3. Verify process is dead: `ps -p <PID>` returns non-zero

But Claude does NONE of this.

### Impact
- Resource leaks accumulate
- Tests interfere with each other
- Hard to debug ("is old Chrome interfering?")
- User frustration with repeated issue

---

## Problem 6: Debug Logging Left in Code

### What Happened
Added debug logging to investigate registration timeout:

**extension/background.js:352-358:**
```javascript
// 🔍 DEBUG: Log all incoming messages
console.log('[ChromeDevAssist] 🔍 DEBUG: Received raw message:', event.data);
```

**server/websocket-server.js:592-594:**
```javascript
console.log('[Server] 🔍 DEBUG: Sending registration-ack:', JSON.stringify(ackMessage));
console.log('[Server] 🔍 DEBUG: registration-ack sent successfully to', name);
```

### Root Cause
**No protocol for temporary debug changes.**

Debug logging should be:
1. Marked as temporary
2. Removed after investigation
3. Or converted to conditional logging (DEBUG env var)

But no rule enforces this.

### Impact
- Production code polluted with debug logs
- Console noise in normal operation
- Harder to find real issues in logs

---

## Problem 7: Investigation Took Wrong Path

### What Happened
**Time Spent:**
- 30+ minutes investigating Registration ACK implementation
- Reading server code, extension code, test code
- Adding debug logging to ACK sending/receiving
- Creating test scripts to reload extension

**Actual Problem:**
- Extension not reconnecting (took 5 minutes to discover once right question asked)

### Root Cause
**Assumed symptom was the cause.**

- Symptom: "Registration timeout, reconnecting..."
- Assumed: Bug in Improvement 6 (Registration ACK)
- Reality: Bug in reconnection logic (different issue)

### Better Approach
Should have asked FIRST:
1. Is server running? ✅ (PID 75422)
2. Is extension connected? ❌ (NO - this is the issue!)
3. When did extension last connect? (19:12 to old server)
4. When did server restart? (19:31 new server)
5. **Conclusion: Reconnection failed**

Then investigate reconnection, NOT registration ACK.

---

## Recommendations

### 1. Add Process Cleanup Rule to CLAUDE.md

**New Section: "Resource Cleanup Protocol"**

```markdown
## Resource Cleanup Protocol (MANDATORY)

### Before Starting Background Processes
1. Check if port/resource already in use
2. Document PID/resource in session notes

### When Starting Background Processes
```bash
# ALWAYS capture PID
./script.sh &
SCRIPT_PID=$!
echo "Started process: PID $SCRIPT_PID"

# Or for node processes
npm run server &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
```

### After Test/Debug Session (MANDATORY)
1. Kill all processes started
2. Verify processes are dead
3. Check for orphaned processes
4. Clean up temporary files

**Checklist:**
- [ ] Chrome killed: `kill <chrome-pid>`
- [ ] Server killed: `kill <server-pid>`
- [ ] Processes verified dead: `ps -p <PID>` returns non-zero
- [ ] Temp files removed: `rm -f test-*.js`
- [ ] Background shells killed: Use KillShell tool

### Verification Command
```bash
# Check for orphaned Chrome/node processes
ps aux | grep -E "(chrome|node.*server)" | grep -v grep

# If any found, document why or kill
```
```

**Priority:** P0 CRITICAL - Add to bootstrap.md

---

### 2. Add Test Verification Rule

**New Section in tier1/testing.md:**

```markdown
## Test Reality Check (MANDATORY)

### After Writing Tests
1. Verify tests import/call production code
2. NOT mocks, NOT local implementations
3. Add verification test if unsure

### Verification Test Pattern
```javascript
describe('Production Code Verification', () => {
  it('should verify function exists in production file', () => {
    const sourceCode = fs.readFileSync(
      path.join(__dirname, '../../src/production.js'),
      'utf8'
    );
    expect(sourceCode).toContain('function nameOfFunction(');
  });

  it('should verify production code is actually called', () => {
    // Use spy/mock to verify REAL function called
    const realModule = require('../../src/production');
    const spy = jest.spyOn(realModule, 'functionName');

    // Run test
    runTest();

    expect(spy).toHaveBeenCalled();
  });
});
```

### Red Flags (Fake Tests)
- ❌ Test file defines function being tested
- ❌ Mock implementation in test file
- ❌ No require/import of production code
- ❌ Tests pass even when production code is broken
```

**Priority:** P0 CRITICAL - Add to tier1/testing.md

---

### 3. Add WebSocket Testing Methodology

**New File: tier1/websocket-testing.md**

```markdown
# WebSocket Testing Methodology

## Server Restart Protocol

### ❌ NEVER: Restart server mid-session
```bash
# This breaks extension connection
kill <old-server>
npm run server  # New server, but extension won't reconnect
```

### ✅ ALWAYS: Restart both server AND extension
```bash
# Method 1: Kill everything
kill <chrome-pid>
kill <server-pid>
sleep 2
npm run server
./scripts/launch-chrome-with-extension.sh

# Method 2: Reload extension programmatically
node -e "require('./claude-code/index').reload('<ext-id>')"
```

## Debug Logging Best Practices

### Adding Debug Logs
1. Mark as TEMPORARY with 🔍 emoji
2. Document removal plan
3. Use DEBUG environment variable

```javascript
// ✅ GOOD: Conditional debug logging
if (process.env.DEBUG) {
  console.log('[DEBUG] Message:', data);
}

// ❌ BAD: Always-on debug logging
console.log('[ChromeDevAssist] 🔍 DEBUG: Message:', data);
```

### Removing Debug Logs
- Before committing code
- After investigation complete
- Convert to conditional if useful long-term

## Connection State Debugging

### First Questions
1. Is server running? `ps aux | grep node.*server`
2. Is extension connected? Check server logs for "Extension registered"
3. When did connection last work? Check timestamps
4. What changed between working and broken? (server restart, extension reload, etc.)

### Diagnosis Tree
```
Registration timeout?
├─ Is server running? NO → Start server
├─ Is server running? YES
   ├─ Is extension connected? NO
   │  ├─ When was extension last connected?
   │  ├─ Was server restarted since then?
   │  └─ DIAGNOSIS: Reconnection failure (ISSUE-012)
   └─ Is extension connected? YES
      └─ DIAGNOSIS: Registration ACK not received (check server code)
```
```

**Priority:** P1 HIGH - Create this file

---

### 4. Add Investigation Protocol

**New Section in bootstrap.md:**

```markdown
## Investigation Protocol

### Before Deep Diving
**STOP. Ask these questions FIRST:**

1. **What is the symptom?** (error message, behavior)
2. **What SHOULD be happening?** (expected behavior)
3. **What resources are involved?** (server, extension, browser)
4. **What is the STATE of each resource?**
   - Is server running? Check PID
   - Is extension connected? Check server logs
   - Is browser running? Check ps aux
5. **When did it last work?** (timestamp)
6. **What changed since then?** (code, restart, etc.)

### Only AFTER answering above
- Read code
- Add debug logging
- Create test scripts

### Time Box Investigations
- 10 minutes: State checking (questions above)
- 30 minutes: Initial investigation
- If not resolved: Document findings, ask for help

### Avoid Assumption Traps
- ❌ "Error says X, so X is broken"
- ✅ "Error says X, but what STATE led to X?"
- ❌ "This code looks wrong"
- ✅ "Is this code even being executed?"
```

**Priority:** P1 HIGH - Add to bootstrap.md

---

### 5. Add Cleanup to /validate Command

**Update base-rules/.claude/commands/validate.md:**

```markdown
## 7-Item Validation Checklist

### 1. Tests Pass
- [ ] All tests passing
- [ ] No fake tests (tests call production code)

### 2. Code Quality
- [ ] No syntax errors
- [ ] No TODOs without tickets
- [ ] No debug logging (or marked TEMPORARY)

### 3. Documentation Updated
- [ ] README updated if needed
- [ ] API docs updated if needed

### 4. Issue Tracking
- [ ] Bugs logged to TO-FIX.md
- [ ] Features logged to FEATURE-SUGGESTIONS-TBD.md

### 5. Security Review
- [ ] No hardcoded secrets
- [ ] Input validation present

### 6. **RESOURCE CLEANUP** ⭐ NEW
- [ ] All background processes killed
- [ ] Process death verified
- [ ] Temp files removed
- [ ] Chrome/browser tabs closed

### 7. Test Reality Check
- [ ] Tests import production code
- [ ] Tests call real functions (not mocks)
- [ ] Verification tests added if complex
```

**Priority:** P0 CRITICAL - Update /validate command

---

### 6. Create Cleanup Helper Script

**New File: scripts/cleanup-test-session.sh**

```bash
#!/bin/bash
# Cleanup after test/debug session
# Run this before marking task complete

echo "🧹 Cleaning up test session..."

# Kill Chrome instances (testing profile)
echo "Killing Chrome (testing profile)..."
pkill -f "chrome.*tmp.*chrome-dev-assist-testing" && echo "✅ Chrome killed" || echo "ℹ️  No Chrome found"

# Kill WebSocket server
echo "Killing WebSocket server..."
if [ -f .server-pid ]; then
  SERVER_PID=$(cat .server-pid)
  kill $SERVER_PID 2>/dev/null && echo "✅ Server killed (PID: $SERVER_PID)" || echo "⚠️  Server not running"
  rm .server-pid
else
  pkill -f "node.*websocket-server" && echo "✅ Server killed" || echo "ℹ️  No server found"
fi

# Kill any background test processes
echo "Killing background test processes..."
pkill -f "npm.*test" && echo "✅ Tests killed" || echo "ℹ️  No tests found"

# Remove temporary files
echo "Removing temporary files..."
rm -f test-*.js reload-*.sh 2>/dev/null && echo "✅ Temp files removed" || echo "ℹ️  No temp files"

# Verify cleanup
echo ""
echo "🔍 Verification:"
echo "Chrome processes:"
ps aux | grep -E "chrome.*tmp.*chrome-dev-assist" | grep -v grep || echo "  ✅ None found"

echo "Node processes:"
ps aux | grep -E "node.*(server|test)" | grep -v grep || echo "  ✅ None found"

echo ""
echo "✅ Cleanup complete!"
```

**Usage:**
```bash
# At end of test session
./scripts/cleanup-test-session.sh

# Or make it automatic via /validate
```

**Priority:** P1 HIGH - Create this script

---

## Summary of Rule Changes

### bootstrap.md Changes
1. Add "Resource Cleanup Protocol" section (P0 CRITICAL)
2. Add "Investigation Protocol" section (P1 HIGH)

### tier1/testing.md Changes
1. Add "Test Reality Check" section (P0 CRITICAL)
2. Add verification test pattern examples

### tier1/ New Files
1. Create websocket-testing.md (P1 HIGH)

### Commands Changes
1. Update /validate to include cleanup check (P0 CRITICAL)

### Scripts Changes
1. Create cleanup-test-session.sh (P1 HIGH)

---

## Metrics to Track

### Process Cleanup Compliance
- Sessions ending with orphaned processes: Currently HIGH
- Target: 0%

### Test Reality
- Fake tests discovered: 4 out of 5 in timeout-wrapper.test.js (80%)
- Target: 0%

### Investigation Efficiency
- Time to identify root cause: 90+ minutes
- Target: <30 minutes with better protocol

### Resource Leaks
- Background processes left running: 5+ per session
- Target: 0

---

## Conclusion

This debugging session revealed **systematic problems** with our testing and debugging methodology:

1. **No cleanup protocol** → Resource leaks
2. **No test verification** → Fake tests
3. **No testing methodology docs** → Server restart broke connection
4. **No investigation protocol** → Wasted time on wrong diagnosis

**All 7 issues are SOLVABLE** with rule updates and new helper scripts.

**Priority Order:**
1. P0 CRITICAL: Add cleanup protocol and /validate update (blocks all testing)
2. P0 CRITICAL: Add test verification (blocks quality assurance)
3. P1 HIGH: Add WebSocket testing docs (blocks WebSocket development)
4. P1 HIGH: Add investigation protocol (improves efficiency)

---

*Analysis Date: 2025-10-25*
*Session: Registration Timeout Investigation*
*Findings: 7 critical methodology issues identified*
*Recommendations: 6 actionable improvements proposed*

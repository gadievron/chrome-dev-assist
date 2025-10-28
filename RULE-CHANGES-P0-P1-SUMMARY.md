# Rule Changes Summary: P0 & P1 Recommendations

**Date:** 2025-10-25
**Source:** LESSONS-LEARNED-TESTING-DEBUGGING.md
**Status:** ✅ P0 #3 COMPLETE | ⏳ P0 #1-2 PENDING | ⏳ P1 PENDING

---

## P0 CRITICAL (Must Implement)

### ✅ P0.3: Update /validate Command [COMPLETE]

**File:** `~/Documents/Claude Code/.claude/commands/validate.md`

**Changes Made:**

- Added 3 new validation items (8, 9, 10)
- Total checklist items: 7 → 10

**New Items:**

```
[ ] 8. Test Reality Check (tests call production code, not mocks) ⭐ NEW
[ ] 9. Resource Cleanup (all processes killed, files removed) ⭐ NEW
[ ] 10. Debug Logging Removed (no temporary debug code) ⭐ NEW
```

**Impact:**

- Prevents fake tests from passing validation
- Forces cleanup before task completion
- Ensures temporary debug code is removed

**Status:** ✅ COMPLETE (applied globally to ~/Documents/Claude Code/.claude/commands/validate.md)

---

### ⏳ P0.1: Add Resource Cleanup Protocol to bootstrap.md

**File:** `~/Documents/Claude Code/base-rules/bootstrap.md`

**New Section to Add:**

````markdown
## Resource Cleanup Protocol (MANDATORY)

**THE RULE:** All background processes and temporary files MUST be cleaned up before marking any task complete.

### Before Starting Background Processes

1. Check if port/resource already in use
2. Document PID/resource ID in session notes
3. Plan cleanup strategy

### When Starting Background Processes

**ALWAYS capture PID:**

```bash
# For shell scripts
./script.sh &
SCRIPT_PID=$!
echo "Started process: PID $SCRIPT_PID"

# For npm/node
npm run server &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# For Chrome/browser
./launch-chrome.sh
# Script outputs: "Chrome launched (PID: 12345)"
# Record: CHROME_PID=12345
```
````

### After Test/Debug Session (MANDATORY)

**Cleanup checklist:**

- [ ] Kill all processes started (Chrome, server, tests)
- [ ] Verify processes are dead: `ps -p <PID>` returns non-zero
- [ ] Remove temporary files (test-_.js, reload-_.sh, etc.)
- [ ] Kill background shell processes (use KillShell tool)
- [ ] Check for orphaned processes

**Verification commands:**

```bash
# Check for orphaned Chrome/node processes
ps aux | grep -E "(chrome|node.*server)" | grep -v grep

# If any found, kill them or document why they should stay
```

**Automated cleanup (if script exists):**

```bash
./scripts/cleanup-test-session.sh
```

### Enforcement

**This is NOT optional. /validate command REQUIRES:**

- Item 9: All processes killed and verified dead
- Item 10: All temporary files removed
- Item 11: No debug logging left in code

**Validation FAILS if:**

- Any test Chrome instance still running
- Any server process still running
- Any temporary files present (test-\*.js, etc.)
- Debug logging found in code (🔍 DEBUG markers)

````

**Priority:** P0 CRITICAL
**Estimated Time:** 15 minutes
**Location:** Add after "5 NON-NEGOTIABLES" section

---

### ⏳ P0.2: Add Test Reality Check to tier1/testing.md

**File:** `~/Documents/Claude Code/base-rules/tier1/testing.md`

**New Section to Add:**

```markdown
## Test Reality Check (MANDATORY)

**THE PROBLEM:** Tests can use local mocks instead of testing production code, giving false confidence.

**THE RULE:** All tests MUST call actual production code, not local mock implementations.

### After Writing Tests - Verification Required

**Check these 5 items:**
1. [ ] Tests import/require production code files (not define functions locally)
2. [ ] Tests call actual production functions
3. [ ] No local mock implementations in test files
4. [ ] Can trace: test call → production code execution
5. [ ] Verification test exists (if complex)

### How to Verify

**Good test pattern:**
```javascript
// ✅ GOOD: Imports production code
const productionModule = require('../../src/module');

describe('Production function', () => {
  it('should work correctly', () => {
    const result = productionModule.actualFunction(input);
    expect(result).toBe(expected);
  });
});
````

**Bad test pattern (FAKE TEST):**

```javascript
// ❌ BAD: Defines function being tested locally
function localMockFunction(input) {
  // Mock implementation
  return mockResult;
}

describe('Function', () => {
  it('should work', () => {
    const result = localMockFunction(input);
    expect(result).toBe(expected);
    // ❌ This tests the mock, NOT production code!
  });
});
```

### Verification Test Pattern

**For complex implementations, add verification test:**

```javascript
describe('Verification: Production Code Exists', () => {
  it('should verify function exists in production file', () => {
    const fs = require('fs');
    const path = require('path');

    const sourceCode = fs.readFileSync(path.join(__dirname, '../../src/production.js'), 'utf8');

    // Verify function exists
    expect(sourceCode).toContain('function actualFunction(');

    // Verify implementation details
    expect(sourceCode).toContain('expectedImplementationDetail');
  });

  it('should verify production code is actually called', () => {
    const productionModule = require('../../src/production');
    const spy = jest.spyOn(productionModule, 'actualFunction');

    // Run test
    runTestThatShouldCallProduction();

    // Verify real function was called
    expect(spy).toHaveBeenCalled();
  });
});
```

### Red Flags - Fake Tests Detected

**If you see these patterns, tests are FAKE:**

- ❌ Test file defines function being tested
- ❌ Mock implementation in test file (not in **mocks**)
- ❌ No require/import of production code
- ❌ Tests pass even when production code is broken
- ❌ Test creates local copy of production logic

**Example of fake test discovered:**

```javascript
// timeout-wrapper.test.js had this:
async function withTimeout(promise, timeout, operation) {
  // ... 20 lines of local implementation
}

// Tests called this local version, NOT background.js!
// 80% of tests were fake!
```

### Enforcement

**/validate command checks:**

- Item 8: Test Reality Check
- Tests must import production code
- Verification tests exist for complex code
- Can trace test → production

**Validation FAILS if:**

- Tests define functions being tested
- No imports of production code
- Tests can't be traced to production

````

**Priority:** P0 CRITICAL
**Estimated Time:** 20 minutes
**Location:** Add after "Test-First Development" section

---

## P1 HIGH (Should Implement)

### ⏳ P1.1: Create WebSocket Testing Methodology

**File:** `~/Documents/Claude Code/base-rules/tier1/websocket-testing.md` (NEW FILE)

**Full Content:** See LESSONS-LEARNED-TESTING-DEBUGGING.md, section "Add WebSocket Testing Methodology"

**Key Points:**
- Never restart server mid-session
- Always restart both server AND extension/client
- Use debug logging conditionally (DEBUG env var)
- Follow diagnosis tree for connection issues

**Priority:** P1 HIGH
**Estimated Time:** 30 minutes
**Impact:** Prevents broken connections during testing

---

### ⏳ P1.2: Add Investigation Protocol to bootstrap.md

**File:** `~/Documents/Claude Code/base-rules/bootstrap.md`

**New Section to Add:**

```markdown
## Investigation Protocol

**THE RULE:** Before investigating code, check system STATE first.

### Before Deep Diving - Answer These FIRST

**STOP. Do NOT read code yet. Answer these 5 questions:**

1. **What is the symptom?**
   - Exact error message
   - Observed behavior
   - When it occurs

2. **What SHOULD be happening?**
   - Expected behavior
   - Normal operation
   - Success criteria

3. **What resources are involved?**
   - Server (which PID?)
   - Extension/client (running?)
   - Browser (which instance?)
   - Database (connection status?)

4. **What is the STATE of each resource?**
   ```bash
   # Server
   ps aux | grep server
   cat .server-pid

   # Extension
   # Check browser console
   # Check extension service worker

   # Connections
   # Check server logs for connections
````

5. **When did it last work?**
   - Timestamp of last success
   - What changed since then?
   - Code change? Restart? Config change?

### Only AFTER Answering Above

**Now you can:**

- Read code
- Add debug logging
- Create test scripts
- Investigate implementation

### Time Box Investigations

**Set time limits:**

- 10 minutes: State checking (questions above)
- 30 minutes: Initial investigation
- 60 minutes: Deep dive
- If not resolved: Document findings, ask for help

### Avoid Assumption Traps

**Common mistakes:**

```
❌ "Error says X, so X is broken"
✅ "Error says X, but what STATE caused X?"

❌ "This code looks wrong"
✅ "Is this code even being executed?"

❌ "Registration timeout = bug in registration code"
✅ "Registration timeout = why isn't server connected?"
```

### Example: Registration Timeout Investigation

**Wrong approach (90 minutes wasted):**

1. Read registration ACK code
2. Add debug logging to ACK sending
3. Add debug logging to ACK receiving
4. Create test scripts
5. Eventually discover: extension not connected to server

**Right approach (10 minutes):**

1. Is server running? YES (PID 75422)
2. Is extension connected? Check server logs... NO
3. When did extension connect? Last at 19:12 to old server (PID 71941)
4. When did server restart? 19:31 (new PID 75422)
5. **Conclusion: Extension didn't reconnect after server restart**
6. Investigate reconnection logic (the real issue)

### Enforcement

**Use this protocol for:**

- All error investigations
- All "why isn't X working" questions
- All debugging sessions
- Before adding any debug logging

**Skip for:**

- Trivial issues (typo, syntax error)
- Already know root cause
- Reproducing known bug

````

**Priority:** P1 HIGH
**Estimated Time:** 25 minutes
**Location:** Add after "Resource Cleanup Protocol"

---

## Summary Table

| ID | Item | File | Status | Time | Priority |
|----|------|------|--------|------|----------|
| P0.1 | Resource Cleanup Protocol | bootstrap.md | ⏳ Pending | 15min | CRITICAL |
| P0.2 | Test Reality Check | tier1/testing.md | ⏳ Pending | 20min | CRITICAL |
| P0.3 | Update /validate | .claude/commands/validate.md | ✅ Complete | - | CRITICAL |
| P1.1 | WebSocket Testing Methodology | tier1/websocket-testing.md | ⏳ Pending | 30min | HIGH |
| P1.2 | Investigation Protocol | bootstrap.md | ⏳ Pending | 25min | HIGH |

**Total Estimated Time:**
- P0 Remaining: 35 minutes
- P1: 55 minutes
- **Grand Total: 90 minutes**

---

## Implementation Order

**Recommended sequence:**

1. ✅ **DONE:** Update /validate (5min) - Already complete
2. **P0.2:** Add Test Reality Check to testing.md (20min)
3. **P0.1:** Add Resource Cleanup to bootstrap.md (15min)
4. **Test:** Run /validate to verify new items work
5. **P1.2:** Add Investigation Protocol to bootstrap.md (25min)
6. **P1.1:** Create websocket-testing.md (30min)

**Rationale:**
- P0 items first (block quality assurance)
- Test Reality Check before Cleanup (more urgent - fake tests worse than leaks)
- Investigation Protocol helps prevent future issues
- WebSocket testing last (specific use case)

---

## Validation After Implementation

**After implementing P0 items, verify:**

1. Run /validate command:
   - Should show 10 items (not 7)
   - Items 8-10 should be present
   - Checklist includes examples

2. Test cleanup script:
   ```bash
   ./scripts/cleanup-test-session.sh
   # Should detect processes, files, debug logging
````

3. Test fake test detection:
   - Create test file with local mock
   - Run /validate
   - Should fail item 8

---

## Files Created/Modified

**Already Complete:**

1. ✅ `/validate` command updated (global)
2. ✅ `scripts/cleanup-test-session.sh` created
3. ✅ `LESSONS-LEARNED-TESTING-DEBUGGING.md` created
4. ✅ `TO-FIX.md` updated (ISSUE-012 added)
5. ✅ `REGISTRATION-TIMEOUT-DEBUG-FINDINGS.md` created

**Pending:**

1. ⏳ `~/Documents/Claude Code/base-rules/bootstrap.md` (2 sections to add)
2. ⏳ `~/Documents/Claude Code/base-rules/tier1/testing.md` (1 section to add)
3. ⏳ `~/Documents/Claude Code/base-rules/tier1/websocket-testing.md` (new file)

---

## Success Metrics

**After implementation, measure:**

1. **Process Cleanup Compliance**
   - Before: HIGH leak rate (5+ processes per session)
   - Target: 0% leak rate

2. **Fake Test Detection**
   - Before: 80% fake tests (4/5 in timeout-wrapper.test.js)
   - Target: 0% (caught by /validate)

3. **Investigation Efficiency**
   - Before: 90+ minutes to root cause
   - Target: <30 minutes with protocol

4. **Resource Leaks**
   - Before: Multiple Chrome/server instances orphaned
   - Target: All cleaned up automatically

---

**Document Created:** 2025-10-25
**Status:** P0.3 Complete, P0.1-2 and P1 Pending
**Next Action:** Implement P0.2 (Test Reality Check) in testing.md

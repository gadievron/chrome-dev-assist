# /pre-validation-check - Mandatory Pre-Validation Checks

**Run this BEFORE /validate command**

This command performs automated checks that catch common mistakes BEFORE validation.

---

## What This Command Does

```bash
#!/bin/bash
# Automated pre-validation checks

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PRE-VALIDATION CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED=0

# 1. Check for running test processes
echo "1. Checking for running test processes..."
TEST_PROCS=$(ps aux | grep -iE "(npm.*test|jest|chrome.*--test)" | grep -v grep | wc -l)
if [ "$TEST_PROCS" -gt 0 ]; then
  echo "   ❌ FAIL: $TEST_PROCS test process(es) still running"
  ps aux | grep -iE "(npm.*test|jest|chrome.*--test)" | grep -v grep
  FAILED=1
else
  echo "   ✅ PASS: No test processes running"
fi

# 2. Check for WebSocket server
echo ""
echo "2. Checking for WebSocket server..."
if lsof -i :9876 2>/dev/null | grep -q LISTEN; then
  echo "   ⚠️  WARNING: WebSocket server still running on port 9876"
  lsof -i :9876
  echo "   (May be intentional - verify manually)"
else
  echo "   ✅ PASS: No server on port 9876"
fi

# 3. Check for temp test files
echo ""
echo "3. Checking for temporary test files..."
TEMP_FILES=$(find . -maxdepth 1 -name "test-*.js" 2>/dev/null | wc -l)
if [ "$TEMP_FILES" -gt 0 ]; then
  echo "   ❌ FAIL: $TEMP_FILES temporary test file(s) found:"
  find . -maxdepth 1 -name "test-*.js" 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No temporary test files"
fi

# 4. Check for uncommitted changes
echo ""
echo "4. Checking git status..."
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "   ⚠️  WARNING: $UNCOMMITTED uncommitted change(s)"
  git status --short
  echo "   (Expected during development - verify these are intentional)"
else
  echo "   ✅ PASS: No uncommitted changes"
fi

# 5. Check if tests were run recently
echo ""
echo "5. Checking test results..."
if [ -f "npm-debug.log" ] || [ -f ".jest-cache" ]; then
  echo "   ✅ INFO: Test artifacts found (tests were run)"
else
  echo "   ⚠️  WARNING: No test artifacts found"
  echo "   Did you run 'npm test' before validation?"
fi

# 6. Check for debug logging
echo ""
echo "6. Checking for debug markers..."
DEBUG_COUNT=$(grep -r "🔍 DEBUG" extension/ server/ claude-code/ 2>/dev/null | wc -l)
if [ "$DEBUG_COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: $DEBUG_COUNT debug marker(s) found:"
  grep -rn "🔍 DEBUG" extension/ server/ claude-code/ 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No debug markers"
fi

# 7. Check for console.log in production code
echo ""
echo "7. Checking for debug console.log..."
CONSOLE_LOGS=$(grep -rn "console\.log" extension/background.js server/websocket-server.js claude-code/index.js 2>/dev/null | grep -v "^\s*//" | wc -l)
if [ "$CONSOLE_LOGS" -gt 20 ]; then
  echo "   ⚠️  WARNING: $CONSOLE_LOGS console.log statements (review if temporary)"
else
  echo "   ✅ PASS: Console logging reasonable"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 1 ]; then
  echo "❌ PRE-VALIDATION CHECK FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Fix issues above before running /validate"
  exit 1
else
  echo "✅ PRE-VALIDATION CHECK PASSED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Ready to run /validate"
  exit 0
fi
```

---

## When to Use

**MANDATORY:**

- Before running `/validate` command
- Before marking any task complete
- Before creating commits

**Catches:**

1. Running processes not killed
2. Temporary files not cleaned up
3. Debug logging not removed
4. Uncommitted changes (awareness)
5. Tests not run

---

## Expected Output

**Success:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE-VALIDATION CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Checking for running test processes...
   ✅ PASS: No test processes running

2. Checking for WebSocket server...
   ✅ PASS: No server on port 9876

3. Checking for temporary test files...
   ✅ PASS: No temporary test files

4. Checking git status...
   ✅ PASS: No uncommitted changes

5. Checking test results...
   ✅ INFO: Test artifacts found

6. Checking for debug markers...
   ✅ PASS: No debug markers

7. Checking for debug console.log...
   ✅ PASS: Console logging reasonable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PRE-VALIDATION CHECK PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to run /validate
```

**Failure:**

```
❌ FAIL: 2 test process(es) still running
npm         12345  ...  npm test
node        12346  ...  jest

❌ FAIL: 5 temporary test file(s) found:
./test-debug.js
./test-temp.js
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ PRE-VALIDATION CHECK FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix issues above before running /validate
```

---

## Integration with /validate

**New workflow:**

1. Complete work
2. Run `/pre-validation-check` (this command)
3. Fix any failures
4. Run `/validate`
5. Mark task complete

---

## See Also

- `/validate` - Full validation checklist (run AFTER this)
- `scripts/cleanup-test-session.sh` - Automated cleanup
- `.claude/commands/validate.md` - Validation gate

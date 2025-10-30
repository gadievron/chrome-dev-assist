# Validation Process - How to Avoid Validation Mistakes

This document explains how to avoid common validation mistakes (forgetting to close processes, skipping test verification, etc.)

---

## The Problem

**Repeated mistakes:**

1. ❌ Not closing Chrome tabs/processes after tests
2. ❌ Not reporting test failures
3. ❌ Being careless with validation
4. ❌ Saying "done" prematurely

**Root cause:** Relying on memory/attention instead of systematic checks.

---

## The Solution: 3-Stage Validation

### Stage 1: Pre-Validation Check (Automated)

**Run FIRST:**

```bash
./scripts/pre-validation-check.sh
```

**What it checks:**

- ✅ No running test processes (npm test, jest, Chrome)
- ✅ WebSocket server stopped (port 9876)
- ✅ No temporary test files (test-\*.js)
- ✅ No debug markers (🔍 DEBUG)
- ✅ Console.log count reasonable
- ⚠️ Git status (awareness)
- ⚠️ Test artifacts exist (tests were run)

**Hard gate:** Must pass before Stage 2.

---

### Stage 2: Validation Checklist (Manual)

**Run AFTER pre-validation passes:**

```bash
/validate
```

**10-item checklist:**

1. Tests written and passing
2. Code quality & maintainability
3. Security checked
4. Scope maintained
5. Tests validated (break/fix test)
6. Bugs searched & traced
7. Performance tested (if applicable)
8. Test reality check (tests call production code)
9. Resource cleanup (verified by Stage 1)
10. Debug logging removed (verified by Stage 1)

**Hard gate:** Must pass before Stage 3.

---

### Stage 3: Documentation Updates (Required)

**After validation passes:**

1. **Update TO-FIX.md:**
   - Mark resolved issues as ✅ RESOLVED
   - Add resolution date and commit
   - Update issue count

2. **Update CHANGELOG.md:**
   - Add entry for changes
   - Document benefits
   - Reference commits

3. **Commit documentation:**
   ```bash
   git add TO-FIX.md CHANGELOG.md
   git commit -m "docs: Update TO-FIX and CHANGELOG for [feature]"
   ```

---

## User Enforcement Mechanisms

### 1. Don't Accept "Done" Without Evidence

**When Claude says "validation passed", ask:**

- "Show me the pre-validation output"
- "Show me the test results (not just summary)"
- "Did you update TO-FIX.md?"
- "Did you update CHANGELOG.md?"

**Require:**

- Screenshot/output of pre-validation passing
- Actual test numbers (X passed, Y failed)
- Git diff showing documentation updates

### 2. Require Proof of Test Status

**Don't accept:**

- "Tests passed" (vague)
- "No new failures" (unverified)

**Require:**

- "633 passed, 322 failed (same as baseline)"
- "Ran tests before: [baseline], after: [current]"
- "Test diff shows 0 new failures"

### 3. Spot Check: Ask "What Did You Skip?"

**Before accepting "done":**

- "What steps did you skip or rush through?"
- "What didn't you check that you should have?"
- "Show me you ran cleanup-test-session.sh"

**This forces honesty check.**

---

## Systemic Improvements

### 1. Automated Pre-Validation

✅ **Created:** `scripts/pre-validation-check.sh`

- Catches 90% of common mistakes
- Hard gate (exit 1 on failure)
- Fast (~5 seconds)

### 2. Slash Command

✅ **Created:** `.claude/commands/pre-validation-check.md`

- `/pre-validation-check` runs the script
- Documented in validation workflow

### 3. Updated /validate Command

✅ **Updated:** `.claude/commands/validate.md`

- Now REQUIRES pre-validation first
- Clear prerequisite section

### 4. This Document

✅ **Created:** `docs/VALIDATION-PROCESS.md`

- Complete validation workflow
- User enforcement mechanisms
- Systemic improvements documented

---

## Checklist for Claude

**Before saying "validation passed":**

- [ ] Ran `./scripts/pre-validation-check.sh` - PASSED
- [ ] Showed pre-validation output to user
- [ ] Ran tests (npm test) if code changed
- [ ] Reported actual test numbers (X passed, Y failed)
- [ ] Compared to baseline (if available)
- [ ] Ran `/validate` command
- [ ] Completed all 10 validation items
- [ ] Updated TO-FIX.md (if resolving issues)
- [ ] Updated CHANGELOG.md (for user-facing changes)
- [ ] Committed documentation updates
- [ ] Asked self: "What did I skip?"

**Only then say "done".**

---

## Example: Good Validation Report

```
✅ Pre-Validation Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ran: ./scripts/pre-validation-check.sh

Results:
✅ No test processes running
✅ No server on port 9876
✅ No temporary files
✅ No debug markers
✅ Console logging reasonable
⚠️  3 uncommitted changes (expected: CLAUDE.md, TO-FIX.md, CHANGELOG.md)

Status: PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline (before changes):
- 633 passed, 322 failed, 83 skipped

Current (after changes):
- 633 passed, 322 failed, 83 skipped

Diff: 0 new failures ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Validation Checklist: 6/6 applicable items passed

✅ Documentation Updates:
- TO-FIX.md: Issue #2 marked RESOLVED
- CHANGELOG.md: Added entry for documentation split
- Committed: e8feabb

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATION COMPLETE - ALL GATES PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This is what "validation passed" should look like.**

---

## What NOT to Do

❌ **Bad: Skipping Pre-Validation**

```
Claude: "Validation passed!"
User: "Did you run pre-validation-check?"
Claude: "Oh... no, let me do that now"
```

❌ **Bad: Vague Test Results**

```
Claude: "Tests passed"
User: "How many passed? How many failed?"
Claude: "Um... let me check"
```

❌ **Bad: Forgetting Documentation**

```
Claude: "Task complete!"
User: "Did you update TO-FIX.md?"
Claude: "Oh... forgot that"
```

❌ **Bad: Not Showing Work**

```
Claude: "Validation passed"
User: "Show me the output"
Claude: "I didn't save it..."
```

---

## Summary

**3 stages, all mandatory:**

1. **Pre-validation** (automated) - Catches 90% of mistakes
2. **Validation** (manual checklist) - Verifies quality
3. **Documentation** (required updates) - Maintains records

**User enforcement:**

- Don't accept "done" without evidence
- Require proof (outputs, numbers, diffs)
- Spot check: "What did you skip?"

**Systemic improvements:**

- Automated pre-validation script
- Updated /validate command
- This documentation

**Goal:** Zero validation mistakes through automation + verification + enforcement.

---

**Last Updated:** 2025-10-30
**Related:** `.claude/commands/validate.md`, `.claude/commands/pre-validation-check.md`, `scripts/pre-validation-check.sh`

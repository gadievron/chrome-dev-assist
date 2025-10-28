#!/bin/bash
# test-rules-compliance.sh
# Tests rule execution compliance automatically
# Usage: ./test-rules-compliance.sh

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Rule Execution Compliance Test Suite"
printf "Project: %s\n" "$(basename "$PWD")"
printf "Date: %s\n" "$(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Helper functions
pass() {
    printf "✓ PASS - %s\n" "$1"
    ((PASS_COUNT++))
}

fail() {
    printf "✗ FAIL - %s\n" "$1"
    ((FAIL_COUNT++))
}

warn() {
    printf "⚠ WARN - %s\n" "$1"
    ((WARN_COUNT++))
}

info() {
    printf "  ℹ %s\n" "$1"
}

# Test 1: Check for .claude-state directory
echo "[Test 1] Checkpoint System"
if [ -d ".claude-state" ]; then
    pass ".claude-state/ exists"

    # Check for session files
    SESSION_COUNT=$(ls -1 .claude-state/session-*.json 2>/dev/null | wc -l | tr -d ' ')
    if [ "$SESSION_COUNT" -gt 0 ]; then
        info "Session files: $SESSION_COUNT"
    fi

    # Check for checkpoints
    if [ -d ".claude-state/checkpoints" ]; then
        CHECKPOINT_COUNT=$(ls -1 .claude-state/checkpoints/*.json 2>/dev/null | wc -l)
        info "Checkpoints: $CHECKPOINT_COUNT"
    fi

    # Check for resume.md
    if [ -f ".claude-state/resume.md" ]; then
        info "Resume file exists"
    fi
else
    fail ".claude-state/ not found (checkpointing not active)"
fi
echo ""

# Test 2: Check for project name file
echo "[Test 2] Project Name Detection"
if [ -f ".project-name" ]; then
    pass ".project-name exists"
    PROJECT_NAME=$(cat .project-name)
    info "Project name: $PROJECT_NAME"
elif git rev-parse --show-toplevel &>/dev/null; then
    warn ".project-name not found, using git repo name"
    PROJECT_NAME=$(basename "$(git rev-parse --show-toplevel)")
    info "Git-derived name: $PROJECT_NAME"
else
    warn ".project-name not found, using directory name"
    PROJECT_NAME=$(basename "$PWD")
    info "Directory-derived name: $PROJECT_NAME"
fi
echo ""

# Test 3: Check for base rules accessibility
echo "[Test 3] Base Rules Accessibility"
BASE_RULES="$HOME/Documents/Claude Code/base-rules"
if [ -d "$BASE_RULES" ]; then
    pass "Base rules directory found"

    # Count markdown files
    RULE_COUNT=$(ls -1 "$BASE_RULES"/*.md 2>/dev/null | wc -l | tr -d ' ')
    info "Rule files available: $RULE_COUNT"

    # Check for Tier 1 rules
    TIER1_RULES=("CORE_EXECUTION_RULES.md" "PERSONA_REVIEW_RULES.md" "STATE_PRESERVATION_RULES.md" "SECURITY_RULES.md")
    for rule in "${TIER1_RULES[@]}"; do
        if [ -f "$BASE_RULES/$rule" ]; then
            info "✓ $rule"
        else
            warn "✗ $rule missing"
        fi
    done
else
    fail "Base rules not found at $BASE_RULES"
fi
echo ""

# Test 4: Check for CLAUDE.md
echo "[Test 4] Project Configuration"
if [ -f "CLAUDE.md" ]; then
    pass "CLAUDE.md exists"
elif [ -f "$HOME/Documents/Claude Code/CLAUDE.md" ]; then
    pass "Global CLAUDE.md exists"
    warn "No project-specific CLAUDE.md"
else
    fail "CLAUDE.md not found"
fi
echo ""

# Test 5: Git repository status
echo "[Test 5] Git Repository Status"
if git status &>/dev/null; then
    pass "Git repository detected"

    # Check for uncommitted changes
    CHANGED=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGED" -gt 0 ]; then
        info "Uncommitted changes: $CHANGED files"
        git status --short | head -5
        if [ "$CHANGED" -gt 5 ]; then
            info "... and $(($CHANGED - 5)) more files"
        fi
    else
        info "Working tree clean"
    fi

    # Check for .gitignore with .claude-state
    if [ -f ".gitignore" ]; then
        if grep -q "\.claude-state" .gitignore; then
            info "✓ .claude-state in .gitignore"
        else
            warn ".claude-state not in .gitignore"
        fi
    fi
else
    warn "Not a git repository"
fi
echo ""

# Test 6: Check for test directory
echo "[Test 6] Test Infrastructure"
if [ -d "tests" ] || [ -d "test" ] || [ -d "__tests__" ]; then
    pass "Test directory found"

    # Count test files
    TEST_COUNT=$(find . -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l | tr -d ' ')
    info "Test files: $TEST_COUNT"
else
    fail "No test directory found"
fi
echo ""

# Test 7: Check for documentation
echo "[Test 7] Documentation"
if [ -f "README.md" ]; then
    pass "README.md exists"

    # Check README size
    README_LINES=$(wc -l < README.md)
    if [ "$README_LINES" -gt 10 ]; then
        info "README has $README_LINES lines"
    else
        warn "README is very short ($README_LINES lines)"
    fi
else
    warn "README.md not found"
fi
echo ""

# Test 8: Check for common security issues
echo "[Test 8] Security Checks (Basic)"
SECURITY_ISSUES=0

# Check for .env files not in .gitignore
if [ -f ".env" ] && [ -f ".gitignore" ]; then
    if ! grep -q "\.env" .gitignore; then
        warn ".env file exists but not in .gitignore"
        ((SECURITY_ISSUES++))
    fi
fi

# Check for potential secrets in tracked files (basic check)
if git status &>/dev/null; then
    if git grep -i "password\s*=\s*['\"]" 2>/dev/null | grep -v "test" | grep -v "example" > /dev/null; then
        warn "Potential hardcoded passwords found"
        ((SECURITY_ISSUES++))
    fi
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    pass "No obvious security issues detected"
else
    fail "Found $SECURITY_ISSUES potential security issues"
fi
echo ""

# Test 9: Check for package.json or requirements.txt
echo "[Test 9] Dependency Management"
if [ -f "package.json" ]; then
    pass "package.json exists (Node.js project)"
    info "Dependencies managed via npm/yarn"
elif [ -f "requirements.txt" ]; then
    pass "requirements.txt exists (Python project)"
    info "Dependencies managed via pip"
elif [ -f "Cargo.toml" ]; then
    pass "Cargo.toml exists (Rust project)"
    info "Dependencies managed via cargo"
else
    warn "No dependency file found"
fi
echo ""

# Test 10: Check for CI/CD configuration
echo "[Test 10] CI/CD Configuration"
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l | tr -d ' ')
    pass "GitHub Actions configured ($WORKFLOW_COUNT workflows)"
elif [ -f ".gitlab-ci.yml" ]; then
    pass "GitLab CI configured"
elif [ -f ".travis.yml" ]; then
    pass "Travis CI configured"
else
    warn "No CI/CD configuration found"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
printf "✓ Passed: %s\n" "$PASS_COUNT"
printf "✗ Failed: %s\n" "$FAIL_COUNT"
printf "⚠ Warnings: %s\n" "$WARN_COUNT"
echo ""

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASS_COUNT * 100 / TOTAL_TESTS))
    printf "Pass Rate: %s%% (%s / %s)\n" "$PASS_RATE" "$PASS_COUNT" "$TOTAL_TESTS" ($PASS_COUNT / $TOTAL_TESTS)"
else
    echo "Pass Rate: N/A"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Recommendations
if [ $FAIL_COUNT -gt 0 ]; then
    echo "Recommendations to improve compliance:"
    echo ""

    if [ ! -d ".claude-state" ]; then
        echo "• Initialize checkpoint system (.claude-state/)"
    fi

    if [ ! -f ".project-name" ]; then
        echo "• Create .project-name file:"
        echo "  echo \"$PROJECT_NAME\" > .project-name"
    fi

    if [ ! -d "tests" ] && [ ! -d "test" ]; then
        echo "• Create tests/ directory for test-first development"
    fi

    if [ ! -f ".gitignore" ] || ! grep -q "\.claude-state" .gitignore 2>/dev/null; then
        echo "• Add .claude-state/ to .gitignore"
    fi

    echo ""
fi

# Exit code based on critical failures
CRITICAL_FAILURES=0

# Critical: base rules not accessible
if [ ! -d "$BASE_RULES" ]; then
    ((CRITICAL_FAILURES++))
fi

if [ $CRITICAL_FAILURES -gt 0 ]; then
    echo "⚠ CRITICAL: $CRITICAL_FAILURES critical failure(s) detected"
    echo ""
    exit 1
fi

# Exit with warning if there are failures but no critical ones
if [ $FAIL_COUNT -gt 0 ]; then
    exit 2
fi

exit 0

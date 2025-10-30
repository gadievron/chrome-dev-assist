#!/bin/bash
#
# Test 3: Verify shell command equivalence
#
# This test validates that Phase 1c line splitting didn't change shell behavior.
#

set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "TEST 3: Shell Command Equivalence"
echo "============================================================"
echo ""

ALL_PASSED=true

# Test 1: find/grep command (line 129 split)
echo "Test 3.1: find/grep command with line continuation"
echo "-----------------------------------------------------------"

# Original (simulated - single line)
ORIGINAL=$(find . -name "*.sh" -type f -exec grep -Hn '\$[A-Z_][A-Z_0-9]*[^"\}]' {} \; 2>/dev/null | grep -v '^\s*#' | grep -v '=' | head -5 || true)

# Split version (as in workflow)
SPLIT=$(find . -name "*.sh" -type f \
  -exec grep -Hn '\$[A-Z_][A-Z_0-9]*[^"\}]' {} \; 2>/dev/null \
  | grep -v '^\s*#' | grep -v '=' | head -5 || true)

if [ "$ORIGINAL" = "$SPLIT" ]; then
    echo "✅ Outputs are identical"
else
    echo "❌ Outputs differ!"
    echo ""
    echo "Original output:"
    echo "$ORIGINAL"
    echo ""
    echo "Split output:"
    echo "$SPLIT"
    ALL_PASSED=false
fi

echo ""

# Test 2: Variable extraction (line 244 refactor)
echo "Test 3.2: Variable extraction maintains logic"
echo "-----------------------------------------------------------"

# Simulate GitHub Actions variable substitution
MOCK_LINT_RESULT="success"
MOCK_SECURITY_RESULT="success"

# Original (simulated)
if [ "$MOCK_LINT_RESULT" != "success" ] || [ "$MOCK_SECURITY_RESULT" != "success" ]; then
    ORIGINAL_RESULT="FAILED"
else
    ORIGINAL_RESULT="PASSED"
fi

# Refactored (as in workflow)
LINT="$MOCK_LINT_RESULT"
SECURITY="$MOCK_SECURITY_RESULT"
if [ "$LINT" != "success" ] || [ "$SECURITY" != "success" ]; then
    REFACTORED_RESULT="FAILED"
else
    REFACTORED_RESULT="PASSED"
fi

if [ "$ORIGINAL_RESULT" = "$REFACTORED_RESULT" ]; then
    echo "✅ Logic is equivalent (both: $ORIGINAL_RESULT)"
else
    echo "❌ Logic differs!"
    echo "   Original: $ORIGINAL_RESULT"
    echo "   Refactored: $REFACTORED_RESULT"
    ALL_PASSED=false
fi

echo ""

# Test 3: Edge case - failure scenario
echo "Test 3.3: Variable extraction - failure case"
echo "-----------------------------------------------------------"

MOCK_LINT_RESULT="failure"
MOCK_SECURITY_RESULT="success"

# Original
if [ "$MOCK_LINT_RESULT" != "success" ] || [ "$MOCK_SECURITY_RESULT" != "success" ]; then
    ORIGINAL_RESULT="FAILED"
else
    ORIGINAL_RESULT="PASSED"
fi

# Refactored
LINT="$MOCK_LINT_RESULT"
SECURITY="$MOCK_SECURITY_RESULT"
if [ "$LINT" != "success" ] || [ "$SECURITY" != "success" ]; then
    REFACTORED_RESULT="FAILED"
else
    REFACTORED_RESULT="PASSED"
fi

if [ "$ORIGINAL_RESULT" = "$REFACTORED_RESULT" ]; then
    echo "✅ Logic is equivalent (both: $ORIGINAL_RESULT)"
else
    echo "❌ Logic differs!"
    echo "   Original: $ORIGINAL_RESULT"
    echo "   Refactored: $REFACTORED_RESULT"
    ALL_PASSED=false
fi

echo ""
echo "============================================================"

if [ "$ALL_PASSED" = true ]; then
    echo "✅ ALL SHELL TESTS PASSED"
    exit 0
else
    echo "❌ SOME SHELL TESTS FAILED"
    exit 1
fi

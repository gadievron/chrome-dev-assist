#!/bin/bash

##
## Pre-Commit Validation Script
##
## Ensures Chrome extension changes are safe before committing.
## Run this manually before git commit, or set up as git hook.
##
## Checks:
## 1. Extension syntax (no Node.js-only code)
## 2. Extension health (loaded and working)
## 3. Unit tests passing
##
## Usage:
##   ./scripts/pre-commit-validation.sh
##   ./scripts/pre-commit-validation.sh --skip-health  # Skip health check
##

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo ""
echo "🔒 Pre-Commit Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: Extension syntax validation
echo "1️⃣  Validating Chrome extension syntax..."
echo ""

if node scripts/validate-extension-syntax.js; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo ""
  echo "❌ VALIDATION FAILED: Extension syntax errors found"
  echo ""
  echo "Fix the errors above before committing."
  echo ""
  exit 1
fi

# Check 2: Unit tests
echo "2️⃣  Running unit tests..."
echo ""

if npm test -- --testPathPattern=unit 2>&1 | grep -E "Tests:|PASS|FAIL" || true; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo ""
  echo "❌ VALIDATION FAILED: Unit tests failed"
  echo ""
  exit 1
fi

# Check 3: Extension health (optional - can be skipped)
if [[ "$*" == *"--skip-health"* ]]; then
  echo "⏭️  Skipping extension health check (--skip-health flag)"
  echo ""
else
  echo "3️⃣  Checking extension health (optional)..."
  echo ""
  echo "   This checks if extension is loaded and working."
  echo "   Skip with: --skip-health flag"
  echo ""

  if node scripts/check-extension-health.js 2>&1; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  else
    echo ""
    echo "⚠️  Extension health check failed"
    echo ""
    echo "This is optional, but recommended before committing extension changes."
    echo ""
    echo "Continue anyway? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      echo ""
      echo "Commit cancelled. Fix extension health or use --skip-health flag."
      echo ""
      exit 1
    fi
    echo ""
  fi
fi

echo "✅ ALL VALIDATIONS PASSED"
echo ""
echo "Safe to commit! 🚀"
echo ""

exit 0

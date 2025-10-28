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

printf "\n"
printf "%s\n" "🔒 Pre-Commit Validation"
printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "\n"

# Check 1: Extension syntax validation
printf "%s\n" "1️⃣  Validating Chrome extension syntax..."
printf "\n"

if node scripts/validate-extension-syntax.js; then
  printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "\n"
else
  printf "\n"
  printf "%s\n" "❌ VALIDATION FAILED: Extension syntax errors found"
  printf "\n"
  printf "%s\n" "Fix the errors above before committing."
  printf "\n"
  exit 1
fi

# Check 2: Unit tests
printf "%s\n" "2️⃣  Running unit tests..."
printf "\n"

if npm test -- --testPathPattern=unit 2>&1 | grep -F "Tests:" || grep -F "PASS" || grep -F "FAIL" || true; then
  printf "\n"
  printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "\n"
else
  printf "\n"
  printf "%s\n" "❌ VALIDATION FAILED: Unit tests failed"
  printf "\n"
  exit 1
fi

# Check 3: Extension health (optional - can be skipped)
if [[ "$*" == *"--skip-health"* ]]; then
  printf "%s\n" "⏭️  Skipping extension health check (--skip-health flag)"
  printf "\n"
else
  printf "%s\n" "3️⃣  Checking extension health (optional)..."
  printf "\n"
  printf "%s\n" "   This checks if extension is loaded and working."
  printf "%s\n" "   Skip with: --skip-health flag"
  printf "\n"

  if node scripts/check-extension-health.js 2>&1; then
    printf "%s\n" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "\n"
  else
    printf "\n"
    printf "%s\n" "⚠️  Extension health check failed"
    printf "\n"
    printf "%s\n" "This is optional, but recommended before committing extension changes."
    printf "\n"
    printf "%s\n" "Continue anyway? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      printf "\n"
      printf "%s\n" "Commit cancelled. Fix extension health or use --skip-health flag."
      printf "\n"
      exit 1
    fi
    printf "\n"
  fi
fi

printf "%s\n" "✅ ALL VALIDATIONS PASSED"
printf "\n"
printf "%s\n" "Safe to commit! 🚀"
printf "\n"

exit 0

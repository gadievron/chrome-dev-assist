#!/usr/bin/env node

/**
 * Validate Chrome Extension Syntax
 *
 * Detects Node.js-only syntax in Chrome extension files that would
 * cause runtime failures.
 *
 * Catches:
 * - require() calls (Node.js only)
 * - module.exports (Node.js only)
 * - process.env (Node.js only)
 * - __dirname, __filename (Node.js only)
 *
 * Run: node scripts/validate-extension-syntax.js
 */

const fs = require('fs');
const path = require('path');

const EXTENSION_DIR = path.join(__dirname, '../extension');
const EXCLUDE_DIRS = ['node_modules', 'lib'];

// Patterns that indicate Node.js-only syntax
const FORBIDDEN_PATTERNS = [
  {
    pattern: /\brequire\s*\(/g,
    message: 'require() is Node.js only - use importScripts() in Chrome extensions',
    severity: 'ERROR',
    exception: /if\s*\(typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\)/  // Allow conditional exports
  },
  {
    pattern: /\bmodule\.exports\s*=/g,
    message: 'module.exports is Node.js only - Chrome extensions use global scope',
    severity: 'WARNING',
    exception: /if\s*\(typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\)/  // Allow conditional exports
  },
  {
    pattern: /\bprocess\.env\b/g,
    message: 'process.env is Node.js only - not available in Chrome extensions',
    severity: 'ERROR'
  },
  {
    pattern: /\b__dirname\b/g,
    message: '__dirname is Node.js only - not available in Chrome extensions',
    severity: 'ERROR'
  },
  {
    pattern: /\b__filename\b/g,
    message: '__filename is Node.js only - not available in Chrome extensions',
    severity: 'ERROR'
  }
];

// Scan a file for forbidden patterns
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  const issues = [];

  for (const check of FORBIDDEN_PATTERNS) {
    const matches = content.matchAll(check.pattern);

    for (const match of matches) {
      // Check if this is an allowed exception
      if (check.exception) {
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(content.length, match.index + 100);
        const context = content.slice(contextStart, contextEnd);

        if (check.exception.test(context)) {
          continue; // Skip this match, it's allowed
        }
      }

      // Find line number
      const lines = content.slice(0, match.index).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;

      issues.push({
        file: relativePath,
        line: lineNumber,
        column: columnNumber,
        severity: check.severity,
        pattern: match[0],
        message: check.message
      });
    }
  }

  return issues;
}

// Recursively scan directory
function scanDirectory(dir) {
  const issues = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        issues.push(...scanDirectory(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      issues.push(...scanFile(fullPath));
    }
  }

  return issues;
}

// Main
function main() {
  console.log('🔍 Validating Chrome Extension Syntax...\n');
  console.log(`Scanning: ${EXTENSION_DIR}\n`);

  const issues = scanDirectory(EXTENSION_DIR);

  if (issues.length === 0) {
    console.log('✅ No syntax issues found!\n');
    console.log('All Chrome extension files use browser-compatible syntax.\n');
    process.exit(0);
  }

  // Group by severity
  const errors = issues.filter(i => i.severity === 'ERROR');
  const warnings = issues.filter(i => i.severity === 'WARNING');

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} ERROR(S):\n`);
    errors.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}:${issue.column}`);
      console.log(`    Pattern: ${issue.pattern}`);
      console.log(`    Issue: ${issue.message}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} WARNING(S):\n`);
    warnings.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}:${issue.column}`);
      console.log(`    Pattern: ${issue.pattern}`);
      console.log(`    Issue: ${issue.message}\n`);
    });
  }

  console.log('\n💡 TIP: Run this script before loading extension in Chrome.\n');

  // Exit with error code if any errors found
  process.exit(errors.length > 0 ? 1 : 0);
}

main();

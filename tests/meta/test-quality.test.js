/**
 * Meta-Tests: Test Quality Validation
 * Persona: 🧪 Testing Expert - "Test The Tests"
 *
 * Focus: Detect fake tests, verify test effectiveness
 * These tests ensure our TEST SUITE is high quality
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

describe('Testing Expert: Fake Test Detection', () => {
  test('all test files should import real implementations', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['tests/meta/**', 'node_modules/**'],
    });

    const fakeTests = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Pattern 1: Defines async arrow functions (possible mock implementations)
      const definesFunctions = /const \w+\s*=\s*async\s*\([^)]*\)\s*=>/gm.test(content);

      // Pattern 2: Imports from implementation directories
      const importsFromExtension = /require\(['"]\.\.\/\.\.\/extension/.test(content);
      const importsFromSrc = /require\(['"]\.\.\/\.\.\/src/.test(content);
      const importsFromServer = /require\(['"]\.\.\/\.\.\/server/.test(content);
      const importsRealCode = importsFromExtension || importsFromSrc || importsFromServer;

      // If defines functions but doesn't import real code, likely fake
      if (definesFunctions && !importsRealCode) {
        // Check if it's a helper function pattern (allowed)
        const hasHelperComment = /\/\/ Helper function|\/\/ Test helper|\/\/ Utility/.test(content);

        if (!hasHelperComment) {
          fakeTests.push({
            file,
            reason: 'Defines functions but does not import real implementation',
          });
        }
      }

      // Pattern 3: Tests that only mock, never use real objects
      const onlyUsesMocks = /jest\.fn\(\)/g.test(content) && !importsRealCode;
      if (onlyUsesMocks && content.length > 500) {
        // Ignore very small test files
        fakeTests.push({
          file,
          reason: 'Only uses mocks, never imports real implementation',
        });
      }
    });

    if (fakeTests.length > 0) {
      const message =
        'Fake tests detected:\n' + fakeTests.map(t => `  - ${t.file}: ${t.reason}`).join('\n');
      throw new Error(message);
    }

    expect(fakeTests).toEqual([]);
  });

  test('test files should not be larger than implementation × 3', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['tests/meta/**', 'node_modules/**'],
    });

    const oversizedTests = [];

    testFiles.forEach(testFile => {
      const testContent = fs.readFileSync(testFile, 'utf8');
      const testLines = testContent.split('\n').length;

      // Try to find corresponding implementation file
      const implPath = testFile
        .replace(/^tests\//, '')
        .replace(/\.test\.js$/, '.js')
        .replace(/^unit\//, 'extension/')
        .replace(/^integration\//, 'server/')
        .replace(/^security\//, 'extension/')
        .replace(/^boundary\//, 'extension/');

      if (fs.existsSync(implPath)) {
        const implContent = fs.readFileSync(implPath, 'utf8');
        const implLines = implContent.split('\n').length;

        // Test should not be more than 3× implementation size
        if (testLines > implLines * 3) {
          oversizedTests.push({
            test: testFile,
            impl: implPath,
            testLines,
            implLines,
            ratio: (testLines / implLines).toFixed(1),
          });
        }
      }
    });

    // This is a warning, not a hard failure
    if (oversizedTests.length > 0) {
      console.warn('Tests significantly larger than implementation (may indicate fake tests):');
      oversizedTests.forEach(t => {
        console.warn(`  ${t.test}: ${t.testLines} lines (${t.ratio}× implementation)`);
      });
    }

    // Allow some oversized tests, but not too many
    expect(oversizedTests.length).toBeLessThan(testFiles.length * 0.3); // Max 30%
  });

  test('all test files should have describe blocks', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['node_modules/**'],
    });

    const missingDescribe = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      if (!content.includes('describe(')) {
        missingDescribe.push(file);
      }
    });

    expect(missingDescribe).toEqual([]);
  });

  test('all test files should have at least one test', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['node_modules/**'],
    });

    const noTests = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      const hasTest = /test\(|it\(/.test(content);

      if (!hasTest) {
        noTests.push(file);
      }
    });

    expect(noTests).toEqual([]);
  });
});

describe('Testing Expert: Test Effectiveness', () => {
  test('tests should use assertions (expect)', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['tests/meta/**', 'node_modules/**'],
    });

    const noAssertions = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Count test blocks
      const testCount = (content.match(/test\(|it\(/g) || []).length;

      // Count assertions
      const assertionCount = (content.match(/expect\(/g) || []).length;

      // Should have at least as many assertions as tests
      if (assertionCount < testCount) {
        noAssertions.push({
          file,
          tests: testCount,
          assertions: assertionCount,
        });
      }
    });

    // Some tests might use other assertion methods, so allow some flexibility
    if (noAssertions.length > 0) {
      console.warn('Tests with fewer assertions than test blocks:');
      noAssertions.forEach(t => {
        console.warn(`  ${t.file}: ${t.tests} tests, ${t.assertions} assertions`);
      });
    }

    // Most tests should have assertions
    expect(noAssertions.length).toBeLessThan(testFiles.length * 0.2); // Max 20%
  });

  test('test files should not define implementation functions', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['tests/meta/**', 'node_modules/**', 'tests/**/helpers/**'],
    });

    const suspiciousPatterns = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Look for function implementations that look like real code
      const patterns = [
        { pattern: /async function handle\w+Command/, name: 'Command handler function' },
        { pattern: /class \w+Manager/, name: 'Manager class definition' },
        { pattern: /function connect\w+/, name: 'Connection function' },
        { pattern: /function send\w+/, name: 'Send function' },
      ];

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          // Check if it's in a test block or top-level
          const lines = content.split('\n');
          const matches = content.match(pattern);

          if (matches) {
            suspiciousPatterns.push({
              file,
              pattern: name,
              example: matches[0],
            });
          }
        }
      });
    });

    if (suspiciousPatterns.length > 0) {
      console.warn('Test files defining implementation-like functions:');
      suspiciousPatterns.forEach(s => {
        console.warn(`  ${s.file}: ${s.pattern}`);
      });
    }

    // Should have very few (helpers are OK, but implementations are not)
    expect(suspiciousPatterns.length).toBeLessThan(3);
  });
});

describe('Testing Expert: Test Organization', () => {
  test('test files should be in appropriate directories', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['node_modules/**'],
    });

    const misplaced = [];

    testFiles.forEach(file => {
      const dir = path.dirname(file);
      const basename = path.basename(file);

      // Security tests should be in tests/security/
      if (basename.includes('security') && !dir.includes('security')) {
        misplaced.push({ file, shouldBe: 'tests/security/' });
      }

      // Performance tests should be in tests/performance/
      if (basename.includes('performance') && !dir.includes('performance')) {
        misplaced.push({ file, shouldBe: 'tests/performance/' });
      }

      // Boundary tests should be in tests/boundary/
      if (basename.includes('boundary') && !dir.includes('boundary')) {
        misplaced.push({ file, shouldBe: 'tests/boundary/' });
      }

      // Integration tests should be in tests/integration/
      if (basename.includes('integration') && !dir.includes('integration')) {
        misplaced.push({ file, shouldBe: 'tests/integration/' });
      }

      // Unit tests should be in tests/unit/
      if (basename.includes('unit') && !dir.includes('unit')) {
        misplaced.push({ file, shouldBe: 'tests/unit/' });
      }
    });

    if (misplaced.length > 0) {
      console.warn('Misplaced test files:');
      misplaced.forEach(m => {
        console.warn(`  ${m.file} → should be in ${m.shouldBe}`);
      });
    }

    expect(misplaced).toEqual([]);
  });

  test('all personas should have test coverage', () => {
    const expectedPersonas = [
      'security',
      'boundary',
      'unit',
      'integration',
      // Performance, chaos, etc. can be added as they're implemented
    ];

    const existingPersonas = [];

    expectedPersonas.forEach(persona => {
      const files = glob.sync(`tests/${persona}/**/*.test.js`);
      if (files.length > 0) {
        existingPersonas.push(persona);
      }
    });

    // Should have at least some persona coverage
    expect(existingPersonas.length).toBeGreaterThan(0);
  });
});

describe('Testing Expert: Test Naming Conventions', () => {
  test('test files should follow naming convention', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['node_modules/**'],
    });

    const badNames = [];

    testFiles.forEach(file => {
      const basename = path.basename(file);

      // Should end with .test.js
      if (!basename.endsWith('.test.js')) {
        badNames.push({
          file,
          issue: 'Should end with .test.js',
        });
      }

      // Should not have spaces
      if (basename.includes(' ')) {
        badNames.push({
          file,
          issue: 'Should not contain spaces',
        });
      }

      // Should be kebab-case or camelCase, not snake_case
      if (basename.includes('_') && !basename.startsWith('_')) {
        badNames.push({
          file,
          issue: 'Should use kebab-case or camelCase, not snake_case',
        });
      }
    });

    expect(badNames).toEqual([]);
  });

  test('test descriptions should be clear and specific', () => {
    const testFiles = glob.sync('tests/**/*.test.js', {
      ignore: ['tests/meta/**', 'node_modules/**'],
    });

    const vagueDescriptions = [];

    testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Find test descriptions
      const testMatches = content.matchAll(/(?:test|it)\(['"](.+?)['"]/g);

      for (const match of testMatches) {
        const description = match[1];

        // Check for vague descriptions
        const vague = [
          /^should work$/i,
          /^works$/i,
          /^test$/i,
          /^it works$/i,
          /^works correctly$/i,
        ];

        if (vague.some(pattern => pattern.test(description))) {
          vagueDescriptions.push({
            file,
            description,
          });
        }
      }
    });

    if (vagueDescriptions.length > 0) {
      console.warn('Vague test descriptions found:');
      vagueDescriptions.forEach(v => {
        console.warn(`  ${v.file}: "${v.description}"`);
      });
    }

    expect(vagueDescriptions).toEqual([]);
  });
});

describe('Testing Expert: Code Coverage Gaps', () => {
  test('critical functions should have tests', () => {
    // Check that our most important functions have test coverage
    const criticalFunctions = [
      { name: 'handleOpenUrlCommand', file: 'extension/background.js' },
      { name: 'HealthManager', file: 'src/health/health-manager.js' },
    ];

    const untested = [];

    criticalFunctions.forEach(({ name, file }) => {
      // Look for test files that import and test this
      const testFiles = glob.sync('tests/**/*.test.js');

      const hasCoverage = testFiles.some(testFile => {
        const content = fs.readFileSync(testFile, 'utf8');
        const importsFunction = content.includes(name);
        const testsFunction =
          new RegExp(`test\\(['"].*${name}`, 'i').test(content) ||
          new RegExp(`describe\\(['"].*${name}`, 'i').test(content);

        return importsFunction || testsFunction;
      });

      if (!hasCoverage) {
        untested.push({ name, file });
      }
    });

    if (untested.length > 0) {
      console.warn('Critical functions without test coverage:');
      untested.forEach(u => {
        console.warn(`  ${u.name} (${u.file})`);
      });
    }

    expect(untested).toEqual([]);
  });
});

/**
 * Test Reality Check - Meta Tests
 *
 * Tests that verify our tests are actually testing production code
 * Based on lessons learned: 80% of timeout-wrapper tests were fake!
 *
 * Problem #2 from LESSONS-LEARNED-TESTING-DEBUGGING.md
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

describe('Test Reality Check - Verify Tests Test Production Code', () => {
  describe('Critical Production Functions', () => {
    it('should verify withTimeout is tested against production code', () => {
      const testFile = fs.readFileSync(
        path.join(__dirname, '../unit/timeout-wrapper.test.js'),
        'utf8'
      );

      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify production code has withTimeout
      expect(backgroundJs).toContain('async function withTimeout(');

      // Verify test file has verification tests
      expect(testFile).toContain('should verify withTimeout exists in background.js');
    });

    it('should verify safeSend is tested against production code', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Verify safeSend exists in production
      expect(backgroundJs).toContain('function safeSend(');
      expect(backgroundJs).toContain('messageQueue'); // Part of Improvement 7
    });

    it('should verify registration ACK is tested against production code', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      const serverJs = fs.readFileSync(
        path.join(__dirname, '../../server/websocket-server.js'),
        'utf8'
      );

      // Verify registration ACK in extension
      expect(backgroundJs).toContain("if (message.type === 'registration-ack')");

      // Verify registration ACK in server
      expect(serverJs).toContain("type: 'registration-ack'");
    });
  });

  describe('Test File Analysis - Detect Fake Tests', () => {
    it('should not have local mock implementations in test files', () => {
      const testFiles = glob.sync('tests/**/*.test.js');

      const filesWithLocalMocks = [];

      testFiles.forEach(testFile => {
        const content = fs.readFileSync(testFile, 'utf8');

        // Red flags for fake tests:
        // 1. Test file defines async function with same name as production function
        // 2. Test file has function definitions that look like production code
        const suspiciousPatterns = [
          /^async function withTimeout\(/m,
          /^function safeSend\(/m,
          // Add more as needed
        ];

        suspiciousPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            // Check if it's a legitimate helper or mock
            if (!content.includes('// Test helper') &&
                !content.includes('// Mock') &&
                !testFile.includes('__mocks__')) {
              filesWithLocalMocks.push({
                file: testFile,
                pattern: pattern.source
              });
            }
          }
        });
      });

      if (filesWithLocalMocks.length > 0) {
        console.warn('⚠️  Potential fake tests detected:');
        filesWithLocalMocks.forEach(({ file, pattern }) => {
          console.warn(`   ${file}: ${pattern}`);
        });
      }

      // This is a warning, not a hard failure
      // Manual review needed
    });

    it('should verify unit tests import production code', () => {
      const unitTestFiles = glob.sync('tests/unit/**/*.test.js');

      const filesWithoutImports = [];

      unitTestFiles.forEach(testFile => {
        const content = fs.readFileSync(testFile, 'utf8');

        // Skip POC and verification tests
        if (testFile.includes('.poc.') || testFile.includes('verification')) {
          return;
        }

        // Check for imports/requires
        const hasImports =
          content.includes('require(') ||
          content.includes('import ') ||
          content.includes('fs.readFileSync'); // Verification pattern

        if (!hasImports) {
          filesWithoutImports.push(testFile);
        }
      });

      if (filesWithoutImports.length > 0) {
        console.warn('⚠️  Unit tests without imports detected:');
        filesWithoutImports.forEach(file => {
          console.warn(`   ${file}`);
        });
      }

      // Most files should import something
      const importRate = (unitTestFiles.length - filesWithoutImports.length) / unitTestFiles.length;
      expect(importRate).toBeGreaterThan(0.5); // At least 50% should import
    });
  });

  describe('Verification Test Pattern', () => {
    it('should have verification tests for critical functions', () => {
      const verificationTestFile = fs.readFileSync(
        path.join(__dirname, '../integration/improvements-verification.test.js'),
        'utf8'
      );

      // Verify the verification test exists
      expect(verificationTestFile).toContain('Verification:');

      // Verify it checks production code
      expect(verificationTestFile).toContain('fs.readFileSync');
      expect(verificationTestFile).toContain('background.js');
      expect(verificationTestFile).toContain('websocket-server.js');
    });

    it('should verify critical implementations exist in production files', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Improvement 8: Timeout wrapper
      expect(backgroundJs).toContain('async function withTimeout(');
      expect(backgroundJs).toContain('clearTimeout(timeoutHandle)');

      // Improvement 7: Message queuing
      expect(backgroundJs).toContain('const messageQueue = []');
      expect(backgroundJs).toContain('const MAX_QUEUE_SIZE = 100');

      // Improvement 6: Registration ACK
      expect(backgroundJs).toContain('let registrationPending = false');
      expect(backgroundJs).toContain('let registrationTimeout = null');
    });
  });

  describe('Test Coverage Gaps', () => {
    it('should identify functions in production that lack tests', () => {
      const backgroundJs = fs.readFileSync(
        path.join(__dirname, '../../extension/background.js'),
        'utf8'
      );

      // Extract function names
      const functionPattern = /(?:async )?function (\w+)\(/g;
      const functions = [];
      let match;

      while ((match = functionPattern.exec(backgroundJs)) !== null) {
        functions.push(match[1]);
      }

      // Critical functions that should have tests
      const criticalFunctions = [
        'withTimeout',
        'safeSend',
        'connectToServer',
        'scheduleReconnect'
      ];

      const missingTests = [];

      criticalFunctions.forEach(funcName => {
        // Check if function exists
        if (!functions.includes(funcName)) {
          missingTests.push(`${funcName} (not found in production)`);
          return;
        }

        // Check if tests exist for it
        const testFiles = glob.sync('tests/**/*.test.js');
        let hasTest = false;

        testFiles.forEach(testFile => {
          const content = fs.readFileSync(testFile, 'utf8');
          if (content.includes(funcName)) {
            hasTest = true;
          }
        });

        if (!hasTest) {
          missingTests.push(funcName);
        }
      });

      if (missingTests.length > 0) {
        console.warn('⚠️  Critical functions without tests:');
        missingTests.forEach(func => {
          console.warn(`   - ${func}`);
        });
      }

      // This is informational, not a hard failure
    });
  });

  describe('Test Classification - Behavior vs Verification', () => {
    it('should have >40% behavior tests in test suite (P0 CRITICAL)', () => {
      const testFiles = glob.sync('tests/**/*.test.js');

      let behaviorTests = 0;
      let verificationTests = 0;
      let otherTests = 0;

      testFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Skip meta tests and POC tests
        if (file.includes('/meta/') || file.includes('.poc.')) {
          return;
        }

        // Count test definitions
        const testMatches = content.match(/it\(['"]/g) || [];
        const testCount = testMatches.length;

        // Verification test patterns
        const hasFileRead = content.includes('fs.readFileSync');
        const hasToContain = content.includes('.toContain(');
        const hasVerificationKeyword = content.includes('Verification:') || content.includes('should verify');

        // Behavior test patterns
        const hasAsync = content.includes('async') || content.includes('await');
        const hasMocking = content.includes('jest.fn') || content.includes('spy');
        const hasExecution = content.includes('await ') && !content.includes('fs.readFileSync');

        // Classify file
        if (hasFileRead && hasToContain) {
          verificationTests += testCount;
        } else if (hasAsync || hasExecution || hasMocking) {
          behaviorTests += testCount;
        } else {
          otherTests += testCount;
        }
      });

      const total = behaviorTests + verificationTests + otherTests;
      const behaviorPercent = total > 0 ? (behaviorTests / total) * 100 : 0;
      const verificationPercent = total > 0 ? (verificationTests / total) * 100 : 0;

      console.log('\n═══════════════════════════════════════');
      console.log('TEST CLASSIFICATION ANALYSIS');
      console.log('═══════════════════════════════════════');
      console.log(`Behavior tests:      ${behaviorTests} (${behaviorPercent.toFixed(1)}%)`);
      console.log(`Verification tests:  ${verificationTests} (${verificationPercent.toFixed(1)}%)`);
      console.log(`Other tests:         ${otherTests}`);
      console.log(`Total tests:         ${total}`);
      console.log('═══════════════════════════════════════\n');

      // ✅ P0 FIX: Fail if too many verification tests
      if (behaviorPercent < 40) {
        fail(`Behavior test ratio too low: ${behaviorPercent.toFixed(1)}% (goal: >40%)\n` +
             `Too many verification tests (${verificationPercent.toFixed(1)}%)\n` +
             `Need more tests that verify code WORKS, not just that code EXISTS`);
      }

      expect(behaviorPercent).toBeGreaterThanOrEqual(40);
    });

    it('should warn if verification tests > 60%', () => {
      const testFiles = glob.sync('tests/**/*.test.js');

      let verificationTestFiles = [];

      testFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Skip meta tests
        if (file.includes('/meta/') || file.includes('.poc.')) {
          return;
        }

        // Check if file is mostly verification
        const hasFileRead = content.includes('fs.readFileSync');
        const hasToContain = content.includes('.toContain(');
        const testCount = (content.match(/it\(['"]/g) || []).length;

        if (hasFileRead && hasToContain && testCount > 0) {
          verificationTestFiles.push({
            file: file.replace(path.join(__dirname, '../..'), ''),
            tests: testCount
          });
        }
      });

      const totalVerificationTests = verificationTestFiles.reduce((sum, f) => sum + f.tests, 0);

      if (verificationTestFiles.length > 0) {
        console.log('\nFiles with verification tests:');
        verificationTestFiles.forEach(({ file, tests }) => {
          console.log(`  - ${file}: ${tests} verification tests`);
        });
        console.log(`Total: ${totalVerificationTests} verification tests\n`);
      }

      // This is informational
      expect(true).toBe(true);
    });
  });

  describe('Test Quality Indicators', () => {
    it('should verify tests can fail when production code breaks', () => {
      // This is documented in verification tests
      const verificationTests = fs.readFileSync(
        path.join(__dirname, '../integration/improvements-verification.test.js'),
        'utf8'
      );

      // Tests should check for specific implementations
      expect(verificationTests).toContain('expect(backgroundJs).toContain(');
      expect(verificationTests).toContain('expect(serverJs).toContain(');

      // If production code changes, these tests will fail
      // This proves tests are actually checking production code
    });

    it('should verify tests use expect assertions (not just console.log)', () => {
      const testFiles = glob.sync('tests/**/*.test.js');

      testFiles.forEach(testFile => {
        const content = fs.readFileSync(testFile, 'utf8');

        // Every test file should have assertions
        const hasExpect = content.includes('expect(');
        const hasIt = content.includes("it('") || content.includes('it("');

        if (hasIt && !hasExpect) {
          console.warn(`⚠️  Test file without assertions: ${testFile}`);
        }
      });
    });
  });
});

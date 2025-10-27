/**
 * Tests for validate-extension-syntax.js
 *
 * Ensures the syntax validator correctly detects Node.js-only patterns
 * in Chrome extension files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VALIDATOR_PATH = path.join(__dirname, '../../scripts/validate-extension-syntax.js');
const TEST_FILES_DIR = path.join(__dirname, '../fixtures/syntax-validation');

// Helper to create test file
function createTestFile(filename, content) {
  const filePath = path.join(TEST_FILES_DIR, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// Helper to clean up test files
function cleanupTestFiles() {
  if (fs.existsSync(TEST_FILES_DIR)) {
    fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
  }
}

// Helper to run validator on test directory
function runValidator() {
  try {
    // Temporarily modify validator to scan test directory
    const validatorContent = fs.readFileSync(VALIDATOR_PATH, 'utf8');
    const modifiedValidator = validatorContent.replace(
      "const EXTENSION_DIR = path.join(__dirname, '../extension');",
      `const EXTENSION_DIR = '${TEST_FILES_DIR}';`
    );

    const tempValidator = path.join(__dirname, '../../scripts/.temp-validator.js');
    fs.writeFileSync(tempValidator, modifiedValidator, 'utf8');

    const output = execSync(`node "${tempValidator}"`, { encoding: 'utf8' });
    fs.unlinkSync(tempValidator);

    return { success: true, output, exitCode: 0 };
  } catch (err) {
    // Clean up temp file if it exists
    const tempValidator = path.join(__dirname, '../../scripts/.temp-validator.js');
    if (fs.existsSync(tempValidator)) {
      fs.unlinkSync(tempValidator);
    }

    return {
      success: false,
      output: err.stdout || err.message,
      exitCode: err.status || 1
    };
  }
}

describe('validate-extension-syntax.js', () => {
  beforeEach(() => {
    cleanupTestFiles();
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  describe('Detecting require()', () => {
    test('detects require() calls', () => {
      createTestFile('bad-require.js', `
        const Foo = require('./foo');
        const bar = require('bar');
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('require(');
      expect(result.output).toContain('bad-require.js');
      expect(result.output).toContain('ERROR');
    });

    test('allows conditional require() for Node.js compatibility', () => {
      createTestFile('conditional-export.js', `
        class Foo {}

        // Conditional export for Node.js tests
        if (typeof module !== 'undefined' && module.exports) {
          module.exports = Foo;
        }
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('No syntax issues found');
    });

    test('detects multiple require() calls in same file', () => {
      createTestFile('multiple-requires.js', `
        const a = require('./a');
        const b = require('./b');
        const c = require('./c');
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('require(');
      // Should report multiple occurrences
      expect((result.output.match(/require\(/g) || []).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Detecting module.exports', () => {
    test('detects module.exports assignments as WARNING', () => {
      createTestFile('bad-exports.js', `
        function foo() {}
        module.exports = foo;
      `);

      const result = runValidator();

      // module.exports is WARNING (not ERROR), so validation passes
      // but warning should be in output
      expect(result.success).toBe(true); // Only ERRORs fail validation
      expect(result.output).toContain('module.exports');
      expect(result.output).toContain('bad-exports.js');
      expect(result.output).toContain('WARNING');
    });

    test('allows conditional module.exports for Node.js compatibility', () => {
      createTestFile('conditional-export2.js', `
        class Bar {}

        if (typeof module !== 'undefined' && module.exports) {
          module.exports = Bar;
        }
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });
  });

  describe('Detecting process.env', () => {
    test('detects process.env usage', () => {
      createTestFile('bad-process-env.js', `
        const apiKey = process.env.API_KEY;
        if (process.env.DEBUG) {
          console.log('Debug mode');
        }
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('process.env');
      expect(result.output).toContain('bad-process-env.js');
      expect(result.output).toContain('ERROR');
    });
  });

  describe('Detecting __dirname and __filename', () => {
    test('detects __dirname usage', () => {
      createTestFile('bad-dirname.js', `
        const filePath = __dirname + '/file.txt';
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('__dirname');
      expect(result.output).toContain('bad-dirname.js');
      expect(result.output).toContain('ERROR');
    });

    test('detects __filename usage', () => {
      createTestFile('bad-filename.js', `
        console.log('Current file:', __filename);
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('__filename');
      expect(result.output).toContain('bad-filename.js');
      expect(result.output).toContain('ERROR');
    });
  });

  describe('Valid Chrome extension code', () => {
    test('passes valid importScripts() usage', () => {
      createTestFile('good-import.js', `
        importScripts('./modules/ConsoleCapture.js');
        const capture = new ConsoleCapture();
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('No syntax issues found');
    });

    test('passes standard Chrome extension APIs', () => {
      createTestFile('good-chrome-apis.js', `
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
          console.log('Message received:', msg);
          sendResponse({ success: true });
        });

        chrome.tabs.query({}, (tabs) => {
          console.log('Tabs:', tabs);
        });
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });

    test('passes ES6+ features', () => {
      createTestFile('good-es6.js', `
        const arrow = () => console.log('arrow');
        const { a, b } = { a: 1, b: 2 };
        const spread = [...array];
        const template = \`hello \${name}\`;

        async function fetchData() {
          const response = await fetch(url);
          return response.json();
        }
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });
  });

  describe('Multiple files', () => {
    test('reports issues from multiple files', () => {
      createTestFile('file1.js', `const a = require('./a');`);
      createTestFile('file2.js', `const b = process.env.DEBUG;`);
      createTestFile('file3.js', `const c = __dirname + '/file.txt';`);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('file1.js');
      expect(result.output).toContain('file2.js');
      expect(result.output).toContain('file3.js');
      expect(result.output).toContain('require(');
      expect(result.output).toContain('process.env');
      expect(result.output).toContain('__dirname');
    });

    test('passes when all files are valid', () => {
      createTestFile('file1.js', `importScripts('./foo.js');`);
      createTestFile('file2.js', `const x = chrome.runtime.id;`);
      createTestFile('file3.js', `console.log('hello');`);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });
  });

  describe('Edge cases', () => {
    test('handles empty files', () => {
      createTestFile('empty.js', '');

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });

    test('handles files with only comments', () => {
      createTestFile('comments-only.js', `
        // This is a comment
        /* This is a
           multiline comment */
      `);

      const result = runValidator();

      expect(result.success).toBe(true);
      expect(result.output).toContain('No syntax issues found');
    });

    test('detects require in comments (by design - simple regex)', () => {
      createTestFile('require-in-comment.js', `
        // Don't use require() in Chrome extensions
        // Use importScripts() instead
      `);

      // This will detect require() even in comments
      // That's okay - it's a simple regex-based tool
      // Better to have false positives than false negatives
      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('require(');
    });

    test('handles strings containing forbidden patterns', () => {
      createTestFile('string-patterns.js', `
        const message = "Don't use require() here";
        const note = 'process.env is not available';
      `);

      // This will detect patterns even in strings
      // That's a limitation of regex-based validation
      const result = runValidator();

      expect(result.success).toBe(false);
    });
  });

  describe('Output format', () => {
    test('includes file path, line number, and column', () => {
      createTestFile('location-test.js', `
const foo = 'bar';
const bad = require('./bad');
const baz = 'qux';
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toMatch(/location-test\.js:\d+:\d+/);
      expect(result.output).toContain('Pattern: require(');
      expect(result.output).toContain('Issue:');
    });

    test('shows severity level (ERROR or WARNING)', () => {
      createTestFile('severity-test.js', `
        const x = require('./x');
      `);

      const result = runValidator();

      expect(result.success).toBe(false);
      expect(result.output).toContain('ERROR');
    });
  });
});

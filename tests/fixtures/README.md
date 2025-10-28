# Test HTML Fixtures

Test pages designed for Chrome Dev Assist validation with **3-level identification system**.

---

## 🎯 Three-Level Identification System

Every test page includes identification at three levels:

### 1️⃣ **In Code** (Programmatic Detection)

Data attributes on `<body>` element:

```html
<body
  data-test-id="basic-test-001"
  data-test-name="Basic Test Page"
  data-extension-name="Chrome Dev Assist"
  data-test-status="ready"
></body>
```

### 2️⃣ **In Visible Text** (Visual Confirmation)

Test information displayed prominently on page:

- Test ID (monospaced, highlighted)
- Test Name
- Extension Name (Chrome Dev Assist)
- Status indicator

### 3️⃣ **In Console** (Logging at Beginning)

Test identification logged **immediately** when page loads:

```javascript
console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TEST PAGE LOADED');
console.log('═══════════════════════════════════════════════════════');
console.log('Test ID:       basic-test-001');
console.log('Test Name:     Basic Test Page');
console.log('Extension:     Chrome Dev Assist');
console.log('Status:        READY');
console.log('Timestamp:     ' + new Date().toISOString());
console.log('═══════════════════════════════════════════════════════');
```

---

## 📁 Available Test Fixtures

### `basic-test.html`

**Purpose:** Validate basic page load and metadata detection
**Test ID:** `basic-test-001`
**Console Output:** Identification only (clean)
**Expected Errors:** 0

**Use Cases:**

- Verify openUrl() works
- Validate test page metadata detection
- Check console capture works
- Test happy path

---

### `console-errors-test.html`

**Purpose:** Test console error capture functionality
**Test ID:** `console-errors-001`
**Console Output:** 3 intentional errors
**Expected Errors:** 3 (ReferenceError, TypeError, Custom Error)

**Use Cases:**

- Validate error capture
- Test error filtering
- Verify error message accuracy
- Check error count matches expected

---

### `console-mixed-test.html`

**Purpose:** Test mixed console output capture
**Test ID:** `console-mixed-001`
**Console Output:** 5 logs + 2 warnings + 1 error = 8 messages
**Expected:**

- Logs: 5
- Warnings: 2
- Errors: 1

**Use Cases:**

- Validate multi-level capture (log/warn/error)
- Test message counting by level
- Verify filtering by severity
- Check comprehensive capture

---

## 🔧 Usage in Tests

### Basic Usage

```javascript
const chromeDevAssist = require('../../claude-code/index.js');

// Open test page
const result = await chromeDevAssist.openUrl('file:///path/to/tests/fixtures/basic-test.html', {
  captureConsole: true,
  duration: 2000,
});

// Verify test identification in console
const testIdLog = result.consoleLogs.find(
  log => log.message.includes('Test ID:') && log.message.includes('basic-test-001')
);
expect(testIdLog).toBeDefined();
```

### Dogfooding Pattern (Using Extension to Test Itself)

```javascript
// 1. Open test page with capture
const { tabId, consoleLogs } = await chromeDevAssist.openUrl(
  'file:///path/to/tests/fixtures/console-errors-test.html',
  { captureConsole: true, duration: 3000 }
);

// 2. Validate test identification present
const testHeader = consoleLogs.find(log => log.message.includes('console-errors-001'));
expect(testHeader).toBeDefined();

// 3. Validate expected errors captured
const errors = consoleLogs.filter(log => log.level === 'error');
expect(errors.length).toBe(3); // Expected: 3 errors

// 4. Clean up
await chromeDevAssist.closeTab(tabId);
```

### Accessing Test Metadata from Extension

```javascript
// After page loads, metadata is available in window object
window.testMetadata = {
  id: 'basic-test-001',
  name: 'Basic Test Page',
  extension: 'Chrome Dev Assist',
  status: 'ready',
  loadedAt: '2025-10-24T...',
};
```

---

## 📝 Creating New Test Fixtures

### Required Elements

1. **Data Attributes on `<body>`:**

   ```html
   data-test-id="unique-id-001" data-test-name="Descriptive Test Name" data-extension-name="Chrome
   Dev Assist" data-test-status="ready"
   ```

2. **Visible Test Information:**

   ```html
   <div class="test-info">
     <h1>🧪 Test Page Title</h1>
     <p><strong>Test ID:</strong> <span class="test-id">unique-id-001</span></p>
     <p><strong>Test Name:</strong> Descriptive Test Name</p>
     <p><strong>Extension:</strong> <span class="extension-name">Chrome Dev Assist</span></p>
     <p><strong>Status:</strong> <span class="status">STATUS</span></p>
   </div>
   ```

3. **Console Logging at Beginning:**

   ```javascript
   console.log('═══════════════════════════════════════════════════════');
   console.log('🧪 TEST PAGE LOADED');
   console.log('═══════════════════════════════════════════════════════');
   console.log('Test ID:       unique-id-001');
   console.log('Test Name:     Descriptive Test Name');
   console.log('Extension:     Chrome Dev Assist');
   console.log('Status:        READY');
   console.log('Timestamp:     ' + new Date().toISOString());
   console.log('═══════════════════════════════════════════════════════');
   ```

4. **Window Metadata Object:**
   ```javascript
   window.testMetadata = {
     id: 'unique-id-001',
     name: 'Descriptive Test Name',
     extension: 'Chrome Dev Assist',
     status: 'ready',
     loadedAt: new Date().toISOString(),
   };
   ```

### Naming Convention

- **File:** `descriptive-name-test.html`
- **Test ID:** `descriptive-name-XXX` (where XXX is sequential number)
- **Body ID:** Same as test ID

---

## ⚠️ File Access Requirements

**IMPORTANT:** To use `file://` URLs, you must:

1. Open `chrome://extensions`
2. Find "Chrome Dev Assist"
3. Click "Details"
4. Enable **"Allow access to file URLs"**

Without this, Chrome will block local file access.

---

## 🧪 Test Validation Checklist

When creating or using test fixtures, validate:

- [ ] All 3 levels of identification present (data attributes, visible text, console)
- [ ] Test ID appears in console at the beginning
- [ ] Test name visible on page
- [ ] Extension name (Chrome Dev Assist) visible
- [ ] `window.testMetadata` object accessible
- [ ] Console identification logged before other output
- [ ] Status attribute updates if applicable
- [ ] Expected console output matches actual output

---

## 📊 Test Fixture Metadata Summary

| File                       | Test ID              | Logs | Warnings | Errors | Purpose          |
| -------------------------- | -------------------- | ---- | -------- | ------ | ---------------- |
| `basic-test.html`          | `basic-test-001`     | 2    | 0        | 0      | Basic validation |
| `console-errors-test.html` | `console-errors-001` | 5    | 0        | 3      | Error capture    |
| `console-mixed-test.html`  | `console-mixed-001`  | 5    | 2        | 1      | Mixed output     |

---

## 🎯 Future Test Fixtures (Planned)

- `network-requests-test.html` - Test page with XHR/fetch requests
- `dom-manipulation-test.html` - Dynamic DOM changes
- `timing-test.html` - Delayed/async operations
- `memory-test.html` - Memory intensive operations
- `performance-test.html` - Performance metrics

---

**Last Updated:** 2025-10-24
**Maintained By:** Chrome Dev Assist Development Team
**Status:** Active Test Suite

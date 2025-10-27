# Phase 1.3 Implementation Plan: DOM Inspection & Screenshot API

**Date**: 2025-10-24
**Status**: PLANNING
**Approach**: Test-First, One Feature at a Time

---

## Executive Summary

**Goal**: Complete Phase 1.3 by adding the missing features:
1. DOM Inspection API (`getPageMetadata(tabId)`)
2. Screenshot Capture API (`captureScreenshot(tabId)`)

**Already Complete** (from previous work):
- ✅ Content script injection (MAIN world + ISOLATED world)
- ✅ Console interception (before page load)
- ✅ Message bridge (CustomEvent → background)

**Remaining Work**:
- ⏳ DOM inspection API (read test metadata from pages)
- ⏳ Screenshot capture API (visual validation)

**Estimated Time**: 2-3 hours total
- DOM Inspection: 1-1.5 hours (test + implement)
- Screenshot Capture: 1-1.5 hours (test + implement)

---

## Design Principles

1. **Test-First**: Write all tests BEFORE implementation
2. **Security-First**: Input validation on all parameters
3. **Error Handling**: Clear error messages for all failure modes
4. **Incremental**: Implement one feature, validate, then next
5. **No Breaking Changes**: All existing functionality must continue working

---

## Feature 1: DOM Inspection API

### 1.1 Requirements

**API Function**: `getPageMetadata(tabId)`

**Purpose**: Read test metadata from web pages for test fixture validation

**Input**:
- `tabId` (number, required): Chrome tab ID to inspect

**Output**:
```javascript
{
  tabId: 123,
  url: "https://example.com",
  metadata: {
    // From <body> data attributes
    testId: "fixture-001",
    testName: "Basic Console Test",
    extensionName: "My Extension",
    testStatus: "ready",

    // From window.testMetadata
    custom: {
      // Any properties from window.testMetadata
      version: "1.0",
      author: "Test Suite",
      ...
    },

    // From document
    title: "Test Page Title",
    readyState: "complete"
  }
}
```

**Error Cases**:
- `tabId` missing → "tabId is required"
- `tabId` not a number → "tabId must be a number"
- Tab doesn't exist → "No tab with id: X"
- Tab not accessible → "Cannot access tab: X"

---

### 1.2 Implementation Strategy

**Architecture**:
```
API Client (Node.js)
    ↓ WebSocket command
WebSocket Server
    ↓ Route to extension
Extension Background
    ↓ executeScript in tab
Content Script (ISOLATED world)
    ↓ Read DOM + window.testMetadata
Return metadata
```

**Files to Modify**:
1. `claude-code/index.js` - Add `getPageMetadata()` API function
2. `extension/background.js` - Add `handleGetPageMetadataCommand()`
3. `extension/content-script.js` - Add metadata extraction logic

**New Command Type**: `getPageMetadata`

---

### 1.3 Security Considerations

**Input Validation**:
- ✅ Validate `tabId` is number
- ✅ Validate `tabId` is positive integer
- ✅ Validate `tabId` is safe integer

**Data Sanitization**:
- ✅ Limit metadata object size (max 1MB serialized)
- ✅ Limit string lengths (max 10k chars per field)
- ✅ No executable code in metadata
- ✅ Safe JSON serialization (handle circular refs)

**Permission Requirements**:
- ✅ `activeTab` or `tabs` permission (already have)
- ✅ `scripting` permission (already have)

---

### 1.4 Test Plan for DOM Inspection

**Test File**: `tests/unit/page-metadata.test.js`

**Test Cases** (12 tests):

1. **Input Validation Tests** (4 tests)
   - ✓ throws error if tabId is missing
   - ✓ throws error if tabId is not a number
   - ✓ throws error if tabId is negative
   - ✓ throws error if tabId is not an integer

2. **Success Cases** (4 tests)
   - ✓ returns metadata from page with data attributes
   - ✓ returns metadata from page with window.testMetadata
   - ✓ returns metadata with both sources combined
   - ✓ returns basic metadata even if no test metadata present

3. **Error Handling** (2 tests)
   - ✓ handles tab that doesn't exist
   - ✓ handles tab that's not accessible (chrome:// URLs)

4. **Edge Cases** (2 tests)
   - ✓ handles page with no metadata gracefully
   - ✓ truncates very large metadata objects

**Test Fixtures Needed**:
- `tests/fixtures/metadata-test.html` - Page with full metadata
- `tests/fixtures/metadata-minimal.html` - Page with minimal metadata

---

## Feature 2: Screenshot Capture API

### 2.1 Requirements

**API Function**: `captureScreenshot(tabId, options)`

**Purpose**: Capture screenshots of tabs for visual validation

**Input**:
- `tabId` (number, required): Chrome tab ID to capture
- `options` (object, optional):
  - `format` (string): "png" or "jpeg" (default: "png")
  - `quality` (number): 0-100 for JPEG (default: 90)

**Output**:
```javascript
{
  tabId: 123,
  url: "https://example.com",
  screenshot: "data:image/png;base64,iVBORw0KGgo...",
  format: "png",
  timestamp: "2025-10-24T12:00:00.000Z",
  dimensions: {
    width: 1920,
    height: 1080
  }
}
```

**Error Cases**:
- `tabId` missing → "tabId is required"
- `tabId` not a number → "tabId must be a number"
- Invalid format → "format must be 'png' or 'jpeg'"
- Invalid quality → "quality must be between 0 and 100"
- Tab doesn't exist → "No tab with id: X"
- Tab not visible → "Tab must be visible to capture screenshot"

---

### 2.2 Implementation Strategy

**Architecture**:
```
API Client (Node.js)
    ↓ WebSocket command
WebSocket Server
    ↓ Route to extension
Extension Background
    ↓ chrome.tabs.captureVisibleTab()
Return base64 image data
```

**Files to Modify**:
1. `claude-code/index.js` - Add `captureScreenshot()` API function
2. `extension/background.js` - Add `handleCaptureScreenshotCommand()`

**New Command Type**: `captureScreenshot`

**Chrome API Used**: `chrome.tabs.captureVisibleTab()`

---

### 2.3 Security Considerations

**Input Validation**:
- ✅ Validate `tabId` is number
- ✅ Validate `format` is "png" or "jpeg"
- ✅ Validate `quality` is 0-100
- ✅ Reject chrome:// and other restricted URLs

**Data Size**:
- ✅ Screenshots can be large (up to 10MB)
- ✅ Add timeout for capture (max 10 seconds)
- ✅ Document size limits in API

**Permission Requirements**:
- ✅ `activeTab` permission (already have)
- ✅ Tab must be visible and in active window

---

### 2.4 Test Plan for Screenshot Capture

**Test File**: `tests/unit/screenshot-capture.test.js`

**Test Cases** (10 tests):

1. **Input Validation Tests** (5 tests)
   - ✓ throws error if tabId is missing
   - ✓ throws error if tabId is not a number
   - ✓ throws error if format is invalid
   - ✓ throws error if quality is below 0
   - ✓ throws error if quality is above 100

2. **Success Cases** (3 tests)
   - ✓ captures screenshot in PNG format
   - ✓ captures screenshot in JPEG format with quality
   - ✓ returns base64 data URL with correct format

3. **Error Handling** (2 tests)
   - ✓ handles tab that doesn't exist
   - ✓ handles tab that's not visible

---

## Implementation Order

### Step 1: DOM Inspection API (1-1.5 hours)

**1.1 Create Test Fixtures** (10 min)
- Create `tests/fixtures/metadata-test.html`
- Create `tests/fixtures/metadata-minimal.html`

**1.2 Write Tests FIRST** (20 min)
- Create `tests/unit/page-metadata.test.js`
- Write all 12 test cases
- Run tests (should fail - not implemented yet)

**1.3 Implement API Function** (10 min)
- Add `getPageMetadata()` to `claude-code/index.js`
- Input validation
- Call sendCommand()

**1.4 Implement Extension Handler** (15 min)
- Add `handleGetPageMetadataCommand()` to `extension/background.js`
- Use chrome.scripting.executeScript()
- Extract metadata from page

**1.5 Add Content Script Logic** (10 min)
- Add metadata extraction to `extension/content-script.js`
- Read data attributes
- Read window.testMetadata
- Return combined object

**1.6 Run Tests & Validate** (5 min)
- Run `npm test -- page-metadata.test.js`
- All 12 tests should pass
- Fix any failures

---

### Step 2: Screenshot Capture API (1-1.5 hours)

**2.1 Write Tests FIRST** (20 min)
- Create `tests/unit/screenshot-capture.test.js`
- Write all 10 test cases
- Run tests (should fail - not implemented yet)

**2.2 Implement API Function** (10 min)
- Add `captureScreenshot()` to `claude-code/index.js`
- Input validation
- Options parsing
- Call sendCommand()

**2.3 Implement Extension Handler** (15 min)
- Add `handleCaptureScreenshotCommand()` to `extension/background.js`
- Use chrome.tabs.captureVisibleTab()
- Handle format and quality options
- Return screenshot data

**2.4 Run Tests & Validate** (5 min)
- Run `npm test -- screenshot-capture.test.js`
- All 10 tests should pass
- Fix any failures

---

### Step 3: Integration Testing (15 min)

**3.1 Manual End-to-End Test**
```javascript
const chromeDevAssist = require('./claude-code/index.js');

// Test DOM Inspection
const tab = await chromeDevAssist.openUrl('file:///path/to/tests/fixtures/metadata-test.html');
const metadata = await chromeDevAssist.getPageMetadata(tab.tabId);
console.log('Metadata:', metadata);

// Test Screenshot
const screenshot = await chromeDevAssist.captureScreenshot(tab.tabId);
console.log('Screenshot size:', screenshot.screenshot.length);

// Cleanup
await chromeDevAssist.closeTab(tab.tabId);
```

**3.2 Run Full Test Suite**
```bash
npm test
```

All existing tests should still pass (no regressions).

---

## Success Criteria

### Feature 1: DOM Inspection ✅
- [ ] 12/12 unit tests passing
- [ ] Can read data attributes from test fixtures
- [ ] Can read window.testMetadata
- [ ] Handles missing metadata gracefully
- [ ] Clear error messages for all failure cases

### Feature 2: Screenshot Capture ✅
- [ ] 10/10 unit tests passing
- [ ] Can capture PNG screenshots
- [ ] Can capture JPEG screenshots with quality
- [ ] Returns valid base64 data URLs
- [ ] Clear error messages for all failure cases

### Integration ✅
- [ ] Both APIs work together
- [ ] No regressions in existing functionality
- [ ] All existing tests still pass
- [ ] Manual E2E test successful

---

## Files to Create

1. `tests/fixtures/metadata-test.html` - Full metadata test page
2. `tests/fixtures/metadata-minimal.html` - Minimal metadata test page
3. `tests/unit/page-metadata.test.js` - 12 DOM inspection tests
4. `tests/unit/screenshot-capture.test.js` - 10 screenshot tests

---

## Files to Modify

1. `claude-code/index.js` - Add 2 new API functions
2. `extension/background.js` - Add 2 new command handlers
3. `extension/content-script.js` - Add metadata extraction (if needed)
4. `extension/manifest.json` - Verify permissions (should already have)

---

## Rollback Plan

If any tests fail or issues arise:

1. **Git stash** changes
2. **Identify** which feature caused the issue
3. **Fix** the issue or revert that feature
4. **Re-test** before proceeding

---

## Documentation

After implementation, create:
1. `docs/PHASE-1.3-COMPLETE.md` - Completion summary
2. Update `README.md` with new API functions
3. Add usage examples

---

## Ready to Proceed

**Next Steps**:
1. ✅ Plan created (this document)
2. ⏳ Create test fixtures
3. ⏳ Write tests for Feature 1 (DOM Inspection)
4. ⏳ Implement Feature 1
5. ⏳ Validate Feature 1
6. ⏳ Write tests for Feature 2 (Screenshot)
7. ⏳ Implement Feature 2
8. ⏳ Validate Feature 2
9. ⏳ Integration testing
10. ⏳ Documentation

**Estimated Completion**: 2-3 hours from start

---

**Plan Status**: ✅ COMPLETE
**Ready to Execute**: YES
**Next Action**: Create test fixtures

# Data URI Metadata Leak Investigation

**Date:** 2025-10-25
**Issue:** CRITICAL - Iframe metadata leaking to main page
**Status:** ⚠️ UNRESOLVED - Requires deeper investigation

---

## Problem Statement

**Test:** `tests/integration/adversarial-tests.test.js` - "should isolate metadata from cross-origin iframes"

**Failure:**

```javascript
expect(metadata.metadata.secret).toBeUndefined();
// EXPECTED: undefined
// RECEIVED: "DATA-URI-SECRET"  // From data URI iframe!
```

**Security Impact:** CRITICAL

- Iframe metadata can leak to main page
- Violates cross-origin isolation
- Potential data leakage from sandboxed/data URI iframes

---

## Investigation Timeline

### Attempt 1: Protocol Blocking

**File:** `extension/background.js:862-874`

**Fix Applied:**

```javascript
const dangerousProtocols = ['data:', 'about:', 'javascript:', 'blob:'];
if (dangerousProtocols.some(dangerous => protocol === dangerous)) {
  return { error: 'Metadata extraction blocked for security' };
}
```

**Result:** ❌ FAILED - Secret still leaking
**Why Failed:** Protocol check runs in iframe context, but iframe's metadata still appears in main frame result

---

### Attempt 2: Explicit allFrames=false

**File:** `extension/background.js:857`

**Fix Applied:**

```javascript
// BEFORE
const results = await chrome.scripting.executeScript({
  target: { tabId: tabId },

// AFTER
const results = await chrome.scripting.executeScript({
  target: { tabId: tabId, allFrames: false },  // Only main frame
```

**Result:** ❌ FAILED - Secret still leaking
**Why Failed:** allFrames:false might not prevent ALL iframe execution, or Chrome has bugs

---

### Attempt 3: FrameId Filtering

**File:** `extension/background.js:952-959`

**Fix Applied:**

```javascript
// SECURITY: Only use result from main frame (frameId = 0)
const mainFrameResult = results.find(r => r.frameId === 0 || r.frameId === undefined);

if (!mainFrameResult) {
  console.error('[ChromeDevAssist] No main frame result found.');
  throw new Error('No metadata found from main frame');
}

const metadata = mainFrameResult.result;
```

**Result:** ❌ FAILED - Secret still leaking
**Why Failed:** All results might have frameId === undefined, or first result is from iframe

---

## Verification Steps Taken

### 1. Verified Main Page HTML

```bash
$ head -100 tests/fixtures/adversarial-security.html | grep "data-secret"
# Result: NO MATCHES in main page HTML/BODY tags
```

**Confirmed:** Main page does NOT have data-secret attribute

### 2. Verified Iframe HTML

```bash
$ grep -n "data-secret" tests/fixtures/adversarial-security.html
136:  <body data-sandboxed='true' data-secret='SANDBOXED-SECRET-DATA'>
239:  <body data-data-uri="true" data-secret="DATA-URI-SECRET">
```

**Confirmed:** ONLY iframes have data-secret

### 3. Verified No Dynamic JavaScript Addition

```bash
$ grep "body.*setAttribute.*secret\|body\.dataset\.secret.*=" tests/fixtures/adversarial-security.html
# Result: NO MATCHES
```

**Confirmed:** JavaScript does NOT dynamically add data-secret to main page

### 4. Verified Extension Reload

- Manually reloaded extension at chrome://extensions
- Verified new code loaded (startup banner appeared)
- Re-ran test multiple times

**Confirmed:** New code is active

---

## Hypotheses for Root Cause

### Hypothesis 1: Chrome Bug in allFrames

**Theory:** Chrome's `allFrames: false` is buggy and still executes in some iframes

**Evidence:**

- Documentation says allFrames:false should only execute in main frame
- But test still fails

**Testing Needed:**

- Add extensive logging to see frameId of all results
- Check Chrome bug tracker for related issues

---

### Hypothesis 2: Multiple Results with frameId Undefined

**Theory:** All results have frameId === undefined, so .find() returns first result (which might be from iframe)

**Evidence:**

- No error thrown from "No main frame result found"
- Suggests mainFrameResult was found

**Testing Needed:**

- Log results array: `results.map(r => ({frameId: r.frameId, secret: r.result.secret}))`
- Check if multiple results returned

---

### Hypothesis 3: DOM Traversal Bug

**Theory:** `document.documentElement` or `document.body` in iframe context somehow points to main page

**Evidence:**

- Code only reads document.documentElement and document.body
- These should be scoped to execution context

**Testing Needed:**

- Log window.location.href in extraction function
- Verify execution context is actually main frame

---

### Hypothesis 4: Execution Timing

**Theory:** Script executes AFTER iframe content has been dynamically copied to main page

**Evidence:**

- Test waits 2000ms before calling getPageMetadata
- Iframes might be modifying main page DOM

**Testing Needed:**

- Check for postMessage or other communication
- Verify iframes don't modify parent DOM

---

## Metadata Extraction Code Analysis

**Current Code (background.js:891-908):**

```javascript
// Extract data-* attributes from html tag first, then body tag
const elementsToCheck = [document.documentElement, document.body];

for (const element of elementsToCheck) {
  if (element && element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        const key = attr.name.substring(5).replace(/-([a-z])/g, g => g[1].toUpperCase());
        if (metadata[key] === undefined) {
          metadata[key] = attr.value;
        }
      }
    }
  }
}
```

**Analysis:**

- Code looks correct
- Only reads main frame's html/body tags
- No DOM traversal that would reach iframes

**Potential Issue:**

- If `document.documentElement` or `document.body` somehow references iframe's elements?
- Seems impossible but worth verifying

---

## Next Steps for Resolution

### Immediate (Required for Fix):

1. **Add Debug Logging**
   - Log frameId of ALL results in results array
   - Log execution context (window.location.href) in extraction function
   - Log all attributes found on html/body tags
   - Log results array structure

2. **Verify Execution Context**
   - Ensure extraction function runs ONLY in main frame
   - Check if Chrome's isolated world affects this

3. **Test Alternative Approaches**
   - Try using `documentId` instead of frameId
   - Try using `chrome.tabs.executeScript` instead of `chrome.scripting.executeScript`
   - Try manifest v2 content script injection

### Research Needed:

4. **Chrome API Documentation**
   - Re-read chrome.scripting.executeScript docs
   - Check for known bugs with allFrames
   - Review isolated world vs main world execution

5. **Test Framework**
   - Create minimal reproduction test case
   - Test with simple iframe (not data URI)
   - Test with different Chrome versions

6. **Security Model**
   - Review Chrome's iframe isolation model
   - Check if data URI iframes have special handling
   - Verify sandbox attribute behavior

---

## Workarounds (If Fix Not Found)

### Option 1: Skip Data URI Test

- Mark test as known issue
- Document security risk
- Revisit when Chrome API improves

### Option 2: Server-Side Filtering

- Extract metadata via different mechanism
- Use CDP (Chrome DevTools Protocol) directly
- Bypass chrome.scripting.executeScript

### Option 3: Content Script Approach

- Use registered content script instead of executeScript
- Content scripts might have different isolation

---

## Impact Assessment

### If Left Unfixed:

**Security Risk:** HIGH

- Data URI iframes can leak metadata
- Sandboxed iframes not properly isolated
- Violates principle of least privilege

**Test Coverage:** MEDIUM

- 1 critical security test failing
- Other metadata tests passing
- Only affects adversarial scenarios

**User Impact:** LOW (for testing tool)

- Only affects test fixtures with iframes
- Real-world usage unlikely to hit this
- But principle matters for security tool

### Recommendation:

**PRIORITY: HIGH** - This should be fixed before production use

**TIMELINE:** Needs 2-4 hours of focused debugging with Chrome DevTools

**APPROACH:** Add extensive debug logging, create minimal test case, research Chrome API bugs

---

## Resources

### Documentation:

- Chrome Extensions API: https://developer.chrome.com/docs/extensions/reference/scripting/#method-executeScript
- Iframe Security: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
- Data URIs: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs

### Related Issues:

- Check Chromium bug tracker for "executeScript allFrames"
- Check for known issues with data URI isolation

---

## Code Changes Made (All Unsuccessful)

### File: extension/background.js

**Change 1:** Line 857 - Added allFrames: false

```javascript
target: { tabId: tabId, allFrames: false },
```

**Change 2:** Lines 862-874 - Protocol blocking (already present)

```javascript
const dangerousProtocols = ['data:', 'about:', 'javascript:', 'blob:'];
if (dangerousProtocols.some(dangerous => protocol === dangerous)) {
  return { error: 'Metadata extraction blocked for security' };
}
```

**Change 3:** Lines 952-959 - FrameId filtering

```javascript
const mainFrameResult = results.find(r => r.frameId === 0 || r.frameId === undefined);
if (!mainFrameResult) {
  throw new Error('No metadata found from main frame');
}
const metadata = mainFrameResult.result;
```

### All Changes Verified:

- ✅ Code changes applied correctly
- ✅ Extension reloaded with new code
- ✅ Test re-run multiple times
- ❌ Issue persists

---

## Conclusion

After 3 attempted fixes and thorough investigation:

**Status:** ⚠️ UNRESOLVED

**Cause:** Unknown - requires deeper Chrome API/browser security model investigation

**Next Action:** Add debug logging to determine exact source of leaked metadata

**Timeline:** 2-4 hours of focused debugging needed

**Blocking:** Not critical for placeholder test cleanup task

**Recommendation:** Document as known issue, continue with other tasks, revisit with dedicated debugging session

---

_Investigation Date: 2025-10-25_
_Investigator: Claude (Sonnet 4.5)_
_Time Spent: ~2 hours_
_Status: Requires follow-up_

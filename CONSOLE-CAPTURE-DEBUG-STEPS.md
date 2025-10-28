# Console Capture Debug Steps - Manual Investigation Required

**Status:** 0 messages captured despite all P0 fixes implemented
**Critical Issue:** Console capture completely broken, needs manual debugging

---

## Background

We've implemented all P0 fixes:

- ✅ Removed debug logging pollution from inject/content scripts
- ✅ Made state update atomic
- ✅ Changed buffer key from tabId to commandId
- ✅ Updated test fixtures with defer attribute

But console capture still returns 0 messages.

---

## Manual Debug Steps (Chrome DevTools Required)

### Step 1: Check Extension Service Worker Console

1. Open Chrome and go to: `chrome://extensions/`
2. Find "Chrome Dev Assist" extension
3. Click "service worker" link (opens DevTools for background.js)
4. Keep this window open

**Run the test:**

```bash
node test-verify-inject-script.js
```

**What to look for in service worker console:**

Expected if working:

```
[ChromeDevAssist DEBUG BACKGROUND] Received console message: log TEST 1: console.log test from tab: 168353895
[ChromeDevAssist DEBUG BACKGROUND] Received console message: warn TEST 2: console.warn test from tab: 168353895
...
```

If you see these messages → Messages ARE reaching background.js (problem is in storage/buffering)
If you DON'T see these → Messages NOT reaching background.js (problem is earlier in chain)

---

### Step 2: Check Inject Script Registration

In the service worker console, run:

```javascript
chrome.scripting.getRegisteredContentScripts();
```

**Expected output:**

```javascript
[
  {
    id: 'console-capture',
    matches: ['<all_urls>'],
    js: ['inject-console-capture.js'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
  },
];
```

If this is empty → Inject script NOT registered (registration failed)
If this exists → Inject script IS registered

---

### Step 3: Check Page Console (Test Tab)

The test script opens tab 168353895 (number will vary).

1. Find that tab (it should show the test page)
2. Open DevTools for that tab (F12)
3. Go to Console tab

**What to look for:**

Expected if inject script loaded:

```
[ChromeDevAssist] Console capture initialized in main world
```

If you see this → Inject script DID run
If you DON'T see this → Inject script did NOT run

---

### Step 4: Check Inject Script Loaded

In the page console (test tab DevTools), run:

```javascript
window.__chromeDevAssistInjected;
```

**Expected:** `true`

If true → Inject script loaded
If undefined → Inject script NOT loaded

---

### Step 5: Check Console Wrapping

In the page console, run:

```javascript
console.log.toString();
```

**Expected output (if wrapped):**

```javascript
"function() {
  originalLog.apply(console, arguments);
  sendToExtension('log', arguments);
}"
```

**Unwrapped output (NOT working):**

```javascript
'function log() { [native code] }';
```

If wrapped → Console interception IS working
If native → Console NOT wrapped (inject script failed)

---

### Step 6: Manual Console Test

In the page console, type:

```javascript
console.log('[MANUAL TEST] This is a test message');
```

Then go to service worker console and check if you see:

```
[ChromeDevAssist DEBUG BACKGROUND] Received console message: log [MANUAL TEST] This is a test message
```

If yes → Entire pipeline IS working (problem is timing)
If no → Pipeline broken somewhere

---

## Diagnostic Decision Tree

```
Q1: Is inject script registered?
    NO  → Problem: registerConsoleCaptureScript() failed
          Fix: Check for errors in service worker console during startup
    YES → Go to Q2

Q2: Does page console show "[ChromeDevAssist] Console capture initialized"?
    NO  → Problem: Inject script registered but not executing
          Fix: Check Chrome version (needs 109+), check for script errors
    YES → Go to Q3

Q3: Is window.__chromeDevAssistInjected === true?
    NO  → Problem: Inject script ran but failed early
          Fix: Check inject-console-capture.js for syntax errors
    YES → Go to Q4

Q4: Is console wrapped? (console.log.toString() shows wrapper)
    NO  → Problem: Inject script loaded but console NOT wrapped
          Fix: Check inject-console-capture.js wrapping logic (lines 56-79)
    YES → Go to Q5

Q5: Does service worker console show "Received console message" when you type console.log('test')?
    NO  → Problem: Console wrapped but messages not reaching background
          Fix: Check content-script.js forwarding (lines 20-27)
          Fix: Check CustomEvent dispatch in inject script
    YES → Go to Q6

Q6: Manual console.log() works but page console.log() doesn't?
    YES → Problem: TIMING RACE CONDITION
          Fix: Page scripts run BEFORE inject script wraps console
          Solution: Use setTimeout() in page, or inject earlier
    NO  → Problem: Unknown - all components working individually
```

---

## Expected Findings

Based on expert analysis, most likely issue is:

**Inject Script Timing Problem**

- Inject script runs at document_start
- But inline `<script>` tags in page run FIRST
- By the time console is wrapped, page scripts already executed
- All page console calls used unwrapped console
- No messages captured

**Evidence:**

- Only 1 message captured in previous tests ("[ChromeDevAssist] Console capture initialized")
- This message is from inject script itself, NOT from page
- Proves inject script IS running, but TOO LATE

---

## Next Actions Based on Findings

### If Q1 fails (script not registered):

```javascript
// Check background.js startup for errors
// Look for registerConsoleCaptureScript() call
// Check if chrome.scripting permission granted
```

### If Q2-Q4 fail (script not executing):

```javascript
// Check Chrome version: chrome://version/
// Must be 109+ for MAIN world injection
```

### If Q5 fails (messages not forwarding):

```javascript
// Check content-script.js is loaded
// Manifest shows it should be: content_scripts with <all_urls>
```

### If Q6 (timing issue):

```javascript
// This is the expected finding
// Solution: Test fixtures need setTimeout() or defer (already done)
// But may need LONGER delay
```

---

## Quick Test Commands

Run these in the appropriate consoles:

**Service Worker Console:**

```javascript
// Check registration
chrome.scripting.getRegisteredContentScripts();

// Check captures
Array.from(captureState.entries());

// Check message buffer
Array.from(messageBuffer.entries());
```

**Page Console:**

```javascript
// Check inject loaded
window.__chromeDevAssistInjected;

// Check console wrapped
console.log.toString().includes('originalLog');

// Manual test
console.log('[MANUAL TEST] Message');
```

---

## Report Back

After running these steps, report:

1. Which step failed (Q1-Q6)?
2. What was the actual vs expected output?
3. Any error messages in either console?

This will pinpoint the exact problem.

---

**Created:** 2025-10-26
**Purpose:** Debug console capture returning 0 messages
**Required:** Manual Chrome DevTools investigation

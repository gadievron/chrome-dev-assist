# Debug Console Capture - Testing Instructions

**Date:** 2025-10-25
**Purpose:** Manual testing instructions to debug console capture on complex pages
**Issue:** ISSUE-009 - Console capture returns 0 logs from adversarial pages with iframes
**Status:** Debug logging added, ready for manual testing

---

## What Was Added

Debug logging has been added to **three critical files** in the console capture flow:

### 1. `extension/inject-console-capture.js` (MAIN world)
```javascript
// Line 42: Logs when CustomEvent is dispatched
originalLog('[ChromeDevAssist DEBUG INJECT] Dispatching console event:', level, message.substring(0, 100));
```

### 2. `extension/content-script.js` (ISOLATED world)
```javascript
// Line 14: Logs when content script loads
console.log('[ChromeDevAssist DEBUG CONTENT] Content script loaded in:', window.location.href);

// Line 20: Logs when event is received
console.log('[ChromeDevAssist DEBUG CONTENT] Received console event:', logData.level, logData.message.substring(0, 100));

// Line 30: Logs when message is sent to background
console.log('[ChromeDevAssist DEBUG CONTENT] Message sent to background');

// Line 37: Confirms event listener registered
console.log('[ChromeDevAssist DEBUG CONTENT] Event listener registered');
```

### 3. `extension/background.js` (Service Worker)
```javascript
// Line 1657: Logs when background receives message
console.log('[ChromeDevAssist DEBUG BACKGROUND] Received console message:', message.level, message.message.substring(0, 100), 'from tab:', sender.tab?.id, 'url:', sender.url);
```

---

## Console Capture Flow (Expected)

Here's what SHOULD happen when console capture works correctly:

```
Page loads
    ↓
inject-console-capture.js runs (MAIN world)
    → Logs: "[ChromeDevAssist] Console capture initialized in main world"
    ↓
content-script.js runs (ISOLATED world)
    → Logs: "[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://..."
    → Logs: "[ChromeDevAssist DEBUG CONTENT] Event listener registered"
    ↓
User's page calls console.log("test")
    ↓
inject-console-capture.js intercepts
    → Logs: "[ChromeDevAssist DEBUG INJECT] Dispatching console event: log test"
    → Dispatches CustomEvent 'chromeDevAssist:consoleLog'
    ↓
content-script.js receives event
    → Logs: "[ChromeDevAssist DEBUG CONTENT] Received console event: log test"
    → Sends chrome.runtime.sendMessage to background
    → Logs: "[ChromeDevAssist DEBUG CONTENT] Message sent to background"
    ↓
background.js receives message
    → Logs: "[ChromeDevAssist DEBUG BACKGROUND] Received console message: log test from tab: 123 url: http://..."
    → Stores log in capture state
    ↓
captureLogs() retrieves stored logs
    → Returns consoleLogs array with entries
```

---

## Step 1: Reload the Extension

**CRITICAL:** You must reload the extension to activate the new debug logging.

### Option A: Using chrome://extensions (Recommended)

1. Open Chrome browser
2. Navigate to `chrome://extensions`
3. Find "Chrome Dev Assist" extension
4. Click the **Reload** icon (circular arrow)
5. Verify extension reloaded (timestamp should update)

### Option B: Using Extension Reload API (if available)

```bash
# From project directory
npm run reload-extension
# (if this script exists)
```

---

## Step 2: Open Extension Background Console

**This is where you'll see the debug logs!**

1. Navigate to `chrome://extensions`
2. Ensure "Developer mode" is enabled (toggle in top-right)
3. Find "Chrome Dev Assist" extension
4. Click **"service worker"** link (blue text)
   - If it says "Inactive", click "service worker" to activate it
5. A DevTools window opens - this is the **extension's background console**
6. Keep this window open during testing

**What you should see:**
```
[ChromeDevAssist] Extension started
[ChromeDevAssist] Console capture script registered in MAIN world
```

---

## Step 3: Test Simple Page (Known to Work)

### 3.1 Open Simple Test Page

1. In a new Chrome tab, navigate to:
   ```
   http://localhost:9876/fixtures/integration-test-2.html?token=0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c
   ```

2. Open **Page DevTools** (Cmd+Option+J / Ctrl+Shift+J)
   - This is DIFFERENT from the extension background console!

### 3.2 Expected Logs (Page Console)

In the **page console**, you should see:

```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://localhost:9876/fixtures/integration-test-2.html
[ChromeDevAssist DEBUG CONTENT] Event listener registered
[ChromeDevAssist] Console capture initialized in main world
[ChromeDevAssist DEBUG INJECT] Dispatching console event: log [ChromeDevAssist] Console capture initialized in main world
[ChromeDevAssist DEBUG CONTENT] Received console event: log [ChromeDevAssist] Console capture initialized in main world
[ChromeDevAssist DEBUG CONTENT] Message sent to background
```

**✅ If you see these logs:** Content scripts are injecting correctly!

**❌ If you DON'T see these logs:** Content scripts are NOT injecting!

### 3.3 Expected Logs (Extension Background Console)

In the **extension background console**, you should see:

```
[ChromeDevAssist DEBUG BACKGROUND] Received console message: log [ChromeDevAssist] Console capture initialized in main world from tab: 123 url: http://localhost:9876/...
```

**✅ If you see this:** Message reached background successfully!

**❌ If you DON'T see this:** Message NOT reaching background!

---

## Step 4: Test Complex Page (Known to Fail)

### 4.1 Open Adversarial Security Page

1. In a new Chrome tab, navigate to:
   ```
   http://localhost:9876/fixtures/adversarial-security.html?token=0f09fad1179386c8c33c82c796d99a30b1ca6bf74ff74f5d15a525f446d0e99c
   ```

2. Open **Page DevTools** (Cmd+Option+J / Ctrl+Shift+J)

### 4.2 Check Debug Logs

**Look for the same pattern as Step 3.2:**

#### Scenario 1: Content script NOT loaded ❌
```
(No debug logs at all)
```

**Diagnosis:** Content script not injecting on complex pages
**Root cause:** Manifest configuration issue or Chrome bug

#### Scenario 2: Content script loaded, but NO events ⚠️
```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://localhost:9876/fixtures/adversarial-security.html
[ChromeDevAssist DEBUG CONTENT] Event listener registered
(No inject logs)
(No "Received console event" logs)
```

**Diagnosis:** inject-console-capture.js not running in MAIN world
**Root cause:** Dynamic script registration failing on complex pages

#### Scenario 3: Inject script loaded, but content script NOT receiving events ⚠️
```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://localhost:9876/fixtures/adversarial-security.html
[ChromeDevAssist DEBUG CONTENT] Event listener registered
[ChromeDevAssist DEBUG INJECT] Dispatching console event: log [MAIN-PAGE] Logging from main page
(No "Received console event" logs)
```

**Diagnosis:** CustomEvent not crossing MAIN → ISOLATED world boundary
**Root cause:** Possible Chrome security restriction or event dispatch issue

#### Scenario 4: Everything works locally but tests fail ✅
```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://localhost:9876/fixtures/adversarial-security.html
[ChromeDevAssist DEBUG INJECT] Dispatching console event: log [MAIN-PAGE] Logging from main page
[ChromeDevAssist DEBUG CONTENT] Received console event: log [MAIN-PAGE] Logging from main page
[ChromeDevAssist DEBUG CONTENT] Message sent to background
```

**Diagnosis:** Console capture working! Issue is with test automation
**Root cause:** Test timing or API client issue

---

## Step 5: Check Iframes

Complex pages have multiple iframes. Check if content scripts load in iframes:

### 5.1 Inspect Iframe

1. On adversarial-security.html page
2. Right-click inside an iframe area
3. Select "Inspect"
4. DevTools opens with iframe context selected
5. Switch to **Console** tab

### 5.2 Expected Logs (Iframe Console)

**Same-origin iframe:**
```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: http://localhost:9876/iframe.html
[ChromeDevAssist DEBUG CONTENT] Event listener registered
[ChromeDevAssist DEBUG INJECT] Dispatching console event: log [IFRAME] Logging from iframe
```

**Sandboxed iframe:**
```
(May have no logs if sandbox prevents script execution)
```

**Data URI iframe:**
```
[ChromeDevAssist DEBUG CONTENT] Content script loaded in: data:text/html,...
[ChromeDevAssist DEBUG INJECT] Dispatching console event: log [DATA-URI] Logging from data URI
```

**✅ If iframe logs appear:** allFrames: true is working!

**❌ If NO iframe logs:** allFrames not working or iframes blocked!

---

## Step 6: Run Automated Test with Debug Logs

Now run the adversarial test to capture debug output:

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist
npm test -- tests/integration/adversarial-tests.test.js --verbose
```

**What to look for:**

1. Check if test output includes debug logs (it shouldn't - extension console is separate)
2. Compare manual test results (Step 3-5) with automated test behavior
3. Identify discrepancy between manual (works?) vs automated (fails?)

---

## Step 7: Document Findings

### Template for Results:

**Simple Page (integration-test-2.html):**
- [ ] Content script loaded? (YES/NO)
- [ ] Inject script loaded? (YES/NO)
- [ ] Events dispatched? (YES/NO)
- [ ] Events received? (YES/NO)
- [ ] Messages to background? (YES/NO)

**Complex Page (adversarial-security.html):**
- [ ] Content script loaded in main frame? (YES/NO)
- [ ] Content script loaded in iframes? (YES/NO)
- [ ] Inject script loaded in main frame? (YES/NO)
- [ ] Inject script loaded in iframes? (YES/NO)
- [ ] Events dispatched from main frame? (YES/NO)
- [ ] Events dispatched from iframes? (YES/NO)
- [ ] Events received by content script? (YES/NO)
- [ ] Messages to background? (YES/NO)

**Root Cause Identified:**
```
[Describe where the flow breaks based on debug logs]
```

---

## Expected Outcomes

### If Simple Page Works, Complex Page Fails:

**Possible root causes:**
1. Dynamic script registration not working on iframe pages
2. Content script injection timing issue
3. CustomEvent not crossing boundaries on complex pages
4. Chrome security restriction on sandboxed/data URI iframes

### If Both Fail:

**Possible root causes:**
1. Extension not reloaded after debug logging added
2. Manifest configuration error
3. Chrome version incompatibility

### If Both Work:

**Possible root causes:**
1. Test automation timing issue
2. API client not waiting for extension to attach
3. Server/auth issue in automated environment

---

## Troubleshooting

### "No debug logs at all"
- Reload extension via chrome://extensions
- Check manifest.json includes content-script.js
- Verify inject-console-capture.js registered (check background console)

### "Content script loaded but no inject logs"
- Check background console for registration errors
- Verify `chrome.scripting.registerContentScripts()` succeeded
- Try manually restarting extension

### "Events dispatched but not received"
- Check CustomEvent name matches exactly
- Verify content script in ISOLATED world (not MAIN)
- Try adding event listener BEFORE inject script runs

---

## Next Steps After Testing

Based on findings, choose fix approach:

1. **If content script not loading:** Fix manifest configuration
2. **If inject script not loading:** Fix dynamic registration
3. **If events not crossing:** Fix event dispatch mechanism
4. **If messages not reaching background:** Fix message handler
5. **If everything works manually:** Fix test automation

---

## Files Modified

- `extension/inject-console-capture.js` - Added debug logging to sendToExtension()
- `extension/content-script.js` - Added debug logging to event listener
- `extension/background.js` - Added debug logging to message handler

---

**Document Version:** 1.0
**Created:** 2025-10-25
**Author:** Chrome Dev Assist Team
**Status:** Ready for manual testing

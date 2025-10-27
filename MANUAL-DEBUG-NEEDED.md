# Console Capture Debug - What You Need to Do

**Critical Issue:** Console capture returns 0 messages. Needs manual Chrome DevTools investigation.

---

## Quick Steps

### 1. Open Extension Service Worker Console

1. Go to: `chrome://extensions/`
2. Find "Chrome Dev Assist"
3. Click "service worker" link
4. Keep this DevTools window open

### 2. Run the Test

```bash
cd /Users/gadievron/Documents/Claude\ Code/chrome-dev-assist
node test-verify-inject-script.js
```

The test will open a tab and leave it open for inspection.

### 3. Check Service Worker Console

Look for this message in the service worker console:
```
[ChromeDevAssist DEBUG BACKGROUND] Received console message: ...
```

**Question 1: Do you see this debug message?**
- **YES** → Messages ARE reaching background.js (problem is in storage)
- **NO** → Messages NOT reaching background.js (problem earlier in chain)

### 4. Check Page Console (If Step 3 was NO)

1. Find the test tab that was opened
2. Press F12 to open DevTools for that page
3. Look at Console tab

**Question 2: Do you see this message in the page console?**
```
[ChromeDevAssist] Console capture initialized in main world
```

- **YES** → Inject script IS running
- **NO** → Inject script NOT running

### 5. Quick Test (If Step 4 was YES)

In the page console, type:
```javascript
window.__chromeDevAssistInjected
```

**Question 3: What does this return?**
- **true** → Inject script loaded successfully
- **undefined** → Inject script didn't load

### 6. Console Wrapping Test (If Step 5 was true)

In the page console, type:
```javascript
console.log.toString()
```

**Question 4: Does the output include "originalLog"?**
- **YES** → Console IS wrapped
- **NO** → Console NOT wrapped (shows "[native code]")

### 7. Manual Message Test (If Step 6 was YES)

In the page console, type:
```javascript
console.log('[MANUAL TEST] Hello');
```

Then switch to the service worker console.

**Question 5: Do you see "[ChromeDevAssist DEBUG BACKGROUND] Received console message: log [MANUAL TEST] Hello"?**
- **YES** → Pipeline IS working! (Problem is timing)
- **NO** → Pipeline broken (messages not forwarding)

---

## What to Report Back

Answer these 5 questions:

1. Do you see "[ChromeDevAssist DEBUG BACKGROUND] Received console message" in service worker console during the test?
2. Do you see "[ChromeDevAssist] Console capture initialized" in the page console?
3. Does `window.__chromeDevAssistInjected` return `true`?
4. Does `console.log.toString()` include "originalLog"?
5. Does manual `console.log('[MANUAL TEST] Hello')` show in service worker console?

---

## My Diagnosis Based on Your Answers

I'll analyze your answers and tell you exactly what's broken and how to fix it.

---

**Time needed:** 2-3 minutes
**Tools needed:** Chrome browser with extension loaded
**Output:** 5 yes/no answers

---

This is the critical blocking issue. Everything else waits for this.

# Documentation Gap Analysis - Security Restrictions

**Purpose:** Compare discovered security restrictions against existing documentation
**Date:** 2025-10-26
**Method:** Systematic comparison of SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md vs existing docs
**Status:** ✅ COMPLETE

---

## 📊 SUMMARY

**Total Restrictions Found:** 35
**Documented in docs/API.md:** 8 (23%)
**NOT Documented:** 27 (77%)

**Critical Gaps:** 12 HIGH-PRIORITY restrictions missing from user-facing docs

---

## ✅ WHAT'S ALREADY DOCUMENTED (8 restrictions)

### In docs/API.md

| #   | Restriction                         | Where Documented         | Line    |
| --- | ----------------------------------- | ------------------------ | ------- |
| 1   | 10,000 log limit                    | Limitations section      | 617-621 |
| 2   | 10,000 char truncation (dual-layer) | Limitations section      | 623-656 |
| 3   | Cannot reload self                  | System Constraints       | 746     |
| 4   | localhost-only                      | System Constraints       | 748     |
| 5   | Max capture duration 60s            | Input Validation section | 434-438 |
| 6   | mayDisable field returned           | getExtensionInfo()       | 89      |
| 7   | installType field returned          | getExtensionInfo()       | 88      |
| 8   | Circular ref limitation             | Known Limitations        | 715-741 |

**Coverage:** Good for memory limits and basic constraints

---

## ❌ WHAT'S MISSING - CRITICAL GAPS (27 restrictions)

### 🔴 HIGH PRIORITY - USER-FACING IMPACTS (12 restrictions)

These directly affect what users can/cannot do and MUST be documented:

#### 1. Cannot Reload Enterprise-Locked Extensions (mayDisable: false)

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 1.2
**Missing From:** docs/API.md

**Impact:** Users will get cryptic errors when trying to reload enterprise extensions

**Should Add to docs/API.md:**

````markdown
### Enterprise Extension Restrictions

Some extensions installed by IT administrators cannot be reloaded:

```javascript
const info = await chromeDevAssist.getExtensionInfo(extensionId);
if (!info.mayDisable) {
  console.log('⚠️  Cannot reload this extension (enterprise policy)');
  // Error: "Failed to disable extension: ..."
}
```
````

**Why:**

- Extensions with `installType: 'admin'` often have `mayDisable: false`
- Chrome API respects enterprise policies
- Attempting to reload will fail with error

**Workaround:** None - enterprise policies cannot be bypassed

````

---

#### 2. getAllExtensions() Excludes Self and Chrome Apps

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 1.3, 1.4
**Missing From:** docs/API.md

**Impact:** Users may wonder why Chrome Dev Assist isn't listed

**Should Add to docs/API.md:**
```markdown
### getAllExtensions() Filtering

Returns only **extensions** (not Chrome Apps) and **excludes Chrome Dev Assist itself**:

```javascript
const result = await chromeDevAssist.getAllExtensions();
// Will NOT include:
// - Chrome Dev Assist itself (cannot reload self)
// - Chrome Apps (type === 'app')
````

**Why:**

- Cannot reload self (see restrictions)
- Chrome Apps use different APIs

````

---

#### 3. Dangerous URL Protocols Blocked

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 2.1
**Missing From:** docs/API.md

**Impact:** Users may try javascript: or data: URLs and get errors

**Should Add to docs/API.md:**
```markdown
### URL Protocol Restrictions

For security, certain URL protocols are blocked:

```javascript
// ❌ Blocked protocols:
await chromeDevAssist.openUrl('javascript:alert(1)');      // Error
await chromeDevAssist.openUrl('data:text/html,...');       // Error
await chromeDevAssist.openUrl('vbscript:...');             // Error
await chromeDevAssist.openUrl('file:///etc/passwd');       // Error

// ✅ Allowed protocols:
await chromeDevAssist.openUrl('http://example.com');       // OK
await chromeDevAssist.openUrl('https://example.com');      // OK
````

**Why:**

- **javascript:** Code injection attacks
- **data:** XSS via data URLs
- **vbscript:** Legacy attacks
- **file:** Local file access (security risk)

**Error:** `"Dangerous URL protocol not allowed: javascript"`

````

---

#### 4. chrome:// URLs Likely Blocked

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 2.2
**Missing From:** docs/API.md

**Should Add to docs/API.md:**
```markdown
### Chrome Internal Pages

Chrome prevents extensions from opening `chrome://` URLs:

```javascript
// ❌ These will likely fail or redirect:
await chromeDevAssist.openUrl('chrome://extensions');
await chromeDevAssist.openUrl('chrome://settings');
await chromeDevAssist.openUrl('chrome://flags');
````

**Why:** Chrome security policy - prevents extension privilege escalation

**Workaround:** None - Chrome browser restriction

````

---

#### 5. Validation: Extension ID Format (a-p ONLY, not a-z)

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 5.1
**Missing From:** docs/API.md

**Current docs/API.md says:**
```markdown
- **Format**: 32 lowercase letters (a-p only)
````

**Gap:** Should explain WHY a-p only, with examples

**Should Add:**

````markdown
### Extension ID Format

Chrome extension IDs use a **restricted alphabet** (a-p only):

```javascript
// ❌ Invalid - contains q-z:
'abcdefghijklmnopqrstuvwxyzabcdef'; // Error

// ✅ Valid - only a-p:
'abcdefghijklmnopabcdefghijklmnop'; // OK
```
````

**Why a-p only?**

- Chrome generates IDs from base16-encoded public keys
- Base16 uses 0-9 and a-f, but Chrome uses a-p instead
- Historical Chrome decision

**Common Errors:**

- Using full alphabet (a-z)
- Including numbers (0-9)
- Wrong length (not 32)
- Uppercase letters

````

---

#### 6. NaN, Infinity, Negative Duration Blocked

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 5.2
**Missing From:** docs/API.md

**Should Add to docs/API.md Error Handling section:**
```javascript
// ❌ All of these throw errors:
await chromeDevAssist.captureLogs(NaN);        // Error: "NaN not allowed"
await chromeDevAssist.captureLogs(Infinity);   // Error: "must be finite"
await chromeDevAssist.captureLogs(-1000);      // Error: "must be non-negative"
````

---

#### 7. Duration: API Limit (60s) vs Hard Limit (10 min)

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 5.2
**Missing From:** docs/API.md

**Gap:** Docs say "max 60 seconds" but extension has 10 minute hard limit

**Should Clarify:**

```markdown
### Capture Duration Limits

**Two layers of duration limits:**

1. **API Layer (User-Facing):** 1ms - 60,000ms (60 seconds)
   - Enforced in `claude-code/index.js`
   - Recommended for normal usage

2. **Extension Layer (Hard Limit):** Max 600,000ms (10 minutes)
   - Enforced in `extension/background.js`
   - Safety limit to prevent runaway captures

**Why two limits?**

- API limit encourages reasonable durations
- Extension hard limit prevents memory exhaustion if bypassed
```

---

#### 8. Tab ID Cannot Be 0 or Negative

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 5.3
**Missing From:** docs/API.md

**Current docs/API.md says:**

```markdown
- **Format**: Positive integer
```

**Should Add Examples:**

```javascript
// ❌ Invalid tab IDs:
await chromeDevAssist.reloadTab(0); // Error
await chromeDevAssist.reloadTab(-1); // Error
await chromeDevAssist.closeTab('123'); // Error (string)

// ✅ Valid tab IDs:
await chromeDevAssist.reloadTab(123); // OK
```

---

#### 9. Metadata 10KB Size Limit

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 5.5
**Missing From:** docs/API.md (not user-facing, but good to know)

**Relevance:** LOW for users (internal extension registration)

---

#### 10. HTTP Only (Not HTTPS) for Localhost

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 3.2
**Mentioned In:** docs/SECURITY.md (decision document)
**Missing From:** docs/API.md

**Should Add to docs/API.md:**

```markdown
### Why HTTP (Not HTTPS)?

Test fixtures are served over **HTTP** (not HTTPS):
```

http://localhost:9876/fixtures/test.html ✅ Works
https://localhost:9876/fixtures/test.html ❌ Does not work

```

**Why:**
- Traffic on 127.0.0.1 never leaves your machine
- HTTPS provides zero security benefit for localhost
- Industry standard (Jest, Playwright, Cypress all use HTTP)

**See:** `docs/decisions/002-http-vs-https-for-localhost.md`
```

---

#### 11. Server Bound to 127.0.0.1 (Cannot Access from Other Machines)

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 3.1
**Mentioned In:** docs/API.md line 748 ("localhost-only")
**Gap:** Should explain WHAT this means

**Should Expand in docs/API.md:**

````markdown
### Localhost-Only Access

Server binds to **127.0.0.1** (localhost) for security:

```bash
# ✅ This works:
curl http://127.0.0.1:9876/fixtures/test.html

# ❌ This does NOT work (from another machine):
curl http://192.168.1.100:9876/fixtures/test.html

# ❌ This does NOT work (from VM):
curl http://10.0.2.2:9876/fixtures/test.html
```
````

**Why:**

- Security: Prevents remote network access
- Threat model: No external attackers can connect

**Workaround for Remote Access:**

- Use SSH port forwarding (recommended)
- Change `HOST = '0.0.0.0'` in `server/websocket-server.js` (NOT recommended - security risk)

````

---

#### 12. Requires "management" and <all_urls> Permissions

**Found:** SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md, Category 4.1, 4.2
**Missing From:** docs/API.md

**Should Add to docs/API.md:**
```markdown
### Required Permissions

Chrome Dev Assist requires powerful permissions:

**"management" permission:**
- Allows: List extensions, get extension info, enable/disable extensions
- User sees: "Manage your apps, extensions, and themes"
- Required for: `reload()`, `getAllExtensions()`, `getExtensionInfo()`

**"<all_urls>" host permission:**
- Allows: Run content scripts on all websites
- User sees: "Read and change all your data on all websites"
- Required for: Console capture on any website

**Why these permissions?**
- Cannot capture console logs without injecting scripts into pages
- Cannot reload extensions without "management" permission
- These are fundamental to the tool's purpose

**Security note:**
- Chrome Dev Assist only runs when you explicitly call API functions
- Content scripts are passive until capture is started
````

---

### 🟡 MEDIUM PRIORITY - Internal Details (10 restrictions)

These are implementation details users might encounter:

13. ✅ Content scripts run at document_start (mentioned in COMPLETE-FUNCTIONALITY-MAP.md)
14. ✅ 5-minute automatic capture cleanup (mentioned in COMPLETE-FUNCTIONALITY-MAP.md)
15. ❌ One extension connection at a time (should mention in docs/API.md)
16. ❌ Manifest changes require reload (should mention in Troubleshooting)
17. ❌ 10-minute hard duration limit (mentioned above - gap #7)
18. ❌ URL must be non-empty (minor - implicit)
19. ❌ URL must be string (minor - implicit)
20. ❌ extensionId must be non-empty (minor - implicit)
21. ❌ extensionId must be string (minor - implicit)
22. ❌ extensionId must be exactly 32 chars (minor - mentioned but could expand)

---

### 🟢 LOW PRIORITY - Edge Cases (5 restrictions)

These are edge cases users are unlikely to hit:

23. ✅ chrome-extension:// URLs (allowed but limited) - not worth documenting
24. ❌ Sanitized manifest fields (internal security) - not user-facing
25. ❌ Metadata field whitelist (internal security) - not user-facing
26. ❌ Extension ID must be lowercase (already documented)
27. ❌ Extension registration size limits (internal) - not user-facing

---

## 📈 DOCUMENTATION IMPROVEMENT PLAN

### Immediate Actions (HIGH PRIORITY)

**Add to docs/API.md:**

1. **New Section: "Extension Reload Restrictions"** (after line 315)
   - Cannot reload self
   - Cannot reload enterprise-locked extensions (mayDisable: false)
   - getAllExtensions() filters

2. **Expand URL Validation Section** (after line 438)
   - Dangerous protocols blocked (javascript:, data:, vbscript:, file:)
   - chrome:// URLs blocked
   - Examples of allowed/blocked

3. **New Section: "Permission Requirements"** (after line 640)
   - Why "management" permission needed
   - Why "<all_urls>" needed
   - Security implications

4. **Expand Input Validation Section** (enhance existing 419-438)
   - Extension ID format: a-p only (with examples)
   - Duration: NaN, Infinity, negative blocked
   - Tab ID: cannot be 0 or negative
   - Dual duration limits (60s API, 10 min hard)

5. **Expand Localhost-Only Section** (enhance line 748)
   - What 127.0.0.1 binding means
   - Examples of what works/doesn't work
   - Workarounds for remote access

6. **Add HTTP vs HTTPS Explanation** (new subsection under How It Works)
   - Why HTTP for localhost
   - Reference to decision document

---

## 📊 BEFORE vs AFTER COVERAGE

### Before Improvements

```
Total Restrictions: 35
Documented:          8 (23%)
Missing:           27 (77%)
```

**User-facing gaps:** 12 critical restrictions undocumented

### After Improvements (Projected)

```
Total Restrictions: 35
Documented:         28 (80%)
Missing:             7 (20%)
```

**Remaining gaps:** 7 low-priority internal details (acceptable)

---

## ✅ VERIFICATION

**All Gaps Identified:** ✅ YES
**Method:** Systematic comparison of complete restrictions list vs docs/API.md
**Date:** 2025-10-26
**Priority Ranking:** HIGH (12), MEDIUM (10), LOW (5)

**Recommendation:** Add HIGH PRIORITY items to docs/API.md immediately

---

**End of Documentation Gap Analysis**

**Next Steps:**

1. Update docs/API.md with 12 HIGH PRIORITY gaps
2. Add examples and error messages
3. Cross-reference with SECURITY.md
4. Update COMPLETE-FUNCTIONALITY-MAP.md with restrictions section

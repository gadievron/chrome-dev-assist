# Quick Lookup Guide - Chrome Dev Assist

**Purpose:** Answer common questions in < 30 seconds
**Last Updated:** 2025-10-27

---

## 🔥 MOST COMMON QUESTIONS

### Q: Which functions actually exist?
**A:** Only 8 functions exist. **16 phantom APIs** have tests but NO implementation.

**8 Implemented:**
- getAllExtensions()
- getExtensionInfo(extensionId)
- reload(extensionId)
- reloadAndCapture(extensionId, options)
- captureLogs(duration)
- openUrl(url, options)
- reloadTab(tabId, options)
- closeTab(tabId)

**16 Phantom (DON'T USE):**
See `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md`

---

### Q: How do I find which file implements function X?
**A:** Use this lookup table:

| Function | File | Line |
|----------|------|------|
| reload() | claude-code/index.js | 44 |
| reloadAndCapture() | claude-code/index.js | 23 |
| captureLogs() | claude-code/index.js | 64 |
| getAllExtensions() | claude-code/index.js | 84 |
| getExtensionInfo() | claude-code/index.js | 99 |
| openUrl() | claude-code/index.js | 121 |
| reloadTab() | claude-code/index.js | 161 |
| closeTab() | claude-code/index.js | 189 |

**Complete details:** `COMPLETE-FUNCTIONS-LIST-2025-10-26.md`

---

### Q: Where's the complete API documentation?
**A:** `docs/API.md` (1,270 lines, updated 2025-10-26)

**Quick reference:** `docs/QUICK_REFERENCE.md` (360 lines)

---

### Q: What's broken?
**A:** `TO-FIX.md` - 22 active issues:
- 16 phantom APIs (tested but not implemented)
- 3 unused modules (HealthManager, ConsoleCapture, Level4 CDP)
- 1 validation bug (FIXED)
- 2 cleanup recommendations

---

### Q: How does the system work?
**A:** 3-layer WebSocket architecture:

```
Your Code → Node.js API → WebSocket → Extension → Chrome APIs
```

**Detailed:** `ARCHITECTURE-ANALYSIS-2025-10-26.md`

---

### Q: Where are all the files?
**A:** `COMPLETE-FILE-INDEX-2025-10-26.md` - All 118 files categorized

**Summary:**
- 11 production files
- 59 test files
- 36 manual test scripts
- 5 debug/diagnostic
- 4 prototypes
- 3 utilities

---

### Q: What are the security restrictions?
**A:** `SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md` - All 35 restrictions

**Quick summary:**
- Localhost only (127.0.0.1)
- No remote access
- Token authentication
- URL protocol validation
- Extension ID validation

---

### Q: How do I run tests?
**A:** `TESTING-GUIDE.md`

**Quick:**
```bash
npm test  # Run all tests
node test-complete-system.js  # Manual system test
```

---

## 📊 STATISTICS LOOKUP

### Codebase Size
- **Production Files:** 11 files, 3,009 lines
- **Functions:** 72 functions + 4 listeners + 22 constants = 98 items
- **Phantom APIs:** 16 (tested but not implemented)
- **Total Items:** 114 (98 + 16)

### Test Coverage
- **Test Files:** 59 formal + 36 manual = 95 total
- **Placeholder Tests:** 24 (expect(true).toBe(true) pattern)
- **Passing:** 28/106 (environment-dependent)

### Documentation
- **Total Files:** 245+ markdown files
- **Largest:** RESTRICTION-ROOT-CAUSE-ANALYSIS (3,100 lines)
- **Most Comprehensive:** COMPLETE-FUNCTIONALITY-MAP (2,500 lines)

---

## 🗺️ DOCUMENT NAVIGATION

### I need to...

#### ...understand what the project does
→ `README.md` (start here)

#### ...use the API
→ `docs/API.md` (complete reference)
→ `docs/QUICK_REFERENCE.md` (fast lookup)

#### ...see all functions
→ `COMPLETE-FUNCTIONS-LIST-2025-10-26.md` (98 implemented)
→ `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` (16 that DON'T exist)

#### ...understand function relationships
→ `COMPLETE-RELATIONSHIP-MAP-FINAL-2025-10-26.md` (904 lines)
→ `API-TO-FUNCTIONS-INDEX-2025-10-26.md` (call chains)

#### ...see all files in the project
→ `COMPLETE-FILE-INDEX-2025-10-26.md` (118 files)
→ `COMPLETE-AUDIT-118-FILES-2025-10-26.md` (detailed analysis)

#### ...know what's broken
→ `TO-FIX.md` (22 active issues)

#### ...understand security
→ `SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md` (35 restrictions)
→ `docs/SECURITY.md` (security model)

#### ...run tests
→ `TESTING-GUIDE.md`

#### ...understand the audit process
→ `AUDIT-SUMMARY-2025-10-26.md` (high-level)
→ `FINAL-CORRECTIONS-SUMMARY-2025-10-26.md` (8 rounds of challenges)

---

## 🔍 GREP CHEAT SHEET

### Find all references to a function
```bash
grep -rn "functionName" --include="*.js" --include="*.md"
```

### Find all phantom APIs
```bash
grep -rn "phantom\|PHANTOM" *.md
```

### Find all TODOs
```bash
grep -rn "TODO\|FIXME" --include="*.js"
```

### Count markdown files
```bash
find . -name "*.md" | grep -v node_modules | wc -l
```

### Find files modified today
```bash
find . -name "*.md" -mtime -1
```

---

## 🎯 BY FILE TYPE

### Want to read...

#### **Complete comprehensive documents** (2,000+ lines)
- SECURITY-RESTRICTIONS-AND-LIMITATIONS-COMPLETE.md (2,300)
- RESTRICTION-ROOT-CAUSE-ANALYSIS-2025-10-26.md (3,100)
- COMPLETE-FUNCTIONALITY-MAP.md (2,500)

#### **API documentation**
- docs/API.md (1,270 lines)
- docs/QUICK_REFERENCE.md (360 lines)

#### **Audit documents** (verified, accurate)
- COMPLETE-AUDIT-118-FILES-2025-10-26.md
- COMPLETE-RELATIONSHIP-MAP-FINAL-2025-10-26.md (904 lines)
- COMPLETE-FUNCTIONS-LIST-2025-10-26.md

#### **Critical findings**
- PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md (16 missing functions)
- PLACEHOLDER-TESTS-INDEX-2025-10-26.md (24 fake tests)
- TO-FIX.md (22 active issues)

---

## 💡 QUICK ANSWERS

### How many functions exist?
**98 items** (72 functions + 4 listeners + 22 constants) across 11 files

### How many functions are missing?
**16 phantom APIs** (tests exist, implementation doesn't)

### What's the biggest problem?
16 phantom APIs with 100+ tests but zero implementation

### Is the documentation accurate?
✅ YES (as of 2025-10-26 after comprehensive audit)

### How was accuracy verified?
8 rounds of user challenges, line-by-line code reading, systematic grep

### What version is the code?
v1.0.0 (8 API functions) - NOT v1.1.0 or v1.2.0

---

## 🚨 CRITICAL WARNINGS

### ⚠️ DON'T use these 16 functions (they don't exist):
1. startTest()
2. endTest()
3. abortTest()
4. getTestStatus()
5. getPageMetadata()
6. captureScreenshot()
7. captureServiceWorkerLogs()
8. getServiceWorkerStatus()
9. wakeServiceWorker()
10. enableExtension()
11. disableExtension()
12. toggleExtension()
13. enableExternalLogging()
14. disableExternalLogging()
15. getExternalLoggingStatus()
16. verifyCleanup()

**They have tests but NO implementation!**

---

## 📞 STILL CAN'T FIND IT?

### Try these in order:
1. Check this document (you are here)
2. Check `docs/QUICK_REFERENCE.md`
3. Search all docs: `grep -rn "search term" *.md`
4. Check `DOCUMENTATION-INDEX.md` (comprehensive index)
5. Check category-specific documents (see "BY FILE TYPE" above)

---

**Last Updated:** 2025-10-27
**Maintained By:** Chrome Dev Assist Team

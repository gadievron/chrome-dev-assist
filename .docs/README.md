# Documentation Index - Chrome Dev Assist

**Welcome to the Chrome Dev Assist documentation system.**

This directory contains the comprehensive, structured documentation for Chrome Dev Assist following the 12-file pragmatic documentation standard.

**Last Updated:** 2025-10-30
**Documentation Version:** 1.0
**Project Version:** 1.0.0

---

## 📚 Quick Navigation

### 🎯 Product & Features

- [**PRD.md**](PRD.md) - Product requirements and feature specifications
- [**FUNCTIONALITY_MAP.md**](FUNCTIONALITY_MAP.md) - Features → UI → API → Functions → Database

### 🏗️ Architecture & Design

- [**ARCHITECTURE.md**](ARCHITECTURE.md) - System architecture and components
- [**DATA_FLOW.md**](DATA_FLOW.md) - Data and process flows
- [**DECISIONS.md**](DECISIONS.md) - Architecture decision records (ADRs)

### 💻 Implementation

- [**API_MAP.md**](API_MAP.md) - Complete API reference
- [**FUNCTIONS_INDEX.md**](FUNCTIONS_INDEX.md) - Function registry with examples
- [**FILE_INDEX.md**](FILE_INDEX.md) - Complete file inventory

### 🧪 Quality & Testing

- [**TEST_INDEX.md**](TEST_INDEX.md) - Test coverage and patterns
- [**DEPENDENCIES.md**](DEPENDENCIES.md) - Dependencies and versions ✅ COMPLETE

### 📝 UI & Changes

- [**UI_MAP.md**](UI_MAP.md) - UI components map (extension UI)
- [**CHANGES.md**](CHANGES.md) - Chronological change log

### 🌳 Meta

- [**KNOWLEDGE_TREE.md**](KNOWLEDGE_TREE.md) - Document relationships and dependencies

---

## 🎯 Documentation Purpose

This `.docs/` directory provides:

1. **Single Source of Truth** - All project knowledge centralized
2. **Progressive Disclosure** - Start high-level, drill down as needed
3. **Cross-References** - Easily navigate related information
4. **Maintainability** - Structured format for easy updates
5. **Onboarding** - New developers get complete picture quickly

---

## 📖 How to Use This Documentation

### For New Developers

**Day 1: Get Oriented**

1. Read [PRD.md](PRD.md) - Understand what we're building
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) - Understand how it works
3. Read [API_MAP.md](API_MAP.md) - See what's available

**Day 2: Go Deeper** 4. Read [FUNCTIONALITY_MAP.md](FUNCTIONALITY_MAP.md) - See feature → code mappings 5. Read [DATA_FLOW.md](DATA_FLOW.md) - Understand data paths 6. Read [TEST_INDEX.md](TEST_INDEX.md) - Learn testing patterns

**Ongoing:**

- Reference [FUNCTIONS_INDEX.md](FUNCTIONS_INDEX.md) when working with specific functions
- Check [DECISIONS.md](DECISIONS.md) to understand "why" choices were made
- Update [CHANGES.md](CHANGES.md) after completing work

### For Existing Developers

**Before Starting Work:**

- Read [PRD.md](PRD.md) - Check feature requirements
- Read [ARCHITECTURE.md](ARCHITECTURE.md) - Review relevant components
- Check [TEST_INDEX.md](TEST_INDEX.md) - Understand test coverage

**During Development:**

- Reference [API_MAP.md](API_MAP.md) - API contracts
- Reference [FUNCTIONS_INDEX.md](FUNCTIONS_INDEX.md) - Implementation details
- Check [DEPENDENCIES.md](DEPENDENCIES.md) - Version compatibility

**After Completing Work:**

- Update [CHANGES.md](CHANGES.md) - Log your changes
- Update [PRD.md](PRD.md) - Mark features complete
- Update [TEST_INDEX.md](TEST_INDEX.md) - Add new tests
- Update [FUNCTIONALITY_MAP.md](FUNCTIONALITY_MAP.md) - Map new features

### For Debugging

**Issue: Feature not working**

1. Check [FUNCTIONALITY_MAP.md](FUNCTIONALITY_MAP.md) - Find responsible code
2. Check [DATA_FLOW.md](DATA_FLOW.md) - Trace data path
3. Check [TEST_INDEX.md](TEST_INDEX.md) - Find relevant tests

**Issue: API confusion**

1. Check [API_MAP.md](API_MAP.md) - API contracts
2. Check [FUNCTIONS_INDEX.md](FUNCTIONS_INDEX.md) - Implementation

**Issue: Architecture question**

1. Check [ARCHITECTURE.md](ARCHITECTURE.md) - Component details
2. Check [DECISIONS.md](DECISIONS.md) - Why it's designed that way

### For Planning

**Adding New Feature:**

1. Update [PRD.md](PRD.md) - Define requirements
2. Update [ARCHITECTURE.md](ARCHITECTURE.md) - Design components
3. Update [DATA_FLOW.md](DATA_FLOW.md) - Plan data paths
4. Document in [DECISIONS.md](DECISIONS.md) - Record design choices

**Refactoring:**

1. Check [ARCHITECTURE.md](ARCHITECTURE.md) - Understand current design
2. Check [DECISIONS.md](DECISIONS.md) - Why current design exists
3. Update [CHANGES.md](CHANGES.md) - Log refactor reasoning

---

## 🔄 Update Workflow

**After every completed task**, update relevant files:

### Mandatory Updates

✅ **CHANGES.md** - ALWAYS log what changed
✅ **TEST_INDEX.md** - If tests added/modified
✅ **PRD.md** - If feature status changed

### Conditional Updates

- **API_MAP.md** - If API added/changed
- **FUNCTIONS_INDEX.md** - If functions added/changed
- **ARCHITECTURE.md** - If components added/changed
- **DATA_FLOW.md** - If data flows changed
- **FUNCTIONALITY_MAP.md** - If feature mappings changed
- **FILE_INDEX.md** - If files added/removed
- **DEPENDENCIES.md** - If dependencies changed
- **UI_MAP.md** - If UI components changed
- **DECISIONS.md** - If significant design choices made

### Use the /docupdate Command

```bash
# After completing work
/docupdate

# Claude Code will:
# 1. Scan changes
# 2. Update all 12 relevant files
# 3. Verify consistency
# 4. Report what was updated
```

---

## 📊 Documentation Statistics

**Total Files:** 13 (12 core + 1 index)
**Estimated Lines:** ~5,000 lines (when complete)
**Update Frequency:** After every task
**Maintainers:** All contributors

---

## 🌳 Document Relationships

See [KNOWLEDGE_TREE.md](KNOWLEDGE_TREE.md) for visual map of how documents relate to each other.

**Quick Relationships:**

- **PRD.md** → FUNCTIONALITY_MAP.md → API_MAP.md → FUNCTIONS_INDEX.md
- **ARCHITECTURE.md** → DATA_FLOW.md → FUNCTIONS_INDEX.md
- **TEST_INDEX.md** → FUNCTIONS_INDEX.md → API_MAP.md
- **CHANGES.md** references all other files

---

## 📁 File Reference

| File                 | Purpose                | Lines      | Status           |
| -------------------- | ---------------------- | ---------- | ---------------- |
| README.md            | This file - Navigation | ~200       | ✅ Complete      |
| KNOWLEDGE_TREE.md    | Document relationships | ~150       | 🔄 Pending       |
| PRD.md               | Product requirements   | ~400       | 🔄 Pending       |
| ARCHITECTURE.md      | System architecture    | ~500       | 🔄 Pending       |
| API_MAP.md           | API reference          | ~600       | 🔄 Pending       |
| DATA_FLOW.md         | Data flows             | ~300       | 🔄 Pending       |
| FUNCTIONS_INDEX.md   | Function registry      | ~800       | 🔄 Pending       |
| FUNCTIONALITY_MAP.md | Feature mapping        | ~400       | 🔄 Pending       |
| UI_MAP.md            | UI components          | ~200       | 🔄 Pending       |
| FILE_INDEX.md        | File inventory         | ~300       | 🔄 Pending       |
| TEST_INDEX.md        | Test coverage          | ~1,200     | 🔄 Pending       |
| DEPENDENCIES.md      | Dependencies           | ~195       | ✅ Complete      |
| CHANGES.md           | Change log             | ~400       | 🔄 Pending       |
| DECISIONS.md         | ADRs                   | ~300       | 🔄 Pending       |
| **TOTAL**            | **All documentation**  | **~5,945** | **15% complete** |

---

## 🔗 External Documentation

**In addition to `.docs/`, see also:**

- `../README.md` - Project overview and quick start
- `../TO-FIX.md` - Active issues (18 tracked)
- `../FIXED-LOG.md` - Resolved issues
- `../FEATURE-SUGGESTIONS-TBD.md` - Future features
- `../docs/` - Additional guides and analysis
- `../CLAUDE.md` - Development rules and guidelines

---

## ❓ Getting Help

**Can't find what you need?**

1. Search this index for keywords
2. Check [KNOWLEDGE_TREE.md](KNOWLEDGE_TREE.md) for relationships
3. Use `grep -r "keyword" .docs/` to search all docs
4. Check `../docs/` for additional guides

**Documentation gaps?**

- Log in [CHANGES.md](CHANGES.md) under "Documentation Updates" section
- Or create issue in `../TO-FIX.md`

---

**Documentation Standard:** Pragmatic Rules v2.1
**Created:** 2025-10-30
**Maintained By:** Chrome Dev Assist Team

# Knowledge Tree - Chrome Dev Assist Documentation

**Visual map of document relationships and dependencies**

**Last Updated:** 2025-10-30

---

## 🌳 Document Hierarchy

```
ROOT: Chrome Dev Assist Project
│
├── 📋 PLANNING & REQUIREMENTS
│   ├── PRD.md ──────────┐
│   │   └── Features     │
│   │   └── Status       │
│   │   └── Priorities   │
│   │                    │
│   └── DECISIONS.md ────┤
│       └── ADRs         │
│       └── Why choices  │
│                        │
├── 🏗️ ARCHITECTURE     │
│   ├── ARCHITECTURE.md ─┤
│   │   └── Components   │
│   │   └── Patterns     │
│   │   └── Layers       │
│   │                    │
│   └── DATA_FLOW.md ────┤
│       └── Processes    │
│       └── Data paths   │
│                        │
├── 💻 IMPLEMENTATION    │
│   ├── API_MAP.md ──────┼──┐
│   │   └── Endpoints    │  │
│   │   └── Contracts    │  │
│   │                    │  │
│   ├── FUNCTIONS_INDEX─┼──┤
│   │   └── Functions    │  │
│   │   └── Examples     │  │
│   │                    │  │
│   ├── FUNCTIONALITY_  │  │
│   │   MAP.md ──────────┘  │
│   │   └── Feature→Code    │
│   │                       │
│   ├── FILE_INDEX.md ──────┤
│   │   └── File list       │
│   │   └── LOC             │
│   │                       │
│   └── UI_MAP.md ──────────┤
│       └── Components      │
│       └── Props           │
│                           │
├── 🧪 QUALITY             │
│   ├── TEST_INDEX.md ──────┤
│   │   └── Test files     │
│   │   └── Coverage       │
│   │                      │
│   └── DEPENDENCIES.md ───┤
│       └── Packages       │
│       └── Versions       │
│                          │
└── 📝 HISTORY            │
    └── CHANGES.md ────────┘
        └── Chronological log
        └── References all above
```

---

## 🔗 Document Dependencies

### PRD.md (Product Requirements)

**Depends on:** None (root document)

**Depended on by:**

- FUNCTIONALITY_MAP.md (maps features to code)
- TEST_INDEX.md (tracks feature test coverage)
- CHANGES.md (logs feature implementation)

**Updates trigger:**

- FUNCTIONALITY_MAP.md (when features change)
- TEST_INDEX.md (when requirements change)

---

### ARCHITECTURE.md (System Architecture)

**Depends on:**

- PRD.md (features define architecture needs)

**Depended on by:**

- DATA_FLOW.md (flows follow architecture)
- FUNCTIONS_INDEX.md (functions implement components)
- FILE_INDEX.md (files organize per architecture)

**Updates trigger:**

- DATA_FLOW.md (when components change)
- FILE_INDEX.md (when structure changes)

---

### DATA_FLOW.md (Process Flows)

**Depends on:**

- ARCHITECTURE.md (components define flows)
- FUNCTIONS_INDEX.md (flows call functions)

**Depended on by:**

- FUNCTIONALITY_MAP.md (features follow flows)
- TEST_INDEX.md (tests verify flows)

**Updates trigger:**

- FUNCTIONALITY_MAP.md (when flows change)

---

### API_MAP.md (API Reference)

**Depends on:**

- PRD.md (features define API needs)
- ARCHITECTURE.md (API layer design)

**Depended on by:**

- FUNCTIONS_INDEX.md (functions implement APIs)
- FUNCTIONALITY_MAP.md (features use APIs)
- TEST_INDEX.md (tests verify APIs)

**Updates trigger:**

- FUNCTIONS_INDEX.md (when API changes)
- TEST_INDEX.md (when contracts change)

---

### FUNCTIONS_INDEX.md (Function Registry)

**Depends on:**

- ARCHITECTURE.md (component design)
- API_MAP.md (API contracts)
- FILE_INDEX.md (function locations)

**Depended on by:**

- FUNCTIONALITY_MAP.md (maps functions to features)
- DATA_FLOW.md (flows call functions)
- TEST_INDEX.md (tests cover functions)

**Updates trigger:**

- FUNCTIONALITY_MAP.md (when functions change)
- TEST_INDEX.md (when function coverage changes)

---

### FUNCTIONALITY_MAP.md (Feature Mapping)

**Depends on:**

- PRD.md (features defined)
- API_MAP.md (API endpoints)
- FUNCTIONS_INDEX.md (functions available)
- UI_MAP.md (UI components)

**Depended on by:**

- TEST_INDEX.md (tests verify features)

**Updates trigger:**

- TEST_INDEX.md (when feature implementation changes)

---

### UI_MAP.md (UI Components)

**Depends on:**

- ARCHITECTURE.md (UI layer design)
- API_MAP.md (APIs UI calls)

**Depended on by:**

- FUNCTIONALITY_MAP.md (features use UI)
- TEST_INDEX.md (UI tests)

**Updates trigger:**

- FUNCTIONALITY_MAP.md (when UI changes)

---

### FILE_INDEX.md (File Inventory)

**Depends on:**

- ARCHITECTURE.md (file organization)

**Depended on by:**

- FUNCTIONS_INDEX.md (function locations)
- TEST_INDEX.md (test file locations)

**Updates trigger:**

- FUNCTIONS_INDEX.md (when files move)

---

### TEST_INDEX.md (Test Coverage)

**Depends on:**

- All implementation docs (tests verify everything)

**Depended on by:**

- CHANGES.md (logs test updates)

**Updates trigger:**

- None (leaf node)

---

### DEPENDENCIES.md (Dependencies)

**Depends on:**

- package.json (source of truth)

**Depended on by:**

- ARCHITECTURE.md (architecture uses dependencies)
- CHANGES.md (logs dependency updates)

**Updates trigger:**

- None (leaf node)

---

### CHANGES.md (Change Log)

**Depends on:**

- All documents (logs changes to all)

**Depended on by:**

- None (terminal node)

**Updates trigger:**

- None (leaf node)

---

### DECISIONS.md (ADRs)

**Depends on:**

- PRD.md (decisions about requirements)
- ARCHITECTURE.md (decisions about design)

**Depended on by:**

- ARCHITECTURE.md (ADRs justify design)
- API_MAP.md (ADRs justify API choices)

**Updates trigger:**

- None (mostly append-only)

---

## 🔄 Update Propagation

**When you change one file, consider updating:**

### Changed PRD.md

→ Update FUNCTIONALITY_MAP.md (feature mappings)
→ Update TEST_INDEX.md (test requirements)
→ Update CHANGES.md (log changes)

### Changed ARCHITECTURE.md

→ Update DATA_FLOW.md (flows may change)
→ Update FILE_INDEX.md (structure may change)
→ Update FUNCTIONS_INDEX.md (components may change)
→ Update CHANGES.md (log changes)

### Changed API_MAP.md

→ Update FUNCTIONS_INDEX.md (implementation)
→ Update FUNCTIONALITY_MAP.md (feature mappings)
→ Update TEST_INDEX.md (API tests)
→ Update CHANGES.md (log changes)

### Changed FUNCTIONS_INDEX.md

→ Update FUNCTIONALITY_MAP.md (if feature impact)
→ Update TEST_INDEX.md (test coverage)
→ Update CHANGES.md (log changes)

### Changed Any File

→ **ALWAYS** update CHANGES.md

---

## 📊 Document Maturity Levels

**Level 1: Requirements (Foundation)**

- PRD.md
- DECISIONS.md

**Level 2: Design (Structure)**

- ARCHITECTURE.md
- DATA_FLOW.md
- API_MAP.md

**Level 3: Implementation (Code)**

- FUNCTIONS_INDEX.md
- FILE_INDEX.md
- UI_MAP.md

**Level 4: Integration (Features)**

- FUNCTIONALITY_MAP.md

**Level 5: Quality (Verification)**

- TEST_INDEX.md
- DEPENDENCIES.md

**Level 6: History (Tracking)**

- CHANGES.md

---

## 🎯 Read Order for Different Goals

### Goal: Understand the Project

1. PRD.md (what we're building)
2. ARCHITECTURE.md (how it works)
3. API_MAP.md (what's available)

### Goal: Add a New Feature

1. PRD.md (define requirements)
2. ARCHITECTURE.md (design approach)
3. API_MAP.md (API design)
4. FUNCTIONS_INDEX.md (implementation)
5. TEST_INDEX.md (test plan)
6. FUNCTIONALITY_MAP.md (feature mapping)
7. CHANGES.md (log it)

### Goal: Fix a Bug

1. FUNCTIONALITY_MAP.md (find responsible code)
2. FUNCTIONS_INDEX.md (find function)
3. DATA_FLOW.md (trace flow)
4. TEST_INDEX.md (find tests)
5. CHANGES.md (log fix)

### Goal: Refactor Code

1. ARCHITECTURE.md (understand current design)
2. DECISIONS.md (why current design)
3. FUNCTIONS_INDEX.md (what will change)
4. TEST_INDEX.md (verify no regression)
5. CHANGES.md (log refactor)

---

## 📈 Documentation Metrics

**Completeness Score:** 15% (2/13 files complete)

- ✅ README.md - Complete
- ✅ DEPENDENCIES.md - Complete
- 🔄 All others - Pending

**Cross-Reference Count:** ~50 (estimated)
**Update Frequency:** After every task
**Last Full Review:** 2025-10-30

---

**Maintainer:** Chrome Dev Assist Team
**Review Frequency:** Monthly (or when structure changes)

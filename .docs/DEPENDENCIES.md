# Dependencies - Chrome Dev Assist

**Last Updated:** 2025-10-30
**Project Version:** 1.0.0

---

## Production Dependencies

### Runtime Libraries

| Package | Version | Purpose                                   | Critical? | License |
| ------- | ------- | ----------------------------------------- | --------- | ------- |
| `ws`    | 8.18.3  | WebSocket server and client communication | Yes       | MIT     |
| `uuid`  | 13.0.0  | Command ID generation for message routing | Yes       | MIT     |

**Total Production Dependencies:** 2

---

## Development Dependencies

### Testing

| Package | Version | Purpose                   |
| ------- | ------- | ------------------------- |
| `jest`  | 29.7.0  | Test framework and runner |

### Code Quality

| Package    | Version | Purpose            |
| ---------- | ------- | ------------------ |
| `eslint`   | 8.57.0  | JavaScript linting |
| `prettier` | 3.1.1   | Code formatting    |

### Git Hooks & Pre-Commit

| Package       | Version | Purpose                     |
| ------------- | ------- | --------------------------- |
| `husky`       | 8.0.3   | Git hooks management        |
| `lint-staged` | 15.2.0  | Run linters on staged files |

**Total Dev Dependencies:** 5

---

## Chrome Extension Requirements

### Minimum Chrome Version

- **Chrome 88+** (Manifest V3 support)
- Service workers required
- chrome.management API required
- chrome.scripting API required (Manifest V3)

### Required Permissions

Declared in `extension/manifest.json`:

| Permission   | Purpose                                      | Risk Level   |
| ------------ | -------------------------------------------- | ------------ |
| `management` | Control extensions (reload, enable, disable) | High         |
| `tabs`       | Access tab information for commands          | High         |
| `scripting`  | Inject console capture scripts               | High         |
| `<all_urls>` | Access all websites for console capture      | **CRITICAL** |

---

## Node.js Requirements

- **Node.js 14+** (ES2020 support)
- `npm` or `yarn` for package management

---

## Security Audit

**Last Audit:** 2025-10-30
**Method:** `npm audit`

**Vulnerabilities:**

- 0 critical
- 0 high
- 0 medium
- 0 low

**Next Audit:** 2025-11-30 (monthly)

---

## Dependency Security Notes

### `ws` (WebSocket Library)

- **Security:** Mature, widely-used library
- **Binding:** localhost:9876 only (no external exposure)
- **Version:** Using latest stable (8.18.3)

### `uuid` (UUID Generation)

- **Security:** Cryptographically secure random UUIDs
- **Purpose:** Prevent command ID collisions
- **Version:** Using v13.0.0 (latest major)

### Development Tools

- All dev dependencies used for tooling only
- Not included in production runtime
- Security impact: Low (build-time only)

---

## Update Policy

### Production Dependencies

- **Security patches:** Apply immediately
- **Minor versions:** Review changelog, update quarterly
- **Major versions:** Requires testing, plan migration

### Development Dependencies

- **Update frequency:** Quarterly
- **Breaking changes:** Test before upgrading
- **Priority:** Security > Features > Performance

---

## Dependency Graph

```
chrome-dev-assist (production)
├── ws@8.18.3 (WebSocket communication)
│   └── (no transitive dependencies - self-contained)
└── uuid@13.0.0 (UUID generation)
    └── (no transitive dependencies - self-contained)

chrome-dev-assist (development)
├── jest@29.7.0
├── eslint@8.57.0
├── prettier@3.1.1
├── husky@8.0.3
└── lint-staged@15.2.0
```

**Total Dependencies (including transitive):** ~50-60 packages

---

## Compatibility Matrix

### Node.js Versions

| Version | Status       | Notes           |
| ------- | ------------ | --------------- |
| Node 14 | ✅ Supported | Minimum version |
| Node 16 | ✅ Supported | Recommended     |
| Node 18 | ✅ Supported | Latest LTS      |
| Node 20 | ✅ Supported | Current         |

### Chrome Versions

| Version       | Status       | Notes               |
| ------------- | ------------ | ------------------- |
| Chrome 88-91  | ✅ Supported | Manifest V3 minimum |
| Chrome 92-110 | ✅ Supported | Tested              |
| Chrome 111+   | ✅ Supported | Current             |

---

## Installation Commands

```bash
# Install production dependencies
npm install --production

# Install all dependencies (including dev)
npm install

# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Audit security vulnerabilities
npm audit

# Fix security issues automatically
npm audit fix
```

---

## Lock File

- **File:** `package-lock.json`
- **Purpose:** Ensure reproducible installs
- **Version:** npm lockfile v2
- **Committed:** Yes (required for CI/CD)

---

## Future Dependency Considerations

### Potential Additions

1. **Puppeteer** (planned)
   - Purpose: Automated Chrome launch for tests
   - Impact: +50MB install size
   - Status: Tracked in TO-FIX.md

2. **Tesseract.js** (optional)
   - Purpose: Screenshot OCR validation
   - Impact: +10MB install size
   - Status: ISSUE-005

### Deprecation Candidates

- None currently

---

**Lines:** 195
**Maintainer:** Chrome Dev Assist Team
**Review Frequency:** Quarterly

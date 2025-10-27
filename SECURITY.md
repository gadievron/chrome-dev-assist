# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **GitHub Security Advisories** (preferred):
   - Go to: https://github.com/gadievron/chrome-dev-assist/security/advisories
   - Click "Report a vulnerability"
   - Fill in the details

2. **Email** (if GitHub is not available):
   - Send details to: gadievron@users.noreply.github.com
   - Include "SECURITY" in the subject line

### What to Include

Please include:

- **Description**: Clear description of the vulnerability
- **Impact**: What an attacker could do
- **Reproduction**: Step-by-step instructions to reproduce
- **Affected versions**: Which versions are affected
- **Suggested fix** (optional): If you have ideas for fixing it

### What to Expect

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### Security Features

This project includes:

- ✅ **Automated Dependency Scanning** (Dependabot)
- ✅ **CodeQL Security Analysis** (GitHub Advanced Security)
- ✅ **Secret Scanning** (Gitleaks)
- ✅ **CVE-2025-53773 Protection** (Command injection patterns)
- ✅ **Shell Script Security** (ShellCheck)

### Security Best Practices

When using this tool:

1. **Install in isolated test environment** - Never in personal browser
2. **Use synthetic test data only** - No real credentials or PII
3. **Review test code** - Only run trusted scripts
4. **Uninstall after testing** - Don't leave extension installed
5. **Dedicated browser profile** - Separate from personal use

See `README.md` Security Warnings section for complete details.

### Known Security Considerations

#### Extension Permissions
This extension requires broad permissions to function:
- `<all_urls>` - Access to all websites
- `tabs` - Access to all browser tabs
- `scripting` - Can inject code into pages
- `management` - Can control extensions

**These are necessary for test automation** but should be treated as high-risk.

#### Screenshot Sensitivity
`captureScreenshot()` captures ALL visible content including:
- Passwords (even masked)
- Credit card numbers
- PII and sensitive data

**Use only in isolated test environments with fake data.**

### Security Audit History

- **2025-10-27**: Multi-persona security review (5 reviewers)
  - No critical vulnerabilities found
  - Security documentation added
  - Input validation improved (P0 bug fix)

- **2025-10-27**: Added automated security scanning
  - Dependabot enabled
  - CodeQL analysis enabled
  - Gitleaks scanning enabled

### Disclosure Policy

- **Vulnerability fixes**: Released as soon as possible
- **CVE assignment**: Requested for high/critical issues
- **Public disclosure**: After fix is released (coordinated disclosure)
- **Credit**: Security researchers credited unless they prefer anonymity

### Scope

**In scope**:
- Node.js API (claude-code/)
- Chrome Extension (extension/)
- WebSocket Server (server/)
- Test Infrastructure (tests/)

**Out of scope**:
- Third-party dependencies (report to upstream)
- Social engineering
- Physical security
- Denial of service (this is a local dev tool)

### Contact

- **GitHub**: https://github.com/gadievron/chrome-dev-assist/security
- **Email**: gadievron@users.noreply.github.com

---

**Thank you for helping keep Chrome Dev Assist secure!**

# 002. HTTP (not HTTPS) for Localhost Testing

**Status**: ✅ Accepted

**Date**: 2025-10-24

**Context**: `server/websocket-server.js`

---

## Context

The WebSocket server serves test fixtures over HTTP to localhost (127.0.0.1). Modern web security best practices recommend HTTPS everywhere, raising the question:

**Should we use HTTPS for our localhost test server?**

---

## Decision

Use **HTTP (not HTTPS)** for localhost test infrastructure.

```javascript
// Current: HTTP
const httpServer = http.createServer(handleHttpRequest);
httpServer.listen(9876, '127.0.0.1');

// Not using: HTTPS
// const httpsServer = https.createServer({key, cert}, handleHttpRequest);
```

---

## Consequences

### Positive ✅
- **No Certificate Management**: No need to generate, store, rotate self-signed certs
- **No Browser Warnings**: Avoids "Your connection is not private" warnings
- **No Manual Trust Setup**: Users don't need to add cert to system keychain
- **Faster**: HTTP has lower overhead than TLS handshake
- **Standard Practice**: Jest, Playwright, Cypress, WebdriverIO all use HTTP for localhost
- **Simpler Debugging**: No TLS errors, easier to inspect with curl/DevTools

### Negative ⚠️
- **Not "Best Practice"**: Deviates from "HTTPS everywhere" guideline
- **Education**: Need to explain why HTTP is OK for localhost

### Trade-offs
- **Chose Developer Experience Over Theoretical Security**: HTTPS adds no security for localhost but significant friction
- **Chose Standards Compliance**: Following test framework industry standards

---

## Why HTTP is Secure for Localhost

### 1. Traffic Never Leaves Machine
```
Extension → 127.0.0.1:9876 → Server
    ↑                             ↑
    └──── Loopback interface ─────┘
```

Traffic on 127.0.0.1 uses the **loopback interface**:
- Never touches network hardware
- Never traverses any network (LAN, WAN, Internet)
- Cannot be intercepted by network sniffing
- OS kernel routes directly (no physical wire/wireless)

### 2. Network Binding Prevents External Access
```javascript
httpServer.listen(9876, '127.0.0.1'); // NOT '0.0.0.0'
```

- Server bound to 127.0.0.1 (localhost only)
- OS rejects connections from other IP addresses
- Remote machines cannot connect even on same network

### 3. HTTPS Protects Against MitM - No MitM on Localhost
HTTPS prevents:
- ❌ Network eavesdropping (no network involved)
- ❌ DNS spoofing (no DNS lookup for 127.0.0.1)
- ❌ Router/ISP interception (traffic doesn't leave machine)
- ❌ Public WiFi attacks (not on network)

**None of these threats apply to localhost.**

### 4. Defense-in-Depth Still Applies
We still implement:
- Layer 1: Network binding (127.0.0.1)
- Layer 2: Host header validation
- Layer 3: Token authentication
- Layer 4: Directory traversal protection

HTTPS would add:
- Layer 5: TLS encryption (redundant for localhost)

---

## Alternatives Considered

### 1. HTTPS with Self-Signed Certificate ❌

**Implementation**:
```javascript
const https = require('https');
const fs = require('fs');

const httpsServer = https.createServer({
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost-cert.pem')
}, handleHttpRequest);
```

**Rejected Because**:
- ⚠️ Browser shows "Your connection is not private" warning
- ⚠️ Tests fail with `CERT_INVALID` errors
- ⚠️ Users must manually trust cert in system keychain
- ⚠️ Certs expire and need rotation
- ⚠️ Different process for macOS/Windows/Linux
- ⚠️ Curl/fetch require `--insecure` or cert validation bypass
- ✅ **Zero security benefit** (traffic already secure on localhost)

**Example Pain**:
```bash
# Without cert trust
curl https://localhost:9876/fixtures/test.html
# Error: SSL certificate problem: self signed certificate

# Must use insecure flag
curl --insecure https://localhost:9876/fixtures/test.html
# Defeats purpose of HTTPS
```

### 2. HTTPS with mkcert (Local CA) ❌

**Implementation**:
```bash
mkcert -install
mkcert localhost 127.0.0.1
```

**Rejected Because**:
- ⚠️ Requires mkcert installation (extra dependency)
- ⚠️ Setup instructions vary per OS
- ⚠️ May not work in CI/CD environments
- ⚠️ Still requires cert management (rotation, backup)
- ✅ **Still zero security benefit for localhost**

### 3. Dual Mode (HTTP + HTTPS) ❌

**Rejected Because**:
- ❌ Doubles complexity for no benefit
- ❌ More test configurations to maintain
- ❌ Still need to handle self-signed cert issues

---

## When HTTPS Would Be Required

If any of these become true, revisit this decision:

1. **Server accessible from network**:
   ```javascript
   httpServer.listen(9876, '0.0.0.0'); // BAD: network-accessible
   ```

2. **Remote testing** (extension on machine A, server on machine B)

3. **Distributed testing** (multiple machines)

4. **Production deployment** (serving fixtures to real users)

5. **Sensitive data** (PII, credentials, tokens with real value)

**Current status**: None of these apply. Test infrastructure is **localhost-only**.

---

## Industry Standards

All major test frameworks use HTTP for localhost:

### Jest (Facebook)
```javascript
// jest.config.js
module.exports = {
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};
```

### Playwright (Microsoft)
```javascript
// playwright.config.js
export default {
  webServer: {
    url: 'http://localhost:3000', // HTTP, not HTTPS
  }
};
```

### Cypress
```javascript
// cypress.config.js
export default {
  baseUrl: 'http://localhost:8080'
};
```

### WebdriverIO
```javascript
// wdio.conf.js
exports.config = {
  baseUrl: 'http://localhost:3000'
};
```

**None use HTTPS for localhost testing.**

---

## Security Checklist

Even without HTTPS, verify:

- ✅ Server bound to 127.0.0.1 (not 0.0.0.0)
- ✅ Host header validation enabled
- ✅ Token authentication required
- ✅ Directory traversal protection
- ✅ No sensitive data in fixtures
- ✅ Tokens are ephemeral
- ✅ .auth-token file git-ignored

---

## Exception: Production Server

If we ever deploy a **production** server (not test infrastructure):

**THEN use HTTPS**:
```javascript
const https = require('https');
const httpsServer = https.createServer({
  key: fs.readFileSync('/path/to/privkey.pem'),   // From Let's Encrypt
  cert: fs.readFileSync('/path/to/fullchain.pem')
}, handleHttpRequest);
```

**Production requirements**:
- Valid TLS certificate (Let's Encrypt, commercial CA)
- HSTS headers
- TLS 1.2+ only
- Strong cipher suites
- Certificate pinning (if needed)

---

## References

- [RFC 8615: Well-Known URIs for Localhost](https://www.rfc-editor.org/rfc/rfc8615.html)
- [OWASP: localhost Security](https://owasp.org/www-community/vulnerabilities/Localhost)
- [Mozilla: Secure Contexts (localhost is secure)](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- Jest, Playwright, Cypress documentation (localhost test server examples)
- [Stack Overflow: Why localhost doesn't need HTTPS](https://stackoverflow.com/questions/25737589)

---

## Related Decisions

- [ADR-001: Test Infrastructure Authentication](./001-test-infrastructure-authentication.md) - Token auth compensates for HTTP
- [ADR-003: Future OAuth2 Strategy](./003-future-oauth2-strategy.md) - Production will use HTTPS

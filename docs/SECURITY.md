# Security Model - Chrome Dev Assist

## Overview

This document outlines the security architecture for Chrome Dev Assist, distinguishing between **test infrastructure security** (current implementation) and **production user authentication** (future considerations).

---

## Current Implementation: Test Infrastructure Security

### Scope

- **Purpose**: Secure local test fixture serving during development/testing
- **Threat Model**: Prevent unauthorized local applications from accessing test server
- **Not in Scope**: User authentication, external API access, production deployment

### Architecture: Defense-in-Depth

Our test server implements **four layers of security**:

#### Layer 1: Network Binding (Network-Level Isolation)

```javascript
const HOST = '127.0.0.1'; // localhost only
httpServer.listen(PORT, HOST);
```

**Protection**: Server only accepts connections from localhost (127.0.0.1)
**Threat Mitigated**: Remote access attempts from network
**Standard**: Industry standard for local dev servers (Jest, Playwright, Cypress)

#### Layer 2: Host Header Validation (DNS Rebinding Protection)

```javascript
const host = req.headers.host || '';
const isLocalhost =
  host.startsWith('localhost:') ||
  host.startsWith('127.0.0.1:') ||
  host === 'localhost' ||
  host === '127.0.0.1';

if (!isLocalhost) {
  res.writeHead(403);
  res.end('Forbidden: Server only accepts localhost connections');
  return;
}
```

**Protection**: Validates HTTP Host header matches localhost
**Threat Mitigated**: DNS rebinding attacks
**Reference**: OWASP DNS Rebinding Prevention

#### Layer 3: Token Authentication (Application-Level)

```javascript
// Server: Generate random token at startup
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex'); // 256 bits entropy
fs.writeFileSync('.auth-token', AUTH_TOKEN, 'utf8');

// Client: Read token and append to URLs
const token = fs.readFileSync('.auth-token', 'utf8');
const url = `http://localhost:9876/fixtures/test.html?token=${token}`;

// Server: Validate token on every request
if (clientToken !== AUTH_TOKEN) {
  res.writeHead(401);
  res.end('Unauthorized: Invalid or missing auth token');
  return;
}
```

**Protection**: Prevents other localhost applications from accessing test fixtures
**Threat Mitigated**: Cross-localhost attacks (malicious local apps)
**Token Properties**:

- Cryptographically random (256 bits entropy)
- Ephemeral (regenerated on server restart)
- Not embedded in extension code
- Automatically cleaned up on server shutdown

#### Layer 4: Directory Traversal Protection (File-Level)

```javascript
const filepath = path.join(FIXTURES_PATH, filename);

// Security: prevent directory traversal
if (!filepath.startsWith(FIXTURES_PATH)) {
  res.writeHead(403);
  res.end('Forbidden');
  return;
}
```

**Protection**: Validates all file paths stay within fixtures directory
**Threat Mitigated**: Path traversal attacks (e.g., `../../etc/passwd`)

---

### Why HTTP (Not HTTPS) for Localhost?

**Decision**: Use HTTP for local test server

**Rationale**:

1. **Traffic Never Leaves Machine**: Server bound to 127.0.0.1
2. **Industry Standard**: Jest, Playwright, Cypress, WebdriverIO all use HTTP for localhost
3. **TLS Complexity**: Self-signed certs require:
   - Cert generation and management
   - Browser security warnings
   - Manual cert trust configuration
   - Zero security benefit (traffic is local)
4. **Performance**: HTTP is faster for rapid test execution

**Security Posture**: HTTP + localhost binding + token auth provides adequate security for test infrastructure.

---

### Why Token in Query Parameter?

**Decision**: Pass token as URL query parameter (`?token=xxx`)

**Rationale**:

1. **Not Production**: Test infrastructure only
2. **No Network Exposure**: Localhost-only traffic
3. **Simplicity**: Easy for tests to construct URLs
4. **No Logging Risk**: Our server, our logs
5. **Standard Pattern**: Common in local development tools

**Production Note**: For user-facing features, tokens would go in `Authorization` header.

---

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Server Startup                                              │
│  1. Generate random 32-byte token                           │
│  2. Save to .auth-token file                                │
│  3. Start HTTP + WebSocket server                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Test Execution                                              │
│  1. Test helper reads .auth-token file                      │
│  2. Appends token to fixture URL: ?token=xxx                │
│  3. Extension requests fixture from server                  │
│  4. Server validates token → 200 OK or 401 Unauthorized     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Server Shutdown                                             │
│  1. Delete .auth-token file (cleanup)                       │
│  2. Close HTTP server                                       │
│  3. Close WebSocket server                                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Properties**:

- Token exists only while server is running
- Each server restart generates new token
- No persistent secrets in filesystem after shutdown
- Git-ignored to prevent accidental commits

---

### Threat Model: What We Protect Against

| Threat                        | Mitigation                    | Layer     |
| ----------------------------- | ----------------------------- | --------- |
| **Remote network access**     | Server bound to 127.0.0.1     | Layer 1   |
| **DNS rebinding attacks**     | Host header validation        | Layer 2   |
| **Cross-localhost attacks**   | Token authentication          | Layer 3   |
| **Directory traversal**       | Path validation               | Layer 4   |
| **Token extraction from git** | .gitignore + ephemeral tokens | Policy    |
| **Token persistence**         | Deleted on shutdown           | Lifecycle |

---

### What We DON'T Protect Against (Out of Scope)

These are **not threats** in our test infrastructure context:

| Non-Threat                           | Why Not a Concern                                |
| ------------------------------------ | ------------------------------------------------ |
| **Token interception in transit**    | Localhost-only traffic never leaves machine      |
| **Man-in-the-Middle (MitM)**         | No network exposure; localhost loopback          |
| **Token replay attacks**             | Token changes on every restart; test-only        |
| **Malware reading .auth-token file** | If malware has file access, game is already over |
| **User credential theft**            | No user credentials; test fixtures only          |

---

## API Security (P1-P2 Implementation)

### DoS Protection: 1MB Metadata Size Limit (P1-1)

**Threat**: Memory exhaustion DoS attack via oversized page metadata

**Implementation**:

```javascript
const MAX_METADATA_SIZE = 1024 * 1024; // 1MB
const metadataStr = JSON.stringify(metadata);
const sizeBytes = new TextEncoder().encode(metadataStr).length;

if (sizeBytes > MAX_METADATA_SIZE) {
  const sizeKB = Math.ceil(sizeBytes / 1024);
  throw new Error(
    `Metadata too large: ${sizeKB}KB exceeds 1MB limit. ` +
      'Reduce page complexity or use smaller testMetadata object.'
  );
}
```

**Why 1MB?**

- Reasonable limit for test metadata (supports large test fixtures)
- Prevents memory exhaustion from malicious/compromised pages
- UTF-8 byte counting ensures accurate size measurement (not `string.length`)

**Attack Scenario Prevented**:

1. Malicious page creates 100MB metadata object
2. Extension serializes it → Chrome tab crashes
3. Repeated attacks → System memory exhaustion

### Circular Reference Handling (P1-2)

**Threat**: Infinite loop via circular references in page metadata

**Implementation**:

```javascript
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}
```

**Why WeakSet?**

- O(1) circular reference detection (vs O(n²) with Array)
- Automatic garbage collection (no memory leak)
- Handles arrays correctly (arrays are objects)

**Attack Scenario Prevented**:

1. Page creates circular object: `obj.self = obj`
2. Without protection: `JSON.stringify()` → infinite loop → tab freeze
3. With protection: Circular ref replaced with `[Circular]` marker

### Race Condition Documentation (P1-3)

**Vulnerability Class**: Time-Of-Check-Time-Of-Use (TOCTOU)

**Affected APIs**: `getPageMetadata()`, `captureScreenshot()`

**3 Race Scenarios**:

1. **Tab Closure Race**

   ```javascript
   // Client checks tab exists
   const tabs = await chrome.tabs.query({ active: true });
   const tabId = tabs[0].id;

   // ⚠️ RACE: Tab may close here

   // API call fails: "No tab with id: 123"
   await getPageMetadata(tabId);
   ```

2. **Tab Navigation Race**

   ```javascript
   // Client sends command to capture page at URL1
   await captureScreenshot(tabId);

   // ⚠️ RACE: User navigates to URL2 during capture

   // Screenshot captures URL2 (not URL1 as expected)
   ```

3. **Extension Reload Race**

   ```javascript
   // Client sends command
   const promise = getPageMetadata(tabId);

   // ⚠️ RACE: Extension reloads during execution

   // Promise rejects: "Extension disconnected"
   await promise;
   ```

**Client Recovery Strategy**:

```javascript
async function safeGetMetadata(tabId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getPageMetadata(tabId);
    } catch (error) {
      if (error.message.includes('No tab with id')) {
        // Tab closed - normal race, skip retry
        throw error;
      }
      if (error.message.includes('Extension disconnected')) {
        // Extension reloaded - retry after delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error; // Unknown error, don't retry
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Why Not Fixed at API Level?**

- Cannot prevent user actions (tab closure, navigation)
- Cannot prevent Chrome from reloading extension
- Client must handle race conditions as normal errors
- Documentation ensures clients implement proper retry logic

### Input Validation: Integer Quality Parameter (P2-2)

**Threat**: Undefined Chrome API behavior with fractional quality values

**Implementation**:

```javascript
// P2-2: Validation: quality must be an integer
if (format === 'jpeg' && options.quality !== undefined && !Number.isInteger(options.quality)) {
  throw new Error('Quality must be an integer between 0 and 100');
}
```

**Why Integer Enforcement?**

- Chrome DevTools Protocol expects integer quality (0-100)
- Fractional values (e.g., 75.5) cause undefined behavior
- JavaScript quirks: `75.0` is integer, `75.5` is not

**Edge Cases Handled**:

- `75.0` → Accepted (JavaScript treats as 75)
- `75.5` → Rejected (fractional)
- `1e2` → Accepted (100 in scientific notation)
- `-0` → Rejected (not positive)

---

## Future: Production User Authentication

### When We Need Real Auth

If Chrome Dev Assist adds features requiring user authentication:

- Cloud sync of extension settings
- Shared team workspaces
- Access to external APIs (GitHub, Jira, etc.)
- User analytics/telemetry with PII

### Recommended Architecture: OAuth2 + PKCE

**Why OAuth2 + PKCE?**

- Industry standard for browser extensions
- No client secrets embedded in extension
- Works with external identity providers (Google, GitHub, etc.)
- PKCE prevents authorization code interception

**Implementation Plan**:

#### 1. OAuth2 Flow with PKCE

```javascript
// Step 1: Generate PKCE code verifier and challenge
const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const codeChallenge = base64url(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
);

// Step 2: Launch OAuth flow
chrome.identity.launchWebAuthFlow(
  {
    url:
      `https://oauth.example.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `scope=read:user&` +
      `state=${state}`,
    interactive: true,
  },
  async redirectUrl => {
    if (chrome.runtime.lastError) {
      console.error('Auth failed:', chrome.runtime.lastError);
      return;
    }

    // Step 3: Extract authorization code
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');

    // Step 4: Exchange code for token (server-side)
    const response = await fetch('https://api.example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const { access_token, refresh_token } = await response.json();

    // Step 5: Store tokens securely
    await chrome.storage.session.set({
      accessToken: access_token,
      // NEVER store refresh_token in extension
      // Store on server; give extension opaque handle
    });
  }
);
```

#### 2. Token Storage Strategy

**Do:**

- Use `chrome.storage.session` for access tokens (non-persistent, tab-scoped)
- Store refresh tokens server-side only
- Use short-lived access tokens (15-60 minutes)
- Store opaque session handles in `chrome.storage.local`
- Exchange handles for fresh tokens on extension restart

**Don't:**

- Store refresh tokens in extension storage
- Use `chrome.storage.sync` for tokens (syncs across devices)
- Store tokens in localStorage (accessible to content scripts)
- Embed client secrets in extension code

#### 3. Cross-Browser Compatibility

**chrome.identity API Compatibility**:

| API Method            | Chrome           | Edge          | Brave           | Firefox          |
| --------------------- | ---------------- | ------------- | --------------- | ---------------- |
| `getAuthToken()`      | ✅ Google only   | ⚠️ Unreliable | ❌ Often broken | ❌ Not supported |
| `launchWebAuthFlow()` | ✅ Generic OAuth | ✅ Works      | ✅ Works        | ✅ Works         |

**Recommendation**: Use `launchWebAuthFlow()` for maximum compatibility

**Edge/Brave Caveats**:

- Redirect URI registration varies by provider
- Test thoroughly on each browser
- Provide fallback manual auth flow

#### 4. Security Checklist

**Before Shipping Production Auth**:

- [ ] Client secrets NEVER in extension bundle
- [ ] All OAuth flows use PKCE
- [ ] Tokens stored in `chrome.storage.session` (not local/sync)
- [ ] Refresh tokens stored server-side only
- [ ] Access tokens short-lived (<60 min)
- [ ] Token exchange happens over TLS
- [ ] CSP prevents inline scripts and eval
- [ ] Static analysis blocks hardcoded secrets
- [ ] Tested on Chrome, Edge, Brave
- [ ] Graceful degradation for Enterprise policies
- [ ] Rate limiting on token refresh
- [ ] Clock skew tolerance (±5 minutes)
- [ ] JWT verification uses public keys only
- [ ] Native messaging host (if needed) uses OS keychain

#### 5. Native Messaging for OS Keychain (Optional)

**When Needed**:

- Access to OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret)
- Hardware security tokens (YubiKey, TPM)
- Corporate SSO with mutual TLS

**Architecture**:

```
Extension → Native Host (C++/Rust) → OS Keychain
            ↑
            Validates messages with HMAC
            Uses strict JSON schema
            Rate limited
```

**Security Requirements**:

- HMAC all messages between extension and host
- Strict input validation
- Per-platform least privilege
- Version protocol to prevent downgrade attacks

---

## Security Principles (Universal)

These apply to **both** test infrastructure and production:

1. **Least Privilege**: Only request permissions you need
2. **Defense in Depth**: Multiple security layers
3. **Fail Secure**: Default deny; explicit allow
4. **Auditability**: Log security events
5. **Simplicity**: Complex security is fragile security
6. **Standards Compliance**: Use proven protocols (OAuth2, TLS)
7. **Ephemeral Secrets**: Short-lived tokens; frequent rotation
8. **No Hardcoded Secrets**: Generate or fetch at runtime

---

## References

### Current Implementation (Test Security)

- OWASP: Localhost Security Best Practices
- OWASP: DNS Rebinding Prevention
- Node.js: crypto.randomBytes() documentation
- Path Traversal Prevention (OWASP)

### Future Implementation (OAuth2)

- [RFC 7636: PKCE for OAuth 2.0](https://oauth.net/2/pkce/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Chrome Storage API Security](https://developer.chrome.com/docs/extensions/reference/storage/)
- [MV3 Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

---

## Changelog

### 2025-10-28: P1-P2 API Security Enhancements

**Added comprehensive input validation and DoS protection:**

- **P1-1: 1MB Metadata Size Limit** - Prevents memory exhaustion DoS attacks via oversized metadata
  - UTF-8 byte counting with `TextEncoder` for accuracy
  - Clear error messages showing actual size vs limit
  - Implementation: `extension/background.js:790-803`

- **P1-2: Circular Reference Handling** - Safe JSON serialization prevents infinite loops
  - WeakSet-based cycle detection (O(1) lookup)
  - Replaces circular references with `[Circular]` marker
  - Handles nested objects, arrays, complex graphs
  - Implementation: `extension/background.js:730-741`

- **P1-3: TOCTOU Race Documentation** - Time-Of-Check-Time-Of-Use vulnerabilities documented
  - Tab closure race (tab closes during execution)
  - Tab navigation race (tab URL changes during execution)
  - Extension reload race (extension reloads during execution)
  - Client recovery strategies documented in `docs/API.md`

- **P2-2: Integer Validation** - Screenshot quality parameter must be whole number
  - Prevents undefined Chrome API behavior with fractional values
  - Handles JavaScript edge cases (75.0 accepted, 75.5 rejected)
  - Implementation: `claude-code/index.js:314-317`

**Test Coverage:**

- 50 new tests across 6 test files (4 new files + 2 updated files)
- P1-1: 2 tests (page-metadata.test.js size limit boundaries)
- P1-2: 4 tests (p1-2-metadata-edge-cases.test.js)
- P2-2: 3 tests (screenshot-validation.test.js integer validation)
- P2-3: 41 tests (18 edge-case + 13 integration + 10 visual)

### 2025-10-24: Initial Security Model

- Documented test infrastructure security (4-layer defense-in-depth)
- Explained HTTP vs HTTPS decision for localhost
- Token lifecycle and threat model
- Future OAuth2 + PKCE implementation plan
- Cross-browser compatibility notes
- Native messaging considerations

---

## Contact

For security concerns or questions:

- Open an issue on GitHub
- Email: security@example.com (when available)

**Responsible Disclosure**: Report vulnerabilities privately before public disclosure.

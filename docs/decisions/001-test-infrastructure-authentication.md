# 001. Test Infrastructure Authentication Strategy

**Status**: ✅ Accepted

**Date**: 2025-10-24

**Context**: `server/websocket-server.js`, `tests/integration/test-helpers.js`

---

## Context

The WebSocket server serves test fixtures over HTTP to enable integration testing. Without authentication, any localhost application could access test fixtures, potentially causing:

- Test interference from other local processes
- Unexpected fixture access during development
- Debugging confusion when multiple projects use port 9876

**Question**: How do we authenticate test fixture requests from our extension while keeping the solution simple for testing?

---

## Decision

Implement **token-based authentication** with **defense-in-depth** (4 layers):

### Layer 1: Network Binding

```javascript
const HOST = '127.0.0.1'; // localhost only
httpServer.listen(PORT, HOST);
```

### Layer 2: Host Header Validation

```javascript
const isLocalhost = host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
if (!isLocalhost) return 403;
```

### Layer 3: Token Authentication

```javascript
// Server: Generate random token at startup
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
fs.writeFileSync('.auth-token', AUTH_TOKEN);

// Client: Read token and append to URLs
const token = fs.readFileSync('.auth-token');
const url = `http://localhost:9876/fixtures/test.html?token=${token}`;

// Server: Validate on every /fixtures/ request
if (clientToken !== AUTH_TOKEN) return 401;
```

### Layer 4: Directory Traversal Protection

```javascript
if (!filepath.startsWith(FIXTURES_PATH)) return 403;
```

---

## Consequences

### Positive ✅

- **Simple**: No complex OAuth/JWT setup for test infrastructure
- **Secure**: Prevents cross-localhost access from other applications
- **Ephemeral**: Token regenerates on server restart (no persistent secrets)
- **Fast**: No crypto overhead; simple string comparison
- **Git-Safe**: `.auth-token` file is git-ignored
- **Self-Contained**: No external dependencies

### Negative ⚠️

- **Localhost-Only**: Not suitable for remote/distributed testing
- **Single Token**: All clients share same token (acceptable for tests)
- **Query Parameter**: Token visible in URLs (acceptable for localhost)
- **Manual Cleanup**: Requires server restart to rotate token

### Trade-offs

- **Chose Simplicity Over Enterprise Features**: No token rotation, no per-client tokens, no audit logs
- **Chose Speed Over Perfect Security**: Query params vs headers (acceptable for localhost)

---

## Alternatives Considered

### 1. No Authentication ❌

**Rejected**: Any localhost app could interfere with tests

### 2. Basic Auth (username:password) ❌

**Rejected**:

- Still need to store credentials somewhere
- More complex than token approach
- No benefit over random token

### 3. JWT with RSA Signing ❌

**Rejected**:

- Overkill for test infrastructure
- Requires key management
- Performance overhead
- Complexity not justified

### 4. OAuth2 + PKCE ❌

**Rejected**:

- Massive overkill for test fixtures
- Adds external dependencies
- Slower test execution
- See [ADR-003](./003-future-oauth2-strategy.md) for production auth

### 5. Certificate-based (mTLS) ❌

**Rejected**:

- Certificate generation/management complexity
- Breaks standard test tooling
- No additional security benefit for localhost

---

## Implementation Notes

**Token Generation**:

```javascript
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex'); // 256 bits entropy
```

**Token Storage**:

```javascript
// Server writes on startup
fs.writeFileSync('.auth-token', AUTH_TOKEN, 'utf8');

// Client reads on test execution
const AUTH_TOKEN = fs.readFileSync('.auth-token', 'utf8').trim();
```

**Token Cleanup**:

```javascript
// Server deletes on shutdown (SIGINT/SIGTERM)
if (fs.existsSync(TOKEN_FILE)) {
  fs.unlinkSync(TOKEN_FILE);
}
```

**Token Validation**:

```javascript
// Parse token from query parameter or header
let clientToken = req.headers['x-auth-token'];
if (!clientToken && req.url.includes('?token=')) {
  const url = new URL(req.url, `http://${host}`);
  clientToken = url.searchParams.get('token');
}

// Validate
if (requiresAuth && clientToken !== AUTH_TOKEN) {
  res.writeHead(401, { 'Content-Type': 'text/plain' });
  res.end('Unauthorized: Invalid or missing auth token');
}
```

---

## Success Metrics

- ✅ Tests pass with authentication enabled
- ✅ Unauthorized requests get 401 status
- ✅ Token automatically rotates on server restart
- ✅ `.auth-token` file never committed to git
- ✅ No performance impact on test execution

---

## Related Decisions

- [ADR-002: HTTP vs HTTPS for Localhost](./002-http-vs-https-for-localhost.md) - Why HTTP is OK
- [ADR-003: Future OAuth2 Strategy](./003-future-oauth2-strategy.md) - For production auth

---

## References

- `server/websocket-server.js` (lines 33-44, 88-100)
- `tests/integration/test-helpers.js` (lines 38-47, 60-76)
- OWASP: Localhost Security Best Practices
- Node.js crypto.randomBytes() documentation

# 003. Future OAuth2 + PKCE for Production Authentication

**Status**: 📋 Proposed (not yet implemented)

**Date**: 2025-10-24

**Context**: Planning for future user authentication features

---

## Context

Currently, Chrome Dev Assist is a **local development tool** with no user authentication. If we add features requiring user identity or external API access, we'll need production-grade authentication.

**Future features that would require authentication**:
- Cloud sync of extension settings
- Shared team workspaces
- Access to external APIs (GitHub, Jira, Slack, etc.)
- User analytics with PII
- Premium features
- Multi-device sync

**Question**: When we need real user authentication, what's the best approach for a Chrome extension?

---

## Decision

When user authentication becomes necessary, implement **OAuth2 with PKCE** (Proof Key for Code Exchange).

### High-Level Architecture

```
Extension → chrome.identity.launchWebAuthFlow() → OAuth Provider → Authorization Code
     ↓
Exchange code + verifier for token (server-side)
     ↓
Store access token in chrome.storage.session (short-lived)
     ↓
Refresh tokens stored server-side only (never in extension)
```

---

## Rationale

### Why OAuth2?
- **Industry Standard**: Used by Google, GitHub, Microsoft, etc.
- **Proven Security**: Decades of battle-testing
- **No Client Secrets**: Extension never handles user passwords
- **Third-Party Integration**: Easy to integrate with external APIs
- **Standard Libraries**: Available for all languages/platforms

### Why PKCE?
- **Prevents Code Interception**: Protects against authorization code theft
- **Designed for Public Clients**: Extensions are "public clients" (code can be inspected)
- **Required by Modern Providers**: Google, GitHub now require PKCE
- **No Client Secret Needed**: Extension doesn't need to store secrets

---

## Implementation Plan

### Phase 1: Basic OAuth2 + PKCE

```javascript
// 1. Generate PKCE code verifier and challenge
const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const codeChallenge = base64url(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
);

// 2. Launch OAuth flow
chrome.identity.launchWebAuthFlow({
  url: `https://oauth.provider.com/authorize?` +
       `client_id=${CLIENT_ID}&` +
       `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
       `response_type=code&` +
       `code_challenge=${codeChallenge}&` +
       `code_challenge_method=S256&` +
       `scope=read:user&` +
       `state=${randomState}`,
  interactive: true
}, async (redirectUrl) => {
  // 3. Extract authorization code
  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Verify state to prevent CSRF
  if (state !== expectedState) {
    throw new Error('State mismatch');
  }

  // 4. Exchange code for token (server-side)
  const response = await fetch('https://api.yourserver.com/oauth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier })
  });

  const { access_token, expires_in, session_handle } = await response.json();

  // 5. Store tokens securely
  await chrome.storage.session.set({
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in * 1000),
    sessionHandle: session_handle  // Opaque handle for refresh
  });
});
```

### Phase 2: Token Management

```javascript
// Token refresh strategy
async function getValidAccessToken() {
  const { accessToken, expiresAt, sessionHandle } =
    await chrome.storage.session.get(['accessToken', 'expiresAt', 'sessionHandle']);

  // Token still valid
  if (accessToken && Date.now() < expiresAt - 60000) {
    return accessToken;
  }

  // Token expired or missing - refresh
  const response = await fetch('https://api.yourserver.com/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_handle: sessionHandle })
  });

  const { access_token, expires_in } = await response.json();

  // Store new token
  await chrome.storage.session.set({
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in * 1000)
  });

  return access_token;
}
```

### Phase 3: Cross-Browser Support

```javascript
// Use launchWebAuthFlow for maximum compatibility
// (getAuthToken is Chrome+Google only)

async function authenticate(provider) {
  const config = getProviderConfig(provider);

  try {
    // Try chrome.identity first
    return await authenticateWithChromeIdentity(config);
  } catch (error) {
    if (error.message.includes('not supported')) {
      // Fallback for browsers without chrome.identity
      return await authenticateWithPopup(config);
    }
    throw error;
  }
}
```

---

## Security Requirements

### Must Implement

- ✅ **PKCE Required**: All OAuth flows must use PKCE
- ✅ **State Parameter**: CSRF protection (random, verified on callback)
- ✅ **Short-Lived Access Tokens**: 15-60 minutes maximum
- ✅ **Refresh Tokens Server-Side Only**: Never in extension storage
- ✅ **chrome.storage.session**: For access tokens (non-persistent)
- ✅ **TLS Required**: All OAuth endpoints must use HTTPS
- ✅ **Token Exchange Server-Side**: Client secret stays on server
- ✅ **No Secrets in Bundle**: Client ID OK, client secret forbidden

### Must NOT Do

- ❌ **Never store refresh tokens in extension**
- ❌ **Never store client secrets in extension**
- ❌ **Never use chrome.storage.sync for tokens** (syncs across devices)
- ❌ **Never use localStorage** (accessible to content scripts)
- ❌ **Never skip PKCE** (even if provider allows it)
- ❌ **Never embed service account keys**
- ❌ **Never use Basic Auth for users**

---

## Storage Strategy

### Recommended Approach

```javascript
// Short-lived access token (ephemeral)
await chrome.storage.session.set({
  accessToken: 'eyJhbG...',
  expiresAt: Date.now() + 3600000  // 1 hour
});

// Opaque session handle (persistent)
await chrome.storage.local.set({
  sessionHandle: 'opaque_handle_abc123'  // Exchange for new token on startup
});

// Refresh token (NEVER in extension)
// Stored on server, tied to sessionHandle
```

### Storage Comparison

| Storage Type | Access Token | Refresh Token | Session Handle |
|--------------|--------------|---------------|----------------|
| **storage.session** | ✅ Yes | ❌ No | ⚠️ Lost on restart |
| **storage.local** | ⚠️ Not ideal | ❌ Never | ✅ Yes |
| **storage.sync** | ❌ Never | ❌ Never | ❌ Leaks across devices |
| **localStorage** | ❌ Never | ❌ Never | ❌ Content script access |
| **Server-side** | ⚠️ For refresh | ✅ Always | ✅ As backup |

---

## Cross-Browser Compatibility

### API Support Matrix

| Browser | getAuthToken() | launchWebAuthFlow() | Notes |
|---------|----------------|---------------------|-------|
| **Chrome** | ✅ Google only | ✅ Generic OAuth | Full support |
| **Edge** | ⚠️ Unreliable | ✅ Works | Use launchWebAuthFlow |
| **Brave** | ❌ Often broken | ✅ Works | Use launchWebAuthFlow |
| **Firefox** | ❌ Not supported | ✅ Works (browser.identity) | Different API name |

**Recommendation**: Always use `launchWebAuthFlow()` for maximum compatibility.

### Browser-Specific Issues

**Edge**:
- Redirect URI registration varies by provider
- May reject `chrome-extension://` URIs
- Test with `https://yourdomain.com/callback` instead

**Brave**:
- Shields may block OAuth popups
- Provide fallback instructions
- Test in both Shields up/down modes

**Firefox**:
- Use `browser.identity` instead of `chrome.identity`
- Polyfill with webextension-polyfill

---

## Provider-Specific Notes

### Google OAuth

```javascript
// Use launchWebAuthFlow (works everywhere)
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=openid email profile&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

// Register redirect URI in Google Console:
// https://your-domain.com/oauth/callback
```

**Google-Specific**:
- Requires verified domain for redirect URI
- Can use `getAuthToken()` but not portable
- PKCE now required for new apps

### GitHub OAuth

```javascript
const authUrl = `https://github.com/login/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `scope=read:user&` +
  `state=${state}`;
```

**GitHub-Specific**:
- Supports PKCE (recommended but not required yet)
- Allows `chrome-extension://` redirect URIs
- Easy to test locally

### Microsoft (Azure AD)

```javascript
const authUrl = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=openid profile email&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;
```

**Microsoft-Specific**:
- PKCE required for public clients
- Supports enterprise SSO
- MSAL.js library available

---

## Alternative: Native Messaging for Enterprise

If requirements include:
- Corporate SSO with mutual TLS
- Hardware security tokens (YubiKey)
- OS keychain access (macOS Keychain, Windows DPAPI)
- Certificate-based authentication

**Then use Native Messaging Host**:

```javascript
// Extension → Native Host → OS Keychain
const port = chrome.runtime.connectNative('com.yourapp.auth');

port.postMessage({
  command: 'getToken',
  nonce: randomNonce,
  hmac: calculateHMAC(message)
});

port.onMessage.addListener((response) => {
  // Verify HMAC
  if (!verifyHMAC(response)) {
    throw new Error('Invalid response signature');
  }

  // Use token from OS keychain
  const token = response.token;
});
```

**Native Host Security**:
- HMAC all messages
- Strict JSON schema validation
- Rate limiting
- Least privilege (per-platform)
- Versioned protocol

---

## Testing Strategy

### OAuth Flow Tests

```javascript
// Mock OAuth provider for tests
describe('OAuth Flow', () => {
  it('should complete PKCE flow', async () => {
    const mockProvider = new MockOAuthProvider();
    mockProvider.expectAuthorizationRequest({
      code_challenge_method: 'S256',
      response_type: 'code'
    });

    const token = await authenticate(mockProvider);
    expect(token).toBeDefined();
    expect(mockProvider.usedPKCE).toBe(true);
  });

  it('should reject state mismatch', async () => {
    // Test CSRF protection
  });

  it('should handle clock skew', async () => {
    // Test ±5 minutes tolerance
  });
});
```

### Cross-Browser Tests

Run on:
- Chrome Stable
- Chrome Beta
- Edge Stable
- Brave
- Firefox (if targeting)

**Test Cases**:
- OAuth popup opens
- Redirect URI captured correctly
- Token exchange succeeds
- Token refresh works
- Logout clears storage
- Multiple tabs don't fight for tokens (singleflight)

---

## When to Implement

**Trigger Events**:
1. Need to store user-specific data
2. Need to access external APIs on behalf of user
3. Need to sync data across devices
4. Need to implement premium features
5. Need user analytics with PII

**Before Implementation**:
- [ ] Define which features require auth
- [ ] Choose OAuth provider(s) (Google, GitHub, etc.)
- [ ] Register OAuth application
- [ ] Set up server-side token exchange endpoint
- [ ] Implement PKCE flow
- [ ] Add token storage/refresh logic
- [ ] Test on all target browsers
- [ ] Security audit
- [ ] Privacy policy update (if storing user data)

---

## Cost-Benefit Analysis

**Benefits of OAuth2 + PKCE**:
- Industry-standard security
- No password handling
- Third-party integration
- User trust (familiar flow)
- Cross-platform compatibility

**Costs**:
- Implementation complexity
- Server-side token management
- Cross-browser testing
- OAuth provider rate limits
- User friction (popup flow)

**When Simple Token is Enough**:
- Local-only features
- No external API access
- No user-specific data
- Test infrastructure only

**Decision Point**: If we can avoid user authentication, we should. Only implement when features genuinely require it.

---

## References

- [RFC 7636: PKCE for OAuth 2.0](https://oauth.net/2/pkce/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Chrome Storage API Security](https://developer.chrome.com/docs/extensions/reference/storage/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [WebCrypto API for PKCE](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

---

## Related Decisions

- [ADR-001: Test Infrastructure Authentication](./001-test-infrastructure-authentication.md) - Current token auth
- [ADR-002: HTTP vs HTTPS for Localhost](./002-http-vs-https-for-localhost.md) - Production will use HTTPS
- docs/SECURITY.md - Complete security architecture

---

## Status Updates

**2025-10-24**: Initial proposal - not yet needed, planning for future

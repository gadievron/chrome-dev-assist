# Architecture Decisions - Chrome Dev Assist

**Architecture Decision Records (ADRs) for major design choices**

**Last Updated:** 2025-10-30

---

## Decision Index

| #       | Decision                           | Status      | Date       | Impact       |
| ------- | ---------------------------------- | ----------- | ---------- | ------------ |
| ADR-001 | Test Infrastructure Authentication | ✅ Accepted | 2025-10-24 | Security     |
| ADR-002 | HTTP vs HTTPS for Localhost        | ✅ Accepted | 2025-10-24 | Performance  |
| ADR-003 | Future OAuth2 Strategy             | 📋 Planned  | 2025-10-24 | Scalability  |
| ADR-004 | WebSocket over REST API            | ✅ Accepted | 2025-10-23 | Architecture |
| ADR-005 | Manifest V3 Adoption               | ✅ Accepted | 2025-10-23 | Compliance   |

---

## ADR-001: Test Infrastructure Authentication

**Status:** ✅ Accepted
**Date:** 2025-10-24
**Context:** Test fixture HTTP server security

**Decision:** Token-based authentication with 4-layer defense:

1. Network binding (localhost only)
2. Host header validation
3. Token authentication (random 32-byte)
4. Directory traversal protection

**Rationale:**

- Simple for testing infrastructure
- Prevents cross-localhost access
- Ephemeral tokens (regenerate on restart)
- No external dependencies

**Alternatives Rejected:**

- No auth (insecure)
- Basic auth (no benefit)
- JWT/OAuth2 (overkill)
- mTLS (complexity)

**Full Details:** See `../docs/decisions/001-test-infrastructure-authentication.md`

---

## ADR-002: HTTP vs HTTPS for Localhost

**Status:** ✅ Accepted
**Date:** 2025-10-24
**Context:** WebSocket server protocol choice

**Decision:** Use HTTP (not HTTPS) for localhost:9876

**Rationale:**

- Localhost is secure (no network exposure)
- HTTPS adds complexity (certificate management)
- Performance benefit (no TLS overhead)
- Standard practice for local development

**Security Measures:**

- Bind to 127.0.0.1 only (no 0.0.0.0)
- Host header validation
- Token authentication
- No external access possible

**Full Details:** See `../docs/decisions/002-http-vs-https-for-localhost.md`

---

## ADR-003: Future OAuth2 Strategy

**Status:** 📋 Planned
**Date:** 2025-10-24
**Context:** Production authentication requirements

**Decision:** When user data/cloud sync needed, use OAuth2 + PKCE

**Implementation Plan:**

- Use `chrome.identity.launchWebAuthFlow()`
- OAuth2 with PKCE (prevents authorization code interception)
- Store tokens in `chrome.storage.session`
- Automatic token refresh

**Timeline:** Not needed for v1.0 (local-only tool)

**Full Details:** See `../docs/decisions/003-future-oauth2-strategy.md`

---

## ADR-004: WebSocket Architecture

**Status:** ✅ Accepted
**Date:** 2025-10-23
**Context:** Communication between Node.js and Chrome extension

**Decision:** 3-layer WebSocket architecture:

- Node.js API ↔ WebSocket Server ↔ Chrome Extension

**Rationale:**

- Bidirectional communication (vs polling)
- Real-time command routing
- Auto-reconnect support
- Standard protocol

**Alternatives Rejected:**

- REST API (no bidirectional support)
- Native Messaging (complexity, platform-specific)
- Chrome DevTools Protocol (requires debug mode)

**Trade-offs:**

- Complexity: Higher (3 components vs 2)
- Reliability: Higher (auto-reconnect)
- Performance: Better (no polling overhead)

---

## ADR-005: Manifest V3 Adoption

**Status:** ✅ Accepted
**Date:** 2025-10-23
**Context:** Chrome extension manifest version

**Decision:** Use Manifest V3 (not V2)

**Rationale:**

- V2 sunset: June 2024 (Chrome 127+)
- Future-proof
- Required for new extensions

**Consequences:**

- Service workers (not background pages)
- More complex lifecycle management
- Requires chrome.alarms for keep-alive

**Migration Notes:**

- chrome.runtime.sendMessage (not chrome.extension.sendMessage)
- chrome.scripting.executeScript (not chrome.tabs.executeScript)
- Service worker keep-alive via chrome.alarms

---

## Decision-Making Process

**When to Create ADR:**

1. **Architectural Changes** - Impacts multiple components
2. **Technology Choices** - Library/framework selection
3. **Trade-offs** - When benefits vs costs unclear
4. **Reversible Decisions** - Document why NOT to change
5. **Team Alignment** - When multiple approaches valid

**ADR Template:**

```markdown
## ADR-XXX: Decision Title

**Status:** Proposed | Accepted | Rejected | Deprecated
**Date:** YYYY-MM-DD
**Context:** What's the situation?

**Decision:** What we decided

**Rationale:** Why this choice

**Alternatives Rejected:**

- Option A (why not)
- Option B (why not)

**Consequences:**

- Positive
- Negative

**Trade-offs:** What we gave up

**Full Details:** See ../docs/decisions/XXX-file.md
```

---

## Decision Status

- **Proposed**: Under discussion
- **Accepted**: Implemented and in use
- **Rejected**: Considered but not chosen
- **Deprecated**: No longer applies (architecture changed)

---

## Related Documentation

- `../docs/decisions/` - Full ADR documents
- `ARCHITECTURE.md` - Implementation of decisions
- `CHANGES.md` - When decisions were implemented

---

**Maintainer:** Chrome Dev Assist Team
**Review Frequency:** When architectural changes occur

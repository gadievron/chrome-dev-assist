# Future Development & Architectural Decisions

**Last Updated:** 2025-10-25
**Purpose:** Track decisions on what NOT to develop, future expansion considerations, and architectural assumptions

---

## Decision Log Format

```markdown
### [ID] - [Decision Title]
**Date:** YYYY-MM-DD
**Context:** What prompted this decision
**Decision:** What we decided (YES/NO/DEFER)
**Rationale:** Why we decided this
**Revisit Conditions:** When should we reconsider
**Related Issues:** Links to TO-FIX.md, FEATURE-SUGGESTIONS-TBD.md
```

---

## DEFERRED Features (Revisit Later)

### DEC-001 - Exponential Backoff for WebSocket Reconnection
**Date:** 2025-10-25
**Context:** Researching service worker keep-alive best practices
**Decision:** NOT implementing exponential backoff for now
**Rationale:**
- Current: Fixed 1-second retry on disconnect
- Use case: Local development tool (server on localhost:9876)
- Local server rarely goes down for extended periods
- If it does, user notices immediately (test failures)
- Fixed retry is simpler and sufficient
- Exponential backoff benefit: Prevents hammering server during outages
- Exponential backoff cost: Added complexity (state tracking, max delay logic)

**When to Revisit:**
- If we support remote servers (not localhost)
- If we get user reports of "server hammering"
- If we add production monitoring features

**Implementation Complexity:** MEDIUM (30 minutes - 1 hour)

**Related:** Service Worker Keep-Alive Investigation (2025-10-25)

---

### DEC-002 - chrome.storage.session for State Persistence
**Date:** 2025-10-25
**Context:** Service worker lifecycle management
**Decision:** NOT migrating from global variables to chrome.storage.session
**Rationale:**
- Current: Using `let ws = null` (lost on service worker restart)
- Chrome 116+ behavior: Service worker wakes fast (<100ms) for alarms
- Our reconnection is fast enough that state loss doesn't matter
- Global variables are simpler to reason about
- chrome.storage.session adds async complexity everywhere
- Benefit: State survives service worker restarts
- Cost: Significantly more complex code (every variable access becomes async)

**When to Revisit:**
- If we need state to survive service worker restarts
- If we implement complex state machines that need persistence
- If users report connection issues due to state loss

**Implementation Complexity:** HIGH (4-6 hours - touch 20+ lines)

**Related:** Service Worker Lifecycle (docs/SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md)

---

### DEC-003 - Port-Based Keep-Alive (chrome.runtime.connect)
**Date:** 2025-10-25
**Context:** Alternative keep-alive mechanism research
**Decision:** NOT implementing port-based keep-alive
**Rationale:**
- Alternative to WebSocket ping for keeping service worker alive
- Uses chrome.runtime.connect() to create long-lived connections
- Chrome considers ports as "active connections" → keeps worker alive
- However: Redundant with WebSocket ping (Chrome 116+)
- WebSocket ping is official Chrome guidance for network connections
- Port-based keep-alive is better for message-passing without network
- We HAVE a network connection (WebSocket), so use it

**When to Revisit:**
- If WebSocket ping proves insufficient (Chrome bug or behavior change)
- If we need keep-alive without WebSocket connection

**Implementation Complexity:** MEDIUM (1-2 hours)

**Related:** Chrome DevTools Protocol research

---

### DEC-004 - Content Script Heartbeat Backup
**Date:** 2025-10-25
**Context:** Additional keep-alive redundancy
**Decision:** NOT implementing content script heartbeat
**Rationale:**
- Idea: Inject content script that pings service worker every 15s
- Benefit: Backup keep-alive if alarms fail
- Cost: Content scripts on every page (resource overhead)
- Cost: Additional complexity
- Current approach (alarms + WebSocket ping) is already redundant
- If both fail, something is fundamentally broken (not fixable with more pings)

**When to Revisit:**
- If we see service worker terminations despite alarms + WebSocket ping
- If Chrome changes alarm reliability

**Implementation Complexity:** LOW (30 minutes)

**Related:** Service Worker Keep-Alive

---

### DEC-005 - Puppeteer-Based Service Worker Log Capture
**Date:** 2025-10-25
**Context:** captureServiceWorkerLogs() implementation options
**Decision:** DEFER - Implement manual helper instead of Puppeteer
**Rationale:**
- Puppeteer approach: Programmatic, automated, heavyweight (50MB+ dependency)
- Manual helper: Instructions-only, lightweight, requires user action
- Use case: Occasional debugging, not continuous monitoring
- Puppeteer cost: 50MB+ dependency, launches full browser, headful-only, slow
- Manual helper cost: User must follow instructions (5 steps)
- For occasional use, manual helper is better trade-off

**When to Revisit:**
- If automated service worker log capture becomes critical for CI/CD
- If users frequently request this feature
- If we build comprehensive test automation that needs it

**Implementation Complexity:** HIGH (4-6 hours + 50MB dependency)

**Related:**
- FEATURE-SUGGESTIONS-TBD.md: CHROME-FEAT-20251025-002
- docs/SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md (ServiceWorkerInspector class documented)

---

## NOT Implementing (Architectural Decisions)

### DEC-006 - Separate Keep-Alive API Functions
**Date:** 2025-10-25
**Context:** Should keep-alive be exposed as public API?
**Decision:** NO - Keep as internal infrastructure only
**Rationale:**
- Keep-alive is transparent/automatic
- Users don't need to control it
- Adding API increases surface area without value
- Existing API sufficient:
  - `wakeServiceWorker()` - Explicit wake if needed
  - `getServiceWorkerStatus()` - Check if alive
- Keep-alive should "just work" invisibly

**When to Revisit:**
- If users need fine-grained control (disable/enable/configure keep-alive)
- If debugging requires exposing internals

**Related:** Service Worker API (docs/API.md)

---

### DEC-007 - Test File Organization: Combined vs Separate
**Date:** 2025-10-25
**Context:** Should service-worker-api.test.js and keep-alive.test.js be combined?
**Decision:** NO - Keep separate
**Rationale:**
- Different purposes:
  - service-worker-api.test.js: PUBLIC API contract testing (fast, stable)
  - keep-alive.test.js: INTERNAL INFRASTRUCTURE testing (slow, timing-dependent)
- Different audiences:
  - API tests: For users of the library
  - Infrastructure tests: For extension developers
- Different characteristics:
  - API tests: Fast (<5s), no long waits
  - Infrastructure tests: Slow (45s for long-running connection test)
- Separation allows:
  - Running API tests quickly during development
  - Running infrastructure tests only when needed
  - Clear distinction between contract and implementation

**Naming:**
- ✓ service-worker-api.test.js (public API)
- ✓ service-worker-lifecycle.test.js (internal infrastructure) - RENAME keep-alive.test.js to this

**When to Revisit:**
- If infrastructure tests become fast enough to merge
- If separation creates too much duplication

**Related:** Testing strategy

---

## ASSUMPTIONS (May Need Validation)

### ASM-001 - Chrome 116+ WebSocket Behavior
**Date:** 2025-10-25
**Assumption:** "Sending or receiving messages across a WebSocket resets the service worker's idle timer"
**Source:** Chrome official docs (developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
**Risk:** MEDIUM - If Chrome behavior changes, keep-alive breaks
**Mitigation:** Test on multiple Chrome versions (116+, 120+, 130+)
**Validation:** Monitor for service worker terminations in production

---

### ASM-002 - chrome.alarms Reliability
**Date:** 2025-10-25
**Assumption:** chrome.alarms reliably fire every 15 seconds even when service worker is suspended
**Source:** Chrome documentation, common practice
**Risk:** LOW - Alarms are designed for this purpose
**Mitigation:** If alarms fail, WebSocket ping from external client can wake worker
**Validation:** Long-running tests (>30 minutes)

---

### ASM-003 - Local Development Server Availability
**Date:** 2025-10-25
**Assumption:** WebSocket server (localhost:9876) is usually available, short downtime if any
**Risk:** LOW - User controls the server
**Impact on Design:** Justifies fixed 1s retry instead of exponential backoff
**Mitigation:** Clear error messages guide user to start server
**Validation:** User feedback

---

### ASM-004 - Service Worker Wakes Fast on Alarms
**Date:** 2025-10-25
**Assumption:** Chrome wakes service worker in <100ms when alarm fires
**Source:** Chrome architecture (event-driven)
**Risk:** LOW - This is core Chrome behavior
**Impact on Design:** Justifies not using chrome.storage.session (state loss acceptable)
**Validation:** Performance monitoring

---

## EXPANSION OPPORTUNITIES (Future Features)

### EXP-001 - Remote Server Support
**Date:** 2025-10-25
**Idea:** Support WebSocket servers not on localhost (wss://remote-server.com)
**Benefits:**
- Distributed testing (CI/CD runs on remote machines)
- Multi-developer setups
- Cloud-hosted test infrastructure

**Challenges:**
- Security: Need authentication beyond local auth token
- CORS/certificate issues with wss://
- Network reliability (would need exponential backoff)

**Prerequisites:**
- Implement DEC-001 (exponential backoff)
- Add authentication mechanism (API keys, OAuth)
- SSL/TLS certificate handling

**Effort:** HIGH (1-2 weeks)

**Priority:** P3 (nice to have, not critical)

---

### EXP-002 - Multi-Extension Orchestration
**Date:** 2025-10-25
**Idea:** Coordinate testing across multiple Chrome extensions simultaneously
**Benefits:**
- Test extension interactions
- Parallel test execution
- Extension compatibility testing

**Challenges:**
- Phase 0 supports multi-extension connections (Map-based), but no orchestration
- Need test routing by extension ID
- Need per-extension state management

**Prerequisites:**
- Phase 0 complete (already is!)
- API for selecting target extension
- Test harness for multi-extension scenarios

**Effort:** MEDIUM (3-5 days)

**Priority:** P4 (very low priority, niche use case)

---

### EXP-003 - Production Monitoring Integration
**Date:** 2025-10-25
**Idea:** Built-in Sentry/LogRocket/DataDog integration
**Benefits:**
- One-line setup for production monitoring
- Pre-configured error tracking
- Built-in performance metrics

**Challenges:**
- Adds dependencies (Sentry SDK, etc.)
- Increases bundle size
- Privacy concerns (user data)

**Prerequisites:**
- External logging API (already implemented!)
- Partnership/approval from monitoring services
- Privacy policy and user consent flow

**Effort:** MEDIUM (1 week per integration)

**Priority:** P3 (useful for production extensions)

**Related:** External Logging API (v1.2.0)

---

## TECHNICAL DEBT (Known Issues)

### DEBT-001 - ISSUE-001: Data URI Iframe Metadata Leakage
**Date:** 2025-10-25
**Status:** VERIFIED FAILING (3 fix attempts)
**Priority:** P0 (BLOCKS PRODUCTION)
**Description:** Metadata from data URI iframes leaks to main page extraction
**Root Cause:** UNKNOWN (requires deep investigation)
**Impact:** Security vulnerability, cross-origin isolation violated
**Next Steps:**
- Debug logging to identify frame context
- Minimal reproduction case
- Research Chrome executeScript API behavior
- Consider CDP-based alternative

**Effort:** 2-4 hours focused debugging

**Related:** TO-FIX.md ISSUE-001

---

### DEBT-002 - Adversarial Test Timing Pattern
**Date:** 2025-10-25
**Status:** ROOT CAUSE IDENTIFIED
**Priority:** P2 (test bug, not production bug)
**Description:** 4 adversarial tests use incorrect timing (start capture after page load)
**Root Cause:** Tests start capture AFTER logs generated (setTimeout-based pages)
**Solution:** Start capture BEFORE opening URL
**Impact:** Test failures, but production code works correctly

**Effort:** 30 minutes - 1 hour

**Related:** TO-FIX.md ISSUE-009 (RESOLVED)

---

## DOCUMENTATION NEEDS

### DOC-001 - Keep-Alive Internal Architecture
**Date:** 2025-10-25
**Status:** PLANNED
**Location:** docs/SERVICE-WORKER-LIFECYCLE-CAPABILITIES.md (section to add)
**Content:**
- Decision tree diagram (when each mechanism activates)
- Integration points table
- Why we chose this architecture
- What we explicitly decided NOT to implement (reference this file)

**Effort:** 1-2 hours

---

### DOC-002 - Testing Guidelines for Keep-Alive
**Date:** 2025-10-25
**Status:** NEEDED
**Location:** docs/TESTING-GUIDELINES-FOR-TESTERS.md (section to add)
**Content:**
- How to verify keep-alive is working
- Expected behavior (service worker stays active >30s)
- What to check in chrome://serviceworker-internals
- Troubleshooting connection issues

**Effort:** 30 minutes

---

## QUESTIONS FOR USER

### Q-001 - Remote Server Support Priority
**Date:** 2025-10-25
**Question:** Do you plan to use this with remote WebSocket servers, or always localhost?
**Impact:** Affects whether we implement exponential backoff (DEC-001)
**Current Answer:** Assumed localhost only (based on current design)

---

### Q-002 - Production vs. Development Use
**Date:** 2025-10-25
**Question:** Is this primarily for local development/testing, or will it be used in production?
**Impact:** Affects monitoring features, error handling rigor, state persistence needs
**Current Answer:** Assumed development/testing (based on "test automation tool" description)

---

### Q-003 - CI/CD Integration Plans
**Date:** 2025-10-25
**Question:** Will this run in automated CI/CD pipelines (GitHub Actions, Jenkins)?
**Impact:** Affects Puppeteer decision (DEC-005), headless mode requirements
**Current Answer:** Unknown

---

## VERSION HISTORY

### v1.0 (2025-10-25)
- Initial creation
- 7 deferred features documented
- 1 architectural decision (not implementing)
- 4 assumptions documented
- 3 expansion opportunities identified
- 2 technical debt items tracked
- 2 documentation needs identified
- 3 questions for user

---

**How to Use This File:**

1. **Before implementing a feature:** Check if it's already in "NOT Implementing" or "DEFERRED"
2. **When deferring a feature:** Add to "DEFERRED" section with rationale
3. **When making architectural decision:** Document in "NOT Implementing"
4. **When assuming behavior:** Document in "ASSUMPTIONS" with risk assessment
5. **When identifying expansion opportunity:** Add to "EXPANSION OPPORTUNITIES"
6. **When finding technical debt:** Add to "TECHNICAL DEBT"

**Maintenance:**
- Review quarterly
- Update when Chrome behavior changes
- Update when user requirements change
- Move items between sections as priorities shift

---

*Document Created: 2025-10-25*
*Template Version: 1.0*
*Owner: Chrome Dev Assist Team*

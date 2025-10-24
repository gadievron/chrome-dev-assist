# Architecture Decision Records (ADRs)

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made during the project, along with its context and consequences.

## Quick Index

| # | Decision | Status | Date |
|---|----------|--------|------|
| [001](./001-test-infrastructure-authentication.md) | Test Infrastructure Authentication Strategy | ✅ Accepted | 2025-10-24 |
| [002](./002-http-vs-https-for-localhost.md) | HTTP (not HTTPS) for Localhost Testing | ✅ Accepted | 2025-10-24 |
| [003](./003-future-oauth2-strategy.md) | Future OAuth2 + PKCE for Production Auth | 📋 Proposed | 2025-10-24 |

## How to Use ADRs

### For Claude:
When making architectural decisions:
1. Read existing ADRs first: `docs/decisions/README.md` (this file)
2. Check if decision already exists in the index
3. If new decision needed, create new ADR with next number
4. Update this index

### For Developers:
- **Finding Decisions**: Check the index above or search `docs/decisions/`
- **Proposing Changes**: Create new ADR or supersede existing one
- **Disagreement**: ADRs can be superseded; original stays for history

## ADR Format

```markdown
# [Number]. [Title]

**Status**: Proposed | Accepted | Deprecated | Superseded by [ADR-XXX]

**Date**: YYYY-MM-DD

## Context
What is the issue we're facing? What factors influence the decision?

## Decision
What did we decide to do and why?

## Consequences
What are the positive and negative outcomes of this decision?

## Alternatives Considered
What other options did we consider and why were they rejected?
```

## Categories

ADRs are organized by topic:

- **001-099**: Security & Authentication
- **100-199**: Architecture & Design Patterns
- **200-299**: Testing Strategy
- **300-399**: Performance & Optimization
- **400-499**: Developer Experience
- **500-599**: Deployment & Operations

## References

- [ADR Documentation](https://adr.github.io/)
- [Why ADRs?](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

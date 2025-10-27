# Issues & Alerts Dashboard

**Purpose**: Show all open issues, security alerts, workflow failures, and local problems.

---

## Instructions for Claude

When this command is invoked, gather and display:

### 1. GitHub Issues

```bash
gh issue list --limit 20
```

Show:

- Issue number, title, labels, assignee
- Age and last updated
- Group by label (bug, enhancement, question)

### 2. Security Alerts

**CodeQL Alerts:**

```bash
gh api /repos/:owner/:repo/code-scanning/alerts --jq '.[] | select(.state == "open") | {number, rule: .rule.id, severity: .rule.severity, location: .most_recent_instance.location.path}'
```

**Dependabot Alerts:**

```bash
gh api /repos/:owner/:repo/dependabot/alerts --jq '.[] | select(.state == "open") | {number, package: .security_advisory.package.name, severity: .security_advisory.severity, summary: .security_advisory.summary}'
```

**Secret Scanning Alerts:**

```bash
gh api /repos/:owner/:repo/secret-scanning/alerts --jq '.[] | select(.state == "open") | {number, type: .secret_type, location: .locations[0].details.path}'
```

### 3. Workflow Failures

**Recent Failed Runs:**

```bash
gh run list --status=failure --limit 10 --json conclusion,displayTitle,event,createdAt,url
```

Show:

- Workflow name
- Trigger (push/pull_request/schedule)
- When it failed
- Link to view logs

**Currently In Progress:**

```bash
gh run list --status=in_progress --limit 10 --json displayTitle,event,createdAt,url
```

### 4. Pull Request Checks

**PRs with Failing Checks:**

```bash
gh pr list --json number,title,statusCheckRollup --jq '.[] | select(.statusCheckRollup | any(.conclusion == "FAILURE")) | {number, title, failed_checks: [.statusCheckRollup[] | select(.conclusion == "FAILURE") | .name]}'
```

### 5. Local Issues

**Uncommitted Changes:**

```bash
git status --short
```

**Local Test Failures:**

```bash
npm test 2>&1 | grep -E "(FAIL|failing|failed)" | head -20
```

**Linting Errors:**

```bash
npm run lint 2>&1 | grep -E "error|✖" | head -20
```

**Outdated Dependencies:**

```bash
npm outdated
```

### 6. Repository Health

**Branch Status:**

```bash
git status
```

**Stale Branches:**

```bash
git branch -vv | grep -v 'main' | grep -E 'gone|behind'
```

---

## Output Format

Present results in this structure:

```
🚨 ISSUES & ALERTS DASHBOARD
================================

📋 GITHUB ISSUES (3 open)
  #12 [bug] Extension fails on Firefox - @user - 2 days ago
  #10 [enhancement] Add dark mode - unassigned - 1 week ago
  #8 [question] How to configure X? - @user - 3 weeks ago

🔒 SECURITY ALERTS (2 critical, 1 high)
  CodeQL:
    ❌ #1 [critical] SQL Injection in server/db.js:45
    ⚠️ #2 [high] XSS vulnerability in extension/popup.js:120

  Dependabot:
    ⚠️ #3 [high] ws package has DoS vulnerability (update to 8.18.0)

❌ WORKFLOW FAILURES (1 recent)
  Critical Checks - failed 2 hours ago (push to main)
  → https://github.com/user/repo/actions/runs/12345

🔧 LOCAL ISSUES
  Uncommitted Changes:
    M server/websocket-server.js
    ?? new-feature.js

  Linting Errors: None
  Test Failures: None

📦 DEPENDENCIES
  Outdated: 3 packages
    eslint: 8.57.0 → 8.58.0
    prettier: 3.1.1 → 3.2.0
    jest: 29.7.0 → 29.7.1

✅ REPOSITORY HEALTH
  Branch: main
  Status: Up to date with origin/main
  No stale branches

================================
Total Issues: 6 requiring attention
Priority: 2 critical security alerts
```

---

## Priority Ranking

Rank issues by severity:

1. **🔴 Critical** - Security alerts (critical/high), workflow failures on main
2. **🟡 High** - Open bugs, medium security alerts, failing PR checks
3. **🟢 Medium** - Enhancement requests, outdated dependencies, linting errors
4. **⚪ Low** - Questions, uncommitted changes, stale branches

---

## Action Items

After displaying dashboard, suggest:

**If critical security alerts exist:**

- "Run `/security` command for detailed security analysis"
- Link to GitHub Security tab

**If workflow failures exist:**

- "View logs: `gh run view <run-id> --log`"
- Suggest re-running: `gh run rerun <run-id>`

**If test failures exist:**

- "Run tests locally: `npm test`"
- Check specific test: `npx jest <test-file>`

**If linting errors exist:**

- "Auto-fix: `npm run lint:fix`"
- "Format: `npm run format`"

---

## Error Handling

If any command fails:

- Note which data source is unavailable
- Continue with other checks
- Example: "⚠️ CodeQL alerts unavailable (requires GitHub Advanced Security)"

If no issues found:

```
✅ ALL CLEAR
No open issues, security alerts, or failures detected.
```

---

## Usage

```
/issues
```

That's it. Claude will gather all information and present the dashboard.

---

**Auto-refresh suggestion**: Run this command:

- Before starting new work
- After pushing to GitHub
- Weekly as part of maintenance
- After receiving failure notifications

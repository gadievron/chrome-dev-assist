# CI/CD Pipeline Documentation

**Complete guide to automated checks, security scanning, and quality gates**

---

## Overview

This project uses **100% free** GitHub Actions workflows for:

- ✅ Security scanning (secrets, vulnerabilities, CVEs)
- ✅ Code quality (linting, formatting, best practices)
- ✅ Dependency updates (automated PRs)
- ✅ Test coverage reporting
- ✅ Static analysis (CodeQL)

**Cost**: $0 (free for public repositories)
**Runs on**: Every push, pull request, and scheduled

---

## Workflows

### 1. Critical Checks (Free) - `.github/workflows/critical-checks.yml`

**Triggers**: Push to main, Pull Requests
**Duration**: ~3-5 minutes
**Status Badge**:

```markdown
[![CI/CD](https://github.com/gadievron/chrome-dev-assist/actions/workflows/critical-checks.yml/badge.svg)](https://github.com/gadievron/chrome-dev-assist/actions/workflows/critical-checks.yml)
```

**What it checks**:

#### ShellCheck (Shell Script Security)

- Syntax errors in bash/sh scripts
- Common security issues (unquoted variables, command injection)
- Best practice violations
- Potential bugs

**Example findings**:

```bash
scripts/deploy.sh:18:12: warning: Double quote to prevent globbing [SC2086]
  echo $USER_INPUT
       ^----------^

Recommendation: echo "$USER_INPUT"
```

#### Gitleaks (Secret Scanning)

- API keys, tokens, passwords
- AWS credentials, private keys
- Database connection strings
- Generic high-entropy secrets

**Example findings**:

```
Finding: Potential API Key
File: src/config.js:42
Match: api_key = "sk-abc123..."
Entropy: 4.5 (high)
```

#### CVE-2025-53773 (Command Injection Patterns)

- Unsafe shell command construction
- Code execution patterns
- Patterns from GitHub Copilot RCE vulnerability

**What it detects**:

```bash
# UNSAFE (fails):
echo "$user_input"      # Command injection risk
eval "$variable"        # Code execution risk

# SAFE (passes):
printf '%s\n' "$input"  # Properly escaped
grep -F "$literal"      # Fixed string mode
```

#### Token Budget Check

- `CLAUDE.md` ≤ 250 lines
- `tier1/*.md` files ≤ 150 lines each

#### File Validation

- YAML syntax (workflows)
- JSON syntax (configs)
- Markdown quality (documentation)

---

### 2. CodeQL Security Analysis - `.github/workflows/codeql.yml`

**Triggers**: Push to main, Pull Requests, Monday 9 AM UTC (weekly scan)
**Duration**: ~5-10 minutes
**Status Badge**:

```markdown
[![CodeQL](https://github.com/gadievron/chrome-dev-assist/actions/workflows/codeql.yml/badge.svg)](https://github.com/gadievron/chrome-dev-assist/actions/workflows/codeql.yml)
```

**What it finds**:

#### Security Vulnerabilities

- SQL injection
- Cross-site scripting (XSS)
- Path traversal
- Command injection
- Code injection

#### Code Quality Issues

- Unused variables
- Dead code
- Type errors
- Logic errors

#### Configuration

- **Languages**: JavaScript
- **Query suites**: `security-extended`, `security-and-quality`
- **Severity levels**: Error, Warning, Note

**Example findings**:

```
🔴 High Severity: Uncontrolled data used in path expression
File: server/file-handler.js:45
Path: user input → file path → fs.readFile()
Recommendation: Validate and sanitize file paths
```

**View results**:

- GitHub Security tab → Code scanning alerts
- Detailed flow diagrams showing data flow
- Suggested fixes and references

---

### 3. Test Coverage - `.github/workflows/test-coverage.yml`

**Triggers**: Push to main, Pull Requests
**Duration**: ~3-5 minutes
**Status Badge**:

```markdown
[![Coverage](https://codecov.io/gh/gadievron/chrome-dev-assist/branch/main/graph/badge.svg)](https://codecov.io/gh/gadievron/chrome-dev-assist)
```

**What it does**:

1. Runs all tests with coverage enabled
2. Generates LCOV coverage report
3. Uploads to Codecov (free for open source)
4. Comments on PR with coverage summary
5. Uploads coverage artifact (30-day retention)

**PR Comment Example**:

```markdown
## 📊 Test Coverage Report

✅ Coverage report generated successfully

Lines: 75.2% (450/598)
Functions: 82.1% (89/108)
Branches: 68.4% (156/228)

View detailed coverage in artifacts section.
```

**Codecov Features** (free):

- Line-by-line coverage visualization
- Coverage diff in PRs (shows coverage change)
- Coverage trends over time
- File browser with coverage overlay

**Setup Codecov** (one-time):

```bash
# 1. Sign up at https://codecov.io with GitHub account
# 2. Add repository
# 3. Copy upload token
# 4. Add to GitHub secrets:
#    Settings → Secrets → Actions → New secret
#    Name: CODECOV_TOKEN
#    Value: <your-token>
```

---

### 4. Dependabot - `.github/dependabot.yml`

**Triggers**: Weekly (Monday 9 AM ET), Daily for security updates
**What it does**: Automatically creates PRs to update dependencies

**Configuration**:

#### npm Dependencies

- **Schedule**: Weekly (Monday 9 AM ET)
- **Grouping**: Minor/patch updates grouped together
- **Labels**: `dependencies`, `automated`
- **Max open PRs**: 10

#### GitHub Actions

- **Schedule**: Weekly (Monday 9 AM ET)
- **Labels**: `dependencies`, `github-actions`
- **Max open PRs**: 5

**Example PR**:

```
Title: build(deps): bump jest from 29.5.0 to 29.7.0

Dependabot will resolve any conflicts with this PR as long as you don't
alter it yourself. You can also trigger a rebase manually by commenting
@dependabot rebase.

📊 Compatibility: 100%
🔒 Security: No known vulnerabilities
📦 Release notes: https://github.com/jestjs/jest/releases/tag/v29.7.0
```

**Dependabot commands** (comment on PR):

```
@dependabot rebase         # Rebase the PR
@dependabot recreate       # Recreate the PR
@dependabot merge          # Merge when passing
@dependabot squash and merge  # Squash and merge
@dependabot cancel merge   # Cancel auto-merge
@dependabot ignore this dependency  # Ignore this dependency
@dependabot ignore this minor version  # Ignore minor updates
```

---

## Security Features

### Enabled by Default

GitHub enables these automatically for public repos:

#### 1. Dependency Graph

- **Location**: Insights → Dependency graph
- **Shows**: All dependencies and their versions
- **Includes**: Direct and transitive dependencies

#### 2. Dependabot Alerts

- **Location**: Security → Dependabot alerts
- **Triggers**: When vulnerability found in dependency
- **Actions**: Auto-creates security update PR

#### 3. Secret Scanning

- **Location**: Security → Secret scanning
- **Scans**: Every commit for exposed secrets
- **Partners**: Notifies secret providers (AWS, GitHub, etc.)
- **Coverage**: 200+ secret patterns

#### 4. Code Scanning (CodeQL)

- **Location**: Security → Code scanning
- **Languages**: JavaScript, TypeScript
- **Queries**: Security-extended + quality
- **Alerts**: Categorized by severity

---

## Pull Request Checks

When you create a PR, you'll see:

```
Checks
  ✅ Critical Checks (Free) — Passed in 3m 42s
  ✅ CodeQL — Passed in 7m 15s
  ✅ Test Coverage — Passed in 4m 28s

All checks have passed
3 successful checks

[Details ▼]
```

**Detailed view**:

```
✅ Critical Checks (Free)
   ✅ ShellCheck: 0 issues
   ✅ Gitleaks: 0 secrets found
   ✅ CVE-2025-53773: 0 patterns
   ✅ Token budgets: All within limits
   ✅ YAML: Valid
   ✅ JSON: Valid
   ✅ Markdown: 0 issues

✅ CodeQL
   ✅ JavaScript analysis: 0 issues
   - Analyzed: 245 files
   - Queries: 289 security + quality checks

✅ Test Coverage
   ✅ Coverage: 75.2% (+0.3% from main)
   - Lines: 450/598 covered
   - Functions: 89/108 covered
   - View report: [Codecov]
```

---

## Workflow Artifacts

Each workflow can produce downloadable artifacts:

### Test Coverage Artifacts

- **Name**: `coverage-report`
- **Contents**: Full HTML coverage report
- **Retention**: 30 days
- **Size**: ~2-5 MB

**Download**:

1. Go to Actions tab
2. Click on workflow run
3. Scroll to "Artifacts" section
4. Click download

**View locally**:

```bash
unzip coverage-report.zip
open coverage/lcov-report/index.html
```

---

## Local Testing

Run checks locally before pushing:

### Critical Checks

```bash
# ShellCheck
shellcheck scripts/*.sh

# Gitleaks
docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source /repo

# CVE-2025-53773 patterns
grep -r 'echo.*\$' scripts/
grep -r 'eval ' .

# Token budgets
wc -l CLAUDE.md  # Should be ≤250
find . -path "*/tier1/*.md" -exec wc -l {} \; # Each ≤150

# YAML validation
yamllint .github/workflows/*.yml

# JSON validation
python3 -m json.tool package.json > /dev/null

# Markdown linting
npx markdownlint-cli '**/*.md'
```

### CodeQL

```bash
# Install CodeQL CLI
brew install codeql

# Create database
codeql database create ./codeql-db --language=javascript

# Run analysis
codeql database analyze ./codeql-db \
  --format=sarif-latest \
  --output=results.sarif \
  javascript-security-extended.qls

# View results
cat results.sarif
```

### Test Coverage

```bash
# Run tests with coverage
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
npm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
```

---

## Branch Protection

**Recommended settings** (Settings → Branches → main):

```
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale reviews when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks:
    ✅ Critical Checks (Free)
    ✅ CodeQL
    ✅ Test Coverage

✅ Require conversation resolution before merging
✅ Require signed commits (optional but recommended)
✅ Include administrators
```

**Effect**: Cannot merge PR unless all checks pass

---

## Monitoring & Alerts

### GitHub Notifications

**Configure** (Settings → Notifications → Watching):

```
✅ Issues
✅ Pull requests
✅ Releases
✅ Security alerts
✅ Discussions (if enabled)
```

### Email Alerts

You'll receive emails for:

- ⚠️ Failed workflow runs
- 🔴 Security vulnerabilities (Dependabot)
- 🔒 Secret scanning alerts
- 📊 CodeQL findings (high/critical)

### Slack Integration (Optional)

```bash
# Install GitHub + Slack app
/github subscribe gadievron/chrome-dev-assist
/github subscribe gadievron/chrome-dev-assist workflows:{event:"pull_request" branch:"main"}
```

---

## Cost Analysis

### Current Usage (100% Free)

| Service                 | Free Tier | Our Usage    | Cost   |
| ----------------------- | --------- | ------------ | ------ |
| GitHub Actions (public) | Unlimited | ~10 min/push | $0     |
| CodeQL                  | Unlimited | ~7 min/run   | $0     |
| Dependabot              | Unlimited | Weekly       | $0     |
| Codecov                 | Unlimited | Per push     | $0     |
| Secret Scanning         | Unlimited | Per commit   | $0     |
| **Total**               |           |              | **$0** |

### If Private Repo

| Service        | Free Tier       | Estimated Usage | Cost          |
| -------------- | --------------- | --------------- | ------------- |
| GitHub Actions | 2,000 min/month | ~300 min/month  | $0            |
| CodeQL         | Free            | Included        | $0            |
| Dependabot     | Free            | Included        | $0            |
| Codecov        | Not free        | ~100 pushes     | $10/month     |
| **Total**      |                 |                 | **$10/month** |

**Recommendation**: Keep public for free tier benefits

---

## Troubleshooting

### Workflow Fails: "Node modules not cached"

**Fix**: Clear cache

```bash
# In workflow file, add:
- name: Clear cache
  run: npm cache clean --force
```

### CodeQL: "No code found"

**Fix**: Ensure autobuild works or add manual build steps

```yaml
- name: Build
  run: |
    npm ci
    npm run build
```

### Codecov: "Upload failed"

**Fix**: Check token is set

```bash
# GitHub Settings → Secrets → Actions
# Verify CODECOV_TOKEN exists
```

### Dependabot: "PR conflicts"

**Fix**: Comment `@dependabot rebase` on the PR

### Secret Scanning: False Positive

**Fix**: Mark as false positive in Security tab, or:

```bash
# Add to .gitignore or .gitleaksignore
# Example: test fixtures with fake keys
tests/fixtures/fake-secrets.json
```

---

## Best Practices

### 1. Keep Workflows Fast

- ✅ Use caching (`actions/cache@v4`)
- ✅ Run expensive jobs only on main
- ✅ Use `paths` filters to skip irrelevant changes

### 2. Pin Action Versions

```yaml
# Good (pinned to SHA)
uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608

# Acceptable (pinned to major version)
uses: actions/checkout@v4

# Bad (latest, could break)
uses: actions/checkout@main
```

### 3. Use Secrets Properly

```yaml
# Good
env:
  API_KEY: ${{ secrets.API_KEY }}

# Bad (exposed in logs)
run: echo "API_KEY=${{ secrets.API_KEY }}"
```

### 4. Monitor Workflow Usage

```bash
# View workflow runs
gh run list

# View usage
gh api /repos/gadievron/chrome-dev-assist/actions/workflows --jq '.workflows[] | {name, path, state}'
```

---

## Current Status (2025-10-28)

### ✅ Recently Fixed

**Shell Security (CVE-2025-53773)** - 2025-10-28

- Fixed 50+ unsafe `echo "$var"` → `printf "%s\n" "$var"`
- Converted `grep -E` → `grep -F` (literal matching)
- All shell scripts now pass Hook Security Audit
- Result: ✅ Hook Security Audit PASSING

**YAML Formatting** - 2025-10-28

- Fixed `branches: [ "main" ]` → `branches: ["main"]`
- Result: ✅ YAML Lint PASSING

**Parsing Errors** - 2025-10-28

- Fixed invalid syntax in test files
- Result: ✅ Lint Code PASSING

### ❌ Known Issues

**Token Budget Validation** - HIGH PRIORITY

- CLAUDE.md exceeds 250-line limit (602 lines, 241% over)
- Blocks: All CI/CD workflows
- Fix: Split into multiple focused files
- Status: Tracked in TO-FIX.md #2

**ShellCheck Linting** - MEDIUM PRIORITY

- Shell scripts contain linting issues
- Blocks: Critical Checks workflow
- Status: Tracked in TO-FIX.md #3

### 📊 Workflow Health

| Workflow            | Status         | Last Fixed |
| ------------------- | -------------- | ---------- |
| Hook Security Audit | ✅ PASSING     | 2025-10-28 |
| YAML Lint           | ✅ PASSING     | 2025-10-28 |
| Lint Code (ESLint)  | ✅ PASSING     | 2025-10-28 |
| Test Coverage       | ✅ PASSING     | 2025-10-28 |
| CodeQL Analysis     | ⏳ IN PROGRESS | -          |
| Token Budget        | ❌ FAILING     | -          |
| ShellCheck          | ❌ FAILING     | -          |

---

## Maintenance

### Weekly Tasks

- [ ] Review Dependabot PRs (auto-created Monday)
- [ ] Check CodeQL findings (if any)
- [ ] Review failed workflow runs

### Monthly Tasks

- [ ] Review security alerts
- [ ] Update workflow action versions
- [ ] Review coverage trends

### Quarterly Tasks

- [ ] Audit workflow efficiency
- [ ] Update CodeQL queries
- [ ] Review branch protection rules

---

## Additional Resources

- **GitHub Actions**: https://docs.github.com/en/actions
- **CodeQL**: https://codeql.github.com/docs/
- **Dependabot**: https://docs.github.com/en/code-security/dependabot
- **Codecov**: https://docs.codecov.com/
- **Gitleaks**: https://github.com/gitleaks/gitleaks
- **ShellCheck**: https://www.shellcheck.net/

---

**Questions?** Open an issue or check the docs above.

# Issues & Alerts Dashboard

**Note**: This project uses the global `/issues` command located at `~/.claude/commands/issues.md`

For the full command documentation and features, see:

```bash
cat ~/.claude/commands/issues.md
```

---

## Quick Reference

**Usage:**

```bash
/issues
```

**What it does:**

- Shows GitHub issues, security alerts, workflow failures
- Checks local uncommitted changes, outdated dependencies
- **Saves all results** to `.issues/` directory with timestamps
- Tracks trends over time (security alerts, workflow failures)
- Works across ALL your projects (Node.js, Python, Go, Rust, generic)

**Where data is saved:**

- `.issues/snapshots/` - Timestamped JSON + Markdown snapshots
- `.issues/alerts/` - Individual alert tracking
- `.issues/trends/` - CSV time series data
- `.issues/index.md` - Master index
- `.issues/latest.md` - Quick access to most recent

**Trend analysis:**

```bash
tail -10 .issues/trends/security-counts.csv
tail -10 .issues/trends/workflow-failures.csv
```

---

**Global command features:**

- ✅ Auto-detects project type (nodejs/python/go/rust)
- ✅ Works with or without GitHub
- ✅ Works with or without Git
- ✅ Gracefully handles missing tools (gh CLI, npm, pip, etc.)
- ✅ Saves structured data (JSON + Markdown + CSV)
- ✅ Tracks historical trends
- ✅ Provides actionable next steps

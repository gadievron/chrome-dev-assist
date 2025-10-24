# Global Rule Enforcement - Product Requirements Document
**Task Size:** LARGE
**Scope:** All projects in Claude Code workspace
**Goal:** Make rules auto-enforce globally, not rely on Claude's memory

## Problem Statement

**Current State:**
- Rules exist in CLAUDE.md and base-rules/
- Documented as "MANDATORY", "ALWAYS", "NO EXCEPTIONS"
- Actual compliance: 5-30% (proven through testing)
- Relies on Claude remembering to check and follow
- No enforcement mechanism

**Impact:**
- Validation gates skipped 80% of time
- Persona reviews skipped 95% of time
- Test-first violated 70% of time
- Inconsistent code quality
- No session continuity

**Root Cause:**
- Rules in `<system-reminder>` = lower priority
- No automatic execution trigger
- Complex, long checklists (1200+ lines)
- No feedback when rules skipped

## Goal

Create an enforcement system that:
1. **Auto-executes** at session start (not optional)
2. **Simple and clear** (reduced cognitive load)
3. **Visible to user** (transparent compliance)
4. **Hard to skip** (gates are actual gates)
5. **Works globally** (all projects benefit)

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Session startup compliance | 5% | 95% |
| Response prefixing | 10% | 95% |
| Test-first adherence | 30% | 80% |
| Validation gate execution | 20% | 90% |
| Persona review execution | 5% | 75% |
| Overall compliance | 20% | 85% |

## Solution Architecture

### Tier 1: Simplified Core Rules (Mandatory Always)

**Create:** `~/Documents/Claude Code/base-rules/MANDATORY_CORE.md`

**Content:** Top 10 absolute must-have rules
- Session startup protocol (3 lines)
- Response prefixing (mandatory)
- Test-first (hard gate)
- Validation checklist (simplified to 5 items)
- Persona review trigger (when required)

**Why:** Easier to remember and follow when concise

### Tier 2: Slash Command System

**Create:** `~/.claude/commands/` directory with:
- `/init` - Session startup command
- `/validate` - Run validation gate
- `/review` - Run persona reviews
- `/checkpoint` - Create checkpoint
- `/status` - Show compliance status

**Why:** Explicit triggers make enforcement visible and actionable

### Tier 3: Auto-Startup Script

**Create:** `~/Documents/Claude Code/base-rules/auto-startup.md`

**Purpose:** Single-line trigger that Claude checks FIRST
**Content:** "BEFORE responding: Load MANDATORY_CORE.md + detect project + prefix response"

**Location:** Move to higher-priority instruction area (not `<system-reminder>`)

### Tier 4: Compliance Tracking

**Create:** Visual compliance indicator
```
[chrome-dev-assist] ✓ CORE | ✓ PREFIX | ⚠ TESTS | ✗ VALIDATION
```

**Why:** Makes rule-following visible to both user and Claude

### Tier 5: Enforcement Tools

**Create actual tools (not just prose):**
1. `ValidationGate.md` - Checklist that must be completed
2. `PersonaReview.md` - Template for all 6 reviews
3. `TestFirst.md` - Workflow enforcement
4. `ScopeCheck.md` - Scope discipline tracker

## What Changes

### Files Modified:

1. **`~/Documents/Claude Code/CLAUDE.md`**
   - Simplified startup protocol
   - Clear priority markers
   - Reference to slash commands
   - Compliance tracking added

2. **`~/Documents/Claude Code/base-rules/MANDATORY_CORE.md`** (NEW)
   - Top 10 essential rules
   - <100 lines total
   - Clear, actionable

3. **`~/Documents/Claude Code/.claude/commands/`** (NEW)
   - `/init` command
   - `/validate` command
   - `/review` command
   - `/checkpoint` command
   - `/status` command

4. **`~/Documents/Claude Code/base-rules/tools/`** (NEW)
   - ValidationGate.md
   - PersonaReview.md
   - TestFirst.md
   - ScopeCheck.md

### Files Preserved (No Changes):

- Existing base-rules (CORE_EXECUTION_RULES.md, PERSONA_REVIEW_RULES.md, etc.)
  - Remain as comprehensive reference
  - Not loaded by default (too long)
  - Consulted when needed

- Existing projects
  - No changes to project code
  - Works with existing `.claude-state/` if present

## What Stays The Same

- Core philosophy (test-first, validation gates, persona reviews)
- Professional standards
- Security requirements
- Checkpoint system
- Project structure

## Implementation Plan

### Phase 1: Create Simplified Core Rules
1. Extract top 10 essential rules from existing base-rules
2. Create MANDATORY_CORE.md (<100 lines)
3. Make it scannable and memorable

### Phase 2: Create Slash Commands
1. Create `.claude/commands/` directory structure
2. Write `/init` command (session startup)
3. Write `/validate` command (validation gate)
4. Write `/review` command (persona reviews)
5. Write `/checkpoint` command (state preservation)
6. Write `/status` command (compliance tracking)

### Phase 3: Create Enforcement Tools
1. ValidationGate.md (5-item checklist)
2. PersonaReview.md (6-persona template)
3. TestFirst.md (workflow guide)
4. ScopeCheck.md (scope tracker)

### Phase 4: Modify CLAUDE.md
1. Simplify session startup section
2. Add slash command references
3. Add compliance tracking format
4. Make enforcement explicit and visible

### Phase 5: Create Global Setup Script
1. `setup-global-rules.sh` to install system
2. Copies files to correct locations
3. Creates `.claude/` directory structure
4. Tests installation

### Phase 6: Testing
1. Test in chrome-dev-assist (current project)
2. Test in new project
3. Test across multiple sessions
4. Measure compliance rates
5. Iterate based on results

## Architecture Diagram

```
Session Start
    ↓
MANDATORY_CORE.md loaded FIRST
    ↓
[1] Detect project name
[2] Check for state recovery
[3] Display startup message
    ↓
Every Response:
    ↓
Check compliance:
  - Prefix with [project-name]
  - Track phase (Plan/Test/Code/Validate/Review)
  - Show status: ✓ CORE | ✓ PREFIX | ...
    ↓
User can trigger:
  /init     → Force startup protocol
  /validate → Run validation gate
  /review   → Run persona reviews
  /status   → Show compliance

Gates enforced:
  Before coding → /init must run
  Before complete → /validate must pass
  Before final → /review must approve
```

## Data Flow

```
User Request
    ↓
Claude checks MANDATORY_CORE.md
    ↓
Is session initialized?
    NO → Run /init automatically
    YES → Continue
    ↓
What phase are we in?
    Plan → Load planning rules
    Test → Enforce test-first
    Code → Apply standards
    Validate → Run /validate
    Review → Run /review
    ↓
Respond with compliance status
    ↓
[project-name] ✓ CORE | ✓ TESTS | ... Response here
```

## Function Connectivity

### MANDATORY_CORE.md
- Loaded: Every session start
- Calls: Project detection, state recovery check
- Outputs: Startup message, compliance tracker

### /init Command
- Triggered: Session start (auto or manual)
- Loads: MANDATORY_CORE.md
- Executes: Project detection, state check
- Outputs: Startup message

### /validate Command
- Triggered: Before task completion
- Loads: ValidationGate.md
- Executes: 5-item checklist
- Outputs: PASS/FAIL + details

### /review Command
- Triggered: After validation passes
- Loads: PersonaReview.md
- Executes: All 6 persona reviews
- Outputs: Review results + decision

### /status Command
- Triggered: Any time
- Checks: Current phase, compliance status
- Outputs: Status indicator

## Dependencies

### External:
- Claude Code CLI (existing)
- Bash (for setup scripts)
- Git (for project detection)

### Internal:
- MANDATORY_CORE.md → All commands
- ValidationGate.md → /validate
- PersonaReview.md → /review
- CLAUDE.md → Session configuration

### File Structure:
```
~/Documents/Claude Code/
├── CLAUDE.md (modified)
├── base-rules/
│   ├── MANDATORY_CORE.md (NEW)
│   ├── CORE_EXECUTION_RULES.md (reference only)
│   ├── PERSONA_REVIEW_RULES.md (reference only)
│   ├── SECURITY_RULES.md (reference only)
│   ├── STATE_PRESERVATION_RULES.md (reference only)
│   └── tools/ (NEW)
│       ├── ValidationGate.md
│       ├── PersonaReview.md
│       ├── TestFirst.md
│       └── ScopeCheck.md
├── .claude/
│   └── commands/ (NEW)
│       ├── init.md
│       ├── validate.md
│       ├── review.md
│       ├── checkpoint.md
│       └── status.md
└── scripts/
    └── setup-global-rules.sh (NEW)
```

## Pre-Flight Validation

- [ ] Simplest solution identified: YES - slash commands + simplified core
- [ ] Impact on other code mapped: Affects CLAUDE.md, adds new files
- [ ] What WILL change: Session startup, enforcement mechanism
- [ ] What SHOULDN'T change: Existing projects, core philosophy
- [ ] All names/functions/parameters verified: Commands named clearly
- [ ] No name collisions: New directory structure avoids conflicts
- [ ] All references correct: Dependencies mapped
- [ ] Future-self will understand: Well documented

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slash commands not supported | HIGH | Fall back to explicit tool references |
| Still relies on Claude memory | MEDIUM | Make MANDATORY_CORE very short and clear |
| User forgets to use commands | MEDIUM | Auto-trigger where possible |
| Too complex to maintain | LOW | Keep core simple, tools modular |

## Future Enhancements

**Phase 2 (Future):**
- IDE integration for compliance tracking
- Automated test execution
- Real checkpoint file creation
- Network resilience implementation
- AI-powered compliance monitoring

**Not in MVP:**
- Automatic checkpoint file creation (complex)
- Network pause/resume (requires system hooks)
- CI/CD integration
- Multi-user collaboration features

## Acceptance Criteria

Task is complete when:
- [ ] MANDATORY_CORE.md created and tested (<100 lines)
- [ ] All 5 slash commands working (/init, /validate, /review, /checkpoint, /status)
- [ ] All 4 enforcement tools created (ValidationGate, PersonaReview, TestFirst, ScopeCheck)
- [ ] CLAUDE.md updated with new system
- [ ] Setup script created and tested
- [ ] Compliance measured: >85% across all metrics
- [ ] Tested in 3+ projects successfully
- [ ] Documentation complete
- [ ] User guide created

## Timeline Estimate

- Phase 1 (Simplified Core): 30 min
- Phase 2 (Slash Commands): 1 hour
- Phase 3 (Enforcement Tools): 45 min
- Phase 4 (CLAUDE.md update): 30 min
- Phase 5 (Setup Script): 30 min
- Phase 6 (Testing): 1 hour

**Total: ~4-5 hours of work**

## Success Metrics

**Measure after implementation:**
1. Session startup compliance (target: 95%)
2. Response prefix consistency (target: 95%)
3. Test-first adherence (target: 80%)
4. Validation gate execution (target: 90%)
5. Persona review execution (target: 75%)

**Test in:**
1. chrome-dev-assist (current)
2. New test project
3. Existing project with state

**Compare:**
- Before: 20% overall compliance
- After: 85% overall compliance

---

**Next:** Proceed to Phase 1 - Create MANDATORY_CORE.md

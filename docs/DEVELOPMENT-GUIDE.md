# Chrome Dev Assist - Development Guide

Complete guide for developers working on the chrome-dev-assist project.

**For quick reference, see:** [CLAUDE.md](../CLAUDE.md) | [API.md](API.md) | [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## Development Commands

### Setup

```bash
# Install dependencies
npm install

# Load Chrome extension manually
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → Select extension/ folder
# 4. Note the extension ID (32 characters)
```

### Running Tests

```bash
# All tests (requires extension loaded)
npm test

# Specific test suites
npx jest tests/integration/websocket-server.test.js
npx jest tests/integration/complete-system.test.js
npx jest tests/unit/

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual Testing

```bash
# Start WebSocket server
node server/websocket-server.js

# Run manual test script
node test-complete-system.js

# Run specific manual tests
node test-reload-self.js
node test-console-minimal.js
```

### Common Operations

```bash
# Kill stuck server
pkill -f websocket-server
lsof -i :9876  # Find process on port 9876

# Check server status
curl http://localhost:9876/health

# View server logs
DEBUG=true node server/websocket-server.js
```

---

## Common Development Tasks

### Adding New API Function

1. **Add function to** `claude-code/index.js`:

```javascript
async function newFunction(param) {
  // Validation
  const command = { id: generateCommandId(), type: 'newType', params: { param } };
  return await sendCommand(command);
}
```

2. **Add handler in** `extension/background.js`:

```javascript
case 'newType':
  const result = await handleNewType(command.params);
  sendResponse({ result });
  break;
```

3. **Export from** `claude-code/index.js`:

```javascript
module.exports = { ..., newFunction };
```

4. **Write tests** in `tests/integration/`:

```javascript
test('newFunction should work', async () => {
  const result = await chromeDevAssist.newFunction(param);
  expect(result).toBeDefined();
});
```

### Debugging WebSocket Issues

1. **Check server running**: `lsof -i :9876`
2. **Check extension connected**: Open extension service worker console
3. **Enable debug logging**: `DEBUG=true node server/websocket-server.js`
4. **Check WebSocket messages**: Look for `[Server] Message:` logs
5. **Check command routing**: Verify command ID matches in request/response

### Fixing Test Failures

1. **"Extension not connected"**: Load extension in Chrome, verify service worker running
2. **"Command timeout"**: Check extension console for errors, increase timeout if needed
3. **"Invalid extension ID"**: Use 32-character ID from chrome://extensions
4. **"Port already in use"**: Kill old server with `pkill -f websocket-server`

---

## Development Workflow

### Before Starting Work

1. **Read existing docs** relevant to your task (see [Documentation Index](CLAUDE.md#documentation-index))
2. **Check** `PHANTOM-APIS-COMPLETE-LIST-2025-10-26.md` to avoid phantom functions
3. **Load extension** in Chrome if running tests
4. **Start server** with `node server/websocket-server.js`

### Feature Development

1. **Write tests first** (TDD approach)
2. **Verify no phantom API** - Check function exists in `claude-code/index.js` or `extension/background.js`
3. **Implement minimal change** to pass tests
4. **Run full test suite** to check for regressions
5. **Update docs** if API changes

### Bug Fixing

1. **Reproduce** with minimal test case
2. **Check audit docs** for related known issues
3. **Fix surgically** - Minimal change to resolve
4. **Verify no regressions** - Run full test suite
5. **Document** in `FIXED-LOG.md` after 24-hour cooling period

### Code Review Checklist

- [ ] Tests written and passing
- [ ] No phantom APIs used
- [ ] Extension ID validation follows `/^[a-p]{32}$/`
- [ ] WebSocket error handling present
- [ ] No hardcoded extension IDs or tokens
- [ ] Documentation updated (API.md, README.md if applicable)
- [ ] Security implications considered (4-layer defense)

---

## Emergency Procedures

### Server Won't Start

```bash
# Check port availability
lsof -i :9876

# Kill existing server
pkill -f websocket-server

# Remove stale PID file
rm .server-pid

# Restart
node server/websocket-server.js
```

### Extension Not Responding

1. Open `chrome://extensions`
2. Find "Chrome Dev Assist"
3. Click "service worker" link
4. Check console for errors
5. Click "Reload" on extension card
6. Verify "Connected to server" message

### Tests Hanging

```bash
# Kill Jest
pkill -f jest

# Kill any stuck Chrome processes
pkill -f Chrome

# Restart server
pkill -f websocket-server
node server/websocket-server.js

# Retry tests
npm test
```

### Rollback Process

```bash
# Revert to last working commit
git log --oneline  # Find last good commit
git revert <commit-hash>

# Or reset (use with caution)
git reset --hard <commit-hash>

# Reload extension manually
# chrome://extensions → Reload button
```

---

## Testing Strategy

**See:** [TESTING-GUIDE.md](../TESTING-GUIDE.md) for complete testing documentation.

### Test Categories

- **Unit tests** (`tests/unit/`): 30+ tests
  - Extension ID validation
  - Console capture logic
  - Tab cleanup
  - Health manager

- **Integration tests** (`tests/integration/`): 50+ tests
  - WebSocket communication
  - Extension reload
  - Console capture
  - Multi-feature workflows

- **Security tests** (`tests/security/`): 10+ tests
  - WebSocket security
  - Tab cleanup security
  - Client security

- **Edge cases** (`tests/integration/edge-cases-*.test.js`):
  - Memory limits
  - Concurrency
  - Special data types
  - Stress testing

### Running Single Test

```bash
# Specific file
npx jest tests/unit/error-logger.test.js

# Specific test
npx jest -t "should validate extension ID format"

# With verbose output
npx jest tests/integration/complete-system.test.js --verbose
```

---

## CI/CD Workflow

**See:** [docs/CI-CD.md](CI-CD.md) for complete CI/CD documentation.

### Pre-commit Hooks

- Automatically runs on `git commit`
- ESLint auto-fix
- Prettier auto-format
- Only on staged files (fast!)

### GitHub Actions

6 automated workflows run on every push/PR:

- Critical Checks (ShellCheck, Gitleaks, CVE checks, linting)
- CodeQL Security Analysis (289 checks)
- Test Coverage (Codecov integration)
- Lint Code (ESLint + Prettier)
- PR Auto-Labeler
- PR Title Check

---

**Last Updated:** 2025-10-30
**Related:** [CLAUDE.md](../CLAUDE.md) | [ARCHITECTURE-OVERVIEW.md](ARCHITECTURE-OVERVIEW.md) | [KNOWN-ISSUES.md](KNOWN-ISSUES.md)

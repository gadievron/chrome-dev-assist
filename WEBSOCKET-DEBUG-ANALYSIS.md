# WebSocket Connection Debug Analysis

**Date:** 2025-10-26
**Issue:** Extension showing ERR_CONNECTION_REFUSED despite server running

## Investigation Results

### 1. Server Status

```bash
$ lsof -i :9876 -P -n
node 19389 gadievron 14u IPv4 TCP 127.0.0.1:9876 (LISTEN)
node 19389 gadievron 15u IPv4 TCP 127.0.0.1:9876->127.0.0.1:65427 (ESTABLISHED)
Google 1543 gadievron 47u IPv4 TCP 127.0.0.1:65427->127.0.0.1:9876 (ESTABLISHED)
```

**CRITICAL FINDING:** Connection IS established!

- Server (PID 19389) listening on 127.0.0.1:9876
- Chrome (PID 1543) connected from 127.0.0.1:65427
- Connection state: ESTABLISHED (both directions)

### 2. Web Search Findings

**Chrome MV3 WebSocket Issues (pre-Chrome 116):**

- Service workers auto-terminate after 30s of inactivity
- WebSocket connections would close when service worker terminates
- **Solution:** Keepalive messages every 20s (Chrome 116+)

**Common ERR_CONNECTION_REFUSED Causes:**

1. ~~Server not running~~ ✅ Server IS running and connected
2. ~~Port binding issues~~ ✅ Correctly bound to IPv4 127.0.0.1
3. ~~localhost resolution~~ ✅ Extension uses ws://localhost:9876, resolves correctly
4. Service worker lifecycle - May be causing reconnection cycles
5. Old error messages in console (connection recovered but error persists)

### 3. Extension Code Analysis

**background.js:269:**

```javascript
ws = new WebSocket('ws://localhost:9876');
```

**Reconnection Logic:**

- Exponential backoff implemented
- Automatic reconnection on close/error
- Connection timeout: 5 seconds

### 4. Hypotheses

**Hypothesis A: Stale Error Messages**

- Extension tried to connect before server was ready
- Connection failed with ERR_CONNECTION_REFUSED
- Extension reconnected successfully (as shown by lsof)
- Old error still visible in console

**Hypothesis B: Service Worker Lifecycle**

- Service worker terminates during inactivity
- WebSocket closes
- Extension reconnects automatically
- User sees error during reconnection window

**Hypothesis C: Reconnection Cycle**

- Extension connects successfully
- Some validation fails (e.g., registration format)
- Server closes connection
- Extension tries to reconnect (ERR_CONNECTION_REFUSED)
- Cycle repeats

## Next Steps

### Test 1: Verify Current Connection

Use test script to check if connection is functional:

```javascript
const ws = new WebSocket('ws://localhost:9876');
ws.on('open', () => console.log('✅ Connected'));
ws.on('error', err => console.error('❌ Error:', err));
```

### Test 2: Send Test Command

If connected, send a simple command (e.g., listExtensions) to verify bidirectional communication.

### Test 3: Check Server Logs

Review server output for registration/command messages.

### Test 4: Reload Extension

If connection is functional, send reload command to test ErrorLogger.

## Action Plan

1. ✅ CONFIRMED: Server is running and extension is connected
2. TODO: Test if connection is bidirectional (can send/receive messages)
3. TODO: If working, proceed with ErrorLogger testing
4. TODO: If broken, debug registration/validation issues
5. TODO: Implement keepalive messages if service worker lifecycle is issue

## Resolution Strategy

**If connection works:**

- Proceed with extension reload and ErrorLogger verification
- Old error messages can be ignored

**If connection doesn't work:**

- Check server validation requirements
- Fix registration format in extension
- Test with minimal registration payload

**Long-term fix:**

- Implement keepalive messages (20s interval)
- Add better error reporting in extension console
- Clear console on successful reconnection

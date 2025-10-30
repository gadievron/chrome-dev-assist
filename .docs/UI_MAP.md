# UI Map - Chrome Dev Assist

**UI components documentation**

**Last Updated:** 2025-10-30

---

## Chrome Extension UI

**Type:** Background-only extension (no UI)

**Service Worker:**

- No visible UI
- Console-only output
- Background processing

**Future UI (if added):**

- Options page (extension settings)
- Popup (quick actions)
- DevTools panel (debugging)

---

## CLI Output

**Node.js API Output:**

- JSON responses
- Error messages
- Debug logging (if DEBUG=true)

**Examples:**

```javascript
// Success response
{
  extensionId: 'abc...',
  extensionName: 'My Extension',
  reloadSuccess: true
}

// Error response
Error: Invalid extension ID format
```

---

**Maintained By:** Chrome Dev Assist Team

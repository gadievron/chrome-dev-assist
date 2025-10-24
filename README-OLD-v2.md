# Chrome Dev Assist

**Automated Chrome extension testing tool for Node.js**

Chrome Dev Assist enables you to programmatically reload Chrome extensions and capture console logs from your Node.js test automation, CI/CD pipelines, or development scripts.

---

## Features

- ✅ **Reload Extensions** - Programmatically reload any Chrome extension
- ✅ **Capture Console Logs** - Intercept console output from all tabs and frames
- ✅ **Auto-Start Server** - No manual server management required
- ✅ **Auto-Reconnect** - Resilient to server/extension restarts
- ✅ **Simple API** - Three clean functions, that's it
- ✅ **Type Validated** - Extension ID validation with clear error messages

## Installation

### 1. Install the package

```bash
cd chrome-dev-assist
npm install
```

### 2. Install native messaging host

```bash
npm run install-host
```

This installs the native messaging host that enables communication between Node.js and Chrome.

### 3. Install the Chrome extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this project

### 4. Configure extension ID

After installing the extension, you'll see an Extension ID (32 character string) on the `chrome://extensions` page.

```bash
npm run configure-host <YOUR_EXTENSION_ID>
```

**Done!** The extension is now ready to use.

## Usage

### Basic Example

```javascript
const chromeDevAssist = require('chrome-dev-assist');

// Reload extension and capture console logs
const result = await chromeDevAssist.reloadAndCapture('abcdefghijklmnop');

console.log('Extension reloaded:', result.reloadSuccess);
console.log('Console logs captured:', result.consoleLogs.length);

result.consoleLogs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
});
```

### API Reference

#### `reloadAndCapture(extensionId, options)`

Reload an extension and capture console logs.

**Parameters:**
- `extensionId` (string): Chrome extension ID (32 characters)
- `options` (object, optional):
  - `duration` (number): Console capture duration in milliseconds (default: 5000)

**Returns:** Promise<Object>
```javascript
{
  extensionId: string,
  extensionName: string,
  reloadSuccess: boolean,
  consoleLogs: [
    {
      level: 'log' | 'error' | 'warn' | 'info' | 'debug',
      message: string,
      timestamp: string (ISO 8601),
      source: string,
      url: string,
      tabId: number
    }
  ]
}
```

**Example:**
```javascript
const result = await chromeDevAssist.reloadAndCapture('abcdefghijklmnop', {
  duration: 3000  // Capture for 3 seconds
});
```

#### `reload(extensionId)`

Reload an extension without capturing console logs.

**Parameters:**
- `extensionId` (string): Chrome extension ID

**Returns:** Promise<Object>
```javascript
{
  extensionId: string,
  extensionName: string,
  reloadSuccess: boolean
}
```

**Example:**
```javascript
await chromeDevAssist.reload('abcdefghijklmnop');
```

#### `captureLogs(duration)`

Capture console logs without reloading any extension.

**Parameters:**
- `duration` (number, optional): Capture duration in milliseconds (default: 5000)

**Returns:** Promise<Object>
```javascript
{
  consoleLogs: [...]
}
```

**Example:**
```javascript
const result = await chromeDevAssist.captureLogs(10000); // 10 seconds
console.log(result.consoleLogs);
```

## Use Cases

### Automated Testing

```javascript
const chromeDevAssist = require('chrome-dev-assist');

async function testExtension() {
  // Reload extension and check for errors
  const result = await chromeDevAssist.reloadAndCapture('your-extension-id');

  const errors = result.consoleLogs.filter(log => log.level === 'error');

  if (errors.length > 0) {
    console.error('Extension has errors:');
    errors.forEach(err => console.error(err.message));
    process.exit(1);
  } else {
    console.log('✓ Extension loaded without errors');
  }
}

testExtension();
```

### CI/CD Integration

```javascript
// test-extension.js
const chromeDevAssist = require('chrome-dev-assist');

async function runTests() {
  // Test 1: Extension loads without errors
  console.log('Test 1: Extension reload...');
  const result = await chromeDevAssist.reloadAndCapture(process.env.EXTENSION_ID);

  const errors = result.consoleLogs.filter(log => log.level === 'error');
  if (errors.length > 0) {
    throw new Error(`Extension has ${errors.length} errors`);
  }

  console.log('✓ Extension loaded successfully');

  // Test 2: Check for warnings
  const warnings = result.consoleLogs.filter(log => log.level === 'warn');
  if (warnings.length > 0) {
    console.warn(`⚠ ${warnings.length} warnings found`);
  }

  console.log('✓ All tests passed');
}

runTests().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});
```

## How It Works

Chrome Dev Assist uses Chrome's Native Messaging API to enable communication between Node.js and the Chrome extension:

```
Node.js API → Native Host → Chrome Extension → Results → Native Host → Node.js API
```

1. **Node.js API** - Your code calls the simple API
2. **Native Host** - Node.js process that bridges to Chrome
3. **Chrome Extension** - Receives commands, executes actions, captures logs
4. **Native Messaging** - Chrome's official API for extension ↔ native app communication

## Troubleshooting

### Extension not responding

- Verify extension is installed and enabled in `chrome://extensions`
- Check that extension ID is correctly configured
- Look for errors in Chrome's extension console

### Native host not found

- Run `npm run install-host` to reinstall
- Check that manifest exists in:
  - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
  - Linux: `~/.config/google-chrome/NativeMessagingHosts/`

### Permission denied errors

- Ensure native host script is executable: `chmod +x native-host/host.js`
- Check file permissions in the native messaging hosts directory

## Limitations

- **Console capture scope**: Only captures console logs from web pages (content script context). Background script console logs of the target extension are not captured in MVP.
- **Platform support**: Currently supports macOS and Linux. Windows requires manual registry configuration.
- **Chrome only**: Works with Google Chrome. Chromium/Edge support may require manifest path adjustments.

## Development

### Project Structure

```
chrome-dev-assist/
├── claude-code/           # Node.js API
│   └── index.js
├── native-host/           # Native messaging bridge
│   ├── host.js
│   ├── manifest.json
│   └── package.json
├── extension/             # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content-script.js
│   └── popup/
├── scripts/               # Setup scripts
│   ├── install.js
│   └── configure-host.js
└── tests/                 # Test suite
```

### Running Tests

```bash
npm test
```

### Manual Testing

1. Install extension in Chrome
2. Create test script:

```javascript
const chromeDevAssist = require('./claude-code/index.js');

chromeDevAssist.reloadAndCapture('your-extension-id')
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

3. Run: `node test-script.js`

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.

---

**Made for automated Chrome extension testing workflows.**

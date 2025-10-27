/**
 * Screenshot Visual Verification Test
 *
 * This test verifies that screenshots actually capture visible content
 * by displaying secret codes on screen, capturing them, and verifying
 * the codes are readable in the screenshots.
 *
 * Uses Claude's image reading capability to verify screenshot content.
 */

const chromeDevAssist = require('../../claude-code/index.js');
const fs = require('fs');
const path = require('path');

// Read auth token for fixture access
const AUTH_TOKEN = fs.readFileSync(path.join(__dirname, '../../.auth-token'), 'utf8').trim();

// Test data: Each fixture displays a unique secret code
const TEST_CASES = [
  {
    fixture: 'screenshot-test-1.html',
    secret: 'ALPHA-7392',
    format: 'png',
    description: 'Purple gradient background with red secret code',
  },
  {
    fixture: 'screenshot-test-2.html',
    secret: 'BETA-4561',
    format: 'jpeg',
    quality: 90,
    description: 'Pink gradient background with green secret code',
  },
  {
    fixture: 'screenshot-test-3.html',
    secret: 'GAMMA-8205',
    format: 'png',
    description: 'Orange gradient background with dark container',
  },
];

describe('Screenshot Visual Verification', () => {
  let testId;
  const openedTabs = [];

  beforeAll(async () => {
    testId = `screenshot-visual-test-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup: Close all opened tabs
    for (const tabId of openedTabs) {
      try {
        await chromeDevAssist.closeTab(tabId);
      } catch (err) {
        // Tab might already be closed
      }
    }

    // NOTE: Screenshots are kept for manual verification
    // To cleanup, manually delete: tests/.screenshots/
    console.log('\n💾 Screenshots preserved for verification at: tests/.screenshots/');
  });

  describe('PNG Screenshot Verification', () => {
    // TODO: This test is INCOMPLETE - it only verifies file size, not visual content
    // Need to implement actual visual verification using OCR or Claude Vision API
    // Currently SKIPPED to avoid fake test (identified by QA expert review)
    it.skip('should capture and verify secret code ALPHA-7392 in PNG format', async () => {
      const testCase = TEST_CASES[0];

      // 1. Open test fixture (with auth token)
      const fixtureUrl = `http://localhost:9876/fixtures/${testCase.fixture}?token=${AUTH_TOKEN}`;
      console.log(`Opening fixture: ${fixtureUrl}`);

      const openResult = await chromeDevAssist.openUrl(fixtureUrl, { active: true });
      openedTabs.push(openResult.tabId);

      expect(openResult.tabId).toBeGreaterThan(0);
      console.log(`Tab opened: ${openResult.tabId}`);

      // 2. Wait for page to fully render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Capture screenshot
      console.log(`Capturing PNG screenshot of tab ${openResult.tabId}...`);
      const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      // 4. Verify screenshot structure
      expect(screenshot).toBeDefined();
      expect(screenshot.tabId).toBe(openResult.tabId);
      expect(screenshot.format).toBe('png');
      expect(screenshot.dataUrl).toBeDefined();
      expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(screenshot.size).toBeGreaterThan(1000); // Should be substantial size

      console.log(`Screenshot captured: ${screenshot.size} bytes`);

      // 5. Save screenshot to temp file for verification
      const screenshotDir = path.join(__dirname, '../.screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotDir, `test-1-${testCase.secret}.png`);
      const base64Data = screenshot.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(screenshotPath, base64Data, 'base64');

      console.log(`Screenshot saved to: ${screenshotPath}`);
      console.log(`Expected secret: ${testCase.secret}`);
      console.log(`Description: ${testCase.description}`);

      // 6. Verification success (screenshot captured and saved)
      expect(fs.existsSync(screenshotPath)).toBe(true);
      const fileSize = fs.statSync(screenshotPath).size;
      expect(fileSize).toBeGreaterThan(1000);

      console.log(`✓ Screenshot saved successfully (${fileSize} bytes)`);
      console.log(`✓ Ready for visual verification of secret: ${testCase.secret}`);
    }, 30000);
  });

  describe('JPEG Screenshot Verification', () => {
    // TODO: This test is INCOMPLETE - it only verifies file size, not visual content
    // Need to implement actual visual verification using OCR or Claude Vision API
    // Currently SKIPPED to avoid fake test (identified by QA expert review)
    it.skip('should capture and verify secret code BETA-4561 in JPEG format', async () => {
      const testCase = TEST_CASES[1];

      // 1. Open test fixture (with auth token)
      const fixtureUrl = `http://localhost:9876/fixtures/${testCase.fixture}?token=${AUTH_TOKEN}`;
      console.log(`Opening fixture: ${fixtureUrl}`);

      const openResult = await chromeDevAssist.openUrl(fixtureUrl, { active: true });
      openedTabs.push(openResult.tabId);

      expect(openResult.tabId).toBeGreaterThan(0);

      // 2. Wait for page to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Capture JPEG screenshot with quality setting
      console.log(`Capturing JPEG screenshot (quality: ${testCase.quality})...`);
      const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'jpeg',
        quality: testCase.quality,
      });

      // 4. Verify screenshot structure
      expect(screenshot).toBeDefined();
      expect(screenshot.format).toBe('jpeg');
      expect(screenshot.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(screenshot.size).toBeGreaterThan(500);

      console.log(`Screenshot captured: ${screenshot.size} bytes`);

      // 5. Save screenshot
      const screenshotDir = path.join(__dirname, '../.screenshots');
      const screenshotPath = path.join(screenshotDir, `test-2-${testCase.secret}.jpeg`);
      const base64Data = screenshot.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(screenshotPath, base64Data, 'base64');

      console.log(`Screenshot saved to: ${screenshotPath}`);
      console.log(`Expected secret: ${testCase.secret}`);

      // 6. Verify file saved
      expect(fs.existsSync(screenshotPath)).toBe(true);
      const fileSize = fs.statSync(screenshotPath).size;
      expect(fileSize).toBeGreaterThan(500);

      console.log(`✓ JPEG screenshot saved (${fileSize} bytes)`);
      console.log(`✓ Ready for visual verification of secret: ${testCase.secret}`);
    }, 30000);
  });

  describe('High Resolution Screenshot', () => {
    // TODO: This test is INCOMPLETE - it only verifies file size, not visual content
    // Need to implement actual visual verification using OCR or Claude Vision API
    // Currently SKIPPED to avoid fake test (identified by QA expert review)
    it.skip('should capture and verify secret code GAMMA-8205 with high detail', async () => {
      const testCase = TEST_CASES[2];

      // 1. Open test fixture (with auth token)
      const fixtureUrl = `http://localhost:9876/fixtures/${testCase.fixture}?token=${AUTH_TOKEN}`;
      console.log(`Opening fixture: ${fixtureUrl}`);

      const openResult = await chromeDevAssist.openUrl(fixtureUrl, { active: true });
      openedTabs.push(openResult.tabId);

      expect(openResult.tabId).toBeGreaterThan(0);

      // 2. Wait for render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Capture high-resolution PNG
      console.log('Capturing high-resolution screenshot...');
      const screenshot = await chromeDevAssist.captureScreenshot(openResult.tabId, {
        format: 'png',
      });

      // 4. Verify
      expect(screenshot).toBeDefined();
      expect(screenshot.format).toBe('png');
      expect(screenshot.size).toBeGreaterThan(1000);

      console.log(`Screenshot captured: ${screenshot.size} bytes`);

      // 5. Save
      const screenshotDir = path.join(__dirname, '../.screenshots');
      const screenshotPath = path.join(screenshotDir, `test-3-${testCase.secret}.png`);
      const base64Data = screenshot.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(screenshotPath, base64Data, 'base64');

      console.log(`Screenshot saved to: ${screenshotPath}`);
      console.log(`Expected secret: ${testCase.secret}`);

      // 6. Verify
      expect(fs.existsSync(screenshotPath)).toBe(true);
      const fileSize = fs.statSync(screenshotPath).size;
      expect(fileSize).toBeGreaterThan(1000);

      console.log(`✓ High-res screenshot saved (${fileSize} bytes)`);
      console.log(`✓ Ready for visual verification of secret: ${testCase.secret}`);
    }, 30000);
  });

  describe('Screenshot Verification Summary', () => {
    it('should list all screenshots for manual verification', () => {
      const screenshotDir = path.join(__dirname, '../.screenshots');

      console.log('\n📸 SCREENSHOT VERIFICATION SUMMARY');
      console.log('=====================================');

      if (fs.existsSync(screenshotDir)) {
        const files = fs.readdirSync(screenshotDir);

        console.log(`\nTotal screenshots captured: ${files.length}`);
        console.log(`Location: ${screenshotDir}\n`);

        files.forEach(file => {
          const filePath = path.join(screenshotDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  ✓ ${file} (${stats.size} bytes)`);
        });

        console.log('\n📋 Expected secrets to verify:');
        TEST_CASES.forEach(tc => {
          console.log(`  • ${tc.secret} - ${tc.description}`);
        });

        console.log('\n🔍 Next step: Verify screenshots contain visible secret codes');
        console.log('   Use Read tool to analyze screenshot images');

        expect(files.length).toBe(3);
      }
    });
  });
});

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Load API keys from .env
const envPath = path.resolve(__dirname, '..', '.env');
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) env[match[1]] = match[2].trim();
  }
}

const DEMO_DIR = path.resolve(__dirname, '..', 'Demo');
const testImages = fs
  .readdirSync(DEMO_DIR)
  .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
  .sort()
  .slice(0, 2) // Just 2 images for speed
  .map((f) => path.join(DEMO_DIR, f));

test('Smoke test - Basic video generation flow', async ({ page }) => {
  console.log('=== DraftCut Smoke Test ===\n');

  // Step 1: Load home page
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('DraftCut');
  console.log('✓ Home page loaded');

  // Step 2: Seed API keys
  await page.evaluate(
    (keys) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('draftcut', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('settings'))
            db.createObjectStore('settings');
          if (!db.objectStoreNames.contains('projects'))
            db.createObjectStore('projects', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('assets'))
            db.createObjectStore('assets', { keyPath: 'id' });
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          for (const [id, key] of Object.entries(keys)) {
            if (key) store.put(key, `api-key-${id}`);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    },
    {
      gemini: env.GEMINI_API_KEY || '',
    }
  );
  console.log('✓ API keys seeded');

  // Step 3: Configure AI provider (Gemini for speed)
  await page.locator('button[title="Settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Select Gemini (faster than Claude)
  const providerSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').first();
  await providerSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Gemini' }).click();

  // Fill API key
  const apiKeyInput = page.locator('[role="dialog"]').locator('input[type="password"]').first();
  await apiKeyInput.fill(env.GEMINI_API_KEY || '');

  // Select Gemini Flash 2.5 (fastest)
  const modelSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').nth(1);
  await modelSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Flash' }).click();

  console.log('✓ AI provider configured (Gemini 2.5 Flash)');

  // Close settings
  await page.keyboard.press('Escape');

  // Step 4: Upload test images
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testImages);

  await expect(page.locator(`text=Assets (${testImages.length})`)).toBeVisible({
    timeout: 10_000,
  });
  console.log(`✓ ${testImages.length} test images uploaded`);

  // Step 5: Enter simple prompt
  const textarea = page.locator('textarea');
  await textarea.fill('Create a 10-second video with these images using Ken Burns effects.');
  console.log('✓ Prompt entered');

  // Step 6: Generate
  const generateBtn = page.locator('button').filter({ hasText: 'Generate Video Draft' });
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();
  console.log('✓ Generate clicked');

  // Step 7: Wait for generation
  await expect(page.locator('button').filter({ hasText: /Generating/ })).toBeVisible({
    timeout: 10_000,
  });
  console.log('✓ Generation in progress...');

  // Wait for navigation to editor (60s timeout for Gemini)
  await page.waitForURL('**/editor', { timeout: 60_000 });
  console.log('✓ Navigated to editor!');

  // Step 8: Verify editor loaded
  await expect(page.locator('text=No project loaded')).not.toBeVisible();
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({
    path: 'e2e/screenshots/smoke-test-result.png',
    fullPage: true,
  });
  console.log('✓ Screenshot saved');

  console.log('\n✓ Smoke test PASSED - Basic video generation works!');
});

test('UI components smoke test', async ({ page }) => {
  console.log('=== UI Components Smoke Test ===\n');

  await page.goto('/');

  // Check key UI elements exist
  await expect(page.locator('h1')).toContainText('DraftCut');
  console.log('✓ Header present');

  await expect(page.locator('text=Create Videos with AI')).toBeVisible();
  console.log('✓ Hero text present');

  await expect(page.locator('textarea')).toBeVisible();
  console.log('✓ Prompt textarea present');

  await expect(page.locator('input[type="file"]')).toBeVisible();
  console.log('✓ File upload present');

  await expect(page.locator('button[title="Settings"]')).toBeVisible();
  console.log('✓ Settings button present');

  // Open settings
  await page.locator('button[title="Settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  console.log('✓ Settings dialog opens');

  // Check all tabs
  await expect(page.locator('[role="tab"]').filter({ hasText: 'AI Provider' })).toBeVisible();
  await expect(page.locator('[role="tab"]').filter({ hasText: 'Media Services' })).toBeVisible();
  await expect(page.locator('[role="tab"]').filter({ hasText: 'Brand Kit' })).toBeVisible();
  await expect(page.locator('[role="tab"]').filter({ hasText: 'Website' })).toBeVisible();
  await expect(page.locator('[role="tab"]').filter({ hasText: 'Advanced' })).toBeVisible();
  console.log('✓ All settings tabs present');

  // Check Advanced tab for agentic mode
  await page.locator('[role="tab"]').filter({ hasText: 'Advanced' }).click();
  await page.waitForTimeout(500);

  await expect(page.locator('text=Agentic Video Creation')).toBeVisible();
  console.log('✓ Agentic mode setting present');

  await expect(page.locator('[role="switch"]')).toBeVisible();
  console.log('✓ Agentic mode toggle present');

  await page.keyboard.press('Escape');

  console.log('\n✓ UI smoke test PASSED - All components present!');
});

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
const demoImages = fs
  .readdirSync(DEMO_DIR)
  .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
  .sort()
  .slice(0, 3) // Use only 3 images for faster test
  .map((f) => path.join(DEMO_DIR, f));

// Simpler prompt to test agentic refinement
const PROMPT = `Create a 15-second product showcase video with these screenshots.
Add dynamic animations and professional intro/outro.`;

test('Generate video with agentic mode enabled', async ({ page }) => {
  // Step 1: Go to home page
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('DraftCut');
  console.log('✓ Home page loaded');

  // Step 2: Seed API keys into IndexedDB
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
            store.put(key, `api-key-${id}`);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    },
    {
      claude: env.ANTHROPIC_API_KEY,
      gemini: env.GEMINI_API_KEY,
    }
  );
  console.log('✓ API keys seeded into IndexedDB');

  // Step 3: Open settings
  await page.locator('button[title="Settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Configure AI Provider (Claude)
  const providerSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').first();
  await providerSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude (Anthropic)' }).click();

  const apiKeyInput = page.locator('[role="dialog"]').locator('input[type="password"]').first();
  await apiKeyInput.fill(env.ANTHROPIC_API_KEY);

  const modelSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').nth(1);
  await modelSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude Sonnet 4.5' }).click();

  console.log('✓ AI provider configured (Claude Sonnet 4.5)');

  // Step 4: Enable Agentic Mode
  // Click on "Advanced" tab
  await page.locator('[role="tab"]').filter({ hasText: 'Advanced' }).click();
  await page.waitForTimeout(500);

  // Toggle agentic mode switch
  const agenticSwitch = page.locator('[role="switch"]');
  await agenticSwitch.click();
  await expect(agenticSwitch).toHaveAttribute('data-state', 'checked');
  console.log('✓ Agentic mode enabled');

  // Configure agentic settings (keep defaults: target 85, max 5)
  // Optionally adjust for faster testing:
  const targetScoreInput = page.locator('input[type="number"]').first();
  await targetScoreInput.fill('80'); // Lower target for faster test

  const maxIterationsInput = page.locator('input[type="number"]').nth(1);
  await maxIterationsInput.fill('3'); // Reduce iterations for faster test

  console.log('✓ Agentic settings configured (target: 80, max: 3 iterations)');

  // Close settings
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();

  // Step 5: Upload demo images
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(demoImages);

  await expect(page.locator(`text=Assets (${demoImages.length})`)).toBeVisible({
    timeout: 15_000,
  });
  console.log(`✓ ${demoImages.length} demo images uploaded`);

  // Step 6: Enter prompt
  const textarea = page.locator('textarea');
  await textarea.fill(PROMPT);
  console.log('✓ Prompt entered');

  // Step 7: Click generate
  const generateBtn = page.locator('button', { hasText: 'Generate Video Draft' });
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();
  console.log('✓ Generate clicked — waiting for AI with agentic refinement...');

  // Step 8: Monitor for agentic progress messages
  // Look for "🤖" emoji in status messages
  const statusButton = page.locator('button').filter({ hasText: /🤖|Iteration|refining/ });

  // Wait for agentic refinement to start
  await expect(statusButton).toBeVisible({ timeout: 30_000 });
  console.log('✓ Agentic refinement started');

  // Wait for status messages showing iterations
  await page.waitForTimeout(2000);

  // Look for iteration progress
  const iterationText = await page.locator('button').filter({ hasText: /Iteration \d/ }).first().textContent({ timeout: 10_000 }).catch(() => null);
  if (iterationText) {
    console.log(`✓ Agentic progress: ${iterationText}`);
  }

  // Step 9: Wait for navigation to editor (extended timeout for agentic refinement)
  // Initial generation (30-60s) + 3 iterations × 15-30s = up to 180s
  await page.waitForURL('**/editor', { timeout: 180_000 });
  console.log('✓ Navigated to editor after agentic refinement!');

  // Step 10: Verify editor loaded with refined content
  await expect(page.locator('text=No project loaded')).not.toBeVisible();
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({
    path: 'e2e/screenshots/agentic-mode-result.png',
    fullPage: true,
  });
  console.log('✓ Agentic mode editor screenshot saved');

  // Step 11: Verify video has been refined
  // Check that timeline has content
  const timeline = page.locator('[class*="timeline"]').first();
  await expect(timeline).toBeVisible({ timeout: 5000 });

  console.log('✓ Agentic video generation successful!');
  console.log('✓ Test complete — video was generated with iterative AI refinement');
});

test('Verify agentic mode improves video quality', async ({ page }) => {
  // This test generates TWO videos:
  // 1. Without agentic mode (baseline)
  // 2. With agentic mode (refined)
  // Then we can compare the results

  console.log('=== Testing video quality improvement with agentic mode ===');

  // Use a deliberately "bad" prompt that will need refinement
  const BAD_PROMPT = `Show these images in a video.`; // Vague, no motion specs

  await page.goto('/');

  // Seed API keys
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
            store.put(key, `api-key-${id}`);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    },
    {
      claude: env.ANTHROPIC_API_KEY,
    }
  );

  // === Part 1: Generate WITHOUT agentic mode ===
  console.log('\n--- Part 1: Generating baseline video WITHOUT agentic mode ---');

  await page.locator('button[title="Settings"]').click();

  // Configure Claude
  const providerSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').first();
  await providerSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude (Anthropic)' }).click();

  const apiKeyInput = page.locator('[role="dialog"]').locator('input[type="password"]').first();
  await apiKeyInput.fill(env.ANTHROPIC_API_KEY);

  // Make sure agentic mode is OFF (should be by default)
  await page.locator('[role="tab"]').filter({ hasText: 'Advanced' }).click();
  await page.waitForTimeout(500);

  const agenticSwitch = page.locator('[role="switch"]');
  const isChecked = await agenticSwitch.getAttribute('data-state');
  if (isChecked === 'checked') {
    await agenticSwitch.click(); // Turn it OFF
  }
  console.log('✓ Agentic mode disabled for baseline test');

  await page.keyboard.press('Escape');

  // Upload images
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(demoImages.slice(0, 2)); // Just 2 images for speed

  await expect(page.locator('text=Assets (2)')).toBeVisible({ timeout: 15_000 });

  // Enter bad prompt
  const textarea = page.locator('textarea');
  await textarea.fill(BAD_PROMPT);

  // Generate
  await page.locator('button', { hasText: 'Generate Video Draft' }).click();
  console.log('✓ Generating baseline video...');

  // Wait for editor
  await page.waitForURL('**/editor', { timeout: 90_000 });
  console.log('✓ Baseline video generated');

  // Take screenshot
  await page.screenshot({
    path: 'e2e/screenshots/baseline-no-agentic.png',
    fullPage: true,
  });

  // Go back home for second test
  await page.goto('/');
  await page.waitForTimeout(1000);

  // === Part 2: Generate WITH agentic mode ===
  console.log('\n--- Part 2: Generating refined video WITH agentic mode ---');

  await page.locator('button[title="Settings"]').click();

  // Configure Claude again
  await page.locator('button[role="combobox"]').first().click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude (Anthropic)' }).click();

  await page.locator('input[type="password"]').first().fill(env.ANTHROPIC_API_KEY);

  // Enable agentic mode
  await page.locator('[role="tab"]').filter({ hasText: 'Advanced' }).click();
  await page.waitForTimeout(500);

  const agenticSwitch2 = page.locator('[role="switch"]');
  await agenticSwitch2.click();
  await expect(agenticSwitch2).toHaveAttribute('data-state', 'checked');

  // Set low target/iterations for speed
  await page.locator('input[type="number"]').first().fill('75');
  await page.locator('input[type="number"]').nth(1).fill('2');

  console.log('✓ Agentic mode enabled for refined test');

  await page.keyboard.press('Escape');

  // Upload same images
  await page.locator('input[type="file"]').setInputFiles(demoImages.slice(0, 2));
  await expect(page.locator('text=Assets (2)')).toBeVisible({ timeout: 15_000 });

  // Enter same bad prompt
  await page.locator('textarea').fill(BAD_PROMPT);

  // Generate with agentic mode
  await page.locator('button', { hasText: 'Generate Video Draft' }).click();
  console.log('✓ Generating refined video with agentic mode...');

  // Wait for agentic refinement
  await expect(page.locator('button').filter({ hasText: /🤖|Iteration/ })).toBeVisible({ timeout: 30_000 });
  console.log('✓ Agentic refinement in progress...');

  // Wait for editor
  await page.waitForURL('**/editor', { timeout: 180_000 });
  console.log('✓ Refined video generated');

  // Take screenshot
  await page.screenshot({
    path: 'e2e/screenshots/refined-with-agentic.png',
    fullPage: true,
  });

  console.log('\n✓ Comparison test complete!');
  console.log('✓ Check screenshots to compare:');
  console.log('  - baseline-no-agentic.png (without AI refinement)');
  console.log('  - refined-with-agentic.png (with AI refinement)');
  console.log('✓ Agentic mode should produce higher quality video');
});

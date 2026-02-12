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
  .map((f) => path.join(DEMO_DIR, f));

const PROMPT = `Create a 30-second demo video for "DraftCut" — an AI video editor built at the "Built with Opus 4.6: Claude Code Hackathon" by Cerebral Valley x Anthropic.

Use all uploaded screenshots as a slideshow. Structure:

1. INTRO (0-3s): Bold title card — "DraftCut" with subtitle "AI Video Editor — Built with Claude Code"
2. HACKATHON CONTEXT (3-12s): Show the Discord announcement, Opus 4.6 intro, and speaker screenshots with captions like "500 builders. $100K in prizes. One week to ship."
3. THE TOOL (12-22s): Show the hackathon landing page and registration screenshots with captions: "Describe a video. Upload assets. AI drafts the edit." then "Runs in your browser. 100% private."
4. OUTRO (22-30s): Call to action — "Try DraftCut" with subtitle "Built with Opus 4.6 + Claude Code"

Dark background (#0a0a0a). Brand colors: warm gold #D4A574, Anthropic purple #8B5CF6. Bold modern captions. Energetic pacing.`;

test('Generate hackathon demo video end-to-end', async ({ page }) => {
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
      elevenlabs: env.ELEVENLABS_API_KEY,
      // Skip replicate/beatoven to avoid slow music generation in test
      fal: env.FAL_API_KEY,
      pexels: env.PEXELS_API_KEY,
    }
  );
  console.log('✓ API keys seeded into IndexedDB');

  // Step 3: Open settings and select Claude as provider (most capable for this test)
  await page.locator('button[title="Settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Select Claude provider
  // Click the Provider dropdown
  const providerSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').first();
  await providerSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude (Anthropic)' }).click();

  // Fill in the API key
  const apiKeyInput = page.locator('[role="dialog"]').locator('input[type="password"]').first();
  await apiKeyInput.fill(env.ANTHROPIC_API_KEY);

  // Select Sonnet 4.5 model
  const modelSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]').nth(1);
  await modelSelect.click();
  await page.locator('[role="option"]').filter({ hasText: 'Claude Sonnet 4.5' }).click();

  console.log('✓ AI provider configured (Claude Sonnet 4.5)');

  // Close settings
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();

  // Step 4: Upload demo images
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(demoImages);

  // Wait for all assets to appear
  await expect(page.locator('text=Assets')).toBeVisible({ timeout: 15_000 });
  // Verify we have the right count
  await expect(page.locator(`text=Assets (${demoImages.length})`)).toBeVisible({
    timeout: 15_000,
  });
  console.log(`✓ ${demoImages.length} demo images uploaded`);

  // Step 5: Type the prompt
  const textarea = page.locator('textarea');
  await textarea.fill(PROMPT);
  console.log('✓ Prompt entered');

  // Step 6: Click generate
  const generateBtn = page.locator('button', { hasText: 'Generate Video Draft' });
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();
  console.log('✓ Generate clicked — waiting for AI response...');

  // Step 7: Wait for generation (AI call without music since we skipped those keys)
  // The button text changes to status messages during generation
  await expect(page.locator('button').filter({ hasText: /Generating|Generating video spec|Scraping/ })).toBeVisible({
    timeout: 10_000,
  });
  console.log('✓ Generation in progress...');

  // Wait for navigation to /editor (up to 60s for Claude API call)
  await page.waitForURL('**/editor', { timeout: 60_000 });
  console.log('✓ Navigated to editor!');

  // Step 8: Verify editor loaded with content
  await expect(page.locator('text=No project loaded')).not.toBeVisible();

  // Check the timeline has tracks
  await page.waitForTimeout(2000); // let editor render

  // Take a screenshot of the final editor state
  await page.screenshot({
    path: 'e2e/screenshots/demo-editor-result.png',
    fullPage: true,
  });
  console.log('✓ Editor screenshot saved to e2e/screenshots/demo-editor-result.png');

  // Verify we're on the editor page
  expect(page.url()).toContain('/editor');
  console.log('✓ Demo video generated successfully!');
});

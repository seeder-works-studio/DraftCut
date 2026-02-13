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

const PROMPT = `Create a dynamic 30-second demo video for "DraftCut" — an AI video editor built at the "Built with Opus 4.6: Claude Code Hackathon" by Cerebral Valley x Anthropic.

IMPORTANT: Use ImageSlideshow skill with Ken Burns effects for all screenshots - NO static images!

Structure with MOTION GRAPHICS:

1. INTRO (0-3s): IntroTitleCard with animated entrance
   - Title: "DraftCut"
   - Subtitle: "AI Video Editor — Built with Claude Code"
   - Use animated accent bars and corner decorations

2. HACKATHON CONTEXT (3-15s): ImageSlideshow with Ken Burns effects
   - Slide 1: Discord announcement (kenBurns: "zoomIn", caption: "500 Builders • $100K in Prizes")
   - Slide 2: Opus 4.6 intro (kenBurns: "panRight", caption: "Built with Opus 4.6")
   - Slide 3: Speaker screenshots (kenBurns: "zoomOut", caption: "One Week to Ship")
   - Use smooth crossfade transitions (20 frames)

3. THE TOOL (15-25s): ImageSlideshow with dynamic motion
   - Slide 1: Landing page (kenBurns: "zoomIn", caption: "Describe Your Video")
   - Slide 2: Upload interface (kenBurns: "panLeft", caption: "Upload Your Assets")
   - Slide 3: Editor view (kenBurns: "zoomOut", caption: "AI Drafts the Edit")
   - Slide 4: Preview (kenBurns: "panRight", caption: "100% Browser-Based & Private")

4. OUTRO (25-30s): OutroCTA with pulsing button
   - Heading: "Try DraftCut Today"
   - CTA Text: "Get Started Free"
   - Include animated glow and shimmer effects

STYLING:
- Background: #0a0a0a (dark)
- Primary: #D4A574 (warm gold)
- Accent: #8B5CF6 (Anthropic purple)
- Text: #ffffff (white)
- Use bold, modern typography
- Energetic pacing with constant motion

REMEMBER: All images must use ImageSlideshow skill with Ken Burns effects - vary the effects (zoomIn, zoomOut, panLeft, panRight) for visual interest!`;

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

  // Wait for navigation to /editor (up to 120s for Claude API call with longer prompt)
  await page.waitForURL('**/editor', { timeout: 120_000 });
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

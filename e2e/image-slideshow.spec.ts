import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Test ImageSlideshow functionality with multiple images
 * Verifies:
 * - Images can be uploaded
 * - AI generates slideshow
 * - Preview plays without errors
 * - No interpolation errors in console
 */

test.describe('ImageSlideshow', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for AI generation
    test.setTimeout(120000);

    // Navigate to home page
    await page.goto('http://localhost:3000');

    // Load API key from environment
    const claudeKey = process.env.CLAUDE_API_KEY;
    if (!claudeKey) {
      throw new Error('CLAUDE_API_KEY environment variable not set');
    }

    // Open settings and configure API key
    await page.click('button:has-text("Settings")');
    await page.fill('input[type="password"]', claudeKey);

    // Select Claude Sonnet 4.5
    await page.click('[role="combobox"]:near(:text("Model"))');
    await page.click('text=Claude Sonnet 4.5');

    // Close settings
    await page.click('button:has-text("Settings")');
  });

  test('should create slideshow from 3 images without interpolation errors', async ({ page }) => {
    console.log('Starting ImageSlideshow test...');

    // Create test images programmatically
    const testImagesDir = path.join(__dirname, 'test-images');
    if (!fs.existsSync(testImagesDir)) {
      fs.mkdirSync(testImagesDir, { recursive: true });
    }

    // Create 3 simple test images (solid colors)
    const images = [
      { name: 'red.png', color: 'red' },
      { name: 'green.png', color: 'green' },
      { name: 'blue.png', color: 'blue' },
    ];

    for (const img of images) {
      const canvas = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="${img.color}"/>
        <text x="400" y="300" font-size="48" text-anchor="middle" fill="white">${img.color.toUpperCase()}</text>
      </svg>`;

      const imagePath = path.join(testImagesDir, img.name);
      fs.writeFileSync(imagePath, canvas);
    }

    console.log('Test images created');

    // Upload the 3 images
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(testImagesDir, 'red.png'),
      path.join(testImagesDir, 'green.png'),
      path.join(testImagesDir, 'blue.png'),
    ]);

    console.log('Images uploaded');

    // Wait for uploads to complete
    await page.waitForSelector('text=Added red.png', { timeout: 5000 });
    await page.waitForSelector('text=Added green.png', { timeout: 5000 });
    await page.waitForSelector('text=Added blue.png', { timeout: 5000 });

    console.log('Upload confirmations received');

    // Enter prompt for slideshow
    await page.fill('textarea[placeholder*="Describe your video"]',
      'Create a simple slideshow with all 3 images. Show each image for 3 seconds with smooth transitions.'
    );

    // Listen for console errors (specifically interpolation errors)
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        console.log('Console error:', text);

        // Fail immediately if we see the interpolation error
        if (text.includes('inputRange must be strictly monotonically increasing')) {
          throw new Error(`Interpolation error detected: ${text}`);
        }
      }
    });

    // Click generate button
    await page.click('button:has-text("Generate Video")');
    console.log('Generation started');

    // Wait for generation to complete (progress dialog)
    await page.waitForSelector('text=Video draft generated!', { timeout: 90000 });
    console.log('Video generated successfully');

    // Should navigate to editor
    await page.waitForURL('**/editor', { timeout: 10000 });
    console.log('Navigated to editor');

    // Wait for preview to load
    await page.waitForSelector('[data-remotion-canvas]', { timeout: 10000 });
    console.log('Preview canvas loaded');

    // Wait a moment for any initial rendering
    await page.waitForTimeout(2000);

    // Check that we have a slideshow with multiple clips
    const timeline = page.locator('[data-testid="timeline"]').first();
    const clips = await timeline.locator('[role="button"]').count();

    console.log(`Found ${clips} clips on timeline`);
    expect(clips).toBeGreaterThanOrEqual(1); // Should have at least 1 slideshow clip

    // Play the preview for a few seconds
    console.log('Playing preview...');
    await page.click('button[aria-label="Play"]');

    // Let it play for 5 seconds
    await page.waitForTimeout(5000);

    // Pause
    await page.click('button[aria-label="Pause"]');
    console.log('Preview paused');

    // Check for interpolation errors
    const interpolationErrors = consoleErrors.filter(err =>
      err.includes('inputRange must be strictly monotonically increasing')
    );

    if (interpolationErrors.length > 0) {
      console.error('Interpolation errors found:', interpolationErrors);
      throw new Error(`Found ${interpolationErrors.length} interpolation errors`);
    }

    console.log('✅ No interpolation errors detected');

    // Take a screenshot
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'image-slideshow-success.png'),
      fullPage: true
    });

    console.log('Test completed successfully!');

    // Cleanup test images
    for (const img of images) {
      const imagePath = path.join(testImagesDir, img.name);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    if (fs.existsSync(testImagesDir)) {
      fs.rmdirSync(testImagesDir);
    }
  });

  test('should handle slideshow with Ken Burns effects', async ({ page }) => {
    console.log('Starting Ken Burns slideshow test...');

    // Create 2 test images
    const testImagesDir = path.join(__dirname, 'test-images');
    if (!fs.existsSync(testImagesDir)) {
      fs.mkdirSync(testImagesDir, { recursive: true });
    }

    const images = [
      { name: 'landscape1.png', color: '#4a90e2' },
      { name: 'landscape2.png', color: '#f39c12' },
    ];

    for (const img of images) {
      const canvas = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="1920" height="1080" fill="${img.color}"/>
        <circle cx="960" cy="540" r="200" fill="white" opacity="0.3"/>
      </svg>`;

      const imagePath = path.join(testImagesDir, img.name);
      fs.writeFileSync(imagePath, canvas);
    }

    // Upload images
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(testImagesDir, 'landscape1.png'),
      path.join(testImagesDir, 'landscape2.png'),
    ]);

    await page.waitForSelector('text=Added landscape1.png', { timeout: 5000 });
    await page.waitForSelector('text=Added landscape2.png', { timeout: 5000 });

    // Request slideshow with Ken Burns effects
    await page.fill('textarea[placeholder*="Describe your video"]',
      'Create a cinematic slideshow with zoom and pan effects on the images. 4 seconds per image.'
    );

    // Track errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        if (text.includes('inputRange must be strictly monotonically increasing')) {
          throw new Error(`Interpolation error with Ken Burns: ${text}`);
        }
      }
    });

    // Generate
    await page.click('button:has-text("Generate Video")');
    await page.waitForSelector('text=Video draft generated!', { timeout: 90000 });
    await page.waitForURL('**/editor', { timeout: 10000 });

    // Play preview
    await page.waitForSelector('[data-remotion-canvas]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.click('button[aria-label="Play"]');
    await page.waitForTimeout(6000); // Play through transitions
    await page.click('button[aria-label="Pause"]');

    // Verify no errors
    const interpolationErrors = consoleErrors.filter(err =>
      err.includes('inputRange must be strictly monotonically increasing')
    );

    expect(interpolationErrors).toHaveLength(0);
    console.log('✅ Ken Burns effects work without errors');

    // Cleanup
    for (const img of images) {
      const imagePath = path.join(testImagesDir, img.name);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    if (fs.existsSync(testImagesDir)) {
      fs.rmdirSync(testImagesDir);
    }
  });
});

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Screenshot the home page
  console.log('Taking homepage screenshot...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(__dirname, 'screenshot-home.png'), fullPage: true });
  console.log('Saved: test/screenshot-home.png');

  // Load the promo spec into the editor via localStorage/zustand
  // We'll navigate to the editor and inject the spec
  console.log('Loading promo spec into editor...');
  const promoSpec = JSON.parse(readFileSync(resolve(__dirname, 'promo-spec.json'), 'utf8'));

  // Click "Load Example Project" first to get into editor
  await page.click('text=Load Example Project');
  await page.waitForURL('**/editor', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Take editor screenshot with example project
  await page.screenshot({ path: resolve(__dirname, 'screenshot-editor.png'), fullPage: false });
  console.log('Saved: test/screenshot-editor.png');

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);

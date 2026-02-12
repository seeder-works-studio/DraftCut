import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click "Load Example Project"
  await page.click('text=Load Example Project');
  await page.waitForURL('**/editor', { timeout: 10000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: resolve(__dirname, 'screenshot-editor.png') });
  console.log('Saved: test/screenshot-editor.png');

  await browser.close();
}

main().catch(console.error);

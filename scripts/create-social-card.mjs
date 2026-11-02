import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const svg = await readFile(new URL('../public/social-card.svg', import.meta.url), 'utf8');
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await writeFile(new URL('../public/social-card.png', import.meta.url), await page.screenshot({ type: 'png' }));
  console.log('Created public/social-card.png (1200 × 630).');
} finally {
  await browser.close();
}

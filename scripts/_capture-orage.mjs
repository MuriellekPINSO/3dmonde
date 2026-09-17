import { chromium } from 'playwright-core';
const nav = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await nav.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:5177/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.waitForTimeout(2000);
await page.click('#begin');
await page.waitForTimeout(16000);
// Forcer la pluie via le menu Pause pour voir l'orage de suite.
await page.keyboard.press('p');
await page.waitForTimeout(600);
await page.selectOption('#weather-setting', 'pluie');
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await page.keyboard.press('Escape'); // fermer le panel
await page.waitForTimeout(1200);
await page.keyboard.press('p');
// attendre un éclair (jusqu'à ~14 s de délai aléatoire)
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/orage-${i}.png` });
  // stopper après 2 screenshots probables d'éclair
  if (i > 10) break;
}
await nav.close();
console.log('ok');

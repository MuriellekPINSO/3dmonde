import { chromium } from 'playwright-core';
const nav = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await nav.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:5177/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.waitForTimeout(2000);
await page.click('#begin');
await page.waitForTimeout(16000);
// Marcher le long de la promenade pour croiser des passants.
await page.keyboard.down('z');
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/salut-1.png' });
await page.waitForTimeout(1300);
await page.screenshot({ path: '/tmp/salut-2.png' });
await page.keyboard.up('z');
await nav.close();
console.log('ok');

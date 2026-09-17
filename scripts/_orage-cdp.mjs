import { chromium } from 'playwright-core';
import fs from 'node:fs';

const nav = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await nav.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:5177/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.waitForTimeout(2000);
await page.click('#begin');
await page.waitForTimeout(16000);
await page.keyboard.press('p');
await page.waitForSelector('#panel[open]');
await page.selectOption('#weather-setting', 'pluie');
await page.click('#close');
const client = await page.context().newCDPSession(page);
await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 1280, maxHeight: 720 });
const frames = [];
client.on('Page.screencastFrame', async prm => {
  frames.push({ data: prm.data });
  try { await client.send('Page.screencastFrameAck', { sessionId: prm.sessionId }); } catch {}
});
await page.waitForTimeout(28000);
await client.send('Page.stopScreencast');
await nav.close();
fs.mkdirSync('/tmp/orage-frames', { recursive: true });
frames.forEach((f, i) => fs.writeFileSync(`/tmp/orage-frames/o${String(i).padStart(5,'0')}.jpg`, Buffer.from(f.data, 'base64')));
console.log('frames:', frames.length);

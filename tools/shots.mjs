import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs = [];
for (const [name, url, vp] of [
  ['openings', '#/openings/w-ruy', { width: 1400, height: 950 }],
  ['puzzles', '#/puzzles', { width: 1400, height: 950 }],
  ['learnlist', '#/learn', { width: 1400, height: 950 }],
  ['mobile-play', '#/play', { width: 390, height: 844 }],
  ['mobile-lesson', '#/learn/after-the-opening', { width: 390, height: 844 }],
]) {
  const p = await b.newPage({ viewport: vp });
  p.on('pageerror', e => errs.push(name + ' ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text()); });
  await p.goto('http://localhost:4173/' + url);
  await p.waitForTimeout(1500);
  if (name === 'openings') { for (let i = 0; i < 9; i++) await p.click('button:has-text("▶")'); await p.waitForTimeout(300); }
  await p.screenshot({ path: `/tmp/s-${name}.png` });
  await p.close();
}
console.log('errors:', errs.join('\n') || 'none');
await b.close();

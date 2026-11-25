import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 2560, height: 1440 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4173/#/play'); await p.waitForTimeout(600);
await p.click('.bot-card:nth-child(4)'); await p.click('button.huge'); await p.waitForTimeout(1200);
const sq = (s) => `#game-board-square-${s}`;
const dotted = () => p.evaluate(() => [...document.querySelectorAll('[id^="game-board-square-"]')].filter(e => e.querySelector('.sq-dot, .sq-ring')).map(e => e.id.slice(-2)).sort().join(','));
// click e2 then click f2 -> f2 selected
await p.click(sq('e2')); await p.waitForTimeout(150); console.log('after click e2 dots:', await dotted());
await p.click(sq('f2')); await p.waitForTimeout(150); console.log('after click f2 dots:', await dotted());
// click e2 then start dragging g1 knight
await p.click(sq('e2')); await p.waitForTimeout(150);
const box = await p.locator(sq('g1')).boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
await p.mouse.move(box.x + box.width / 2 + 20, box.y - 30, { steps: 5 }); await p.waitForTimeout(200);
console.log('while dragging g1 dots:', await dotted());
const f3 = await p.locator(sq('f3')).boundingBox();
await p.mouse.move(f3.x + f3.width / 2, f3.y + f3.height / 2, { steps: 5 }); await p.mouse.up();
const t0 = Date.now();
await p.waitForSelector('.bubble-glyph', { timeout: 15000 });
const tVerdict = Date.now() - t0;
await p.waitForFunction(() => document.querySelectorAll('.ml-cell:not(.empty)').length >= 2, null, { timeout: 30000 });
const tBot = Date.now() - t0;
console.log(`verdict after ${tVerdict}ms, bot replied after ${tBot}ms (gap ${tBot - tVerdict}ms)`);
// clock re-render check: count renders of board in 2s idle -> use performance marks via mutation observer on board
const mutations = await p.evaluate(() => new Promise(res => { let n = 0; const o = new MutationObserver(m => n += m.length); o.observe(document.querySelector('#game-board-board') || document.body, { subtree: true, attributes: true, childList: true }); setTimeout(() => { o.disconnect(); res(n); }, 2000); }));
console.log('board DOM mutations during 2s idle:', mutations);
// Animation check: a bot move should glide (transition on transform), not jump.
const glide = await p.evaluate(() => getComputedStyle(document.querySelector('.piece')).transitionDuration);
console.log('piece transition:', glide);
const size = await p.evaluate(() => { const r = document.querySelector('#game-board-board').getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.top)}..${Math.round(r.bottom)}`; });
console.log('board size on 2560x1440:', size);
await p.screenshot({ path: '/tmp/big.png' });
console.log('errors:', errs.join('\n') || 'none');
await b.close();

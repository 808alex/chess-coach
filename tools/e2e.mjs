import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const base = 'http://localhost:4173/';
const mv = async (id, from, to) => { await p.click(`#${id}-square-${from}`); await p.waitForTimeout(150); await p.click(`#${id}-square-${to}`); };
const text = async (sel) => (await p.locator(sel).first().innerText().catch(() => '')).replace(/\s+/g, ' ');

// --- Play a coached game
await p.goto(base + '#/play');
await p.waitForTimeout(500);
await p.click('text=1200');
await p.click('text=Start game');
await p.waitForTimeout(1500);
await mv('game-board', 'e2', 'e4');
await p.waitForSelector('.verdict', { timeout: 20000 });
console.log('after e4:', await text('.verdict'));
await p.waitForFunction(() => document.querySelector('.status-line strong')?.textContent === 'Your move', null, { timeout: 30000 });
console.log('status:', await text('.status-line'), '| moves:', await text('.movelist'));
// Hang the queen: Qh5 then maybe Qxf7?? Just try Qg4 which often hangs to d7 bishop / knight
await mv('game-board', 'd1', 'g4');
await p.waitForTimeout(500);
await p.waitForSelector('.verdict', { timeout: 20000 });
await p.waitForTimeout(3500);
console.log('after Qg4:', await text('.coach-box'));
await p.screenshot({ path: '/tmp/s-play.png' });
// blunder check button
const bc = p.locator('button:has-text("Blunder check")');
if (await bc.isEnabled().catch(() => false)) { await bc.click(); await p.waitForTimeout(300); console.log('threats:', await text('.threats')); }
await p.screenshot({ path: '/tmp/s-play2.png' });

// --- Lesson exercise
await p.goto(base + '#/learn/blunder-check');
await p.waitForTimeout(1500);
const exId = 'ex-blunder-check-1';
await mv(exId, 'g8', 'f6'); // wrong on purpose
await p.waitForTimeout(6000);
console.log('wrong answer feedback:', await text('.exercise .task-side'));
await p.locator('.exercise').first().locator('button:has-text("Try again")').click().catch(() => {});
await p.waitForTimeout(400);
await mv(exId, 'g7', 'g6');
await p.waitForTimeout(1500);
console.log('right answer:', await text('.exercise .task-side'));
await p.screenshot({ path: '/tmp/s-lesson.png', fullPage: false });

// --- Puzzles
await p.goto(base + '#/puzzles');
await p.waitForTimeout(1500);
console.log('puzzle page:', (await text('.puzzle')).slice(0, 160));
await p.screenshot({ path: '/tmp/s-puzzle.png' });

// --- Openings drill
await p.goto(base + '#/openings/w-ruy/drill');
await p.waitForTimeout(800);
await mv('drill', 'e2', 'e4');
await p.waitForTimeout(1200);
await mv('drill', 'g1', 'f3');
await p.waitForTimeout(1200);
console.log('drill:', await text('.study-side'));
await mv('drill', 'b1', 'c3'); // wrong (should be Bb5)
await p.waitForTimeout(500);
console.log('drill wrong:', await text('.note-box'));

// --- Review a pasted PGN
await p.goto(base + '#/review');
await p.waitForTimeout(500);
await p.fill('textarea', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1');
await p.click('button:has-text("Review")');
await p.waitForSelector('.sum-card', { timeout: 120000 });
console.log('review summary:', await text('.sum-row'));
console.log('key moments:', await text('.key-moments'));
await p.locator('.moment').first().click();
await p.waitForTimeout(300);
console.log('moment verdict:', await text('.game-side .verdict'));
await p.screenshot({ path: '/tmp/s-review.png' });

// --- Home after data
await p.goto(base + '#/home');
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/s-home.png' });
console.log('home:', (await text('.home')).slice(0, 400));
console.log('ERRORS:', errs.join('\n') || 'none');
await b.close();

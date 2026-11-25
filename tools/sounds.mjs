// Exports WAV previews of the move sounds and prints simple spectral stats.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('http://localhost:4173/#/home'); await p.waitForTimeout(800);
mkdirSync('/tmp/sounds', { recursive: true });
const wav = (data) => { const n = data.length; const buf = Buffer.alloc(44 + n * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(88200, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40); data.forEach((v, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2)); return buf; };
const all = [];
for (const name of ['move', 'capture', 'castle', 'check']) {
  const data = await p.evaluate((n) => window.__renderSound(n, 0.45), name);
  const peak = Math.max(...data.map(Math.abs));
  // zero-crossing rate ~ brightness proxy
  let zc = 0; for (let i = 1; i < 6000; i++) if ((data[i] >= 0) !== (data[i - 1] >= 0)) zc++;
  console.log(`${name}: peak ${peak.toFixed(2)}, zero-crossings in first 136ms: ${zc} (~${Math.round(zc / 2 / 0.136)} Hz dominant)`);
  writeFileSync(`/tmp/sounds/${name}.wav`, wav(data));
  all.push(...data, ...new Array(8000).fill(0));
}
writeFileSync('/tmp/sounds/all-move-sounds.wav', wav(all));
await b.close();

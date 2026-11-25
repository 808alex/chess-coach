// All sounds are synthesised with the Web Audio API — no audio files, nothing to license.
import { getSettings } from './storage';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function vol() {
  const s = getSettings();
  return s.sound ? s.volume : 0;
}

/** A simple enveloped oscillator. */
function tone(c: AudioContext, t: number, freq: number, gain: number, dur: number, type: OscillatorType = 'sine', slideTo?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A soft, rounded "pop": a sine that drops in pitch very quickly, through a gentle low-pass.
 *  This is the ear-candy click used for moves — no noise, so it never sounds like a hi-hat. */
function pop(c: AudioContext, t: number, freq: number, gain: number, dur = 0.09) {
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  lp.Q.value = 0.4;
  lp.connect(c.destination);
  const body = c.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(freq * 1.7, t);
  body.frequency.exponentialRampToValueAtTime(freq, t + 0.018);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  body.connect(g).connect(lp);
  body.start(t);
  body.stop(t + dur + 0.02);
  // A quiet octave partial gives it a glassy, polished edge.
  const sh = c.createOscillator();
  sh.type = 'sine';
  sh.frequency.setValueAtTime(freq * 2.01, t);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(gain * 0.22, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.45);
  sh.connect(g2).connect(lp);
  sh.start(t);
  sh.stop(t + dur);
}

/** A "thock": a game-ified wooden piece being set down.
 *  Low sine body with a quick pitch drop + a short woody mid partial + a tiny low-passed tap.
 *  The noise is only a few milliseconds and low-passed, so it reads as a knock, never a hi-hat. */
function thock(c: AudioContext, t: number, freq: number, gain: number, opts: { tap?: number; body?: number } = {}) {
  const out = c.createGain();
  out.gain.value = 1;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.Q.value = 0.3;
  out.connect(lp).connect(c.destination);

  // Body: the "thump".
  const body = c.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(freq * 1.9, t);
  body.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
  const bg = c.createGain();
  const dur = opts.body ?? 0.14;
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  body.connect(bg).connect(out);
  body.start(t);
  body.stop(t + dur + 0.02);

  // Wood: a short hollow partial a couple of octaves up.
  const wood = c.createOscillator();
  wood.type = 'triangle';
  wood.frequency.setValueAtTime(freq * 4.3, t);
  wood.frequency.exponentialRampToValueAtTime(freq * 3.9, t + 0.05);
  const wg = c.createGain();
  wg.gain.setValueAtTime(0.0001, t);
  wg.gain.exponentialRampToValueAtTime(gain * 0.32, t + 0.002);
  wg.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
  wood.connect(wg).connect(out);
  wood.start(t);
  wood.stop(t + 0.08);

  // Tap: 6 ms of soft, low-passed noise for the contact.
  const len = Math.floor(c.sampleRate * 0.006);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const n = c.createBufferSource();
  n.buffer = buf;
  const nf = c.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 1400;
  const ng = c.createGain();
  ng.gain.value = gain * (opts.tap ?? 0.9);
  n.connect(nf).connect(ng).connect(out);
  n.start(t);
}

export type SoundName =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'illegal'
  | 'start'
  | 'win'
  | 'lose'
  | 'draw'
  | 'correct'
  | 'wrong'
  | 'notify'
  | 'brilliant'
  | 'blunder'
  | 'tick';

export function play(name: SoundName, override?: { ctx: BaseAudioContext; volume: number }) {
  const v = override ? override.volume : vol();
  if (!v) return;
  const c = (override?.ctx ?? ac()) as AudioContext | null;
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (name) {
    case 'move':
      // Slight random detune so repeated moves don't sound robotic.
      thock(c, t, 165 * (0.96 + Math.random() * 0.08), 0.75 * v);
      break;
    case 'capture':
      // Heavier landing, plus the knocked piece clacking a moment later.
      thock(c, t, 135 * (0.97 + Math.random() * 0.06), 0.9 * v, { tap: 1.3, body: 0.17 });
      thock(c, t + 0.045, 260, 0.32 * v, { tap: 0.8, body: 0.06 });
      break;
    case 'castle':
      thock(c, t, 160, 0.7 * v);
      thock(c, t + 0.1, 190, 0.6 * v);
      break;
    case 'check':
      thock(c, t, 165, 0.7 * v);
      tone(c, t + 0.02, 988, 0.07 * v, 0.22, 'sine');
      tone(c, t + 0.1, 1319, 0.06 * v, 0.28, 'sine');
      break;
    case 'promote':
      thock(c, t, 165, 0.7 * v);
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, t + 0.04 + i * 0.055, f, 0.06 * v, 0.24, 'sine'));
      break;
    case 'illegal':
      pop(c, t, 220, 0.3 * v, 0.07);
      pop(c, t + 0.07, 180, 0.25 * v, 0.08);
      break;
    case 'start':
      [523, 784].forEach((f, i) => tone(c, t + i * 0.09, f, 0.09 * v, 0.3, 'sine'));
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, t + i * 0.08, f, 0.12 * v, 0.45, 'triangle'));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(c, t + i * 0.14, f, 0.13 * v, 0.4, 'triangle'));
      break;
    case 'draw':
      [440, 440].forEach((f, i) => tone(c, t + i * 0.15, f, 0.1 * v, 0.3, 'triangle'));
      break;
    case 'correct':
      [659, 880, 1319].forEach((f, i) => tone(c, t + i * 0.07, f, 0.11 * v, 0.25, 'sine'));
      break;
    case 'wrong':
      tone(c, t, 330, 0.12 * v, 0.16, 'triangle', 260);
      tone(c, t + 0.12, 262, 0.12 * v, 0.24, 'triangle', 200);
      break;
    case 'notify':
      tone(c, t, 988, 0.08 * v, 0.15, 'sine');
      tone(c, t + 0.08, 1319, 0.07 * v, 0.2, 'sine');
      break;
    case 'brilliant':
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, t + i * 0.05, f, 0.09 * v, 0.5, 'sine'));
      break;
    case 'blunder':
      tone(c, t, 392, 0.1 * v, 0.3, 'triangle', 233);
      break;
    case 'tick':
      pop(c, t, 1400, 0.08 * v, 0.03);
      break;
  }
}

/** Pick the right sound for a chess.js move. */
export function moveSound(m: { san: string; captured?: string; promotion?: string; flags?: string }) {
  if (m.san.includes('+') || m.san.includes('#')) return play('check');
  if (m.promotion) return play('promote');
  if (m.san.startsWith('O-O')) return play('castle');
  if (m.captured) return play('capture');
  play('move');
}

/** Render a sound offline (used by the test tooling to export previews). */
export async function renderSound(name: SoundName, seconds = 0.6) {
  const ctx = new OfflineAudioContext(1, Math.floor(44100 * seconds), 44100);
  play(name, { ctx, volume: 0.8 });
  const buf = await ctx.startRendering();
  return Array.from(buf.getChannelData(0));
}
if (typeof window !== 'undefined') (window as unknown as { __renderSound: typeof renderSound }).__renderSound = renderSound;

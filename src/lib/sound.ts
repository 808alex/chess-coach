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

/** A short filtered noise burst: the "wood on wood" part of a piece landing. */
function knock(c: AudioContext, t: number, gain: number, freq: number, decay: number) {
  const len = Math.floor(c.sampleRate * decay);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

/** A soft sine "body" under the knock. */
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

export function play(name: SoundName) {
  const v = vol();
  if (!v) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (name) {
    case 'move':
      knock(c, t, 1.4 * v, 1800, 0.06);
      tone(c, t, 180, 0.25 * v, 0.07);
      break;
    case 'capture':
      knock(c, t, 1.8 * v, 2400, 0.05);
      knock(c, t + 0.035, 1.3 * v, 1500, 0.07);
      tone(c, t, 140, 0.3 * v, 0.09);
      break;
    case 'castle':
      knock(c, t, 1.3 * v, 1700, 0.05);
      tone(c, t, 170, 0.2 * v, 0.06);
      knock(c, t + 0.11, 1.3 * v, 1900, 0.05);
      tone(c, t + 0.11, 190, 0.2 * v, 0.06);
      break;
    case 'check':
      knock(c, t, 1.4 * v, 1800, 0.05);
      tone(c, t + 0.01, 880, 0.12 * v, 0.18, 'triangle');
      tone(c, t + 0.09, 1175, 0.1 * v, 0.22, 'triangle');
      break;
    case 'promote':
      knock(c, t, 1.3 * v, 1800, 0.05);
      [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.06, f, 0.1 * v, 0.2, 'triangle'));
      break;
    case 'illegal':
      tone(c, t, 160, 0.18 * v, 0.14, 'square', 120);
      break;
    case 'start':
      [392, 523].forEach((f, i) => tone(c, t + i * 0.09, f, 0.12 * v, 0.25, 'triangle'));
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
      tone(c, t, 220, 0.16 * v, 0.18, 'sawtooth', 150);
      tone(c, t + 0.12, 180, 0.14 * v, 0.22, 'sawtooth', 120);
      break;
    case 'notify':
      tone(c, t, 988, 0.08 * v, 0.15, 'sine');
      tone(c, t + 0.08, 1319, 0.07 * v, 0.2, 'sine');
      break;
    case 'brilliant':
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, t + i * 0.05, f, 0.09 * v, 0.5, 'sine'));
      break;
    case 'blunder':
      tone(c, t, 300, 0.15 * v, 0.35, 'sawtooth', 90);
      break;
    case 'tick':
      tone(c, t, 1600, 0.04 * v, 0.03, 'square');
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

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
      // Slight random detune so repeated moves don't sound robotic.
      pop(c, t, 520 * (0.97 + Math.random() * 0.06), 0.42 * v, 0.085);
      break;
    case 'capture':
      // Brighter and a touch fuller: two pops a fifth apart.
      pop(c, t, 700 * (0.98 + Math.random() * 0.04), 0.4 * v, 0.1);
      pop(c, t + 0.028, 1050, 0.22 * v, 0.12);
      break;
    case 'castle':
      pop(c, t, 480, 0.36 * v, 0.08);
      pop(c, t + 0.085, 640, 0.36 * v, 0.09);
      break;
    case 'check':
      pop(c, t, 560, 0.36 * v, 0.08);
      tone(c, t + 0.02, 988, 0.07 * v, 0.22, 'sine');
      tone(c, t + 0.1, 1319, 0.06 * v, 0.28, 'sine');
      break;
    case 'promote':
      pop(c, t, 560, 0.34 * v, 0.08);
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
